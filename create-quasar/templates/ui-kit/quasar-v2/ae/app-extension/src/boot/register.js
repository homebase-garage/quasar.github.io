import { boot } from 'quasar/wrappers'
import VuePlugin from 'quasar-ui-<%= scope.name %>'

export default boot(({ app }) => {
  app.use(VuePlugin)
})
