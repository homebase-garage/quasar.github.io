<template>
  <q-card flat bordered>
    <doc-code lang="markup" :code="rawVariables" />
  </q-card>
</template>

<script setup>
import DocCode from '@/components/DocCode.vue'
import rawVariables from 'quasar/src/css/variables.sass?raw'
</script>
