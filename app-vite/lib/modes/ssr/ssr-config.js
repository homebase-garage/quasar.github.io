import { join } from 'node:path'
import { mergeConfig as mergeViteConfig } from 'vite'

import {
  createViteConfig,
  extendViteConfig,
  createNodeRolldownConfig,
  extendRolldownConfig
} from '../../config-tools.js'

import { cliPkg } from '../../utils/cli-runtime.js'

import { quasarPwaConfig } from '../pwa/pwa-config.js'
import { quasarVitePluginPwaResources } from '../pwa/vite-plugin.pwa-resources.js'

export const quasarSsrConfig = {
  viteClient: async quasarConf => {
    let cfg = await createViteConfig(quasarConf, {
      compileId: 'vite-ssr-client'
    })
    const { appPaths } = quasarConf.ctx

    cfg = mergeViteConfig(cfg, {
      define: {
        'import.meta.env.QUASAR_CLIENT': 'true',
        'import.meta.env.QUASAR_SERVER': 'false',
        __QUASAR_SSR_PWA__: String(quasarConf.ssr.pwa === true)
      },
      appType: 'custom',
      server: {
        middlewareMode: true
      },
      build: {
        ssrManifest: true,
        outDir: join(quasarConf.build.distDir, 'client')
      }
    })

    // also update pwa-config.js when changing here
    if (quasarConf.ssr.pwa === true) {
      cfg.plugins.push(quasarVitePluginPwaResources(quasarConf))
    }

    // dev has js entry-point, while prod has index.html
    if (quasarConf.ctx.dev) {
      cfg.build.rolldownOptions = cfg.build.rolldownOptions || {}
      cfg.build.rolldownOptions.input =
        appPaths.resolve.entry('client-entry.js')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  },

  viteServer: async quasarConf => {
    let cfg = await createViteConfig(quasarConf, {
      compileId: 'vite-ssr-server'
    })
    const { appPaths } = quasarConf.ctx
    const ssrEntryFile = appPaths.resolve.entry('server-entry.js')

    cfg = mergeViteConfig(cfg, {
      target: quasarConf.build.target.node,
      define: {
        'import.meta.env.QUASAR_CLIENT': 'false',
        'import.meta.env.QUASAR_SERVER': 'true',
        __QUASAR_SSR_PWA__: String(quasarConf.ssr.pwa === true)
      },
      appType: 'custom',
      server: {
        ws: false, // let client config deal with it
        hmr: false, // let client config deal with it
        middlewareMode: true,
        warmup: {
          ssrFiles: [ssrEntryFile]
        }
      },
      ssr: {
        // we don't externalize ourselves because of
        // the possible imports of '#q-app/wrappers' / '@quasar/app-vite/wrappers'
        noExternal: [cliPkg.name]
      },
      build: {
        ssr: true,
        outDir: join(quasarConf.build.distDir, 'server'),
        rolldownOptions: {
          input: ssrEntryFile
        }
      }
    })

    return extendViteConfig(cfg, quasarConf, { isServer: true })
  },

  // returns a Promise
  webserver: quasarConf => {
    const cfg = createNodeRolldownConfig(quasarConf, {
      compileId: 'node-ssr-webserver',
      format: 'esm'
    })
    const { appPaths } = quasarConf.ctx

    cfg.transform.define = {
      ...cfg.transform.define,
      'import.meta.env.QUASAR_CLIENT': 'false',
      'import.meta.env.QUASAR_SERVER': 'true'
    }

    if (quasarConf.ctx.dev) {
      cfg.input = appPaths.resolve.entry('ssr-dev-webserver.js')
      cfg.output.file = appPaths.resolve.entry('compiled-dev-webserver.js')
    } else {
      cfg.external = [
        ...cfg.external,
        'vue/server-renderer',
        'vue/compiler-sfc',
        './render-template.js',
        './quasar.manifest.json',
        './server/server-entry.js'
      ]

      cfg.input = appPaths.resolve.entry('ssr-prod-webserver.js')
      cfg.output.file = join(quasarConf.build.distDir, 'index.js')
    }

    return extendRolldownConfig(
      cfg,
      quasarConf.ssr,
      quasarConf.ctx,
      'extendSSRWebserverConf'
    )
  },

  workbox: quasarPwaConfig.workbox,
  customSw: quasarPwaConfig.customSw
}

export const modeConfig = quasarSsrConfig
