# <%= scope.productName %> (<%= scope.name %>)

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```
<% if (scope.linter === 'oxlint') { %>

### Format & Lint the files

```bash
pnpm run lint
# or yarn/npm/bun run lint
```

...or just check formatting & linting:

```bash
pnpm run lint:check
# or yarn/npm/bun run lint:check
```
<% } else if (scope.linter === 'eslint') { %>

### Lint the files

```bash
pnpm run lint
# or yarn/npm/bun run lint
```

### Format the files

```bash
pnpm run format
# or yarn/npm/bun run format
```
<% } %>

### Build the app for production

```bash
quasar build
```

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
