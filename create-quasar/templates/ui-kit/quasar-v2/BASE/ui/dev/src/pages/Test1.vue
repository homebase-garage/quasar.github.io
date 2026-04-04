<template>
  <q-page padding>
    <% if (scope.features.component) { %>
    <<%= scope.componentName %> />
    <% } %>
    <% if (scope.features.directive) { %>
    <div v-<%= scope.directiveName %> class="directive-target">
      x
    </div>
    <% } %>
  </q-page>
</template>

<style lang="sass" scoped>
.directive-target
  width: 50px
  height: 50px
</style>
