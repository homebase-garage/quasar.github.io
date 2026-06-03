import { existsSync } from 'node:fs'
import fse from 'fs-extra'

/**
 * @param {Object} opts
 * @param {import('../../../types/app-paths').QuasarAppPaths} opts.appPaths
 * @param {import('../../../types/configuration/context').CacheProxy} opts.cacheProxy
 */
export async function ensureConsistency(opts) {
  ensureWWW(opts)
  await ensurePackageJsonAndWorkspace(opts)
  await ensureDeps(opts)
}

function ensureWWW({ appPaths }) {
  const www = appPaths.resolve.capacitor('www')

  if (!existsSync(www)) {
    fse.copySync(appPaths.resolve.cli('templates/capacitor/common/www'), www)
  }
}

async function ensurePackageJsonAndWorkspace({ appPaths, cacheProxy }) {
  const packageJsonPath = appPaths.resolve.capacitor('package.json')
  const pnpmWorkspaceYamlPath = appPaths.resolve.capacitor(
    'pnpm-workspace.yaml'
  )

  if (!existsSync(packageJsonPath)) {
    fse.copySync(
      appPaths.resolve.cli('templates/capacitor/common/package.json'),
      packageJsonPath
    )
  }

  if (!existsSync(pnpmWorkspaceYamlPath)) {
    const nodePackager = await cacheProxy.getModule('nodePackager')
    // If the user is not using pnpm, and they are deleting the pnpm workspace file on purpose,
    // re-creating could be annoying. So, we only create it if using pnpm.
    if (nodePackager.name !== 'pnpm') {
      return
    }

    fse.copySync(
      appPaths.resolve.cli('templates/capacitor/common/pnpm-workspace.yaml'),
      pnpmWorkspaceYamlPath
    )
  }
}

export async function ensureDeps({ appPaths, cacheProxy }) {
  if (existsSync(appPaths.resolve.capacitor('node_modules'))) return

  const nodePackager = await cacheProxy.getModule('nodePackager')
  await nodePackager.install({ cwd: appPaths.capacitorDir })
}
