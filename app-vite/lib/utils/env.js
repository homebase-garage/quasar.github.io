import { existsSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { parse as dotEnvParse } from 'dotenv'
import { expand as dotEnvExpand } from 'dotenv-expand'

import { encodeForDiff } from './encode-for-diff.js'

const readFileEnvCacheKey = 'readFileEnv'

/**
 * Get the raw env definitions from the host
 * project env files.
 */
export function readFileEnv({ ctx, quasarConf }) {
  const { cacheProxy } = ctx

  const opts = {
    envFolder: quasarConf.build.envFolder,
    envFiles: quasarConf.build.envFiles,
    envFilter: quasarConf.build.envFilter
  }

  const configHash = encodeForDiff(opts)
  const cache = cacheProxy.getRuntime(readFileEnvCacheKey, () => ({}))

  if (cache.configHash !== configHash) {
    const result = getFileEnvResult({
      ...opts,
      appPaths: ctx.appPaths,
      quasarMode: ctx.modeName,
      buildType: ctx.dev ? 'dev' : 'prod'
    })

    if (opts.envFilter !== void 0) {
      result.fileClientEnv =
        opts.envFilter(result.fileClientEnv, 'client') || {}

      result.fileServerEnv =
        opts.envFilter(result.fileServerEnv, 'server') || {}
    }

    cacheProxy.setRuntime(readFileEnvCacheKey, {
      configHash,
      result: {
        ...result,
        envFromCache: true
      }
    })

    return result
  }

  return cache.result
}

function getFileEnvResult({
  appPaths,
  quasarMode,
  buildType,
  envFolder = appPaths.appDir,
  envFiles = []
}) {
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
    ...envFiles
  ]

  const usedEnvFiles = []
  const folder =
    isAbsolute(envFolder) === true
      ? envFolder
      : join(appPaths.appDir, envFolder)

  const env = Object.fromEntries(
    fileList.flatMap(file => {
      const filePath = isAbsolute(file) === true ? file : join(folder, file)

      if (existsSync(filePath) === false) {
        return []
      }

      usedEnvFiles.push(file)
      return Object.entries(dotEnvParse(readFileSync(filePath, 'utf-8')))
    })
  )

  if (Object.keys(env).length === 0) return {}

  const { parsed: rawFileEnv } = dotEnvExpand({ parsed: env })

  return {
    fileEnvClient: parseEnv(rawFileEnv, validClientKeyRE),
    fileEnvServer: parseEnv(rawFileEnv, validServerKeyRE),
    usedEnvFiles,
    envFromCache: false
  }
}

const validClientKeyRE = /^QCLI_[a-zA-Z_$][a-zA-Z0-9_$]+/
const validServerKeyRE = /^[a-zA-Z_$][a-zA-Z0-9_$]+/

/**
 * Filter out keys that cannot be used in JS
 * as import.meta.env.[key]
 * Examples: ProgramFiles(x86), BASH_FUNC_which%%
 */
function parseEnv(env, regex) {
  const validKeys = Object.keys(env).filter(key => regex.test(key))
  return validKeys.reduce((acc, key) => {
    acc[`import.meta.env.${key}`] = env[key]
    return acc
  }, {})
}
