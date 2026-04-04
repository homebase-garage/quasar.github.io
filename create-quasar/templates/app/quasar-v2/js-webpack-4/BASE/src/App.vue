<template>
  <router-view />
</template>
<% if (scope.sfcStyle === 'composition-setup') { %>
<script setup>
//
</script><% } else if (scope.sfcStyle === 'composition' || scope.sfcStyle === 'options') { %>
<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App'
});
</script><% } %>
