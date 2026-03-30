import { existsSync, readFileSync } from 'node:fs'
import { join, isAbsolute, relative } from 'node:path'
import { parse as dotEnvParse } from 'dotenv'
import { expand as dotEnvExpand } from 'dotenv-expand'

import { encodeForDiff } from './encode-for-diff.js'

export const ENV_CLIENT_PREFIX = 'QCLI_'
export const validEnvKeyRE = /^[a-zA-Z_$][a-zA-Z0-9_$]+/

const readAppFileEnvCacheKey = 'readAppFileEnv'

/**
 * Get the raw env definitions from the host project env files.
 * Used for the Quasar config file.
 */
export function readQuasarConfFileEnv(ctx) {
  return ctx.cacheProxy.getRuntime('readQuasarConfFileEnv', () => {
    const { rawFileEnv, usedEnvFiles } = getFileEnvResult({
      appDir: ctx.appPaths.appDir,
      fileList: ['.env', '.env.local'],
      folderList: [ctx.appPaths.appDir]
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
export function readAppFileEnv(ctx, env, clientPrefixRE) {
  const configHash = encodeForDiff(env)
  const cache = ctx.cacheProxy.getRuntime(readAppFileEnvCacheKey, () => ({}))

  if (cache.configHash !== configHash) {
    const { modeName: quasarMode, dev } = ctx
    const buildType = dev === true ? 'dev' : 'prod'

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
      ...(env.files || [])
    ]

    const folder = env.folder || ctx.appPaths.appDir
    const folderList = Array.isArray(folder) ? folder : [folder]

    const { rawFileEnv, usedEnvFiles } = getFileEnvResult({
      appDir: ctx.appPaths.appDir,
      fileList,
      folderList
    })

    const result = {
      clientEnvDefineList: parseEnv(rawFileEnv, clientPrefixRE),
      serverEnvDefineList: parseEnv(rawFileEnv, validEnvKeyRE),
      envBanner:
        usedEnvFiles.length !== 0
          ? `App .env files: ${usedEnvFiles.join(' | ')}`
          : null
    }

    if (typeof env.filter === 'function') {
      result.clientEnvDefineList =
        env.filter(result.clientEnvDefineList, 'client') || {}

      result.serverEnvDefineList =
        env.filter(result.serverEnvDefineList, 'server') || {}
    }

    ctx.cacheProxy.setRuntime(readAppFileEnvCacheKey, {
      configHash,
      result
    })

    return result
  }

  return cache.result
}

function getFileEnvResult({ appDir, fileList, folderList }) {
  const usedEnvFiles = []
  const envFolderList = folderList.map(folder =>
    isAbsolute(folder) === true ? folder : join(appDir, folder)
  )

  const list = fileList.flatMap(file => {
    if (isAbsolute(file) === true) return file
    return envFolderList.map(folder => join(folder, file))
  })

  const env = Object.fromEntries(
    list.flatMap(filePath => {
      if (existsSync(filePath) === false) return []

      usedEnvFiles.push(relative(appDir, filePath))
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
