import parseArgs from 'minimist'

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    p: 'port',
    H: 'hostname',
    s: 'silent',
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
  boolean: ['https', 'history', 'https', 'cors'],
  string: ['H', 'C', 'K', 'i'],
  default: {
    p: process.env.PORT || 4000,
    H: process.env.HOSTNAME || '0.0.0.0',
    i: 'index.html'
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
    --cors                  Enable CORS
    --open, -o              Open browser window after starting

    --index, -i <path>      Index url path (default: index.html)
    --history               Use history mode;
                              All requests fallback to /index.html,
                              or whatever "--index" parameter specifies
                              (default: false)

    --https                 Enable HTTPS
    --cert, -C [path]       Path to SSL cert file (Optional)
    --key, -K [path]        Path to SSL key file (Optional)

    --nocolor               Disable colored output
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
import { readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'

import { cliPkg } from '../cli-pkg.js'
import { log, fatal } from '../logger.js'

const root = getAbsolutePath(argv._[0] || '.')
const resolve = path => join(root, path)

function getAbsolutePath(pathParam) {
  return isAbsolute(pathParam) ? pathParam : join(process.cwd(), pathParam)
}

const { green, gray, red } = await import('kolorist')
const { Hono } = await import('hono')

const app = new Hono()

if (argv.cors) {
  const { cors } = await import('hono/cors')

  app.use(
    '/*',
    cors({
      origin: '*',
      allowMethods: ['*'] // Allows all methods
    })
  )
}

if (!argv.silent) {
  app.use('*', async (c, next) => {
    await next()

    const ip =
      c.env?.incoming?.socket?.remoteAddress ||
      c.req.header('x-forwarded-for') ||
      'unknown'

    if (c.res.status >= 200 && c.res.status < 300) {
      console.log(
        `${green(`[${c.req.method}]`)} ${c.req.path} ${green(c.res.status)} ${gray('[' + ip + ']')} ${new Date()}`
      )
    } else {
      console.log(
        `${red(`[${c.req.method}]`)} ${c.req.path} ${red(`!! ${c.res.status}`)} ${gray('[' + ip + ']')} ${new Date()}`
      )
    }
  })
}

if (argv.proxy) {
  let file = (argv.proxy = getAbsolutePath(argv.proxy))
  if (!existsSync(file)) {
    fatal(`Proxy definition file not found: ${file}`)
  }

  // Import the config file and proxy middleware
  file = await import(file)
  const { createProxyMiddleware } = await import('http-proxy-middleware')

  const proxyEntries = file.default || file

  proxyEntries.forEach(entry => {
    const proxyFn = createProxyMiddleware(entry.rule)

    // Wrap the Node.js middleware for Hono
    // Note: Hono requires a wildcard to prefix-match. e.g., '/api/*' instead of '/api'
    const routePath = entry.path.endsWith('/*') ? entry.path : `${entry.path}/*`

    app.use(
      routePath,
      (c, next) =>
        new Promise((resolveEntry, rejectEntry) => {
          // Pass the raw Node.js req/res objects to http-proxy-middleware
          proxyFn(c.env.incoming, c.env.outgoing, err => {
            if (err) {
              return rejectEntry(err)
            }
            // If the proxy middleware skips/falls through, continue Hono's chain
            resolveEntry(next())
          })
        })
    )
  })
}

if (argv.history) {
  const indexFile = resolve(argv.index)
  if (!existsSync(indexFile)) {
    fatal(`Index file not found: ${indexFile}`)
  }

  const indexFileContent = await readFile(indexFile, 'utf8')

  app.use('*', async (c, next) => {
    if (c.req.method !== 'GET') {
      return await next()
    }

    const acceptHeader = c.req.header('Accept')
    if (!acceptHeader?.includes('text/html')) {
      return await next()
    }

    const requestedFile = resolve('.' + c.req.path)
    if (existsSync(requestedFile)) {
      return await next()
    }

    return c.html(indexFileContent)
  })
}

import { serveStatic } from '@hono/node-server/serve-static'
const indexFile = argv.index.startsWith('/') ? argv.index.slice(1) : argv.index

app.use(
  '/*',
  serveStatic({
    root,
    index: indexFile,
    precompressed: true
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
    const { createServer } = await import('node:http')
    return {
      createServer,
      serverOptions: {
        keepAlive: true,
        keepAliveTimeout: 5000
      }
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

  const { createServer } = await import('node:http2')

  return {
    createServer,
    serverOptions: {
      keepAlive: true,
      keepAliveTimeout: 5000,
      key: key || fakeCert,
      cert: cert || fakeCert
    }
  }
}

import { serve } from '@hono/node-server'

const server = serve({
  fetch: app.fetch,
  port: argv.port,
  hostname: argv.hostname,
  ...(await getHttpOptions())
})

// graceful shutdown
process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})
process.on('SIGTERM', () => {
  server.close(err => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})

await new Promise((resolveListen, rejectListen) => {
  server.once('listening', resolveListen)
  server.once('error', rejectListen)
})

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
  .filter(Boolean)
  .map(
    msg =>
      ' ' +
      (msg[0] !== '' ? msg[0].padEnd(20, '.') : filler) +
      ' ' +
      green(msg[1])
  )

console.log('\n' + info.join('\n') + '\n')

if (argv.open) {
  const { isMinimalTerminal } = await import('../is-terminal.js')
  if (!isMinimalTerminal) {
    const url = getListeningUrl(
      argv.hostname === '0.0.0.0' ? 'localhost' : argv.hostname
    )

    log('Opening default browser at ' + url + '\n')
    const { default: open } = await import('open')

    // oxlint-disable-next-line unicorn/prefer-top-level-await
    open(url).catch(() => {
      warn('Failed to open default browser')
      warn()
    })
  }
}
