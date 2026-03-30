import parseArgs from 'minimist'

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    p: 'port',
    H: 'hostname',
    s: 'silent',
    colors: 'colors',
    cors: 'cors',
    o: 'open',
    i: 'index',
    sw: 'sw',
    history: 'history',
    https: 'https',
    C: 'cert',
    K: 'key',
    P: 'proxy',
    h: 'help'
  },
  boolean: ['https', 'colors', 'history', 'https', 'cors'],
  string: ['H', 'C', 'K', 'i', 'sw'],
  default: {
    p: process.env.PORT || 4000,
    H: process.env.HOSTNAME || '0.0.0.0',
    i: 'index.html',
    colors: true
  }
})

if (argv.help) {
  console.log(`
  Description
    Start a HTTP(S) server on a folder.

  Usage
    $ quasar serve [path]
    $ quasar serve . # serve current folder

    If you serve a SSR folder built with the CLI then
    control is yielded to /index.js and params have no effect.

  Options
    --port, -p              Port to use (default: 4000)
    --hostname, -H          Address to use (default: 0.0.0.0)
    --silent, -s            Suppress log message
    --colors                Log messages with colors (default: true)
    --cors                  Enable CORS
    --open, -o              Open browser window after starting

    --sw <path>             Service worker url path (default: sw.js)
    --index, -i <path>      Index url path (default: index.html)
    --history               Use history mode;
                              All requests fallback to /index.html,
                              unless using "--index" parameter
                              (default: false)

    --https                 Enable HTTPS
    --cert, -C [path]       Path to SSL cert file (Optional)
    --key, -K [path]        Path to SSL key file (Optional)

    --help, -h              Displays this message

  Proxy file example
    export default [
      {
        path: '/api',
        rule: { target: 'http://www.example.org' }
      }
    ]
    --> will be transformed into app.use(path, httpProxyMiddleware(rule))
  `)
  process.exit(0)
}

