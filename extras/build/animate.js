const packageName = 'animate.css'

// ------------

const { globSync } = require('tinyglobby')
const { copySync } = require('fs-extra')
const { writeFileSync } = require('node:fs')
const { join, resolve, basename } = require('node:path')

const dist = resolve(__dirname, '../animate')

const pkgFolder = resolve(__dirname, `../node_modules/${packageName}/`)
const cssFiles = globSync(pkgFolder + '/source/*/*.css')
const cssNames = new Set()

const inAnimations = []
const outAnimations = []
const generalAnimations = []

function extract(file) {
  const name = basename(file).match(/(.*)\.css/)[1]

  if (cssNames.has(name)) return

  copySync(file, join(dist, name + '.css'))
  cssNames.add(name)

  if (name.includes('In')) {
    inAnimations.push(name)
  } else if (name.includes('Out')) {
    outAnimations.push(name)
  } else {
    generalAnimations.push(name)
  }
}

function getList(prefix) {
  return `
${prefix}generalAnimations = ${JSON.stringify(generalAnimations, null, 2)}

${prefix}inAnimations = ${JSON.stringify(inAnimations, null, 2)}

${prefix}outAnimations = ${JSON.stringify(outAnimations, null, 2)}
`.replaceAll('"', "'")
}

if (cssFiles.length === 0) {
  console.log('WARNING. Animate.css skipped completely')
} else {
  cssFiles.forEach(file => {
    extract(file)
  })

  generalAnimations.sort()
  inAnimations.sort()
  outAnimations.sort()

  copySync(join(pkgFolder, 'LICENSE'), join(dist, 'LICENSE'))

  const common = getList('module.exports.')

  writeFileSync(join(dist, 'animate-list.js'), common, 'utf8')
  writeFileSync(
    join(dist, 'animate-list.mjs'),
    getList('export const '),
    'utf8'
  )
  writeFileSync(join(dist, 'animate-list.common.js'), common, 'utf8')

  writeFileSync(
    join(dist, 'animate-list.d.ts'),
    getList('export type ')
      .replaceAll('[', '')
      .replaceAll(']', ';')
      .replaceAll(/ {2}'/g, "  | '")
      .replaceAll(',', ''),
    'utf8'
  )
  writeFileSync(
    join(dist, 'animate-list.common.d.ts'),
    getList('export type ')
      .replaceAll('[', '')
      .replaceAll(']', ';')
      .replaceAll(/ {2}'/g, "  | '")
      .replaceAll(',', ''),
    'utf8'
  )
}
