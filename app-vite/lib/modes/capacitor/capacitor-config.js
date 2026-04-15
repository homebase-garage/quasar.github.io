import { join } from 'node:path'

import { createViteConfig, extendViteConfig } from '../../config-tools.js'
import { escapeRegexString } from '../../utils/escape-regex-string.js'

/**
 * Warning!
 *
 * Remember to update this.#registerDiff() calls when adding/removing quasarConf
 * properties needed for the build.
 */
export const quasarCapacitorConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf, {
      compileId: 'vite-capacitor',
      shippedToClient: true
    })
    const { appPaths, cacheProxy } = quasarConf.ctx

    const { capacitorRE, target, injectAliases } =
      await cacheProxy.getAsyncRuntime('runtimeCapacitorConfig', async () => {
        const { default: json } = await import(
          appPaths.resolve.capacitor('package.json'),
          { with: { type: 'json' } }
        )

        const localTarget = appPaths.resolve.capacitor('node_modules')

        const depsList = Object.keys(json.dependencies)
        const localCapacitorRE = new RegExp(
          '^(' + depsList.map(escapeRegexString).join('|') + ')'
        )

        return {
          capacitorRE: localCapacitorRE,
          target: localTarget,
          injectAliases(alias) {
            // we need to set alias as capacitor deps
            // are installed in /src-capacitor and not in root
            // so it breaks Vite
            depsList.forEach(dep => {
              alias[dep] = join(localTarget, dep)
            })
          }
        }
      })

    injectAliases(cfg.resolve.alias)

    cfg.plugins.unshift({
      name: 'quasar:resolve-capacitor-deps',
      resolveId(id) {
        if (capacitorRE.test(id)) {
          return join(target, id)
        }
      }
    })

    if (quasarConf.ctx.prod) {
      cfg.build.outDir = appPaths.resolve.capacitor('www')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  }
}

export const modeConfig = quasarCapacitorConfig
