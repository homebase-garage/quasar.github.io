import { h } from 'vue'
import { QBadge } from 'quasar'

export default {
  name: '<%= scope.componentName %>',

  setup () {
    return () => h(QBadge, {
      class: '<%= scope.componentName %>',
      label: '<%= scope.componentName %>'
    })
  }
}
