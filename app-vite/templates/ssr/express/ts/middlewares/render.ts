import { defineSsrMiddleware } from '#q-app/wrappers'
import type { RenderError } from '#q-app'

/**
 * This middleware should execute as last one
 * since it captures everything and tries to
 * render the page with Vue
 */

export default defineSsrMiddleware(({ app, resolve, render, serve }) => {
  /**
   * We capture any other Express route and hand it
   * over to Vue and Vue Router to render our page
   */
  app.get(resolve.urlPath('{*path}'), async (req, res) => {
    res.setHeader('Content-Type', 'text/html')

    try {
      // We hand over to Vue to render our page
      const html = await render(/* the ssrContext: */ { req, res })
      res.send(html)
    }
    catch(err: unknown) {
      const renderError = err as RenderError & Error

      if (renderError.url) {
        // We were told to redirect to another URL
        const redirectCode = renderError.code || 302
        res.redirect(redirectCode, renderError.url)
      } else if (renderError.code === 404) {
        /**
         * Hmm, Vue Router could not find the requested route
         * and it does not have a "catch-all" route
         */
        res.status(404).send('404 | Page Not Found')
      } else if (import.meta.env.QUASAR_DEV) {
        /**
         * Well, we treat any other code as error;
         * if we're in dev mode, then we can use Quasar CLI
         * to display a nice error page that contains the stack
         * and other useful information
         *
         * Note that serve.error is available on dev only
         */
        const { errorHeaders, errorHtml } = serve.error({ renderError, req })
        res.set(errorHeaders).status(500).send(errorHtml)
      } else {
        if (import.meta.env.QUASAR_DEBUG) {
          console.error(renderError.stack)
        }

        /**
         * Render Error Page on production or
         * alternatively, create a route (/src/routes) for an error page and redirect to it
         * (just make sure that route won't crash too, otherwise you'll end up in an infinite loop)
         */
        res.status(500).send('500 | Internal Server Error')
      }
    }
  })
})