import { existsSync } from 'node:fs'
import { stat, readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'

import { cliPkg } from '../cli-pkg.js'
import { log, fatal } from '../logger.js'
import { defineEventHandler } from 'h3'

const root = getAbsolutePath(argv._[0] || '.')
const resolve = p => join(root, p)

function getAbsolutePath(pathParam) {
  return isAbsolute(pathParam) ? pathParam : join(process.cwd(), pathParam)
}

if (!argv.colors) {
  process.env.FORCE_COLOR = '0'
}

const { green, gray, red } = await import('kolorist')
const { H3, serve, serveStatic, onResponse, onError } = await import('h3')

const app = new H3()

if (argv.cors) {
  const { handleCors } = await import('h3')
  app.use(
    defineEventHandler(event => {
      handleCors(event, {
        origin: '*',
        preflight: {
          statusCode: 204
        },
        methods: '*'
      })
    })
  )
}

if (!argv.silent) {
  app.use(
    onResponse((response, event) => {
      console.log(
        `${green(`[${event.req.method}]`)} ${event.url.pathname} ${green(response.status)} ${gray('[' + event.req.ip + ']')} ${new Date()}`
      )
    })
  )

  app.use(
    onError((error, event) => {
      console.log(
        `${red(`[${event.req.method}]`)} ${event.url.pathname} ${red(`!! ${error.message}`)} ${gray('[' + event.req.ip + ']')} ${new Date()}`
      )
    })
  )
}

const swFile = resolve(argv.sw || 'sw.js')
if (!existsSync(swFile)) {
  if (argv.sw) {
    fatal(`Service worker file not found: ${swFile}`)
  }
} else {
  const swFileContent = await readFile(swFile, 'utf-8')

  app.use(event => {
    if (event.req.method !== 'GET') return
    if (event.url.pathname !== `/${argv.sw}`) return

    event.res.status = 200
    event.res.statusText = 'OK'
    event.res.headers.set('Content-Type', 'application/javascript')

    return swFileContent
  })
}

if (argv.proxy) {
  let file = (argv.proxy = getAbsolutePath(argv.proxy))
  if (!existsSync(file)) {
    fatal(`Proxy definition file not found: ${file}`)
  }

  file = await import(file)

  const { fromNodeMiddleware } = await import('h3')
  const { createProxyMiddleware } = await import('http-proxy-middleware')

  ;(file.default || file).forEach(entry => {
    app.use(entry.path, fromNodeMiddleware(createProxyMiddleware(entry.rule)))
  })
}

if (argv.history) {
  const indexFile = resolve(argv.index)
  if (!existsSync(indexFile)) {
    fatal(`Index file not found: ${indexFile}`)
  }

  const indexFileContent = await readFile(indexFile, 'utf-8')

  app.use(event => {
    if (event.req.method !== 'GET') return

    const acceptHeader = event.req.headers.get('Accept')
    if (!acceptHeader?.includes('text/html')) return
    if (existsSync(resolve(event.url.pathname))) return

    event.res.status = 200
    event.res.statusText = 'OK'
    event.res.headers.set('Content-Type', 'text/html')

    return indexFileContent
  })
}

app.use(event =>
  serveStatic(event, {
    indexNames: [`${argv.index.startsWith('/') ? '' : '/'}${argv.index}`],
    encodings: argv.gzip ? { gzip: '.gz', br: '.br' } : {},
    getContents: id => readFile(resolve(id)),
    getMeta: async id => {
      const stats = await stat(resolve(id)).catch(() => {})
      if (stats?.isFile()) {
        return {
          size: stats.size,
          mtime: stats.mtimeMs
        }
      }
    }
  })
)

const getListeningUrl = hostname =>
  `http${argv.https ? 's' : ''}://${hostname}:${argv.port}`

const { getIPs } = await import('../net.js')

const getListeningBanner = () => {
  let { hostname } = argv

  if (hostname === '0.0.0.0') {
    const acc = getIPs().map(ip => ['', getListeningUrl(ip)])
    if (acc.length !== 0) {
      acc[0][0] = 'URLs in use'
      return acc
    }

    hostname = 'localhost'
  }

  return [['URL in use', getListeningUrl(hostname)]]
}

const getHttpOptions = async () => {
  if (!argv.https) {
    return {
      protocol: 'http'
    }
  }

  let fakeCert, key, cert

  if (argv.key && argv.cert) {
    key = getAbsolutePath(argv.key)
    cert = getAbsolutePath(argv.cert)

    if (existsSync(key)) {
      key = await readFile(key)
    } else {
      fatal(`SSL key file not found: ${key}`)
    }

    if (existsSync(cert)) {
      cert = await readFile(cert)
    } else {
      fatal(`SSL cert file not found: ${cert}`)
    }
  } else {
    const { getCertificate } = await import('@quasar/ssl-certificate')
    fakeCert = await getCertificate({ log, fatal })
  }

  return {
    protocol: 'https',
    tls: {
      key: key || fakeCert,
      cert: cert || fakeCert
    }
  }
}

const server = serve(app, {
  port: argv.port,
  hostname: argv.hostname,
  ...(await getHttpOptions())
})

await server.ready()

const filler = ''.padEnd(20, ' ')
const info = [
  ['Quasar CLI', `v${cliPkg.version}`],
  ...getListeningBanner(),
  ['Web server root', root],
  argv.https ? ['HTTPS', 'enabled'] : '',
  ['Index file', argv.index],
  argv.history ? ['History mode', 'enabled'] : '',
  argv.cors ? ['CORS', 'enabled'] : '',
  argv.proxy ? ['Proxy definitions', argv.proxy] : ''
]
  .filter(msg => msg)
  .map(
    msg =>
      ' ' +
      (msg[0] !== '' ? msg[0].padEnd(20, '.') : filler) +
      ' ' +
      green(msg[1])
  )

console.log('\n' + info.join('\n') + '\n')

if (argv.open) {
  const { isMinimalTerminal } = await import('../is-minimal-terminal.js')
  if (!isMinimalTerminal) {
    const { default: open } = await import('open')
    open(getListeningUrl(argv.hostname), { url: true })
  }
}
