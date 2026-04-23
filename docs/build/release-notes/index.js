import { join, normalize } from 'node:path'
import fse from 'fs-extra'

import request from './request.js'

const rootFolder = normalize(join(import.meta.dirname, '../..'))

const api = {
  v2: {
    versionRE: {
      quasar: /^2./,
      '@quasar/app-webpack': /^(3|4)./,
      '@quasar/app-vite': /^(1|2|3)./
    },
    packages: {
      quasar: [],
      '@quasar/app-vite': [],
      '@quasar/app-webpack': [],
      '@quasar/cli': [],
      '@quasar/extras': [],
      '@quasar/icongenie': [],
      '@quasar/vite-plugin': []
    }
  }
}

for (const quasarVersion in api) {
  const { versionRE, packages } = api[quasarVersion]

  console.log(`Requesting release notes for Quasar v${quasarVersion}...`)

  await request(packages, versionRE).then(content => {
    const dir = join(rootFolder, 'dist/release-notes')
    const file = join(dir, `${quasarVersion}.json`)

    fse.ensureDir(dir)
    fse.writeJsonSync(file, content)

    console.log(' Created:', file)
  })
}
