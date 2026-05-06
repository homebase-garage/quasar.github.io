export async function createQuasarScript({ scope, utils }) {
  await utils.prompts(scope, [
    {
      type: 'select',
      name: 'engine',
      message: 'Pick Quasar App CLI variant:',
      initial: 0,
      choices: [
        {
          title: '@quasar/app-vite v3 beta',
          value: 'vite-3',
          description: 'recommended'
        },
        {
          title: '@quasar/app-vite v2',
          value: 'vite-2',
          description: 'deprecated'
        },
        {
          title: '@quasar/app-webpack v4',
          value: 'webpack-4',
          description: 'deprecated'
        }
      ]
    },
    {
      type: 'text',
      name: 'name',
      message: 'Package name:',
      initial: () => utils.inferPackageName(scope.projectFolderName),
      validate: val =>
        utils.isValidPackageName(val) || 'Invalid package.json name'
    },

    utils.commonPrompts.productName,
    utils.commonPrompts.description
  ])

  await utils.injectAuthor(scope)

  const { createQuasarScript: create } = await import(
    `./${scope.scriptType}-${scope.engine}/create-quasar-script.js`
  )
  await create({ scope, utils })
}
