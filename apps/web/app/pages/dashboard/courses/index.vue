<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

useSeoMeta({ title: 'Moje kurzy' })

const courseStore = useCourseStore()
const toast = useToast()
const loading = ref(true)
const creating = ref(false)
const filter = ref<string>('ALL')
const search = ref('')

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
  } finally {
    loading.value = false
  }
})

const filteredCourses = computed(() => {
  const byState = filter.value === 'ALL'
    ? courseStore.courses
    : courseStore.courses.filter((c: any) => c.state === filter.value)

  const q = search.value.trim().toLowerCase()
  if (!q) return byState

  return byState.filter((c: any) =>
    (c.title || '').toLowerCase().includes(q)
    || (c.description || '').toLowerCase().includes(q)
  )
})

async function createCourse() {
  creating.value = true
  try {
    const { post } = useApi()
    const course = await post('/courses', { title: 'Nový kurz', description: '' })
    toast.add({ title: 'Kurz vytvořen', color: 'success' })
    navigateTo(`/dashboard/courses/${course.uuid || course.id}`)
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se vytvořit kurz', color: 'error' })
  } finally {
    creating.value = false
  }
}

async function deleteCourse(id: string) {
  try {
    const { del } = useApi()
    await del(`/courses/${id}`)
    await courseStore.fetchCourses()
    toast.add({ title: 'Kurz smazán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se smazat kurz', color: 'error' })
  }
}

const stateFilters = [
  { label: 'Vše', value: 'ALL' },
  { label: 'Koncepty', value: 'DRAFT' },
  { label: 'Naplánováno', value: 'SCHEDULED' },
  { label: 'Živě', value: 'LIVE' },
  { label: 'Pozastaveno', value: 'PAUSED' },
  { label: 'Archivováno', value: 'ARCHIVED' }
]
</script>

<template>
  <UDashboardPanel id="courses">
    <template #header>
      <UDashboardNavbar title="Moje kurzy" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <TdaButton icon="i-lucide-plus" :loading="creating" @click="createCourse">
            Nový kurz
          </TdaButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="filters-row">
            <div class="state-tabs">
              <TdaButton
              v-for="f in stateFilters"
              :key="f.value"
              size="sm"
              :variant="filter === f.value ? 'primary' : 'ghost'"
              @click="filter = f.value"
              >{{ f.label }}</TdaButton>
            </div>

            <div class="search-wrap">
              <UIcon name="i-lucide-search" class="search-icon" />
              <input
                v-model="search"
                type="text"
                class="search-input"
                placeholder="Hledat kurz..."
              />
            </div>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="filteredCourses.length === 0" class="empty-state">
        <UIcon name="i-lucide-book-open" class="text-3xl text-muted mb-2" />
        <p class="text-muted">Žádné kurzy</p>
      </div>

      <div v-else class="course-list">
        <div
          v-for="course in filteredCourses"
          :key="course.uuid"
          class="course-row"
        >
          <NuxtLink :to="`/dashboard/courses/${course.uuid}`" class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <h3 class="font-semibold truncate">{{ course.title || 'Bez názvu' }}</h3>
              <UBadge
                :label="STATE_META[course.state]?.label || course.state"
                :style="{ backgroundColor: STATE_META[course.state]?.bg, color: STATE_META[course.state]?.color }"
                size="sm"
              />
            </div>
            <p class="text-sm text-muted truncate">{{ course.description || 'Bez popisu' }}</p>
          </NuxtLink>

          <div class="flex gap-1 shrink-0">
            <TdaButton
              icon="i-lucide-pencil"
              size="sm"
              variant="ghost"
              :to="`/dashboard/courses/${course.uuid}`"
            >Upravit</TdaButton>
            <TdaButton
              v-if="course.state === 'DRAFT'"
              icon="i-lucide-trash-2"
              size="sm"
              variant="danger"
              @click.prevent="deleteCourse(course.uuid)"
            >Smazat</TdaButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.filters-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.state-tabs {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  min-width: min(100%, 280px);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-dimmed);
}

.search-input {
  width: 100%;
  border: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 90%, transparent);
  color: var(--ui-text);
  border-radius: 0.7rem;
  padding: 0.56rem 0.75rem 0.56rem 2.2rem;
  font: inherit;
}

.search-input:focus {
  outline: none;
  border-color: color-mix(in oklab, #0070BB 60%, var(--ui-border));
  box-shadow: 0 0 0 3px color-mix(in oklab, #0070BB 18%, transparent);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  border: 1px dashed var(--ui-border-accented);
  border-radius: 0.85rem;
  background: color-mix(in oklab, var(--ui-bg-muted) 72%, transparent);
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.course-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.85rem;
  background: color-mix(in oklab, var(--ui-bg-elevated) 90%, transparent);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.course-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, #0070BB 48%, var(--ui-border));
}

@media (max-width: 768px) {
  .search-wrap {
    min-width: 100%;
  }

  .course-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
