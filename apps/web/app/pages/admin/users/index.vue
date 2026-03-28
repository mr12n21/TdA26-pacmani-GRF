<template>
  <UDashboardPage>
    <UDashboardPanel grow class="min-h-[50vh]">
      <UDashboardNavbar title="Správa uživatelů" />

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Celkem uživatelů</p>
          <p class="text-3xl font-bold mt-1">{{ totalUsers }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Super Admini</p>
          <p class="text-3xl font-bold mt-1 text-blue-600">{{ superAdminCount }}</p>
        </div>
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
          <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Běžní uživatelé</p>
          <p class="text-3xl font-bold mt-1 text-green-600">{{ regularUserCount }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-6 pb-4">
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
            value-attribute="value"
            placeholder="Všechny role"
          />
        </div>
      </div>

      <!-- Users Table -->
      <div class="px-6 pb-6">
        <UTable
          :data="users"
          :columns="columns"
          :loading="loading"
        >
          <template #name-cell="{ row }">
            <div>
              <p class="font-semibold">{{ row.original.name }}</p>
              <p class="text-sm text-[var(--ui-text-muted)]">{{ row.original.email }}</p>
            </div>
          </template>

          <template #globalRole-cell="{ row }">
            <UBadge
              :color="(row.original.globalRole === 'SUPER_ADMIN' ? 'secondary' : 'success') as any"
              :label="row.original.globalRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Uživatel'"
            />
          </template>

          <template #stats-cell="{ row }">
            <div class="flex items-center gap-3 text-sm text-[var(--ui-text-muted)]">
              <span>{{ row.original._count?.courses ?? 0 }} kurzů</span>
              <span>{{ row.original._count?.namespaceMembers ?? 0 }} org.</span>
            </div>
          </template>

          <template #createdAt-cell="{ row }">
            <span class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(row.original.createdAt) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UButton
                icon="i-heroicons-pencil"
                color="neutral"
                size="xs"
                variant="ghost"
                @click="openEditModal(row.original)"
              />
              <UButton
                icon="i-heroicons-trash"
                color="error"
                size="xs"
                variant="ghost"
                @click="deleteUserAction(row.original)"
              />
            </div>
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
    <UModal v-model:open="showEditModal">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">Upravit uživatele</h2>
          </template>

          <form @submit.prevent="saveUser" class="space-y-4">
            <UFormField label="Jméno">
              <UInput v-model="editForm.name" />
            </UFormField>

            <UFormField label="Email">
              <UInput v-model="editForm.email" type="email" />
            </UFormField>

            <UFormField label="Globální role">
              <USelectMenu
                v-model="editForm.globalRole"
                :options="[
                  { label: 'Uživatel', value: 'USER' },
                  { label: 'Super Admin', value: 'SUPER_ADMIN' }
                ]"
                value-attribute="value"
              />
            </UFormField>

            <UFormField label="Nové heslo (volitelné)">
              <UInput v-model="editForm.password" type="password" placeholder="Ponechte prázdné pro zachování" />
            </UFormField>

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

const columns: TableColumn<AdminUser>[] = [
  { accessorKey: 'name', header: 'Uživatel' },
  { accessorKey: 'globalRole', header: 'Role' },
  { accessorKey: 'stats', header: 'Statistiky' },
  { accessorKey: 'createdAt', header: 'Registrace' },
  { accessorKey: 'actions', header: '' }
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