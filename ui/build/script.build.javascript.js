process.env.BABEL_ENV = 'production'

import fse from 'fs-extra'
import { build as rolldownBuild } from 'rolldown'

import { version, banner, resolveToRoot, logError, writeFile } from './build.utils.js'
import prepareDiff from './prepare-diff.js'

const NODE_TARGET = 'node22'
const BROWSER_TARGET = [
  'chrome111',
  'edge111',
  'firefox114',
  'safari16.4',
  'ios16.4'
]

const importRE = /import\s*\{([\w,\s]+)\}\s*from\s*(['"])([a-zA-Z0-9-@/]+)\2;?/g
const umdTempFilesList = []
const umdTargetAssetRE = /\.js$/
process.on('exit', () => {
  umdTempFilesList.forEach(file => {
    fse.removeSync(file)
  })
})

const builds = [
  // Client entry-point used by @quasar/vite-plugin for DEV only.
  // Also used as entry-point in package.json.
  {
    platform: 'browser',
    input: resolveToRoot('src/index.dev.js'),
    output: {
      banner,
      format: 'esm',
      file: resolveToRoot('dist/quasar.client.js')
    },
    external: [
      'vue'
    ],
    transform: {
      target: BROWSER_TARGET,
      define: {
        // Any change to the flags should be reflected
        // to src/flags.dev.js as well.
        __QUASAR_VERSION__: `'${ version }'`,
        __QUASAR_SSR_SERVER__: 'false'
      }
    }
  },

  // SSR server prod entry-point (ESM - used by @quasar/app-vite)
  // (no flags; not required to replace them)
  {
    platform: 'node',
    input: resolveToRoot('src/index.ssr.js'),
    output: {
      banner,
      format: 'esm',
      minify: true,
      file: resolveToRoot('dist/quasar.server.prod.js')
    },
    external: [
      'vue'
    ],
    transform: {
      target: NODE_TARGET,
      define: {
        __QUASAR_VERSION__: `'${ version }'`,
        __QUASAR_SSR__: 'true',
        __QUASAR_SSR_SERVER__: 'true',
        __QUASAR_SSR_CLIENT__: 'false',
        __QUASAR_SSR_PWA__: 'false'
      }
    }
  },

  // SSR server prod entry-point (CJS - used by @quasar/app-webpack)
  // (no flags; not required to replace them)
  {
    platform: 'node',
    input: resolveToRoot('src/index.ssr.js'),
    output: {
      banner,
      format: 'cjs',
      minify: true,
      file: resolveToRoot('dist/quasar.server.prod.cjs')
    },
    external: [
      'vue'
    ],
    transform: {
      target: NODE_TARGET,
      define: {
        __QUASAR_VERSION__: `'${ version }'`,
        __QUASAR_SSR__: 'true',
        __QUASAR_SSR_SERVER__: 'true',
        __QUASAR_SSR_CLIENT__: 'false',
        __QUASAR_SSR_PWA__: 'false'
      },
    }
  },

  // UMD dev entry
  {
    platform: 'browser',
    input: resolveToRoot('src/index.umd.js'),
    output: {
      banner,
      format: 'iife',
      file: resolveToRoot('dist/quasar.umd.js'),
      globals: {
        vue: 'window.Vue'
      }
    },
    external: [
      'vue'
    ],
    transform: {
      target: BROWSER_TARGET,
      define: {
        __QUASAR_VERSION__: `'${ version }'`,
        __QUASAR_SSR__: 'false',
        __QUASAR_SSR_SERVER__: 'false',
        __QUASAR_SSR_CLIENT__: 'false',
        __QUASAR_SSR_PWA__: 'false'
      }
    }
  },

  // UMD prod entry
  {
    platform: 'browser',
    input: resolveToRoot('src/index.umd.js'),
    output: {
      banner,
      format: 'iife',
      minify: true,
      file: resolveToRoot('dist/quasar.umd.prod.js'),
      globals: {
        vue: 'window.Vue'
      }
    },
    external: [
      'vue'
    ],
    transform: {
      target: BROWSER_TARGET,
      define: {
        __QUASAR_VERSION__: `'${ version }'`,
        __QUASAR_SSR__: 'false',
        __QUASAR_SSR_SERVER__: 'false',
        __QUASAR_SSR_CLIENT__: 'false',
        __QUASAR_SSR_PWA__: 'false'
      }
    }
  }
]

function build (builds) {
  return Promise.all(
    builds.map(rolldownConfig => {
      return rolldownBuild(rolldownConfig).then(result => {
        return writeFile(
          rolldownConfig.output.file,
          result.output[ 0 ].code,
          rolldownConfig.minify === true
        )
      }).catch(err => {
        logError(`Rolldown build failed for ${ rolldownConfig.input }`)
        console.error(err)
        process.exit(1)
      })
    })
  )
}

async function convertExternalImports (content) {
  const importList = {}
  const packageList = new Set()
  const tokenMap = {}
  let tokenIndex = 0

  const tokenContent = content.replace(
    importRE,
    (_, importIdMatch, __, packageMatch) => {
      const token = `____token_${ tokenIndex++ }____`
      packageList.add(packageMatch)
      tokenMap[ token ] = { packageMatch, importIdMatch }
      return token
    }
  )

  await Promise.all(
    [ ...packageList ].map(packageMatch => {
      return import(packageMatch)
        .then(async module => { importList[ packageMatch ] = module })
    })
  )

  return tokenContent.replace(
    /____token_\d+____/g,
    token => {
      const { packageMatch, importIdMatch } = tokenMap[ token ]
      return importIdMatch.match(/[^\s,]+/g)
        .map(id => `const ${ id } = '${ importList[ packageMatch ][ id ] }'\n`)
        .join('')
    }
  )
}

async function addUmdAssets (builds, type, injectName, convertImports) {
  const fileList = fse.readdirSync(resolveToRoot(type))
    .filter(file => umdTargetAssetRE.test(file))

  for (const file of fileList) {
    const name = file
      .substring(0, file.length - 3)
      .replace(/-([a-zA-Z])/g, g => g[ 1 ].toUpperCase())

    const inputCode = fse.readFileSync(resolveToRoot(`${ type }/${ file }`), 'utf-8')
    const tempFile = resolveToRoot(`dist/${ type }/temp.${ file }`)

    umdTempFilesList.push(tempFile)

    fse.writeFileSync(
      tempFile,
      (
        convertImports === true
          ? await convertExternalImports(inputCode)
          : inputCode
      ).replace('export default ', `window.Quasar.${ injectName }.${ name } = `),
      'utf-8'
    )

    builds.push({
      platform: 'browser',
      input: tempFile,
      output: {
        banner,
        format: 'iife',
        minify: true,
        file: addExtension(resolveToRoot(`dist/${ type }/${ file }`), 'umd.prod')
      },
      transform: {
        target: BROWSER_TARGET
      }
    })
  }
}

function addExtension (filename, ext = 'prod') {
  const insertionPoint = filename.lastIndexOf('.')
  const suffix = filename.slice(insertionPoint)
  return `${ filename.slice(0, insertionPoint) }.${ ext }${ suffix }`
}

const runBuild = {
  async full () {
    import('./build.transforms.js').then(({ generate }) => generate({ compact: true }))
    import('./build.icon-sets.js').then(({ generate }) => generate())

    Promise.all([
      addUmdAssets(builds, 'lang', 'Lang'),
      addUmdAssets(builds, 'icon-set', 'IconSet', true)
    ]).then(() => {
      build(builds)
    })

    const api = await import('./build.api.js').then(({ generate }) => generate({ compact: true }))

    import('./build.vetur.js').then(({ generate }) => generate({ api, compact: true }))
    import('./build.web-types.js').then(({ generate }) => generate({ api, compact: true }))

    const quasarLangIndex = await import('./build.lang.js').then(({ generate }) => generate())
    import('./build.types.js').then(({ generate }) => generate({ api, quasarLangIndex }))
  },

  async fast () { // does NOT builds types
    import('./build.transforms.js').then(({ generate }) => generate({ compact: true }))
    import('./build.icon-sets.js').then(({ generate }) => generate())

    Promise.all([
      addUmdAssets(builds, 'lang', 'Lang'),
      addUmdAssets(builds, 'icon-set', 'IconSet', true)
    ]).then(() => {
      build(builds)
    })

    build(builds)

    const api = await import('./build.api.js').then(({ generate }) => generate({ compact: true }))

    import('./build.vetur.js').then(({ generate }) => generate({ api, compact: true }))
    import('./build.web-types.js').then(({ generate }) => generate({ api, compact: true }))

    await import('./build.lang.js').then(({ generate }) => generate())
  },

  async types () {
    prepareDiff('dist/types/index.d.ts')

    const api = await import('./build.api.js').then(({ generate }) => generate())

    const quasarLangIndex = await import('./build.lang.js').then(({ generate }) => generate())
    import('./build.types.js').then(({ generate }) => generate({ api, quasarLangIndex }))
  },

  async api () {
    await prepareDiff('dist/api')
    import('./build.api.js').then(({ generate }) => generate())
  },

  async vetur () {
    await prepareDiff('dist/vetur')

    const api = await import('./build.api.js').then(({ generate }) => generate({ compact: true }))
    import('./build.vetur.js').then(({ generate }) => generate({ api }))
  },

  async webtypes () {
    await prepareDiff('dist/web-types')

    const api = await import('./build.api.js').then(({ generate }) => generate({ compact: true }))
    import('./build.web-types.js').then(({ generate }) => generate({ api }))
  },

  async transforms () {
    await prepareDiff('dist/transforms')
    import('./build.transforms.js').then(({ generate }) => generate())
  }
}

export function buildJavascript (subtype) {
  if (runBuild[ subtype ] === void 0) {
    console.log(` Unrecognized subtype specified: "${ subtype }".`)
    console.log(` Available: ${ Object.keys(runBuild).join(' | ') }\n`)
    process.exit(1)
  }

  runBuild[ subtype ]()
}
