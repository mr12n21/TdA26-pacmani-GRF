<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

useSeoMeta({ title: 'Statistiky' })

const { get } = useApi()
const loading = ref(true)
const stats = ref<any>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    stats.value = await get('/admin/stats')
  } catch (err: any) {
    error.value = err?.data?.message || 'Nepodařilo se načíst statistiky'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <UDashboardPanel id="statistics">
    <template #header>
      <UDashboardNavbar title="Statistiky">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="error" class="text-center py-20">
        <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-4" />
        <p class="text-muted">{{ error }}</p>
      </div>

      <div v-else-if="stats" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in [
            { title: 'Celkový počet kurzů', value: stats.totalCourses, color: 'text-default', icon: 'i-lucide-book-open' },
            { title: 'Aktivní kurzy', value: stats.activeCourses, color: 'text-green-500', icon: 'i-lucide-radio' },
            { title: 'Celkem účastníků', value: stats.totalParticipants, color: 'text-blue-500', icon: 'i-lucide-users' },
            { title: 'Kvízů splněno', value: stats.totalQuizSubmissions, color: 'text-teal-500', icon: 'i-lucide-brain' },
            { title: 'Celkem modulů', value: stats.totalModules, color: 'text-default', icon: 'i-lucide-layers' },
            { title: 'Celkem materiálů', value: stats.totalMaterials, color: 'text-default', icon: 'i-lucide-file' }
          ]"
          :key="item.title"
          class="flex items-center gap-4 p-5 rounded-lg border border-default bg-default"
        >
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
            <UIcon :name="item.icon" class="text-lg" :class="item.color" />
          </div>
          <div>
            <p class="text-sm text-muted">{{ item.title }}</p>
            <p class="text-3xl font-bold" :class="item.color">{{ item.value ?? '—' }}</p>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
