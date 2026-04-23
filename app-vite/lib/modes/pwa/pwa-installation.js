import fse from 'fs-extra'

import { ensureConsistency } from './pwa-consistency.js'
import { log, warn } from '../../utils/logger.js'
import { isModeInstalled } from '../modes-utils.js'

/**
 * @param {{
 *   ctx: import('../../../types/configuration/context').InternalQuasarContext,
 *   silent: boolean
 * }} options
 */
export async function addMode({ ctx: { appPaths, cacheProxy }, silent }) {
  if (isModeInstalled(appPaths, 'pwa')) {
    await ensureConsistency({ appPaths, cacheProxy })

    if (silent !== true) {
      warn('PWA support detected already. Aborting.')
    }
    return
  }

  log('Creating PWA source folder...')

  fse.copySync(appPaths.resolve.cli(`templates/pwa/common`), appPaths.pwaDir)
  fse.copySync(
    appPaths.resolve.cli('templates/pwa/icons'),
    appPaths.resolve.app('public/icons'),
    {
      overwrite: false
    }
  )

  const hasTypescript = await cacheProxy.getModule('hasTypescript')
  const format = hasTypescript ? 'ts' : 'js'
  fse.copySync(appPaths.resolve.cli(`templates/pwa/${format}`), appPaths.pwaDir)

  await ensureConsistency({ appPaths, cacheProxy })

  log('PWA support was added')
}

/**
 * @param {{
 *   ctx: import('../../../types/configuration/context').InternalQuasarContext,
 * }} options
 */
export function removeMode({ ctx: { appPaths } }) {
  if (!isModeInstalled(appPaths, 'pwa')) {
    warn('No PWA support detected. Aborting.')
    return
  }

  log('Removing PWA source folder')
  fse.removeSync(appPaths.pwaDir)
  log('PWA support was removed')
}
