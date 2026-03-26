<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <NuxtLink to="/" class="flex items-center gap-2.5 no-underline group">
    <img src="/brand/logos/logo-erb.svg" alt="TdA" class="h-9 w-9 group-hover:scale-105 transition-transform duration-200" :class="{ 'h-7 w-7': size === 'sm', 'h-11 w-11': size === 'lg' }">
    <span class="font-extrabold text-lg tracking-tight text-accent" :class="{ 'text-base': size === 'sm', 'text-xl': size === 'lg' }">
      Think different Academy
    </span>
  </NuxtLink>
</template>
