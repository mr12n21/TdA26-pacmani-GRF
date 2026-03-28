<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'
import type { FeedItem, CourseModule } from '~/types'

const route = useRoute()
const courseId = route.params.id as string
const courseStore = useCourseStore()
const sse = useSSE()
const toast = useToast()

const feedMessage = ref('')
const sendingFeed = ref(false)
const userStore = useUserStore()

useSeoMeta({
  title: () => courseStore.currentCourse?.title || 'Kurz'
})

// Load course data
const loading = ref(true)
const error = ref<string | null>(null)

async function loadCourse() {
  loading.value = true
  error.value = null
  try {
    await courseStore.fetchFullCourseData(courseId)
    // DRAFT courses require lecturer/admin login
    if (courseStore.currentCourse?.state === 'DRAFT') {
      if (!userStore.isLecturer) {
        return navigateTo('/login')
      }
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Nepodařilo se načíst kurz'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCourse()
  // Connect SSE for live updates
  sse.connect(courseId)

  sse.on('state_changed', (data: any) => {
    if (courseStore.currentCourse) {
      courseStore.currentCourse.state = data.state || data.newState
    }
  })

  sse.on('new_post', (data: any) => {
    if (courseStore.currentCourse?.feed) {
      courseStore.currentCourse.feed.unshift(data)
    }
    courseStore.courseFeed.unshift(data)
  })

  sse.on('module_revealed', (data: any) => {
    const mod = courseStore.courseModules.find(m => m.id === (data.module?.id || data.moduleId))
    if (mod) mod.isRevealed = true
    toast.add({ title: 'Nový modul', description: `Modul "${data.module?.title || ''}" byl odhalen`, color: 'info' })
  })

  sse.on('module_hidden', (data: any) => {
    const mod = courseStore.courseModules.find(m => m.id === (data.module?.id || data.moduleId))
    if (mod) mod.isRevealed = false
  })
})

onBeforeUnmount(() => {
  sse.disconnect()
})

const visibleModules = computed(() =>
  (courseStore.courseModules || [])
    .filter((m: CourseModule) => m.isRevealed)
    .sort((a: CourseModule, b: CourseModule) => a.order - b.order)
)

const sortedFeed = computed(() =>
  [...(courseStore.courseFeed || [])].sort((a: FeedItem, b: FeedItem) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

const stateMeta = computed(() => {
  const state = courseStore.currentCourse?.state
  return state ? STATE_META[state] : null
})

async function sendFeedMessage() {
  if (!feedMessage.value.trim()) return
  sendingFeed.value = true
  try {
    const { post } = useApi()
    await post(`/courses/${courseId}/feed`, { message: feedMessage.value })
    feedMessage.value = ''
  } catch {
    toast.add({ title: 'Chyba', description: 'Zprávu se nepodařilo odeslat', color: 'error' })
  } finally {
    sendingFeed.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-red-500 mb-4" />
      <p class="text-muted">{{ error }}</p>
      <UButton label="Zkusit znovu" class="mt-4" @click="loadCourse" />
    </div>

    <!-- Course content -->
    <div v-else-if="courseStore.currentCourse">
      <!-- Header -->
      <div class="mb-8">
        <UButton icon="i-lucide-arrow-left" label="Zpět na kurzy" to="/courses" variant="ghost" color="neutral" class="mb-4" />

        <div class="flex flex-wrap items-center gap-3 mb-2">
          <h1 class="text-3xl font-bold">{{ courseStore.currentCourse.title }}</h1>
          <UBadge
            v-if="stateMeta"
            :label="stateMeta.label"
            :style="{ backgroundColor: stateMeta.bg, color: stateMeta.color }"
          />
        </div>

        <p v-if="courseStore.currentCourse.description" class="text-muted text-lg">
          {{ courseStore.currentCourse.description }}
        </p>

        <!-- SSE status -->
        <div class="flex items-center gap-4 mt-4 text-sm text-muted">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full" :class="sse.connected.value ? 'bg-green-500' : 'bg-red-500'" />
            {{ sse.connected.value ? 'Připojeno živě' : 'Odpojeno' }}
          </span>
          <span v-if="sse.studentCount.value > 0">
            <UIcon name="i-lucide-users" /> {{ sse.studentCount.value }} {{ sse.studentCount.value === 1 ? 'student' : 'studentů' }}
          </span>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Modules (left 2/3) -->
        <div class="lg:col-span-2 space-y-4">
          <h2 class="text-xl font-semibold mb-4">
            <UIcon name="i-lucide-layers" /> Moduly
          </h2>

          <div v-if="visibleModules.length === 0" class="text-center py-12 bg-muted rounded-lg">
            <UIcon name="i-lucide-clock" class="text-3xl text-muted mb-2" />
            <p class="text-muted">Zatím nebyly odhaleny žádné moduly.</p>
            <p class="text-sm text-muted">Počkejte, až lektor odhalí obsah.</p>
          </div>

          <UPageCard
            v-for="mod in visibleModules"
            :key="mod.id"
            :title="mod.title"
          >
            <template #description>
              <p v-if="mod.description" class="text-sm text-muted mb-3">{{ mod.description }}</p>

              <!-- Materials -->
              <div v-if="mod.materials && mod.materials.length" class="mb-3">
                <p class="text-xs font-semibold text-muted uppercase mb-1">Materiály</p>
                <div class="space-y-1">
                  <div v-for="mat in mod.materials" :key="mat.id" class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-file" class="text-muted" />
                    <a v-if="mat.url" :href="mat.url" target="_blank" rel="noopener" class="text-primary hover:underline">{{ mat.title }}</a>
                    <span v-else>{{ mat.title }}</span>
                  </div>
                </div>
              </div>

              <!-- Quizzes -->
              <div v-if="mod.quizzes && mod.quizzes.length">
                <p class="text-xs font-semibold text-muted uppercase mb-1">Kvízy</p>
                <div class="space-y-1">
                  <NuxtLink
                    v-for="quiz in mod.quizzes"
                    :key="quiz.id"
                    :to="`/courses/${courseId}?quiz=${quiz.id}`"
                    class="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <UIcon name="i-lucide-brain" />
                    {{ quiz.title }}
                  </NuxtLink>
                </div>
              </div>
            </template>
          </UPageCard>
        </div>

        <!-- Feed (right 1/3) -->
        <div>
          <h2 class="text-xl font-semibold mb-4">
            <UIcon name="i-lucide-message-circle" /> Feed
          </h2>

          <!-- Send message (if logged in) -->
          <form v-if="userStore.isAuthenticated" class="mb-4" @submit.prevent="sendFeedMessage">
            <div class="flex gap-2">
              <UInput
                v-model="feedMessage"
                placeholder="Napsat zprávu..."
                class="flex-1"
                :disabled="sendingFeed"
              />
              <UButton
                type="submit"
                icon="i-lucide-send"
                color="primary"
                :disabled="!feedMessage.trim() || sendingFeed"
                :loading="sendingFeed"
              />
            </div>
          </form>

          <div v-if="sortedFeed.length === 0" class="text-center py-8 text-muted text-sm">
            Zatím žádné zprávy
          </div>

          <div v-else class="space-y-3 max-h-[600px] overflow-y-auto">
            <div
              v-for="item in sortedFeed"
              :key="item.uuid"
              class="p-3 rounded-lg bg-muted"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium">
                  {{ item.author?.name || (item.type === 'AUTO' || item.type === 'system' ? 'Systém' : 'Anonym') }}
                </span>
                <span class="text-xs text-muted">
                  {{ new Date(item.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
              <p class="text-sm">{{ item.message || item.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>
