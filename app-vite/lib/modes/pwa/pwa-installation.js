import fse from 'fs-extra'

import { ensureConsistency } from './pwa-consistency.js'
import { createPromptSession, warn } from '../../utils/logger.js'
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

  const promptSession = await createPromptSession('Installing PWA Mode...')

  const copyTask = promptSession.taskLog({ title: 'Creating /src-pwa...' })

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

  copyTask.success('Created /src-pwa')

  await ensureConsistency({ appPaths, cacheProxy })

  if (hasTypescript) {
    promptSession.note(
      'To type-check the service worker during dev/build:' +
        '\n\n  If using ESLint + vite-plugin-checker,' +
        "\n   add a `typescript: { tsconfigPath: './src-pwa/sw/tsconfig.json' }` entry" +
        '\n   to your vite-plugin-checker options in quasar.config (alongside `vueTsc: true`)' +
        '\n\n  Alternatively, if using Oxlint or not, you can run:' +
        '\n   `tsc -p src-pwa/sw/tsconfig.json --noEmit`' +
        '\n\nhttps://v2.quasar.dev/quasar-cli-vite/developing-pwa/pwa-with-typescript',
      'PWA Typechecking'
    )
  }

  promptSession.end('PWA support was added')
}
