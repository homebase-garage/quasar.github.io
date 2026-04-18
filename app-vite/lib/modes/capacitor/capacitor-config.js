import { createViteConfig, extendViteConfig } from '../../config-tools.js'

/**
 * Warning!
 *
 * Remember to update this.#registerDiff() calls when adding/removing quasarConf
 * properties needed for the build.
 */
export const quasarCapacitorConfig = {
  vite: async quasarConf => {
    const {
      appPaths,
      pkg: { modePkg }
    } = quasarConf.ctx

    const cfg = await createViteConfig(quasarConf, {
      compileId: 'vite-capacitor',
      shippedToClient: true,
      modeDeps: modePkg.dependencies
    })

    if (quasarConf.ctx.prod) {
      cfg.build.outDir = appPaths.resolve.capacitor('www')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  }
}

export const modeConfig = quasarCapacitorConfig
