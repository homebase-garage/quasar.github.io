#!/usr/bin/env node

import { join } from 'node:path'
import { parseArgs } from 'node:util'

if (
  process.argv.includes('--no-color') ||
  (await import('ci-info').then(({ isCI }) => isCI))
) {
  process.env.FORCE_COLOR = '0'
}

function showHelp(warn) {
  console.log(`
  Description
    Scaffolds Quasar Apps & App Extensions

  Options
    --template, -t  Type of project to create: app | ae
    --overwrite, -o Overwrite existing folder if it exists
    --preset        Preset to apply (can be used multiple times)
                    - template "app" presets:
                      typescript, sass, oxlint, eslint, filenameBasedRouting, i18n, pinia
                    - template "ae" presets:
                      prompts, install, uninstall, oxlint, typescript
    --name          Name of the project for package.json (must be a valid npm package name)
    --author        Author name for package.json
    --no-git        Do not initialize a git repository
    --install, -i   When invoked through a package manager it's a boolean (eg. --install)
                    Otherwise, the package manager to auto-install with (pnpm, yarn, npm, bun)

    --type          (ONLY for template "app") Quasar App Local CLI to use:
                      vite-3, vite-2, webpack-4
    --product       (ONLY for template "app") Product name for the app

    --defaults, -d  Use default values for the remaining non-specified options
    --no-color      Disable colored output
    --help, -h      Displays this message
  `)

  warn?.()
  process.exit(0)
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp()
}

function argvError(errorMessage) {
  return {
    help: true,
    __warn() {
      console.warn('Error ⚠️  ' + errorMessage)
      console.log()
      process.exit(1)
    }
  }
}

