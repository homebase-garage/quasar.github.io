import fse from 'fs-extra'

import { log, warn } from '../../utils/logger.js'
import { isModeInstalled } from '../modes-utils.js'
import { ensureConsistency } from './electron-consistency.js'

/**
 * @param {{
 *   ctx: import('../../../types/configuration/context').InternalQuasarContext,
 *   silent: boolean
 * }} options
 */
export async function addMode({ ctx: { appPaths, cacheProxy }, silent }) {
  if (isModeInstalled(appPaths, 'electron')) {
    await ensureConsistency({ appPaths, cacheProxy })

    if (silent !== true) {
      warn('Electron support detected already. Aborting.')
    }
    return
  }

  log('Creating Electron source folder...')
  fse.copySync(
    appPaths.resolve.cli(`templates/electron/common`),
    appPaths.electronDir
  )

  const hasTypescript = await cacheProxy.getModule('hasTypescript')
  const format = hasTypescript ? 'ts' : 'js'
  fse.copySync(
    appPaths.resolve.cli(`templates/electron/${format}`),
    appPaths.electronDir
  )

  await ensureConsistency({ appPaths, cacheProxy })

  log('Electron support was added')
}

/**
 * @param {{
 *   ctx: import('../../../types/configuration/context').InternalQuasarContext,
 * }} options
 */
export function removeMode({ ctx: { appPaths } }) {
  if (!isModeInstalled(appPaths, 'electron')) {
    warn('No Electron support detected. Aborting.')
    return
  }

  log('Removing Electron source folder')
  fse.removeSync(appPaths.electronDir)
  log('Electron support was removed')
}
