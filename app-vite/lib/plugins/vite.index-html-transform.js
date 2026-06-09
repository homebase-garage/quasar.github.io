import { transformHtml } from '../utils/html-template.js'

/* Exporting for SSR because it is needed there */
export const htmlStore = {}

const importMetaEnv = new Proxy(
  {},
  {
    get(target, propName, receiver) {
      if (typeof propName !== 'string' || Object.hasOwn(target, propName)) {
        return Reflect.get(target, propName, receiver)
      }

      const key = `import.meta.env.${propName}`
      const { define, clientEnvDefineList, backendEnvDefineList } = htmlStore

      if (Object.hasOwn(define, key)) {
        const val = define[key]
        return val.charAt(0) === '"' ? val.slice(1, -1) : val
      }

      if (Object.hasOwn(clientEnvDefineList, key)) {
        const val = clientEnvDefineList[key]
        return val.charAt(0) === '"' ? val.slice(1, -1) : val
      }

      if (Object.hasOwn(backendEnvDefineList, key)) {
        const val = backendEnvDefineList[key]
        return val.charAt(0) === '"' ? val.slice(1, -1) : val
      }
    }
  }
)

export function updateHtmlVariables(
  {
    htmlVariables,
    build: { define },
    metaConf: { clientEnvDefineList, backendEnvDefineList }
  },
  viteClientServer,
  onBeforeReload
) {
  Object.assign(htmlStore, {
    define,
    clientEnvDefineList,
    backendEnvDefineList,
    htmlVariables: {
      ...htmlVariables,
      importMetaEnv
    }
  })

  onBeforeReload?.(htmlStore)
  viteClientServer?.ws.send({ type: 'full-reload' })
}

export function quasarViteIndexHtmlTransformPlugin(quasarConf) {
  /**
   * The following is mainly for production so we don't have
   * to worry about calling updateHtmlVariables():
   */
  if (Object.keys(htmlStore).length === 0) updateHtmlVariables(quasarConf)

  return {
    name: 'quasar:index-html-transform',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler: html => transformHtml(html, htmlStore.htmlVariables, quasarConf)
    }
  }
}
