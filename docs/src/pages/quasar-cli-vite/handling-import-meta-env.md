---
title: Handling import.meta.env
desc: (@quasar/app-vite) How to differentiate the runtime procedure based on import.meta.env in a Quasar app.
related:
  - /quasar-cli-vite/dotenv-files-support
---

Using `import.meta.env` can help you in many ways:

- differentiating runtime procedure depending on Quasar Mode (SPA/PWA/Cordova/Electron)
- differentiating runtime procedure depending if running a dev or production build
- adding flags to it based on terminal environment variables at build time

## Values provided by Quasar CLI

| `import.meta.env.<name>` | Type    | Meaning                                                                                      |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| `QUASAR_DEV`             | Boolean | Code runs in development mode                                                                |
| `QUASAR_PROD`            | Boolean | Code runs in production mode                                                                 |
| `QUASAR_DEBUG`           | Boolean | Code runs in development mode or `--debug` flag was set for production mode                  |
| `QUASAR_CLIENT`          | Boolean | Code runs on client (not on server)                                                          |
| `QUASAR_SERVER`          | Boolean | Code runs on server (not on client)                                                          |
| `QUASAR_MODE`            | String  | Quasar CLI mode (`spa`, `pwa`, ...)                                                          |
| `QUASAR_<MODE>_MODE`     | Boolean | Code runs in `<MODE>` Quasar mode. Example: QUASAR_ELECTRON_MODE                             |
| `QUASAR_TARGET`          | String  | Can be `ios` or `android` for Cordova/Capacitor modes and `chrome` or `firefox` for BEX mode |

## Example

```js
if (import.meta.env.QUASAR_DEV) {
  console.log(`I'm on a development build`)
}

// import.meta.env.MODE is the <mode> in
// "quasar dev/build -m <mode>"
// (defaults to 'spa' if -m parameter is not specified)

if (import.meta.env.QUASAR_MODE === 'electron') {
  // ...
}

// alternatively, use:
if (import.meta.env.QUASAR_ELECTRON_MODE) {
  // ...
}
```

## Stripping out code

When compiling your website/app, `if ()` branches depending on import.meta.env are evaluated, and if the expression is `false`, they get stripped out of the file. Example:

```js
if (import.meta.env.QUASAR_DEV) {
  console.log('dev')
} else {
  console.log('build')
}

// running with "quasar dev" will result in:
console.log('dev')
// while running with "quasar build" will result in:
console.log('build')
```

Notice above that the `if`s are evaluated and also completely stripped out at compile-time, resulting in a smaller bundle.

## Import based on import.meta.env

You can combine what you learned in the section above with dynamic imports:

```js
if (import.meta.env.QUASAR_MODE === 'electron') {
  import('my-fancy-npm-package').then(package => {
    // notice "default" below, which is the prop with which
    // you can access what your npm imported package exports
    package.default.doSomething()
  })
}

// alternatively:
if (import.meta.env.QUASAR_ELECTRON_MODE) {
  // ...
}
```

## Adding to import.meta.env

You can add your own definitions to `import.meta.env` through the `/quasar.config` file:

```ts /quasar.config file
build: {
  /**
   * Define global constant replacements. Entries will be defined as globals
   * during dev and statically replaced during build.
   *
   * This gets supplied to Vite's & Rolldown's own "define" option,
   * which in turn uses Oxc's "define" feature to perform replacements.
   *
   * All non-string values are automatically JSON.stringified by Quasar CLI.
   * This ensures consistency between Vite & Rolldown builds and avoids Rolldown to fail.
   *
   * @example { __APP_VERSION__: JSON.stringify('v1.0.0') }
   * @example { __API_URL__: 'window.__backend_api_url' }
   */
  define?: Record<
    string,
    string | number | boolean | undefined | null | any[] | Record<string, any>
  >;

  /**
   * Sugar for `define` option. Define global constant replacements that will
   * be automatically transformed into "define" entries with the `import.meta.env` prefix
   * and already JSON-stringified.
   *
   * @example { SOME_DEFINE: 'my-string' } will be transformed into { 'import.meta.env.SOME_DEFINE': '"my-string"' }
   * @example { VERSION: 22 } will be transformed into { 'import.meta.env.VERSION': '22' }
   */
  defineEnv?: Record<
    string,
    string | number | boolean | undefined | null | any[] | Record<string, any>
  >;
}
```

```js /quasar.config example
export default defineConfig(ctx => {
  return {
    // ...

    build: {
      // passing down to UI code from the quasar.config file
      define: {
        'import.meta.env.API': JSON.stringify(
          ctx.dev ? 'https://dev.api.com' : 'https://prod.api.com'
        ),
        'import.meta.env.VERSION': JSON.stringify(22)
      },

      // ALTERNATIVE using the sugar syntax of defineEnv:
      defineEnv: {
        API: ctx.dev ? 'https://dev.api.com' : 'https://prod.api.com',
        VERSION: 22
      }
    }
  }
})
```

Then, in your website/app, you can access `import.meta.env.API` and it will point to one of those two links above, depending on dev or production build type. The `import.meta.env.VERSION` will also be available.

::: tip
There is a fundamental difference between `build.define` and `build.defineEnv`. The build.defineEnv is syntax sugar over build.define:

- It automatically translates to build.define syntax, adding "import.meta.env." to the key prefix and JSON stringifies the value.
- The build.define can also be used to inject non "import.meta.env" definitions. Example:

<br>

```js
build: {
  define: {
    __APP_VERSION__: JSON.stringify('v1.0.0')
  }
}

