#!/usr/bin/env node

import { join } from 'node:path'
import { parseArgs } from 'node:util'

function getArgv() {
  try {
    return parseArgs({
      options: {
        nogit: { type: 'boolean', alias: 'n', default: false }
      },
      strict: true,
      allowPositionals: true
    })
  } catch (err) {
    console.warn(
      'Error ⚠️  ' +
        (err?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION'
          ? err.message
          : 'Unknown error while parsing arguments')
    )
    console.log()
    process.exit(1)
  }
}

const { values, positionals } = getArgv()

const { createProjectFolder } = await import('./create-project-folder.js')
const scope = {
  // Usage: `pnpm create quasar --nogit`
  nogit: values.nogit
}

// Usage: `pnpm create quasar <project-folder>`
const dir = positionals[0]?.trim()
if (dir) {
  scope.projectFolder = join(process.cwd(), dir)
  scope.projectFolderName = dir
}

await createProjectFolder(scope)
