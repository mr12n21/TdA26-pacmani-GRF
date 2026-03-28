<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar>
        <template #left>
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" to="/admin/namespaces" />
          <h1 class="text-xl font-bold ml-2">{{ namespace?.name || 'Detail organizace' }}</h1>
        </template>
        <template #right>
          <UBadge
            v-if="namespace"
            :color="getStatusColor(namespace.status) as any"
            :label="getStatusLabel(namespace.status)"
            size="lg"
          />
        </template>
      </UDashboardNavbar>

      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="namespace" class="p-6 space-y-6">
        <!-- Info Card -->
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-6">
          <h2 class="text-lg font-bold mb-4">Informace o organizaci</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-[var(--ui-text-muted)]">Název</p>
              <p class="font-semibold">{{ namespace.name }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--ui-text-muted)]">Slug</p>
              <p class="font-mono">{{ namespace.slug }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--ui-text-muted)]">Vytvořeno</p>
              <p>{{ formatDate(namespace.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--ui-text-muted)]">Popis</p>
              <p>{{ namespace.description || '—' }}</p>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <UButton
              v-if="namespace.status === 'PENDING'"
              icon="i-heroicons-check"
              label="Schválit organizaci"
              color="success"
              @click="updateStatus('ACTIVE')"
              :loading="updatingStatus"
            />
            <UButton
              v-if="namespace.status === 'PENDING'"
              icon="i-heroicons-x-mark"
              label="Zamítnout"
              color="error"
              variant="soft"
              @click="updateStatus('SUSPENDED')"
              :loading="updatingStatus"
            />
            <UButton
              v-if="namespace.status === 'ACTIVE'"
              icon="i-heroicons-pause"
              label="Pozastavit"
              color="warning"
              variant="soft"
              @click="updateStatus('SUSPENDED')"
              :loading="updatingStatus"
            />
            <UButton
              v-if="namespace.status === 'SUSPENDED'"
              icon="i-heroicons-play"
              label="Aktivovat"
              color="success"
              @click="updateStatus('ACTIVE')"
              :loading="updatingStatus"
            />
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.members ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Členové</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.courses ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Kurzy</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.feedPosts ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Příspěvky</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.documents ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Dokumenty</p>
          </div>
        </div>

        <!-- Members -->
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">Členové organizace</h2>
            <UButton
              icon="i-heroicons-user-plus"
              label="Přidat člena"
              color="primary"
              variant="soft"
              @click="showAddMemberModal = true"
            />
          </div>
          <UTable
            :data="members"
            :columns="memberColumns"
            :loading="loadingMembers"
          >
            <template #user-cell="{ row }">
              <div>
                <p class="font-semibold">{{ row.original.user?.name ?? 'Neznámý' }}</p>
                <p class="text-sm text-[var(--ui-text-muted)]">{{ row.original.user?.email }}</p>
              </div>
            </template>

            <template #role-cell="{ row }">
              <UBadge
                :color="getRoleColor(row.original.role) as any"
                :label="getRoleLabel(row.original.role)"
              />
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="getMemberStatusColor(row.original.status) as any"
                :label="getMemberStatusLabel(row.original.status)"
              />
            </template>

            <template #actions-cell="{ row }">
              <div class="flex gap-2">
                <UButton
                  v-if="row.original.status === 'PENDING'"
                  size="xs"
                  icon="i-heroicons-check"
                  label="Schválit"
                  color="success"
                  @click="approveMember(row.original.id)"
                />
                <UButton
                  v-if="row.original.status === 'PENDING'"
                  size="xs"
                  icon="i-heroicons-x-mark"
                  label="Zamítnout"
                  color="error"
                  variant="soft"
                  @click="rejectMember(row.original.id)"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="removeMemberAction(row.original.id)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </UDashboardPanel>

    <!-- Add Member Modal -->
    <UModal v-model:open="showAddMemberModal">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Přidat člena do organizace</h2>
          </template>

          <div class="space-y-4">
            <UFormField label="Vyhledat uživatele">
              <UInput
                v-model="userSearchQuery"
                placeholder="Jméno nebo email..."
                icon="i-heroicons-magnifying-glass"
                @input="debouncedSearchUsers"
              />
            </UFormField>

            <div v-if="searchingUsers" class="flex justify-center py-4">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-xl text-muted" />
            </div>

            <div v-else-if="searchResults.length > 0" class="max-h-60 overflow-y-auto space-y-2">
              <div
                v-for="u in searchResults"
                :key="u.id"
                class="flex items-center justify-between p-3 rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] cursor-pointer transition-colors"
                :class="{ 'ring-2 ring-[var(--ui-primary)]': selectedUserId === u.id }"
                @click="selectedUserId = u.id"
              >
                <div>
                  <p class="font-semibold">{{ u.name }}</p>
                  <p class="text-sm text-[var(--ui-text-muted)]">{{ u.email }}</p>
                </div>
                <UIcon v-if="selectedUserId === u.id" name="i-heroicons-check-circle" class="text-[var(--ui-primary)] w-5 h-5" />
              </div>
            </div>

            <div v-else-if="userSearchQuery.length >= 2" class="text-sm text-[var(--ui-text-muted)] text-center py-4">
              Žádní uživatelé nenalezeni
            </div>

            <UFormField label="Role">
              <USelectMenu
                v-model="addMemberRole"
                :options="addMemberRoleOptions"
                value-attribute="value"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-2">
              <UButton color="neutral" variant="ghost" @click="showAddMemberModal = false">
                Zrušit
              </UButton>
              <UButton
                :disabled="!selectedUserId"
                :loading="addingMember"
                @click="addMember"
              >
                Přidat
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const route = useRoute()
const { get, patch, del, post } = useApi()
const toast = useToast()

const namespaceId = route.params.id as string
const namespace = ref<any>(null)
const members = ref<any[]>([])
const loading = ref(true)
const loadingMembers = ref(true)
const updatingStatus = ref(false)

// Add member state
const showAddMemberModal = ref(false)
const userSearchQuery = ref('')
const searchResults = ref<any[]>([])
const searchingUsers = ref(false)
const selectedUserId = ref('')
const addMemberRole = ref('LECTURER')
const addingMember = ref(false)

const addMemberRoleOptions = [
  { label: 'Správce', value: 'ORG_ADMIN' },
  { label: 'Lektor', value: 'LECTURER' },
  { label: 'Student', value: 'STUDENT' }
]

const memberColumns: TableColumn<any>[] = [
  { accessorKey: 'user', header: 'Uživatel' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]

onMounted(async () => {
  await Promise.all([loadNamespace(), loadMembers()])
})

async function loadNamespace() {
  loading.value = true
  try {
    namespace.value = await get(`/namespaces/${namespaceId}`)
  } catch (err) {
    console.error('Failed to load namespace:', err)
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    members.value = await get(`/namespaces/${namespaceId}/members`)
  } catch (err) {
    console.error('Failed to load members:', err)
  } finally {
    loadingMembers.value = false
  }
}

async function updateStatus(status: string) {
  updatingStatus.value = true
  try {
    await patch(`/namespaces/${namespaceId}`, { status })
    await loadNamespace()
    await loadMembers()
    toast.add({ title: `Status změněn na ${getStatusLabel(status)}`, color: 'success' })
  } catch (err) {
    console.error('Failed to update status:', err)
    toast.add({ title: 'Chyba při změně statusu', color: 'error' })
  } finally {
    updatingStatus.value = false
  }
}

async function approveMember(memberId: string) {
  try {
    await patch(`/namespaces/${namespaceId}/members/${memberId}`, { status: 'APPROVED' })
    toast.add({ title: 'Člen schválen', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to approve member:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

async function rejectMember(memberId: string) {
  try {
    await patch(`/namespaces/${namespaceId}/members/${memberId}`, { status: 'REJECTED' })
    toast.add({ title: 'Člen zamítnut', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to reject member:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

async function removeMemberAction(memberId: string) {
  if (!confirm('Opravdu chcete odebrat tohoto člena?')) return
  try {
    await del(`/namespaces/${namespaceId}/members/${memberId}`)
    toast.add({ title: 'Člen odebrán', color: 'success' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to remove member:', err)
    toast.add({ title: 'Chyba', color: 'error' })
  }
}

// ── Add Member ───────────────────────────────────────────────────────

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearchUsers() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => searchUsers(), 300)
}

async function searchUsers() {
  if (userSearchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  searchingUsers.value = true
  try {
    searchResults.value = await get(`/namespaces/${namespaceId}/members/search?q=${encodeURIComponent(userSearchQuery.value)}`)
  } catch (err) {
    console.error('Failed to search users:', err)
  } finally {
    searchingUsers.value = false
  }
}

async function addMember() {
  if (!selectedUserId.value) return
  addingMember.value = true
  try {
    await post(`/namespaces/${namespaceId}/members/add`, {
      userId: selectedUserId.value,
      role: addMemberRole.value,
    })
    toast.add({ title: 'Člen úspěšně přidán', color: 'success' })
    showAddMemberModal.value = false
    selectedUserId.value = ''
    userSearchQuery.value = ''
    searchResults.value = []
    await loadMembers()
  } catch (err: any) {
    console.error('Failed to add member:', err)
    toast.add({ title: err?.data?.error || 'Chyba při přidávání člena', color: 'error' })
  } finally {
    addingMember.value = false
  }
}

function getStatusColor(status: string) {
  return { ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'error' }[status] || 'neutral'
}

function getStatusLabel(status: string) {
  return { ACTIVE: 'Aktivní', PENDING: 'Čeká na schválení', SUSPENDED: 'Pozastaveno' }[status] || status
}

function getRoleColor(role: string) {
  return { ORG_ADMIN: 'info', LECTURER: 'secondary', STUDENT: 'neutral' }[role] || 'neutral'
}

function getRoleLabel(role: string) {
  return { ORG_ADMIN: 'Správce', LECTURER: 'Lektor', STUDENT: 'Student' }[role] || role
}

function getMemberStatusColor(status: string) {
  return { APPROVED: 'success', PENDING: 'warning', REJECTED: 'error' }[status] || 'neutral'
}

function getMemberStatusLabel(status: string) {
  return { APPROVED: 'Schválen', PENDING: 'Čeká', REJECTED: 'Zamítnut' }[status] || status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}
</script>