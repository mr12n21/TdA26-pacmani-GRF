<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const userStore = useUserStore()

const items = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: userStore.user?.name || 'Uživatel',
  avatar: {
    icon: 'i-lucide-user'
  }
}], [{
  label: 'Nastavení',
  icon: 'i-lucide-settings',
  to: '/dashboard/statistics'
}], [{
  label: colorMode.value === 'dark' ? 'Světlý režim' : 'Tmavý režim',
  icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
  onSelect: (e: Event) => {
    e.preventDefault()
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
}], [{
  label: 'Odhlásit se',
  icon: 'i-lucide-log-out',
  onSelect: () => {
    userStore.logout()
  }
}]])
</script>

<template>
  <UDropdownMenu :items="items" :ui="{ content: 'w-48' }">
    <UButton
      :label="collapsed ? undefined : (userStore.user?.name || 'Uživatel')"
      :icon="collapsed ? 'i-lucide-user' : undefined"
      color="neutral"
      variant="ghost"
      block
      :class="collapsed ? 'justify-center' : 'justify-start'"
    >
      <template v-if="!collapsed" #leading>
        <UAvatar :alt="userStore.user?.name || 'U'" icon="i-lucide-user" size="2xs" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
