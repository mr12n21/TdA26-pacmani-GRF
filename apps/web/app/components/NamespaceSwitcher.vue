<template>
  <USelectMenu
    v-if="!collapsed"
    v-model="selectedNamespace"
    :options="userStore.availableNamespaces"
    option-attribute="namespace.name"
    value-attribute="namespace.id"
    class="w-full"
    @update:model-value="handleSwitch"
  >
    <template #label>
      <div class="flex items-center gap-2 truncate">
        <UIcon name="i-heroicons-building-office" class="w-4 h-4 flex-shrink-0" />
        <span class="truncate">{{ userStore.activeNamespace?.name ?? 'Vyberte organizaci' }}</span>
      </div>
    </template>

    <template #option="{ option }">
      <div class="flex items-center gap-3 w-full">
        <div class="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ option.namespace.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ getRoleLabel(option.role) }}</p>
        </div>
        <UIcon
          v-if="option.namespace.id === userStore.activeNamespace?.id"
          name="i-heroicons-check"
          class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
        />
      </div>
    </template>
  </USelectMenu>

  <!-- Collapsed state - show icon button with tooltip -->
  <UTooltip v-else :text="userStore.activeNamespace?.name ?? 'Vyberte organizaci'">
    <UButton
      icon="i-heroicons-building-office"
      color="gray"
      variant="ghost"
      class="w-full justify-center"
      @click="navigateTo('/auth/select-namespace')"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import type { NamespaceMembership } from '~/types'

defineProps<{
  collapsed?: boolean
}>()

const userStore = useUserStore()
const selectedNamespace = ref(userStore.activeNamespace?.id)

// Watch for changes in active namespace
watch(() => userStore.activeNamespace?.id, (newId) => {
  selectedNamespace.value = newId
})

async function handleSwitch(namespaceId: string) {
  if (namespaceId === userStore.activeNamespace?.id) return
  
  try {
    await userStore.switchNamespace(namespaceId)
    // Reload page to refresh all namespace-scoped data
    window.location.reload()
  } catch (err) {
    console.error('Failed to switch namespace:', err)
  }
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    ORG_ADMIN: 'Správce',
    LECTURER: 'Lektor',
    STUDENT: 'Student'
  }
  return map[role] || role
}
</script>
