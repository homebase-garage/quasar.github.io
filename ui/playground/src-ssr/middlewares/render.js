import { defineSsrMiddleware } from '#q-app/wrappers'

// This middleware should execute as last one
// since it captures everything and tries to
// render the page with Vue

export default defineSsrMiddleware(({ app, resolve, render, serve }) => {
  app.get(resolve.urlPath('/*'), async c => {
    const req = c.env?.incoming
    const res = c.env?.outgoing

    try {
      const html = await render({ req, res })
      return c.html(html)
    } catch (err) {
      // oops, we had an error while rendering the page
      // we were told to redirect to another URL
      if (err.url) {
        const redirectCode = err.code || 302
        return c.redirect(err.url, redirectCode)
      }

      // hmm, Vue Router could not find the requested route
      if (err.code === 404) {
        c.status(404)
        return c.text('404 | Page Not Found')
      }

      if (import.meta.env.QUASAR_DEV) {
        const { html, headers } = serve.error({ err, req })
        return c.html(html, 500, headers)
      }

      if (import.meta.env.QUASAR_DEBUG) {
        console.error(err.stack)
      }

      return c.text('500 | Internal Server Error', 500)
    }
  })
})
