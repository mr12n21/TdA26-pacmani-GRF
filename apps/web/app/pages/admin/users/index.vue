<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Správa uživatelů" />

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Celkem uživatelů</p>
              <p class="text-3xl font-bold mt-1">{{ totalUsers }}</p>
            </div>
            <UIcon name="i-heroicons-users" class="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Super Admini</p>
              <p class="text-3xl font-bold mt-1 text-purple-600">{{ superAdminCount }}</p>
            </div>
            <UIcon name="i-heroicons-shield-check" class="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Běžní uživatelé</p>
              <p class="text-3xl font-bold mt-1 text-green-600">{{ regularUserCount }}</p>
            </div>
            <UIcon name="i-heroicons-user" class="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-6 pb-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-4">
            <UInput
              v-model="searchQuery"
              placeholder="Hledat uživatele..."
              icon="i-heroicons-magnifying-glass"
              class="flex-1"
              @keyup.enter="loadUsers"
            />
            <USelectMenu
              v-model="roleFilter"
              :options="roleOptions"
              placeholder="Všechny role"
            />
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="px-6 pb-6">
        <UTable
          :rows="users"
          :columns="columns as any"
          :loading="loading"
        >
          <template #name-data="{ row }: any">
            <div>
              <p class="font-semibold">{{ row.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ row.email }}</p>
            </div>
          </template>

          <template #globalRole-data="{ row }: any">
            <UBadge
              :color="(row.globalRole === 'SUPER_ADMIN' ? 'secondary' : 'success') as any"
              :label="row.globalRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Uživatel'"
            />
          </template>

          <template #stats-data="{ row }: any">
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span>{{ row._count?.courses ?? 0 }} kurzů</span>
              <span>{{ row._count?.namespaceMembers ?? 0 }} org.</span>
            </div>
          </template>

          <template #createdAt-data="{ row }: any">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #actions-data="{ row }: any">
            <UDropdown :items="getActions(row)">
              <UButton
                icon="i-heroicons-ellipsis-horizontal"
                color="neutral"
                variant="ghost"
              />
            </UDropdown>
          </template>
        </UTable>

        <!-- Pagination -->
        <div v-if="totalUsers > pageSize" class="flex justify-center mt-4">
          <UPagination
            v-model="currentPage"
            :total="totalUsers"
            :page-count="pageSize"
            @update:model-value="loadUsers"
          />
        </div>
      </div>
    </UDashboardPanel>

    <!-- Edit Modal -->
    <UModal v-model="showEditModal">
      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">Upravit uživatele</h2>
        </template>

        <form @submit.prevent="saveUser" class="space-y-4">
          <UFormGroup label="Jméno">
            <UInput v-model="editForm.name" />
          </UFormGroup>

          <UFormGroup label="Email">
            <UInput v-model="editForm.email" type="email" />
          </UFormGroup>

          <UFormGroup label="Globální role">
            <USelectMenu
              v-model="editForm.globalRole"
              :options="[
                { label: 'Uživatel', value: 'USER' },
                { label: 'Super Admin', value: 'SUPER_ADMIN' }
              ]"
              value-attribute="value"
            />
          </UFormGroup>

          <UFormGroup label="Nové heslo (volitelné)">
            <UInput v-model="editForm.password" type="password" placeholder="Ponechte prázdné pro zachování" />
          </UFormGroup>

          <div class="flex justify-end gap-3 pt-4">
            <UButton type="button" color="neutral" variant="ghost" @click="showEditModal = false">
              Zrušit
            </UButton>
            <UButton type="submit" :loading="saving">
              Uložit
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </UDashboardPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const { get, patch, del } = useApi()
const toast = useToast()

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  globalRole: 'SUPER_ADMIN' | 'USER'
  createdAt: string
  _count?: { courses: number; namespaceMembers: number }
}

const users = ref<AdminUser[]>([])
const totalUsers = ref(0)
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('ALL')
const currentPage = ref(1)
const pageSize = 50
const showEditModal = ref(false)
const saving = ref(false)
const editingUserId = ref('')

const editForm = reactive({
  name: '',
  email: '',
  globalRole: 'USER',
  password: ''
})

const columns = [
  { key: 'name', label: 'Uživatel' },
  { key: 'globalRole', label: 'Role' },
  { key: 'stats', label: 'Statistiky' },
  { key: 'createdAt', label: 'Registrace' },
  { key: 'actions', label: '' }
]

const roleOptions = [
  { label: 'Všechny', value: 'ALL' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Uživatel', value: 'USER' }
]

const superAdminCount = computed(() => users.value.filter(u => u.globalRole === 'SUPER_ADMIN').length)
const regularUserCount = computed(() => users.value.filter(u => u.globalRole === 'USER').length)

onMounted(async () => {
  await loadUsers()
})

watch(roleFilter, () => {
  currentPage.value = 1
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (roleFilter.value !== 'ALL') params.set('role', roleFilter.value)
    params.set('page', String(currentPage.value))
    params.set('limit', String(pageSize))

    const data = await get<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`)
    users.value = data.users
    totalUsers.value = data.total
  } catch (err) {
    console.error('Failed to load users:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}

function getActions(user: AdminUser) {
  return [
    [{
      label: 'Upravit',
      icon: 'i-heroicons-pencil',
      click: () => openEditModal(user)
    }],
    [{
      label: 'Smazat',
      icon: 'i-heroicons-trash',
      click: () => deleteUserAction(user)
    }]
  ]
}

function openEditModal(user: AdminUser) {
  editingUserId.value = user.id
  editForm.name = user.name
  editForm.email = user.email
  editForm.globalRole = user.globalRole
  editForm.password = ''
  showEditModal.value = true
}

async function saveUser() {
  saving.value = true
  try {
    const body: any = {
      name: editForm.name,
      email: editForm.email,
      globalRole: editForm.globalRole,
    }
    if (editForm.password) body.password = editForm.password

    await patch(`/admin/users/${editingUserId.value}`, body)
    showEditModal.value = false
    toast.add({ title: 'Uživatel upraven', color: 'success' })
    await loadUsers()
  } catch (err) {
    console.error('Failed to save user:', err)
    toast.add({ title: 'Chyba při ukládání', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function deleteUserAction(user: AdminUser) {
  if (!confirm(`Opravdu chcete smazat uživatele ${user.name}?`)) return
  try {
    await del(`/admin/users/${user.id}`)
    toast.add({ title: 'Uživatel smazán', color: 'success' })
    await loadUsers()
  } catch (err: any) {
    console.error('Failed to delete user:', err)
    toast.add({ title: err?.data?.message || 'Chyba při mazání', color: 'error' })
  }
}
</script>
