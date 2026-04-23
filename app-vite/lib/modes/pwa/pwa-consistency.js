import { existsSync } from 'node:fs'

export async function ensureDeps({ appPaths, cacheProxy }) {
  if (existsSync(appPaths.resolve.pwa('node_modules'))) return

  const nodePackager = await cacheProxy.getModule('nodePackager')
  nodePackager.install({
    cwd: appPaths.pwaDir,
    params: nodePackager.name === 'pnpm' ? ['i', '--ignore-workspace'] : void 0,
    displayName: 'PWA'
  })
}

export async function ensureConsistency(opts) {
  await ensureDeps(opts)
}
