import { existsSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { parse as dotEnvParse } from 'dotenv'
import { expand as dotEnvExpand } from 'dotenv-expand'

import { encodeForDiff } from './encode-for-diff.js'

export const ENV_CLIENT_PREFIX = 'QCLI_'

const readAppFileEnvCacheKey = 'readAppFileEnv'
const validEnvKeyRE = /^[a-zA-Z_$][a-zA-Z0-9_$]+/

/**
 * Get the raw env definitions from the host project env files.
 * Used for the Quasar config file.
 */
export function readQuasarConfFileEnv(ctx) {
  return ctx.cacheProxy.getRuntime('readQuasarConfFileEnv', () => {
    const { rawFileEnv, usedEnvFiles } = getFileEnvResult({
      appPaths: ctx.appPaths,
      fileList: ['.env', '.env.local']
    })

    return {
      envDefineList: parseEnv(rawFileEnv, validEnvKeyRE),
      envBanner:
        usedEnvFiles.length > 0
          ? `(env files: ${usedEnvFiles.join(' | ')})`
          : '(no env files used for it)'
    }
  })
}

/**
 * Get the raw env definitions from the host project env files.
 * Used for the App content.
 */
export function readAppFileEnv(ctx, quasarConf) {
  const { cacheProxy, modeName: quasarMode, dev } = ctx
  const buildType = dev === true ? 'dev' : 'prod'

  const opts = {
    clientPrefix: quasarConf.build.envClientPrefix,
    folder: quasarConf.build.envFolder,
    files: quasarConf.build.envFiles || [],
    filter: quasarConf.build.envFilter
  }

  const configHash = encodeForDiff(opts)
  const cache = cacheProxy.getRuntime(readAppFileEnvCacheKey, () => ({}))

  if (cache.configHash !== configHash) {
    const fileList = [
      // .env
      // loaded in all cases
      '.env',

      // .env.local
      // loaded in all cases, ignored by git
      '.env.local',

      // .env.[dev|prod]
      // loaded for dev or prod only
      `.env.${buildType}`,

      // .env.local.[dev|prod]
      // loaded for dev or prod only, ignored by git
      `.env.local.${buildType}`,

      // .env.[quasarMode]
      // loaded for specific Quasar CLI mode only
      `.env.${quasarMode}`,

      // .env.local.[quasarMode]
      // loaded for specific Quasar CLI mode only, ignored by git
      `.env.local.${quasarMode}`,

      // .env.[dev|prod].[quasarMode]
      // loaded for specific Quasar CLI mode and dev|prod only
      `.env.${buildType}.${quasarMode}`,

      // .env.local.[dev|prod].[quasarMode]
      // loaded for specific Quasar CLI mode and dev|prod only, ignored by git
      `.env.local.${buildType}.${quasarMode}`,

      // additional user-defined env files
      ...opts.files
    ]

    const { rawFileEnv, usedEnvFiles } = getFileEnvResult({
      appPaths: ctx.appPaths,
      fileList,
      folder: opts.folder
    })

    const validClientEnvKeyRE = new RegExp(
      `^${opts.clientPrefix}[a-zA-Z_$][a-zA-Z0-9_$]+`
    )
    const result = {
      clientEnvDefineList: parseEnv(rawFileEnv, validClientEnvKeyRE),
      serverEnvDefineList: parseEnv(rawFileEnv, validEnvKeyRE),
      envBanner:
        usedEnvFiles.length !== 0
          ? `App .env files: ${usedEnvFiles.join(' | ')}`
          : null
    }

    if (typeof opts.filter === 'function') {
      result.clientEnvDefineList =
        opts.filter(result.clientEnvDefineList, 'client') || {}

      result.serverEnvDefineList =
        opts.filter(result.serverEnvDefineList, 'server') || {}
    }

    cacheProxy.setRuntime(readAppFileEnvCacheKey, {
      configHash,
      result
    })

    return result
  }

  return cache.result
}

function getFileEnvResult({ appPaths, fileList, folder = appPaths.appDir }) {
  const usedEnvFiles = []
  const envFolder =
    isAbsolute(folder) === true ? folder : join(appPaths.appDir, folder)

  const env = Object.fromEntries(
    fileList.flatMap(file => {
      const filePath = isAbsolute(file) === true ? file : join(envFolder, file)

      if (existsSync(filePath) === false) return []

      usedEnvFiles.push(file)
      return Object.entries(dotEnvParse(readFileSync(filePath, 'utf-8')))
    })
  )

  if (Object.keys(env).length === 0) {
    return {
      rawFileEnv: {},
      usedEnvFiles: []
    }
  }

  const { parsed: rawFileEnv } = dotEnvExpand({ parsed: env })

  return {
    rawFileEnv,
    usedEnvFiles
  }
}

/**
 * Filter out keys that cannot be used in JS
 * as import.meta.env.[key]
 * Examples: ProgramFiles(x86), BASH_FUNC_which%%
 */
function parseEnv(env, regex) {
  const validKeys = Object.keys(env).filter(key => regex.test(key))
  return validKeys.reduce((acc, key) => {
    acc[`import.meta.env.${key}`] = JSON.stringify(env[key])
    return acc
  }, {})
}
