#!/usr/bin/env node

import parseArgs from 'minimist'
import { join } from 'node:path'

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    n: 'nogit'
  },

  boolean: ['n']
})

const { createProjectFolder } = await import('./create-project-folder.js')
const scope = {
  // Usage: `pnpm create quasar --nogit`
  nogit: argv.nogit
}

// Usage: `pnpm create quasar <project-folder>`
const dir = argv._[0]?.trim()
if (dir) {
  scope.projectFolder = join(process.cwd(), dir)
  scope.projectFolderName = dir
}

await createProjectFolder(scope)