// then use as __APP_VERSION__ directly
```

:::

You can even combine it with values from the `quasar dev/build` env variables:

```bash /.env
# we set an env variable in terminal
$ MY_API=api.com quasar build
```

```js /quasar.config file
// then we pick it up in the /quasar.config file
build: {
  defineEnv: {
    API: ctx.dev
      ? 'https://dev.' + import.meta.env.MY_API
      : 'https://prod.' + import.meta.env.MY_API
  }
}
```

## HTML Constant Replacement

Any properties in `import.meta.env` can be used in HTML files (like your `/index.html` file) with a special `%CONST_NAME%` syntax:

```html
<!-- the following will use import.meta.env.API -->
<div>The api is: %API%</div>
```

If the env doesn't exist in `import.meta.env`, e.g. `%NON_EXISTENT%`, it will be ignored and not replaced, unlike `import.meta.env.NON_EXISTENT` in JS where it's replaced as `undefined`.

## IntelliSense with Typescript

Quasar CLI takes into account process.env, [dotenv files](/quasar-cli-vite/dotenv-files-support) and /quasar.config > build.define & build.defineEnv to automatically inject the types for it. No `env.d.ts` needed in your project folder.

However, there are cases which are not auto-handled by Quasar CLI:

- Definitions coming from dotenv files used ONLY for the /quasar.config file itself, but not for your app also.
- Dynamic process.env variables. Say you have a /package.json script: "dev:xyz": "XYZ=true quasar dev"; if you only define XYZ for this specific call, then on the other calls without XYZ=true the Quasar CLI won't be able to know about a possible XYZ definition so it won't inject it.

For cases like above, you can define it yourself:

```ts Example: /env.d.ts
/**
 * Add types (that are not auto-magically added by Quasar CLI already)
 * for your custom variables to avoid TypeScript errors, like dynamic
 * process.env variables or definitions in dotenv files configured ONLY
 * for the /quasar.config file itself.
 *
 * @example
 * interface ImportMetaEnv {
 *   readonly MY_VAR: string;
 *   readonly MY_OTHER_VAR: string;
 * }
 */
interface ImportMetaEnv {}
```

## Wrong usage

You might be getting `X is undefined` errors in the browser console if you are accessing the variables in a wrong way or if you have a misconfiguration.

```js
// in /quasar.config file:
build: {
  defineEnv: {
    FOO: 'hello',
  }
}

// in your app:
console.log(import.meta.env.FOO) // ✅
console.log(import.meta.env.foo) // ❌ Case sensitive
console.log(import.meta.env.F0O) // ❌ Typo in the variable name (middle o is 0(zero))
console.log(import.meta.env.BAR) // ❌ It's not defined in config
```

For code in your `/src-ssr`, `/src-electron`, etc. (Quasar Mode folders) there are additional restrictions:

```js
const { FOO } = import.meta.env // ❌ It doesn't allow destructuring or similar
console.log(import.meta.env.FOO) // ✅ It can only replace direct usage like this

function getEnv(name) {
  return import.meta.env[name] // ❌ It can't analyze dynamic usage
}

console.log(import.meta.env) // ❌ It will output {}
```

## Other useful links

You might also want to check out the [Dotenv Files Support](/quasar-cli-vite/dotenv-files-support).
