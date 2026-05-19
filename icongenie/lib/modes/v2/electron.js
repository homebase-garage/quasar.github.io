import { existsSync } from 'node:fs'
import { resolveDir } from '../../utils/app-paths.js'

const dir = existsSync(resolveDir('src-electron/electron-assets'))
  ? 'electron-assets' // q/app-vite v3+
  : existsSync(resolveDir('src-electron/icons'))
    ? 'icons' // q/app-vite v2 or q/app-webpack v4
    : 'electron-assets' // fallback to q/app-webpack v3 specs

export default [
  {
    // macos (embedded icons)
    generator: 'icns',
    name: 'icon.icns',
    folder: `src-electron/${dir}/icons`
  },

  {
    // windows (embedded icon)
    generator: 'ico',
    name: 'icon.ico',
    folder: `src-electron/${dir}/icons`
  },

  {
    // tray icon (all platforms)
    generator: 'png',
    name: 'icon.png',
    folder: `src-electron/${dir}/icons`,
    sizes: [512]
  }
]
