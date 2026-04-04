<template>
  <q-page class="flex flex-center">
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    >
  </q-page>
</template>
<% if (scope.sfcStyle === 'composition-setup') { %>
<script setup>
//
</script><% } else if (scope.sfcStyle === 'composition' || scope.sfcStyle === 'options') { %>
<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'IndexPage'
});
</script><% } %>
