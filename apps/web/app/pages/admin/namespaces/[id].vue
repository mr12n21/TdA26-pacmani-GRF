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
            :color="(getStatusColor(namespace.status)) as any"
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
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-bold mb-4">Informace o organizaci</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Název</p>
              <p class="font-semibold">{{ namespace.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Slug</p>
              <p class="font-mono">{{ namespace.slug }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Vytvořeno</p>
              <p>{{ formatDate(namespace.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Popis</p>
              <p>{{ namespace.description || '—' }}</p>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <UButton
              v-if="namespace.status === 'PENDING'"
              color="success"
              @click="updateStatus('ACTIVE')"
              :loading="updatingStatus"
            >
              Schválit
            </UButton>
            <UButton
              v-if="namespace.status === 'ACTIVE'"
              color="warning"
              variant="soft"
              @click="updateStatus('SUSPENDED')"
              :loading="updatingStatus"
            >
              Pozastavit
            </UButton>
            <UButton
              v-if="namespace.status === 'SUSPENDED'"
              color="success"
              @click="updateStatus('ACTIVE')"
              :loading="updatingStatus"
            >
              Aktivovat
            </UButton>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.members ?? 0 }}</p>
            <p class="text-sm text-gray-500">Členové</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.courses ?? 0 }}</p>
            <p class="text-sm text-gray-500">Kurzy</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.feedPosts ?? 0 }}</p>
            <p class="text-sm text-gray-500">Příspěvky</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.documents ?? 0 }}</p>
            <p class="text-sm text-gray-500">Dokumenty</p>
          </div>
        </div>

        <!-- Members -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-bold mb-4">Členové organizace</h2>
          <UTable
            :rows="members"
            :columns="memberColumns as any"
            :loading="loadingMembers"
          >
            <template #user-data="{ row }: any">
              <div>
                <p class="font-semibold">{{ row.user?.name ?? 'Neznámý' }}</p>
                <p class="text-sm text-gray-500">{{ row.user?.email }}</p>
              </div>
            </template>

            <template #role-data="{ row }: any">
              <UBadge
                :color="(getRoleColor(row.role)) as any"
                :label="getRoleLabel(row.role)"
              />
            </template>

            <template #status-data="{ row }: any">
              <UBadge
                :color="(getMemberStatusColor(row.status)) as any"
                :label="getMemberStatusLabel(row.status)"
              />
            </template>

            <template #actions-data="{ row }: any">
              <div class="flex gap-2">
                <UButton
                  v-if="row.status === 'PENDING'"
                  size="xs"
                  color="success"
                  @click="approveMember(row.id)"
                >
                  Schválit
                </UButton>
                <UButton
                  v-if="row.status === 'PENDING'"
                  size="xs"
                  color="error"
                  variant="soft"
                  @click="rejectMember(row.id)"
                >
                  Zamítnout
                </UButton>
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="removeMemberAction(row.id)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const route = useRoute()
const { get, patch, del } = useApi()
const toast = useToast()

const namespaceId = route.params.id as string
const namespace = ref<any>(null)
const members = ref<any[]>([])
const loading = ref(true)
const loadingMembers = ref(true)
const updatingStatus = ref(false)

const memberColumns = [
  { key: 'user', label: 'Uživatel' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' }
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
    toast.add({ title: `Status změněn na ${getStatusLabel(status)}`, color: 'success' })
  } catch (err) {
    console.error('Failed to update status:', err)
  } finally {
    updatingStatus.value = false
  }
}

async function approveMember(memberId: string) {
  try {
    await patch(`/namespaces/${namespaceId}/members/${memberId}`, { status: 'APPROVED' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to approve member:', err)
  }
}

async function rejectMember(memberId: string) {
  try {
    await patch(`/namespaces/${namespaceId}/members/${memberId}`, { status: 'REJECTED' })
    await loadMembers()
  } catch (err) {
    console.error('Failed to reject member:', err)
  }
}

async function removeMemberAction(memberId: string) {
  if (!confirm('Opravdu chcete odebrat tohoto člena?')) return
  try {
    await del(`/namespaces/${namespaceId}/members/${memberId}`)
    await loadMembers()
  } catch (err) {
    console.error('Failed to remove member:', err)
  }
}

function getStatusColor(status: string) {
  return { ACTIVE: 'green', PENDING: 'yellow', SUSPENDED: 'red' }[status] || 'gray'
}

function getStatusLabel(status: string) {
  return { ACTIVE: 'Aktivní', PENDING: 'Čeká na schválení', SUSPENDED: 'Pozastaveno' }[status] || status
}

function getRoleColor(role: string) {
  return { ORG_ADMIN: 'blue', LECTURER: 'indigo', STUDENT: 'gray' }[role] || 'gray'
}

function getRoleLabel(role: string) {
  return { ORG_ADMIN: 'Správce', LECTURER: 'Lektor', STUDENT: 'Student' }[role] || role
}

function getMemberStatusColor(status: string) {
  return { APPROVED: 'green', PENDING: 'yellow', REJECTED: 'red' }[status] || 'gray'
}

function getMemberStatusLabel(status: string) {
  return { APPROVED: 'Schválen', PENDING: 'Čeká', REJECTED: 'Zamítnut' }[status] || status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}
</script>
