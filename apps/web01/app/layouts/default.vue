<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <UMain class="flex-1">
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>
