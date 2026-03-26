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

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
  } finally {
    loading.value = false
  }
})

const filteredCourses = computed(() => {
  if (filter.value === 'ALL') return courseStore.courses
  return courseStore.courses.filter(c => c.state === filter.value)
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
          <UButton
            label="Nový kurz"
            icon="i-lucide-plus"
            color="primary"
            :loading="creating"
            @click="createCourse"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex gap-2 flex-wrap -ms-1">
            <UButton
              v-for="f in stateFilters"
              :key="f.value"
              :label="f.label"
              :color="filter === f.value ? 'primary' : 'neutral'"
              :variant="filter === f.value ? 'solid' : 'outline'"
              size="sm"
              @click="filter = f.value"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="filteredCourses.length === 0" class="text-center py-16 bg-muted rounded-lg">
        <UIcon name="i-lucide-book-open" class="text-3xl text-muted mb-2" />
        <p class="text-muted">Žádné kurzy</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="course in filteredCourses"
          :key="course.uuid"
          class="flex items-center justify-between gap-4 p-4 rounded-lg border border-default bg-default hover:bg-muted transition-colors"
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
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              :to="`/dashboard/courses/${course.uuid}`"
            />
            <UButton
              v-if="course.state === 'DRAFT'"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              @click.prevent="deleteCourse(course.uuid)"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
