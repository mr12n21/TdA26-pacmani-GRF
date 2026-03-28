<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
    <div class="max-w-5xl w-full">
      <div class="text-center mb-10">
        <img src="/brand/logos/logo-erb.svg" alt="TdA" class="h-16 w-16 mx-auto mb-4" />
        <h1 class="text-4xl font-bold mb-3">Vyberte organizaci</h1>
        <p class="text-gray-600 dark:text-gray-400 text-lg">
          Jste členem více organizací. Vyberte si, se kterou chcete pracovat.
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <UIcon name="i-svg-spinners-pulse-3" class="w-12 h-12 mx-auto text-primary-500" />
        <p class="mt-4 text-gray-600 dark:text-gray-400">Načítám organizace...</p>
      </div>

      <!-- Namespace Cards Grid -->
      <div v-else-if="userStore.availableNamespaces.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          v-for="membership in userStore.availableNamespaces"
          :key="membership.namespace.id"
          @click="selectNamespace(membership.namespace)"
          class="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 p-6 text-left transition-all hover:shadow-xl transform hover:-translate-y-1 duration-200"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
              <UIcon name="i-heroicons-building-office" class="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <UBadge
              :color="getRoleColor(membership.member.role)"
              :label="getRoleLabel(membership.member.role)"
              size="md"
            />
          </div>
          
          <h3 class="text-xl font-bold mb-2">
            {{ membership.namespace.name }}
          </h3>
          
          <p v-if="membership.namespace.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {{ membership.namespace.description }}
          </p>
          <p v-else class="text-sm text-gray-400 dark:text-gray-500 italic">
            Bez popisu
          </p>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Status: <strong :class="getStatusClass(membership.namespace.status)">{{ getStatusLabel(membership.namespace.status) }}</strong></span>
              <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      <!-- No namespaces -->
      <div v-else class="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-20 h-20 mx-auto text-yellow-500 mb-6" />
        <h2 class="text-2xl font-bold mb-3">Nejste členem žádné organizace</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Kontaktujte správce organizace, aby vás přidal. Nebo se můžete připojit přes pozvánku od lektora.
        </p>
        <UButton
          color="gray"
          variant="outline"
          size="lg"
          @click="userStore.logout()"
        >
          Odhlásit se
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Namespace } from '~/types'

definePageMeta({
  layout: false,
  middleware: ['auth']
})

const userStore = useUserStore()
const loading = ref(true)

onMounted(async () => {
  try {
    await userStore.loadAvailableNamespaces()
    
    // If user has exactly one namespace, auto-select it
    if (userStore.availableNamespaces.length === 1) {
      await selectNamespace(userStore.availableNamespaces[0].namespace)
    }
  } finally {
    loading.value = false
  }
})

async function selectNamespace(ns: Namespace) {
  try {
    await userStore.switchNamespace(ns.id)
    navigateTo('/dashboard')
  } catch (err) {
    console.error('Failed to select namespace:', err)
  }
}

function getRoleColor(role: string): string {
  const map: Record<string, string> = {
    ORG_ADMIN: 'red',
    LECTURER: 'blue',
    STUDENT: 'green'
  }
  return map[role] || 'gray'
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    ORG_ADMIN: 'Správce',
    LECTURER: 'Lektor',
    STUDENT: 'Student'
  }
  return map[role] || role
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktivní',
    PENDING: 'Čeká na schválení',
    SUSPENDED: 'Pozastaveno'
  }
  return map[status] || status
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'text-green-600 dark:text-green-400',
    PENDING: 'text-yellow-600 dark:text-yellow-400',
    SUSPENDED: 'text-red-600 dark:text-red-400'
  }
  return map[status] || 'text-gray-600 dark:text-gray-400'
}
</script>
