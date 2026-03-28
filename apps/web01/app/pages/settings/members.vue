<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Členové organizace">
        <template #right>
          <UButton
            icon="i-heroicons-link"
            label="Pozvánkový odkaz"
            color="primary"
            variant="soft"
            @click="showInviteModal = true"
          />
        </template>
      </UDashboardNavbar>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Celkem členů</p>
          <p class="text-3xl font-bold mt-1">{{ members.length }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Čekající</p>
          <p class="text-3xl font-bold mt-1 text-amber-500">{{ pendingCount }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Lektoři</p>
          <p class="text-3xl font-bold mt-1 text-blue-600">{{ lecturerCount }}</p>
        </div>
      </div>

      <!-- Pending Requests Banner -->
      <div v-if="pendingMembers.length > 0" class="mx-6 mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div class="flex items-center gap-3 mb-3">
          <UIcon name="i-heroicons-bell-alert" class="w-5 h-5 text-amber-500" />
          <h3 class="font-semibold text-amber-800 dark:text-amber-200">
            {{ pendingMembers.length }} {{ pendingMembers.length === 1 ? 'žádost čeká' : 'žádostí čeká' }} na schválení
          </h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="m in pendingMembers"
            :key="m.id"
            class="flex items-center justify-between rounded-lg bg-white dark:bg-[var(--ui-bg)] p-3 border border-amber-200 dark:border-amber-800"
          >
            <div>
              <p class="font-semibold">{{ m.user?.name ?? 'Neznámý' }}</p>
              <p class="text-sm text-[var(--ui-text-muted)]">{{ m.user?.email }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UButton icon="i-heroicons-check" label="Schválit" color="success" size="sm" @click="updateMemberStatus(m.id, 'APPROVED')" />
              <UButton icon="i-heroicons-x-mark" label="Zamítnout" color="error" variant="soft" size="sm" @click="updateMemberStatus(m.id, 'REJECTED')" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-6 pb-4">
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            placeholder="Hledat člena..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
          />
          <USelectMenu
            v-model="roleFilter"
            :options="roleOptions"
            value-attribute="value"
            placeholder="Všechny role"
          />
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            value-attribute="value"
            placeholder="Všechny stavy"
          />
        </div>
      </div>

      <!-- Members Table -->
      <div class="px-6 pb-6">
        <UTable
          :data="filteredMembers"
          :columns="columns"
          :loading="loading"
        >
          <template #user-cell="{ row }">
            <div>
              <p class="font-semibold">{{ row.original.user?.name ?? 'Neznámý' }}</p>
              <p class="text-sm text-[var(--ui-text-muted)]">{{ row.original.user?.email }}</p>
            </div>
          </template>

          <template #role-cell="{ row }">
            <UBadge :color="getRoleColor(row.original.role) as any" :label="getRoleLabel(row.original.role)" />
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="getStatusColor(row.original.status) as any" :label="getStatusLabel(row.original.status)" />
          </template>

          <template #joinedAt-cell="{ row }">
            <span class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(row.original.joinedAt) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <template v-if="row.original.status === 'PENDING'">
                <UButton icon="i-heroicons-check" color="success" size="xs" variant="soft" @click="updateMemberStatus(row.original.id, 'APPROVED')" />
                <UButton icon="i-heroicons-x-mark" color="error" size="xs" variant="soft" @click="updateMemberStatus(row.original.id, 'REJECTED')" />
              </template>
              <UDropdownMenu :items="getMoreActions(row.original)">
                <UButton icon="i-heroicons-ellipsis-horizontal" color="neutral" size="xs" variant="ghost" />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>
      </div>
    </UDashboardPanel>

    <!-- Invite Modal -->
    <UModal v-model:open="showInviteModal">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Pozvánkový odkaz</h2>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-[var(--ui-text-muted)]">
              Vytvořte pozvánkový odkaz pro přidání nových členů do vaší organizace.
            </p>

            <div v-if="inviteLink" class="flex items-center gap-2">
              <UInput :model-value="inviteLink" readonly class="flex-1" />
              <UButton icon="i-heroicons-clipboard" color="neutral" @click="copyInviteLink" />
            </div>

            <div v-else class="flex justify-end">
              <UButton :loading="creatingInvite" @click="createInviteLink">
                Vytvořit odkaz
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
import type { NamespaceMember } from '~/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'namespace']
})

const userStore = useUserStore()
const { get, post, patch, del } = useApi()
const toast = useToast()

const members = ref<NamespaceMember[]>([])
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('ALL')
const statusFilter = ref('ALL')
const showInviteModal = ref(false)
const creatingInvite = ref(false)
const inviteLink = ref('')

const columns: TableColumn<NamespaceMember>[] = [
  { accessorKey: 'user', header: 'Uživatel' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'joinedAt', header: 'Přidán' },
  { accessorKey: 'actions', header: '' }
]

const roleOptions = [
  { label: 'Všechny', value: 'ALL' },
  { label: 'Správce', value: 'ORG_ADMIN' },
  { label: 'Lektor', value: 'LECTURER' },
  { label: 'Student', value: 'STUDENT' }
]

const statusOptions = [
  { label: 'Všechny', value: 'ALL' },
  { label: 'Schválení', value: 'APPROVED' },
  { label: 'Čekající', value: 'PENDING' },
  { label: 'Zamítnutí', value: 'REJECTED' }
]

const pendingCount = computed(() => members.value.filter(m => m.status === 'PENDING').length)
const lecturerCount = computed(() => members.value.filter(m => m.role === 'LECTURER').length)
const pendingMembers = computed(() => members.value.filter(m => m.status === 'PENDING'))

const filteredMembers = computed(() => {
  let result = members.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(m =>
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q)
    )
  }
  if (roleFilter.value !== 'ALL') {
    result = result.filter(m => m.role === roleFilter.value)
  }
  if (statusFilter.value !== 'ALL') {
    result = result.filter(m => m.status === statusFilter.value)
  }
  return result
})

