<script setup lang="ts">
const route = useRoute()
const userStore = useUserStore()

const navItems = computed(() => [
  { label: 'Kurzy', to: '/courses', active: route.path.startsWith('/courses') },
  { label: 'O nás', to: '/about' },
  { label: 'FAQ', to: '/faq' }
])
</script>

<template>
  <UHeader :ui="{ root: 'backdrop-blur-md bg-default/80 border-b border-default' }">
    <template #left>
      <AppLogo />
    </template>

    <UNavigationMenu :items="navItems" variant="link" />

    <template #right>
      <UColorModeButton />

      <template v-if="userStore.isAuthenticated">
        <UButton
          label="Dashboard"
          icon="i-lucide-layout-dashboard"
          color="primary"
          variant="subtle"
          to="/dashboard"
          class="hidden lg:inline-flex"
        />
        <UButton
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          @click="userStore.logout()"
        />
      </template>

      <template v-else>
        <UButton
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
          to="/login"
          class="lg:hidden"
        />
        <UButton
          label="Přihlásit se"
          color="neutral"
          variant="outline"
          to="/login"
          class="hidden lg:inline-flex"
        />
        <UButton
          label="Registrace"
          color="primary"
          to="/signup"
          class="hidden lg:inline-flex"
        />
      </template>
    </template>

    <template #body>
      <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />

      <div class="gradient-divider my-6" />

      <template v-if="userStore.isAuthenticated">
        <UButton label="Dashboard" color="primary" to="/dashboard" block class="mb-3" />
        <UButton label="Odhlásit se" color="neutral" variant="subtle" block @click="userStore.logout()" />
      </template>
      <template v-else>
        <UButton label="Přihlásit se" color="neutral" variant="subtle" to="/login" block class="mb-3" />
        <UButton label="Registrace" color="primary" to="/signup" block />
      </template>
    </template>
  </UHeader>

  <!-- Gradient line under header -->
  <div class="gradient-divider" />
</template>
