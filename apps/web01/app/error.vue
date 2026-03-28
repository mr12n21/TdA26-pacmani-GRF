<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps({
  error: {
    type: Object as PropType<NuxtError>,
    required: true
  }
})

useSeoMeta({
  title: 'Stránka nenalezena',
  description: 'Tato stránka neexistuje.'
})
</script>

<template>
  <div>
    <AppHeader />
    <UMain>
      <UContainer>
        <UPage>
          <UError :error="error" />
        </UPage>
      </UContainer>
    </UMain>
    <AppFooter />
  </div>
</template>
