export async function createQuasarScript({ scope, utils }) {
  await utils.promptUser(scope, {
    preset: () =>
      utils.prompts.multiselect({
        message: 'Check the features needed for your project:',
        initialValues: ['sass', 'eslint'],
        options: [
          {
            label: 'Typescript support',
            value: 'typescript'
          },
          {
            label: 'Sass CSS preprocessor',
            value: 'sass'
          },
          {
            label: 'Linting (ESLint)',
            value: 'eslint',
            hint: 'recommended'
          },
          {
            label: 'State Management (Pinia)',
            value: 'pinia',
            hint: 'https://pinia.vuejs.org'
          },
          {
            label: 'Internationalization (vue-i18n)',
            value: 'i18n',
            hint: 'https://vue-i18n.intlify.dev'
          }
        ]
      })
  })

  scope.preset = utils.convertArrayToObject(scope.preset)

  if (scope.preset.eslint) {
    await utils.promptUser(scope, {
      prettier: () =>
        utils.prompts.confirm({
          message: 'Add Prettier for code formatting?'
        })
    })
  } else {
    scope.prettier = false
  }

  const log = utils.prompts.taskLog({
    title: 'Scaffolding Quasar App...'
  })

  const dir = scope.preset.typescript ? 'ts' : 'js'
  utils.createTargetDir(scope)
  utils.renderTemplate(`${dir}/BASE`, scope)

  const css = scope.preset.sass ? 'sass' : 'css'
  utils.renderTemplate(`${dir}/${css}`, scope)

  if (scope.preset.i18n) utils.renderTemplate(`${dir}/i18n`, scope)
  if (scope.preset.eslint) {
    utils.renderTemplate(`${dir}/eslint`, scope)
  }
  if (scope.prettier) {
    utils.renderTemplate(`${dir}/prettier`, scope)
  }
  if (scope.preset.pinia) {
    utils.renderTemplate(`${dir}/pinia`, scope)
  }

  log.success('Quasar App scaffolded successfully!')
}
