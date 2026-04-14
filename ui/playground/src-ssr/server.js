/**
 * More info about this file:
 * https://v2.quasar.dev/quasar-cli-vite/developing-ssr/ssr-webserver
 *
 * Runs in Node.js context.
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { lstatSync } from 'node:fs'
import {
  defineSsrClose,
  defineSsrCreate,
  defineSsrInjectDevMiddleware,
  defineSsrListen,
  defineSsrRenderPreloadTag,
  defineSsrServeStaticContent
} from '#q-app/wrappers'

export const create = defineSsrCreate(async (/* { ... } */) => {
  const app = new Hono()

  if (import.meta.env.QUASAR_PROD) {
    const { compress } = await import('hono/compress')
    app.use(compress())
  }

  return app
})

export const injectDevMiddleware = defineSsrInjectDevMiddleware(
  ({ app }) =>
    middleware => {
      app.use('*', async (c, next) => {
        const req = c.env.incoming
        const res = c.env.outgoing

        const passed = await new Promise(resolve => {
          middleware(req, res, () => resolve(true))
        })

        if (passed) {
          await next()
        }
      })
    }
)

export const listen = defineSsrListen(
  async ({ app, devHttpsOptions, port }) => {
    const opts = {
      fetch: app.fetch,
      port
    }

    if (import.meta.env.QUASAR_DEV && devHttpsOptions) {
      const { createServer } = await import('node:https')
      opts.createServer = createServer
      opts.serverOptions = { ...devHttpsOptions }
    } else {
      const { createServer } = await import('node:http')
      opts.createServer = createServer
    }

    return serve(opts, info => {
      if (import.meta.env.QUASAR_PROD) {
        console.log(`🚀 Server listening at port ${info.port}`)
      }
    })
  }
)

export const close = defineSsrClose(({ listenResult }) => listenResult.close())

const maxAge = import.meta.env.QUASAR_DEV ? 0 : 1000 * 60 * 60 * 24 * 30

export const serveStaticContent = defineSsrServeStaticContent(
  ({ app, resolve }) =>
    ({ urlPath, pathToServe, opts = {} }) => {
      const pubPath = resolve.public(pathToServe)
      const isDir = lstatSync(pubPath).isDirectory()

      const resolvedUrlPath = resolve.urlPath(urlPath)
      const routePath = isDir
        ? resolvedUrlPath.endsWith('*')
          ? resolvedUrlPath
          : `${resolvedUrlPath}*`
        : resolvedUrlPath

      const { maxAge: maxAgeOpt, ...serveOpts } = opts
      const cacheAge = maxAgeOpt !== void 0 ? maxAgeOpt : maxAge

      if (cacheAge > 0) {
        app.get(routePath, async (c, next) => {
          c.header('Cache-Control', `public, max-age=${cacheAge}`)
          await next()
        })
      }

      app.use(
        routePath,
        serveStatic({
          [isDir ? 'root' : 'path']: pubPath,
          ...serveOpts
        })
      )
    }
)

const jsRE = /\.js$/
const cssRE = /\.css$/
const woffRE = /\.woff$/
const woff2RE = /\.woff2$/
const gifRE = /\.gif$/
const jpgRE = /\.jpe?g$/
const pngRE = /\.png$/

export const renderPreloadTag = defineSsrRenderPreloadTag(
  (file /* , { ssrContext } */) => {
    if (jsRE.test(file)) {
      return `<link rel="modulepreload" href="${file}" crossorigin>`
    }

    if (cssRE.test(file)) {
      return `<link rel="stylesheet" href="${file}" crossorigin>`
    }

    if (woffRE.test(file)) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
    }

    if (woff2RE.test(file)) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
    }

    if (gifRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/gif" crossorigin>`
    }

    if (jpgRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/jpeg" crossorigin>`
    }

    if (pngRE.test(file)) {
      return `<link rel="preload" href="${file}" as="image" type="image/png" crossorigin>`
    }

    return ''
  }
)
