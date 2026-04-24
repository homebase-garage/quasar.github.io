export function quasarVitePluginElectronCSP(quasarConf) {
  const headTags = `<meta http-equiv="Content-Security-Policy" content="${quasarConf.electron.csp}">`

  return {
    name: 'quasar:electron-csp',
    enforce: 'pre',

    transformIndexHtml: {
      handler: html =>
        html.replace(/(<\/head>)/i, (_, tag) => `${headTags}${tag}`)
    }
  }
}
