import path from 'node:path'
import { pathToFileURL } from 'node:url'
import MagicString from 'magic-string'

const dirnameReplacement = '__quasar_inject_dirname__'
const filenameReplacement = '__quasar_inject_filename__'
const importMetaUrlReplacement = '__quasar_inject_import_meta_url__'

export const quasarRolldownInjectReplacementsDefine = {
  __dirname: dirnameReplacement,
  __filename: filenameReplacement,
  'import.meta.url': importMetaUrlReplacement
}

const fileRE = /\.[cm]?[jt]s$/

export function quasarRolldownInjectReplacementsPlugin() {
  return {
    name: 'quasar:inject-replacements',

    transform(code, id) {
      if (fileRE.test(id) === false) return null

      const prefix =
        `const ${dirnameReplacement} = ${JSON.stringify(path.dirname(id))};\n` +
        `const ${filenameReplacement} = ${JSON.stringify(id)};\n` +
        `const ${importMetaUrlReplacement} = ${JSON.stringify(pathToFileURL(id).href)};\n`

      const s = new MagicString(code)
      s.prepend(prefix)

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, hires: true })
      }
    }
  }
}
