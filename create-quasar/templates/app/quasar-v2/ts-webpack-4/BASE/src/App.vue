<template>
  <router-view />
</template>
<% if (scope.sfcStyle === 'composition-setup') { %>
<script setup lang="ts">
//
</script><% } else if (scope.sfcStyle === 'composition' || scope.sfcStyle === 'options') { %>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App'
});
</script><% } %>
