<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Kvízy">
        <template #right>
          <UInput
            v-model="searchQuery"
            placeholder="Hledat kvíz..."
            icon="i-heroicons-magnifying-glass"
            class="w-64"
          />
        </template>
      </UDashboardNavbar>

      <div v-if="!userStore.hasActiveNamespace" class="flex flex-col items-center justify-center py-20 text-center">
        <UIcon name="i-heroicons-building-office" class="w-12 h-12 text-[var(--ui-text-muted)] mb-4" />
        <p class="text-lg font-semibold">Žádný aktivní namespace</p>
        <p class="text-[var(--ui-text-muted)]">Vyberte organizaci v levém panelu.</p>
      </div>

      <div v-else>
        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
            <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Celkem kvízů</p>
            <p class="text-3xl font-bold mt-1">{{ quizzes.length }}</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
            <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Viditelné</p>
            <p class="text-3xl font-bold mt-1 text-green-600">{{ visibleCount }}</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
            <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Skryté</p>
            <p class="text-3xl font-bold mt-1 text-amber-500">{{ hiddenCount }}</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
            <p class="text-xs font-medium text-[var(--ui-text-muted)] uppercase tracking-wide">Celkem pokusů</p>
            <p class="text-3xl font-bold mt-1 text-blue-600">{{ totalAttempts }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="px-6 pb-4 flex items-center gap-4">
          <USelectMenu
            v-model="courseFilter"
            :options="courseOptions"
            value-attribute="value"
            placeholder="Všechny kurzy"
            class="w-56"
          />
          <USelectMenu
            v-model="visibilityFilter"
            :options="visibilityOptions"
            value-attribute="value"
            placeholder="Všechny"
            class="w-44"
          />
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-20">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredQuizzes.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-lucide-file-question" class="w-12 h-12 text-[var(--ui-text-muted)] mb-4" />
          <p class="text-lg font-semibold">Žádné kvízy</p>
          <p class="text-[var(--ui-text-muted)]">
            {{ searchQuery || courseFilter !== 'ALL' || visibilityFilter !== 'ALL'
              ? 'Zkuste upravit filtry.'
              : 'Vytvořte kvíz v některém z kurzů.' }}
          </p>
        </div>

        <!-- Quiz Cards -->
        <div v-else class="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="quiz in filteredQuizzes"
            :key="quiz.id"
            class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-bold truncate">{{ quiz.title }}</h3>
                <p class="text-sm text-[var(--ui-text-muted)] truncate">{{ quiz.description || '—' }}</p>
              </div>
              <UBadge
                :color="quiz.isVisible ? 'success' : 'warning'"
                :label="quiz.isVisible ? 'Viditelný' : 'Skrytý'"
                size="sm"
              />
            </div>

            <div class="text-sm text-[var(--ui-text-muted)] space-y-1">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-book-open" class="w-4 h-4" />
                <span class="truncate">{{ quiz.courseName }}</span>
                <UBadge
                  :color="getStateColor(quiz.courseState)"
                  :label="getStateLabel(quiz.courseState)"
                  size="xs"
                />
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-layers" class="w-4 h-4" />
                <span class="truncate">{{ quiz.moduleName }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-help-circle" class="w-4 h-4" />
                  {{ quiz.questions?.length ?? 0 }} otázek
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-users" class="w-4 h-4" />
                  {{ quiz.timesTaken ?? 0 }} pokusů
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--ui-border)]">
              <UButton
                size="xs"
                :icon="quiz.isVisible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                :label="quiz.isVisible ? 'Skrýt' : 'Zobrazit'"
                :color="quiz.isVisible ? 'warning' : 'success'"
                variant="soft"
                @click="toggleVisibility(quiz)"
                :loading="togglingId === quiz.id"
              />
              <UButton
                size="xs"
                icon="i-heroicons-pencil"
                label="Upravit"
                color="neutral"
                variant="ghost"
                :to="`/dashboard/courses/${quiz.courseId}`"
              />
            </div>
          </div>
        </div>
      </div>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'namespace']
})

const userStore = useUserStore()
const { get, put } = useApi()
const toast = useToast()

interface NamespaceQuiz {
  id: string
  moduleId: string
  title: string
  description?: string
  isVisible: boolean
  timesTaken: number
  questions?: any[]
  createdAt: string
  courseName: string
  courseId: string
  courseState: string
  moduleName: string
}

const quizzes = ref<NamespaceQuiz[]>([])
const loading = ref(true)
const searchQuery = ref('')
const courseFilter = ref('ALL')
const visibilityFilter = ref('ALL')
const togglingId = ref('')

const visibilityOptions = [
  { label: 'Všechny', value: 'ALL' },
  { label: 'Viditelné', value: 'visible' },
  { label: 'Skryté', value: 'hidden' }
]

const courseOptions = computed(() => {
  const courses = new Map<string, string>()
  for (const q of quizzes.value) {
    courses.set(q.courseId, q.courseName)
  }
  return [
    { label: 'Všechny kurzy', value: 'ALL' },
    ...Array.from(courses.entries()).map(([id, name]) => ({ label: name, value: id }))
  ]
})

const filteredQuizzes = computed(() => {
  let result = quizzes.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(quiz =>
      quiz.title.toLowerCase().includes(q) ||
      quiz.description?.toLowerCase().includes(q) ||
      quiz.courseName.toLowerCase().includes(q)
    )
  }
  if (courseFilter.value !== 'ALL') {
    result = result.filter(quiz => quiz.courseId === courseFilter.value)
  }
  if (visibilityFilter.value === 'visible') {
    result = result.filter(quiz => quiz.isVisible)
  } else if (visibilityFilter.value === 'hidden') {
    result = result.filter(quiz => !quiz.isVisible)
  }
  return result
})

const visibleCount = computed(() => quizzes.value.filter(q => q.isVisible).length)
const hiddenCount = computed(() => quizzes.value.filter(q => !q.isVisible).length)
const totalAttempts = computed(() => quizzes.value.reduce((sum, q) => sum + (q.timesTaken ?? 0), 0))

const nsId = computed(() => userStore.activeNamespace?.id)

onMounted(async () => {
  if (nsId.value) await loadQuizzes()
})

async function loadQuizzes() {
  loading.value = true
  try {
    quizzes.value = await get<NamespaceQuiz[]>(`/namespaces/${nsId.value}/quizzes`)
  } catch (err) {
    console.error('Failed to load quizzes:', err)
  } finally {
    loading.value = false
  }
}

async function toggleVisibility(quiz: NamespaceQuiz) {
  togglingId.value = quiz.id
  try {
    await put(`/courses/${quiz.courseId}/quizzes/${quiz.id}`, {
      isVisible: !quiz.isVisible,
    })
    quiz.isVisible = !quiz.isVisible
    toast.add({
      title: quiz.isVisible ? 'Kvíz zobrazen' : 'Kvíz skryt',
      color: 'success'
    })
  } catch (err) {
    console.error('Failed to toggle visibility:', err)
    toast.add({ title: 'Chyba při změně viditelnosti', color: 'error' })
  } finally {
    togglingId.value = ''
  }
}

function getStateColor(state: string): any {
  return {
    DRAFT: 'neutral',
    SCHEDULED: 'info',
    LIVE: 'success',
    PAUSED: 'warning',
    ARCHIVED: 'secondary'
  }[state] || 'neutral'
}

function getStateLabel(state: string): string {
  return {
    DRAFT: 'Koncept',
    SCHEDULED: 'Naplánováno',
    LIVE: 'Živě',
    PAUSED: 'Pozastaveno',
    ARCHIVED: 'Archivováno'
  }[state] || state
}
</script>
