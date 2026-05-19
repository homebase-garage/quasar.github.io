import { getArgv } from '../utils/get-argv.js'

const argv = getArgv(
  {
    nocolor: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  },
  { strict: false }
)

const extId = argv._[0]
const cmd = argv._[1]

if (!extId || argv.help) {
  console.log(`
  Description
    Run app extension provided commands

  Usage
    $ quasar run <extension-id> <cmd> [args, params]
    $ quasar <extension-id> <cmd> [args, params]

    $ quasar run iconify create pic -s --mark some_file
    $ quasar iconify create pic -s --mark some_file
        # Note: "iconify" is an example and not a real extension.
        # Looks for installed extension called "iconify"
        # (quasar-app-extension-iconify extension package)
        # and runs its custom defined "create" command
        # with "pic" argument and "-s --mark some_file" params

  Options
    --nocolor        Disable colored output
    --help, -h       Displays this message
  `)

  argv.__warn?.()
  process.exit(0)
}

import { log, warn, aeWarn, aeLog } from '../utils/logger.js'

import { getCtx } from '../utils/get-ctx.js'
const { appExt } = getCtx()

const ext = appExt.getInstance(extId)

if (ext === void 0) {
  warn()
  aeWarn(extId, 'No such App Extension is installed')
  warn()
  process.exit(1)
}

const hooks = await ext.run()

const list = () => {
  if (Object.keys(hooks.commands).length === 0) {
    aeWarn(extId, `App Extension has no commands registered`)
    return
  }

  log(`Listing "${extId}" App Extension commands`)
  log()

  for (const hookCmd in hooks.commands) {
    console.log(`  > ${hookCmd}`)
  }

  console.log()
}

if (!cmd) {
  list()
  process.exit(0)
}
if (!hooks.commands[cmd]) {
  warn()
  aeWarn(extId, `App Extension has no command called "${cmd}"`)
  warn()
  list()
  process.exit(1)
}

const command = hooks.commands[cmd]

aeLog(extId, `Running command "${cmd}"`)
log()

const { _, ...params } = argv
await command({
  args: _.slice(2),
  params
})
