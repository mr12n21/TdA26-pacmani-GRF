<template>
  <div class="space-y-2">
    <USelectMenu
      v-if="!collapsed"
      v-model="selectedNamespaceId"
      :options="namespaceOptions"
      option-attribute="label"
      value-attribute="value"
      class="w-full"
      placeholder="Vyberte organizaci"
      @update:model-value="handleSwitch"
    >
      <template #label>
        <div class="flex items-center gap-2 truncate">
          <UIcon name="i-heroicons-building-office" class="w-4 h-4 flex-shrink-0" />
          <span class="truncate">{{ activeLabel }}</span>
        </div>
      </template>

      <template #option="{ option }">
        <div class="flex items-center gap-3 w-full">
          <div class="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ option.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.roleLabel }}</p>
          </div>
          <UIcon
            v-if="option.value === userStore.activeNamespace?.id"
            name="i-heroicons-check"
            class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
          />
        </div>
      </template>
    </USelectMenu>

    <NuxtLink
      v-if="!collapsed"
      to="/dashboard/organizations"
      class="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-muted)] hover:text-[var(--ui-text)] transition-colors"
    >
      <UIcon name="i-lucide-building-2" class="w-3.5 h-3.5" />
      Správa organizací a členství
    </NuxtLink>

    <UTooltip v-else :text="activeLabel">
      <UButton
        icon="i-heroicons-building-office"
        color="gray"
        variant="ghost"
        class="w-full justify-center"
        @click="navigateTo('/dashboard/organizations')"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const userStore = useUserStore()
const namespaceOptions = computed(() =>
  userStore.availableNamespaces.map(membership => ({
    label: membership.namespace.name,
    value: membership.namespace.id,
    roleLabel: getRoleLabel(membership.role),
  }))
)

const selectedNamespaceId = ref(userStore.activeNamespace?.id)
const activeLabel = computed(() => userStore.activeNamespace?.name ?? 'Vyberte organizaci')

// Watch for changes in active namespace
watch(() => userStore.activeNamespace?.id, (newId) => {
  selectedNamespaceId.value = newId
})

async function handleSwitch(namespaceId?: string | null) {
  if (!namespaceId || namespaceId === userStore.activeNamespace?.id) return

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
