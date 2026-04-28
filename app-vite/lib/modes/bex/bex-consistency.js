import { existsSync } from 'node:fs'

export async function ensureDeps({ appPaths, cacheProxy }) {
  if (existsSync(appPaths.resolve.bex('node_modules'))) return

  const nodePackager = await cacheProxy.getModule('nodePackager')
  nodePackager.install({
    cwd: appPaths.bexDir,
    params: nodePackager.name === 'pnpm' ? ['i', '--ignore-workspace'] : void 0,
    displayName: 'BEX'
  })
}

export async function ensureConsistency(opts) {
  await ensureDeps(opts)
}
