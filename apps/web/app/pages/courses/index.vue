<script setup lang="ts">
import type { CourseSummary } from '~/types'
import { STATE_META } from '~/stores/course'

useSeoMeta({
  title: 'Kurzy',
  description: 'Prohlédněte si dostupné kurzy'
})

const { get } = useApi()
const loading = ref(true)
const courses = ref<CourseSummary[]>([])
const error = ref<string | null>(null)
const search = ref('')

async function loadCourses() {
  loading.value = true
  try {
    const data = await get<CourseSummary[]>('/courses?scope=public')
    courses.value = data || []
  } catch (err: any) {
    error.value = err?.data?.message || 'Nepodařilo se načíst kurzy'
  } finally {
    loading.value = false
  }
}

const filteredCourses = computed(() => {
  const q = search.value.toLowerCase()
  const visible = courses.value.filter(c =>
    c.state === 'SCHEDULED' || c.state === 'LIVE' || c.state === 'PAUSED' || c.state === 'ARCHIVED'
  )
  if (!q) return visible
  return visible.filter(c =>
    (c.title || '').toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q)
  )
})

onMounted(loadCourses)
</script>

<template>
  <UContainer class="py-12">
    <!-- Header with search -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 fade-in">
      <div>
        <h1 class="text-3xl font-bold mb-1">Kurzy</h1>
        <p class="text-muted">Prohlédněte si dostupné kurzy a připojte se</p>
      </div>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Hledat kurzy..."
        class="w-full sm:w-64"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-4">
        <UIcon name="i-lucide-loader" class="text-3xl text-muted animate-spin" />
        <p class="text-muted">Načítám kurzy...</p>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-4" />
      <p class="text-muted">{{ error }}</p>
      <UButton label="Zkusit znovu" class="mt-4" @click="loadCourses" />
    </div>

    <div v-else-if="filteredCourses.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
      <p class="text-muted">{{ search ? 'Žádné kurzy neodpovídají hledání' : 'Zatím nejsou k dispozici žádné kurzy' }}</p>
    </div>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="(course, i) in filteredCourses"
        :key="course.uuid"
        :to="`/courses/${course.uuid}`"
        class="block"
      >
        <div
          class="rounded-xl border border-default bg-elevated p-5 card-glow h-full"
          :class="`fade-in-d${Math.min(i + 1, 5)}`"
        >
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg font-bold">{{ course.title || 'Bez názvu' }}</span>
            <UBadge
              :label="STATE_META[course.state]?.label || course.state"
              :style="{ backgroundColor: STATE_META[course.state]?.bg, color: STATE_META[course.state]?.color }"
              size="sm"
            />
          </div>
          <p class="text-sm text-muted line-clamp-2 mb-3">
            {{ course.description || 'Bez popisu' }}
          </p>
          <p v-if="course.scheduledStart" class="text-xs text-muted flex items-center gap-1">
            <UIcon name="i-lucide-calendar" class="inline" />
            {{ new Date(course.scheduledStart).toLocaleString('cs-CZ') }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </UContainer>
</template>
