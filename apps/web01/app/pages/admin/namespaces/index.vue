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
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Celkem</p>
          <p class="text-3xl font-bold mt-1">{{ stats.total }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Aktivní</p>
          <p class="text-3xl font-bold mt-1 text-green-600">{{ stats.active }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Čekající</p>
          <p class="text-3xl font-bold mt-1 text-amber-500">{{ stats.pending }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Pozastavené</p>
          <p class="text-3xl font-bold mt-1 text-red-500">{{ stats.suspended }}</p>
        </div>
      </div>

      <!-- Pending Requests Banner -->
      <div v-if="pendingNamespaces.length > 0" class="mx-6 mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div class="flex items-center gap-3 mb-3">
          <UIcon name="i-heroicons-bell-alert" class="w-5 h-5 text-amber-500" />
          <h3 class="font-semibold text-amber-800 dark:text-amber-200">
            {{ pendingNamespaces.length }} {{ pendingNamespaces.length === 1 ? 'žádost čeká' : 'žádostí čeká' }} na schválení
          </h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="ns in pendingNamespaces"
            :key="ns.id"
            class="flex items-center justify-between rounded-lg bg-white dark:bg-[var(--ui-bg)] p-3 border border-amber-200 dark:border-amber-800"
          >
            <div>
              <p class="font-semibold">{{ ns.name }}</p>
              <p class="text-sm text-[var(--ui-text-muted)]">{{ ns.slug }} · {{ formatDate(ns.createdAt) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-check"
                label="Schválit"
                color="success"
                size="sm"
                :loading="actionLoading === ns.id"
                @click="approveNamespace(ns)"
              />
              <UButton
                icon="i-heroicons-x-mark"
                label="Zamítnout"
                color="error"
                variant="soft"
                size="sm"
                :loading="actionLoading === ns.id"
                @click="rejectNamespace(ns)"
              />
              <UButton
                icon="i-heroicons-eye"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="navigateTo(`/admin/namespaces/${ns.id}`)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="px-6 pb-4">
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
            value-attribute="value"
            placeholder="Všechny"
          />
        </div>
      </div>

      <!-- Namespaces Table -->
      <div class="px-6 pb-6">
        <UTable
          :data="filteredNamespaces"
          :columns="columns"
          :loading="loading"
        >
          <template #name-cell="{ row }">
            <div>
              <p class="font-semibold">{{ row.original.name }}</p>
              <p class="text-sm text-[var(--ui-text-muted)]">{{ row.original.slug }}</p>
            </div>
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :color="getStatusColor(row.original.status) as any"
              :label="getStatusLabel(row.original.status)"
            />
          </template>

          <template #members-cell="{ row }">
            <span class="text-[var(--ui-text-muted)]">
              {{ row.original._count?.members ?? 0 }} členů
            </span>
          </template>

          <template #createdAt-cell="{ row }">
            <span class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(row.original.createdAt) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <template v-if="row.original.status === 'PENDING'">
                <UButton
                  icon="i-heroicons-check"
                  color="success"
                  size="xs"
                  variant="soft"
                  :loading="actionLoading === row.original.id"
                  @click="approveNamespace(row.original)"
                />
                <UButton
                  icon="i-heroicons-x-mark"
                  color="error"
                  size="xs"
                  variant="soft"
                  :loading="actionLoading === row.original.id"
                  @click="rejectNamespace(row.original)"
                />
              </template>
              <template v-else>
                <UButton
                  :icon="row.original.status === 'ACTIVE' ? 'i-heroicons-pause' : 'i-heroicons-play'"
                  color="warning"
                  size="xs"
                  variant="soft"
                  @click="toggleStatus(row.original)"
                />
              </template>
              <UButton
                icon="i-heroicons-eye"
                color="neutral"
                size="xs"
                variant="ghost"
                @click="navigateTo(`/admin/namespaces/${row.original.id}`)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </UDashboardPanel>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Nová organizace</h2>
          </template>

          <form @submit.prevent="createNamespace" class="space-y-4">
            <UFormField label="Název organizace" required>
              <UInput v-model="form.name" placeholder="např. Gymnázium Brno" />
            </UFormField>

            <UFormField label="Slug (URL identifikátor)" required>
              <UInput v-model="form.slug" placeholder="např. gym-brno" />
            </UFormField>

            <UFormField label="Popis">
              <UTextarea v-model="form.description" :rows="3" placeholder="Nepovinný popis organizace" />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                @click="showCreateModal = false"
              >
                Zrušit
              </UButton>
              <UButton type="submit" :loading="creating">
                Vytvořit organizaci
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
import type { Namespace } from '~/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const { get, post, patch } = useApi()
const toast = useToast()

const namespaces = ref<Namespace[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const searchQuery = ref('')
const statusFilter = ref('ALL')
const actionLoading = ref<string | null>(null)

const form = reactive({
  name: '',
  slug: '',
  description: ''
})

const columns: TableColumn<Namespace>[] = [
  { accessorKey: 'name', header: 'Organizace' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'members', header: 'Členové' },
  { accessorKey: 'createdAt', header: 'Vytvořeno' },
  { accessorKey: 'actions', header: '' }
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

const pendingNamespaces = computed(() =>
  namespaces.value.filter(n => n.status === 'PENDING')
)

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
    toast.add({ title: 'Organizace vytvořena', color: 'success' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to create namespace:', err)
    toast.add({ title: 'Chyba při vytváření', color: 'error' })
  } finally {
    creating.value = false
  }
}

function getStatusColor(status: string): string {
  return { ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'error' }[status] || 'neutral'
}

function getStatusLabel(status: string): string {
  return { ACTIVE: 'Aktivní', PENDING: 'Čeká na schválení', SUSPENDED: 'Pozastaveno' }[status] || status
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

async function approveNamespace(namespace: Namespace) {
  actionLoading.value = namespace.id
  try {
    await patch(`/namespaces/${namespace.id}`, { status: 'ACTIVE' })
    toast.add({ title: `${namespace.name} schválena`, color: 'success' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to approve namespace:', err)
    toast.add({ title: 'Chyba při schvalování', color: 'error' })
  } finally {
    actionLoading.value = null
  }
}

async function rejectNamespace(namespace: Namespace) {
  actionLoading.value = namespace.id
  try {
    await patch(`/namespaces/${namespace.id}`, { status: 'SUSPENDED' })
    toast.add({ title: `${namespace.name} zamítnuta`, color: 'success' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to reject namespace:', err)
    toast.add({ title: 'Chyba při zamítání', color: 'error' })
  } finally {
    actionLoading.value = null
  }
}

async function toggleStatus(namespace: Namespace) {
  actionLoading.value = namespace.id
  try {
    const newStatus = namespace.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    await patch(`/namespaces/${namespace.id}`, { status: newStatus })
    toast.add({ title: 'Status změněn', color: 'success' })
    await loadNamespaces()
  } catch (err) {
    console.error('Failed to toggle status:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  } finally {
    actionLoading.value = null
  }
}
</script>