const nsId = computed(() => userStore.activeNamespace?.id)

onMounted(async () => {
  if (nsId.value) await loadMembers()
})

async function loadMembers() {
  loading.value = true
  try {
    members.value = await get<NamespaceMember[]>(`/namespaces/${nsId.value}/members`)
  } catch (err) {
    console.error('Failed to load members:', err)
  } finally {
    loading.value = false
  }
}

function getRoleColor(role: string) {
  return { ORG_ADMIN: 'info', LECTURER: 'secondary', STUDENT: 'neutral' }[role] || 'neutral'
}

function getRoleLabel(role: string) {
  return { ORG_ADMIN: 'Správce', LECTURER: 'Lektor', STUDENT: 'Student' }[role] || role
}

function getStatusColor(status: string) {
  return { APPROVED: 'success', PENDING: 'warning', REJECTED: 'error' }[status] || 'neutral'
}

function getStatusLabel(status: string) {
  return { APPROVED: 'Schválen', PENDING: 'Čeká', REJECTED: 'Zamítnut' }[status] || status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

function getMoreActions(member: NamespaceMember) {
  const actions: any[][] = []

  if (member.status === 'APPROVED') {
    actions.push([
      { label: 'Změnit na Lektora', icon: 'i-heroicons-academic-cap', onSelect: () => updateMemberRole(member.id, 'LECTURER') },
      { label: 'Změnit na Studenta', icon: 'i-heroicons-user', onSelect: () => updateMemberRole(member.id, 'STUDENT') }
    ])
  }

  actions.push([
    { label: 'Odebrat', icon: 'i-heroicons-trash', onSelect: () => removeMember(member.id) }
  ])

  return actions
}

async function updateMemberStatus(memberId: string, status: string) {
  try {
    await patch(`/namespaces/${nsId.value}/members/${memberId}`, { status })
    toast.add({ title: status === 'APPROVED' ? 'Člen schválen' : 'Člen zamítnut', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to update member:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

async function updateMemberRole(memberId: string, role: string) {
  try {
    await patch(`/namespaces/${nsId.value}/members/${memberId}`, { role })
    toast.add({ title: 'Role změněna', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to update role:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

async function removeMember(memberId: string) {
  if (!confirm('Opravdu chcete odebrat tohoto člena?')) return
  try {
    await del(`/namespaces/${nsId.value}/members/${memberId}`)
    toast.add({ title: 'Člen odebrán', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to remove member:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

async function createInviteLink() {
  creatingInvite.value = true
  try {
    const data = await post<{ token: string }>(`/namespaces/${nsId.value}/invite`, {
      type: 'PERSISTENT'
    })
    inviteLink.value = `${window.location.origin}/invite/${data.token}`
  } catch (err) {
    console.error('Failed to create invite link:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  } finally {
    creatingInvite.value = false
  }
}

function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink.value)
  toast.add({ title: 'Odkaz zkopírován', color: 'success' })
}
</script>