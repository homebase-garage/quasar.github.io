function parsePackageName(name) {
  const scopedPackageRegex = /^(@[^/]+)\/([^/]+)$/
  const match = name
    .replace(/quasar-app-extension-/, '')
    .match(scopedPackageRegex)

  return match ? { org: match[1] + '/', name: match[2] } : { org: '', name }
}

export async function createQuasarScript({ scope, utils }) {
  await utils.prompts(scope, [
    {
      type: 'text',
      name: 'name',
      message:
        'AE ext-id (w/out "quasar-app-extension" in it), eg. "my-ext", "@my-org/my-ext":',
      validate: val =>
        utils.isValidPackageName(val) || 'Invalid App Extension name'
    },

    utils.commonPrompts.description
  ])

  await utils.injectAuthor(scope)

  await utils.prompts(scope, [
    {
      type: 'multiselect',
      name: 'preset',
      message: 'Pick features:',
      choices: [
        {
          title: 'Prompts script',
          value: 'prompts',
          selected: true
        },
        {
          title: 'Install script',
          value: 'install',
          selected: true
        },
        {
          title: 'Uninstall script',
          value: 'uninstall',
          selected: true
        },
        {
          title: 'Lint (oxlint) + Formatter (oxfmt)',
          value: 'oxlint',
          selected: true
        }
      ],
      format: utils.convertArrayToObject
    },

    utils.commonPrompts.scriptType
  ])

  const dir = `./ae-${scope.scriptType}`
  const { org, name } = parsePackageName(scope.name)
  scope.aeShortName = `${org}${name}`
  scope.aeFullName = `${org}quasar-app-extension-${name}`
  scope.linter = scope.preset.oxlint ? 'oxlint' : null

  utils.createTargetDir(scope)
  utils.renderTemplate(`${dir}/BASE`, scope)

  if (scope.preset.prompts) utils.renderTemplate(`${dir}/prompts`, scope)
  if (scope.preset.install) utils.renderTemplate(`${dir}/install`, scope)
  if (scope.preset.uninstall) utils.renderTemplate(`${dir}/uninstall`, scope)

  if (scope.preset.oxlint) utils.renderTemplate(`${dir}/oxlint`, scope)
}
