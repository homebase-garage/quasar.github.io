import { readFileSync } from 'node:fs'

import { getErrorDetails } from './error-details.js'
import { getStack } from './stack.js'
import { getEnv } from './env.js'

function readFile(target) {
  return readFileSync(
    new URL(`../compiled-assets/${target}-injection`, import.meta.url),
    'utf8'
  )
}

const before = readFile('before')
const after = readFile('after')

/**
 * @param {{
 *  err: Error;
 *  req: import('node:http').IncomingMessage | import('node:http2').Http2ServerRequest;
 *  projectRootFolder?: string;
 * }} params
 */
export default function renderSSRError({
  err,
  req,
  projectRootFolder = process.cwd()
}) {
  const data = {
    project: {
      rootFolder: projectRootFolder
    },
    error: getErrorDetails(err),
    stack: getStack(err, projectRootFolder),
    env: getEnv(req)
  }

  // Uncomment this to debug the data
  // writeFileSync(
  //   new URL('./data.json', import.meta.url), JSON.stringify(data, null, 2), 'utf8'
  // )

  return {
    statusCode: 500,

    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    },

    html:
      before +
      JSON.stringify(data).replaceAll('</script>', String.raw`<\/script>`) +
      after
  }
}
