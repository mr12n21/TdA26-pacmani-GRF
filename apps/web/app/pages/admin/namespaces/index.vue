<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Správa organizací">
        <template #right>
          <UButton
            icon="i-heroicons-plus"
            label="Nová organizace"
            color="primary"
            @click="showCreateModal = true"
          />
        </template>
      </UDashboardNavbar>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Celkem organizací</p>
              <p class="text-3xl font-bold mt-1">{{ stats.total }}</p>
            </div>
            <UIcon name="i-heroicons-building-office" class="w-10 h-10 text-blue-500" />
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Aktivní</p>
              <p class="text-3xl font-bold mt-1 text-green-600">{{ stats.active }}</p>
            </div>
            <UIcon name="i-heroicons-check-circle" class="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Čekající schválení</p>
              <p class="text-3xl font-bold mt-1 text-yellow-600">{{ stats.pending }}</p>
            </div>
            <UIcon name="i-heroicons-clock" class="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Pozastavené</p>
              <p class="text-3xl font-bold mt-1 text-red-600">{{ stats.suspended }}</p>
            </div>
            <UIcon name="i-heroicons-no-symbol" class="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="px-6 pb-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-4">
            <UInput
              v-model="searchQuery"
              placeholder="Hledat organizaci..."
              icon="i-heroicons-magnifying-glass"
              class="flex-1"
            />
            <USelectMenu
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="Všechny"
            />
          </div>
        </div>
      </div>

      <!-- Namespaces Table -->
      <div class="px-6 pb-6">
        <UTable
          :rows="filteredNamespaces"
          :columns="columns"
          :loading="loading"
        >
          <template #name-data="{ row }">
            <div>
              <p class="font-semibold">{{ row.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ row.slug }}</p>
            </div>
          </template>

          <template #status-data="{ row }">
            <UBadge
              :color="getStatusColor(row.status)"
              :label="getStatusLabel(row.status)"
            />
          </template>

          <template #members-data="{ row }">
            <span class="text-gray-600 dark:text-gray-400">
              {{ row._count?.members ?? 0 }} členů
            </span>
          </template>

          <template #createdAt-data="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <UDropdown :items="getActions(row)">
              <UButton
                icon="i-heroicons-ellipsis-horizontal"
                color="gray"
                variant="ghost"
              />
            </UDropdown>
          </template>
        </UTable>
      </div>
    </UDashboardPanel>

    <!-- Create Modal -->
    <UModal v-model="showCreateModal">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Nová organizace</h2>
        </template>

        <form @submit.prevent="createNamespace" class="space-y-4">
          <UFormGroup label="Název organizace" required>
            <UInput v-model="form.name" placeholder="např. Gymnázium Brno" />
          </UFormGroup>

          <UFormGroup label="Slug (URL identifikátor)" required>
            <UInput v-model="form.slug" placeholder="např. gym-brno" />
            <template #hint>
              <span class="text-xs text-gray-500">Bude použito v URL</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Popis">
            <UTextarea v-model="form.description" rows="3" placeholder="Nepovinný popis organizace" />
          </UFormGroup>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              color="gray"
              variant="ghost"
              @click="showCreateModal = false"
            >
              Zrušit
            </UButton>
            <UButton
              type="submit"
              :loading="creating"
            >
              Vytvořit organizaci
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
import type { Namespace } from '~/types'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']  // Odstraněn namespace middleware - SUPER_ADMIN nepotřebuje aktivní namespace
})

const { get, post, patch } = useApi()

const namespaces = ref<Namespace[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const searchQuery = ref('')
const statusFilter = ref('ALL')

const form = reactive({
  name: '',
  slug: '',
  description: ''
})

const columns = [
  { key: 'name', label: 'Organizace' },
  { key: 'status', label: 'Status' },
  { key: 'members', label: 'Členové' },
  { key: 'createdAt', label: 'Vytvořeno' },
  { key: 'actions', label: '' }
]

const statusOptions = [
  { label: 'Všechny', value: 'ALL' },
  { label: 'Aktivní', value: 'ACTIVE' },
  { label: 'Čekající', value: 'PENDING' },
  { label: 'Pozastavené', value: 'SUSPENDED' }
]

const stats = computed(() => ({
  total: namespaces.value.length,
  active: namespaces.value.filter(n => n.status === 'ACTIVE').length,
  pending: namespaces.value.filter(n => n.status === 'PENDING').length,
  suspended: namespaces.value.filter(n => n.status === 'SUSPENDED').length
}))

const filteredNamespaces = computed(() => {
  let result = namespaces.value

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.slug.toLowerCase().includes(q)
    )
  }

  if (statusFilter.value !== 'ALL') {
    result = result.filter(n => n.status === statusFilter.value)
  }

  return result
})

onMounted(async () => {
  await loadNamespaces()
})

async function loadNamespaces() {
  loading.value = true
  try {
    namespaces.value = await get<Namespace[]>('/namespaces')
  } catch (err) {
    console.error('Failed to load namespaces:', err)
  } finally {
    loading.value = false
  }
}

async function createNamespace() {
  creating.value = true
  try {
    await post('/namespaces', form)
    showCreateModal.value = false
    Object.assign(form, { name: '', slug: '', description: '' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to create namespace:', err)
  } finally {
    creating.value = false
  }
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'green',
    PENDING: 'yellow',
    SUSPENDED: 'red'
  }
  return map[status] || 'gray'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktivní',
    PENDING: 'Čeká na schválení',
    SUSPENDED: 'Pozastaveno'
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

function getActions(namespace: Namespace) {
  const actions = [
    [{
      label: 'Detail',
      icon: 'i-heroicons-eye',
      click: () => navigateTo(`/admin/namespaces/${namespace.id}`)
    }]
  ]

  // Pokud je organizace PENDING, přidej akce pro schválení/zamítnutí
  if (namespace.status === 'PENDING') {
    actions.push([{
      label: 'Schválit',
      icon: 'i-heroicons-check',
      click: () => approveNamespace(namespace)
    }, {
      label: 'Zamítnout',
      icon: 'i-heroicons-x-mark',
      click: () => rejectNamespace(namespace)
    }])
  } else {
    actions.push([{
      label: namespace.status === 'ACTIVE' ? 'Pozastavit' : 'Aktivovat',
      icon: namespace.status === 'ACTIVE' ? 'i-heroicons-pause' : 'i-heroicons-play',
      click: () => toggleStatus(namespace)
    }])
  }

  return actions
}

async function approveNamespace(namespace: Namespace) {
  try {
    await patch(`/namespaces/${namespace.id}`, { status: 'ACTIVE' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to approve namespace:', err)
  }
}

async function rejectNamespace(namespace: Namespace) {
  try {
    await patch(`/namespaces/${namespace.id}`, { status: 'SUSPENDED' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to reject namespace:', err)
  }
}

async function toggleStatus(namespace: Namespace) {
  try {
    const newStatus = namespace.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    await patch(`/namespaces/${namespace.id}`, { status: newStatus })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to toggle status:', err)
  }
}
</script>
