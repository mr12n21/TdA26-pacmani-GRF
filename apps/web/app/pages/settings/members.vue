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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400">Celkem členů</p>
          <p class="text-3xl font-bold mt-1">{{ members.length }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400">Čekající</p>
          <p class="text-3xl font-bold mt-1 text-yellow-600">{{ pendingCount }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400">Lektoři</p>
          <p class="text-3xl font-bold mt-1 text-blue-600">{{ lecturerCount }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-6 pb-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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
              placeholder="Všechny role"
            />
            <USelectMenu
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="Všechny stavy"
            />
          </div>
        </div>
      </div>

      <!-- Members Table -->
      <div class="px-6 pb-6">
        <UTable
          :rows="filteredMembers"
          :columns="columns"
          :loading="loading"
        >
          <template #user-data="{ row }">
            <div>
              <p class="font-semibold">{{ row.user?.name ?? 'Neznámý' }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ row.user?.email }}</p>
            </div>
          </template>

          <template #role-data="{ row }">
            <UBadge :color="getRoleColor(row.role)" :label="getRoleLabel(row.role)" />
          </template>

          <template #status-data="{ row }">
            <UBadge :color="getStatusColor(row.status)" :label="getStatusLabel(row.status)" />
          </template>

          <template #joinedAt-data="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(row.joinedAt) }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <UDropdown :items="getActions(row)">
              <UButton icon="i-heroicons-ellipsis-horizontal" color="gray" variant="ghost" />
            </UDropdown>
          </template>
        </UTable>
      </div>
    </UDashboardPanel>

    <!-- Invite Modal -->
    <UModal v-model="showInviteModal">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Pozvánkový odkaz</h2>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Vytvořte pozvánkový odkaz pro přidání nových členů do vaší organizace.
          </p>

          <div v-if="inviteLink" class="flex items-center gap-2">
            <UInput :model-value="inviteLink" readonly class="flex-1" />
            <UButton icon="i-heroicons-clipboard" color="gray" @click="copyInviteLink" />
          </div>

          <div v-else class="flex justify-end">
            <UButton :loading="creatingInvite" @click="createInviteLink">
              Vytvořit odkaz
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
import type { NamespaceMember } from '~/types'

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

const columns = [
  { key: 'user', label: 'Uživatel' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joinedAt', label: 'Přidán' },
  { key: 'actions', label: '' }
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
  return { ORG_ADMIN: 'blue', LECTURER: 'indigo', STUDENT: 'gray' }[role] || 'gray'
}

function getRoleLabel(role: string) {
  return { ORG_ADMIN: 'Správce', LECTURER: 'Lektor', STUDENT: 'Student' }[role] || role
}

function getStatusColor(status: string) {
  return { APPROVED: 'green', PENDING: 'yellow', REJECTED: 'red' }[status] || 'gray'
}

function getStatusLabel(status: string) {
  return { APPROVED: 'Schválen', PENDING: 'Čeká', REJECTED: 'Zamítnut' }[status] || status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

function getActions(member: NamespaceMember) {
  const actions: any[][] = []

  if (member.status === 'PENDING') {
    actions.push([
      {
        label: 'Schválit',
        icon: 'i-heroicons-check',
        click: () => updateMemberStatus(member.id, 'APPROVED')
      },
      {
        label: 'Zamítnout',
        icon: 'i-heroicons-x-mark',
        click: () => updateMemberStatus(member.id, 'REJECTED')
      }
    ])
  }

  if (member.status === 'APPROVED') {
    actions.push([
      {
        label: 'Změnit roli na Lektora',
        icon: 'i-heroicons-academic-cap',
        click: () => updateMemberRole(member.id, 'LECTURER')
      },
      {
        label: 'Změnit roli na Studenta',
        icon: 'i-heroicons-user',
        click: () => updateMemberRole(member.id, 'STUDENT')
      }
    ])
  }

  actions.push([{
    label: 'Odebrat',
    icon: 'i-heroicons-trash',
    click: () => removeMember(member.id)
  }])

  return actions
}

async function updateMemberStatus(memberId: string, status: string) {
  try {
    await patch(`/namespaces/${nsId.value}/members/${memberId}`, { status })
    await loadMembers()
  } catch (err) {
    console.error('Failed to update member:', err)
  }
}

async function updateMemberRole(memberId: string, role: string) {
  try {
    await patch(`/namespaces/${nsId.value}/members/${memberId}`, { role })
    await loadMembers()
  } catch (err) {
    console.error('Failed to update role:', err)
  }
}

async function removeMember(memberId: string) {
  try {
    await del(`/namespaces/${nsId.value}/members/${memberId}`)
    await loadMembers()
  } catch (err) {
    console.error('Failed to remove member:', err)
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
  } finally {
    creatingInvite.value = false
  }
}

function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink.value)
  toast.add({ title: 'Odkaz zkopírován', color: 'green' })
}
</script>