async function getArgv() {
  const runningPackageManager = process.env.npm_config_user_agent
  let scope, positionals

  try {
    const { values, positionals: pos } = parseArgs({
      options: {
        'no-git': { type: 'boolean' },
        overwrite: { type: 'boolean', short: 'o' },
        template: { type: 'string', short: 't' },
        type: { type: 'string' },
        preset: { type: 'string', short: 'p', multiple: true },
        linter: { type: 'string', short: 'l' },
        name: { type: 'string' },
        product: { type: 'string' },
        author: { type: 'string' },
        install: runningPackageManager
          ? { type: 'boolean', short: 'i' }
          : { type: 'string', short: 'i' },

        defaults: { type: 'boolean', short: 'd' },
        'no-color': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' }
      },
      strict: true,
      allowPositionals: true
    })

    scope = values
    positionals = pos
  } catch (err) {
    return argvError(
      err?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION'
        ? err.message
        : 'Unknown error while parsing arguments'
    )
  }

  if (positionals.length > 1) {
    return argvError(
      'Too many positional arguments provided (only one is allowed): ' +
        positionals.join(', ')
    )
  }

  const { default: utils } = await import('./utils.js')
  if (scope.defaults) {
    if (scope.overwrite === void 0) scope.overwrite = true
    if (!scope.template) {
      scope.template = utils.definitions.template.default
    }
  }

  const { template } = scope
  const packageManagerList = ['pnpm', 'yarn', 'npm', 'bun']
  scope.packageManagerList = runningPackageManager
    ? [runningPackageManager]
    : packageManagerList

  if (template) {
    if (template === 'ae') {
      if (scope.type) {
        return argvError(
          'The --type option is not applicable for template "ae". Please remove it.'
        )
      }
      if (scope.product) {
        return argvError(
          'The --product option is not applicable for template "ae". Please remove it.'
        )
      }

      if (scope.defaults) {
        if (scope.install === void 0) scope.install = 'pnpm'
        if (!scope.preset) {
          scope.preset = ['prompts', 'install', 'uninstall', 'oxlint']
        }
      }
      const { preset, install } = scope

      if (install) {
        if (runningPackageManager) {
          if (runningPackageManager !== 'pnpm') {
            return argvError(
              `Package manager ${runningPackageManager} is not allowed with --install. Use only "pnpm".`
            )
          }

          scope.install = runningPackageManager
        } else if (install !== 'pnpm') {
          return argvError(
            'Invalid package manager specified with --install for App Extension: ' +
              install +
              '. Allowed value is "pnpm".'
          )
        }
      }

      if (preset) {
        const opts = ['prompts', 'install', 'uninstall', 'oxlint', 'typescript']
        if (preset.some(p => !opts.includes(p))) {
          return argvError(
            'Invalid preset specified: ' +
              preset.join(', ') +
              '. Allowed values are "prompts", "install", "uninstall", "oxlint", "typescript".'
          )
        }

        if (preset.includes('oxlint')) {
          scope.preset = preset.filter(p => p !== 'oxlint')
          scope.preset.push('linting')
          scope.linter = 'oxlint'
        }
      }
    } else if (template === 'app') {
      if (scope.defaults) {
        if (scope.install === void 0) scope.install = 'pnpm'
        if (!scope.type) scope.type = utils.definitions.type.default
      }
      const { type, install } = scope

      if (install) {
        if (runningPackageManager) {
          if (!packageManagerList.includes(runningPackageManager)) {
            return argvError(
              `Package manager ${runningPackageManager} is not allowed with --install. Allowed package managers are ${packageManagerList.join(
                ', '
              )}.`
            )
          }

          scope.install = runningPackageManager
        } else if (!packageManagerList.includes(install)) {
          return argvError(
            'Invalid package manager specified with --install: ' +
              install +
              '. Allowed values are ' +
              packageManagerList.join(', ') +
              '.'
          )
        }
      }

      if (type) {
        if (scope.defaults && !scope.product) {
          scope.product = utils.definitions.product.default
        }

        if (type === 'vite-3') {
          if (scope.defaults && !scope.preset) {
            scope.preset = ['sass', 'oxlint']
          }
          const { preset } = scope

          if (preset) {
            const opts = [
              'typescript',
              'sass',
              'oxlint',
              'eslint',
              'filenameBasedRouting',
              'i18n',
              'pinia'
            ]

            if (preset.some(p => !opts.includes(p))) {
              return argvError(
                'Invalid preset specified: ' +
                  preset.join(', ') +
                  '. Allowed values are "typescript", "sass", "oxlint", "eslint", "filenameBasedRouting", "i18n", "pinia".'
              )
            }

            const hasOxlint = preset.includes('oxlint')
            const hasEslint = preset.includes('eslint')

            if (hasOxlint && hasEslint) {
              return argvError(
                'Invalid presets specified: oxlint and eslint cannot be used together. Please choose one of them.'
              )
            }

            if (hasOxlint) {
              scope.preset = preset.filter(p => p !== 'oxlint')
              scope.preset.push('linting')
              scope.linter = 'oxlint'
            } else if (hasEslint) {
              scope.preset = preset.filter(p => p !== 'eslint')
              scope.preset.push('linting')
              scope.linter = 'eslint'
            }
          }
        } else if (type === 'vite-2' || type === 'webpack-4') {
          if (scope.defaults && !scope.preset) {
            scope.preset = ['sass', 'eslint']
          }
          const { preset } = scope

          if (preset) {
            const opts = ['typescript', 'sass', 'eslint', 'i18n', 'pinia']
            if (preset.some(p => !opts.includes(p))) {
              return argvError(
                'Invalid preset specified: ' +
                  preset.join(', ') +
                  '. Allowed values are "typescript", "sass", "eslint", "i18n", "pinia".'
              )
            }

            if (preset.includes('eslint')) {
              scope.preset = preset.filter(p => p !== 'eslint')
              scope.preset.push('linting')
              scope.linter = 'eslint'
            }
          }
        } else {
          return argvError(
            'Invalid type specified: ' +
              type +
              '. Allowed values are "vite-3", "vite-2", "webpack-4".'
          )
        }
      }
    } else {
      return argvError(
        'Invalid template specified: ' +
          template +
          '. Allowed values are "app" and "ae".'
      )
    }
  }

  if (!scope.author) scope.author = await utils.getGitUser()

  const dir =
    positionals[0]?.trim() ||
    (scope.defaults && utils.definitions.projectFolder.default)

  if (dir) {
    scope.projectFolder = join(process.cwd(), dir)
    scope.projectFolderName = dir

    if (!scope.name) scope.name = utils.definitions.name.default(dir)
  }

  if (scope.name && !utils.definitions.name.isValid(scope.name)) {
    return argvError(
      'Invalid package name specified with --name: ' +
        scope.name +
        '. It must be a valid npm package name.'
    )
  }

  return scope
}

const argv = await getArgv()

if (argv.help) showHelp(argv.__warn)

const { createProjectFolder } = await import('./create-project-folder.js')
await createProjectFolder(argv)
