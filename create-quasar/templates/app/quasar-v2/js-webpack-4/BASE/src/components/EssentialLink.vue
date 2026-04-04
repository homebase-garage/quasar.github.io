<template>
  <q-item
    clickable
    tag="a"
    target="_blank"
    :href="<% if (scope.sfcStyle === 'composition-setup') { %>props.<% } %>link"
  >
    <q-item-section
      v-if="<% if (scope.sfcStyle === 'composition-setup') { %>props.<% } %>icon"
      avatar
    >
      <q-icon :name="<% if (scope.sfcStyle === 'composition-setup') { %>props.<% } %>icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ <% if (scope.sfcStyle === 'composition-setup') { %>props.<% } %>title }}</q-item-label>
      <q-item-label caption>{{ <% if (scope.sfcStyle === 'composition-setup') { %>props.<% } %>caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>
<% if (scope.sfcStyle === 'composition-setup') { %>
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  },

  caption: {
    type: String,
    default: ''
  },

  link: {
    type: String,
    default: '#'
  },

  icon: {
    type: String,
    default: ''
  }
})
</script><% } else if (scope.sfcStyle === 'composition' || scope.sfcStyle === 'options') { %>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EssentialLink',
  props: {
    title: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      default: ''
    },

    link: {
      type: String,
      default: '#'
    },

    icon: {
      type: String,
      default: ''
    }
  }
})
</script><% } %>
