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

      <section v-else-if="stats" class="statistics-shell">
        <header class="statistics-head">
          <h2 class="statistics-title">Přehled metrik platformy</h2>
          <p class="statistics-lead">
            Souhrn nejdůležitějších čísel pro monitoring kurzů a zapojení uživatelů.
          </p>
        </header>

        <div class="stats-grid">
        <div
          v-for="item in [
            { title: 'Celkový počet kurzů', value: stats.totalCourses, color: 'text-default', icon: 'i-lucide-book-open' },
            { title: 'Aktivní kurzy', value: stats.activeCourses, color: 'text-green-500', icon: 'i-lucide-radio' },
            { title: 'Celkem účastníků', value: stats.totalParticipants, color: 'text-blue-500', icon: 'i-lucide-users' },
            { title: 'Kvízů splněno', value: stats.totalQuizSubmissions, color: 'text-teal-500', icon: 'i-lucide-brain' },
            { title: 'Celkem modulů', value: stats.totalModules, color: 'text-default', icon: 'i-lucide-layers' },
            { title: 'Celkem materiálů', value: stats.totalMaterials, color: 'text-default', icon: 'i-lucide-file' },
            { title: 'Celkem uživatelů', value: stats.totalUsers, color: 'text-purple-500', icon: 'i-lucide-user' },
            { title: 'Organizací', value: stats.totalNamespaces, color: 'text-orange-500', icon: 'i-lucide-building-2' }
          ]"
          :key="item.title"
          class="stat-card"
        >
          <div class="stat-icon-wrap">
            <UIcon :name="item.icon" class="text-lg" :class="item.color" />
          </div>
          <div>
            <p class="text-sm text-muted">{{ item.title }}</p>
            <p class="text-3xl font-bold" :class="item.color">{{ item.value ?? '—' }}</p>
          </div>
        </div>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.statistics-shell {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border-muted);
  border-radius: 1rem;
  padding: 1.25rem;
}

.statistics-head {
  margin-bottom: 1rem;
}

.statistics-title {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 800;
}

.statistics-lead {
  margin: 0;
  color: var(--ui-text-muted);
}

.stats-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.85rem;
  border: 1px solid var(--ui-border-muted);
  background: var(--ui-bg-elevated);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.stat-card:hover {
  border-color: color-mix(in oklab, #0070BB 45%, var(--ui-border));
  transform: translateY(-1px);
}

.stat-icon-wrap {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 0.7rem;
  background: color-mix(in oklab, var(--ui-bg-muted) 84%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .statistics-shell {
    padding: 0.95rem;
  }
}
</style>
