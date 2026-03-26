/**
 * Course Pinia store — Nuxt 3 migration.
 *
 * Replaces the old module-level `ref()` exports with a proper
 * `defineStore` so Pinia can manage the state across SSR / client.
 *
 * Uses the `useApi()` composable for all HTTP calls — the API base URL
 * comes from `runtimeConfig.public.apiBase`.
 */

// ── Types ────────────────────────────────────────────────────────────
export type CourseState = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'ARCHIVED'

export interface CourseModule {
  id: string
  uuid?: string
  courseId: string
  title: string
  description?: string
  content?: string
  order: number
  isRevealed?: boolean
  materials?: any[]
  quizzes?: any[]
  createdAt: string
  updatedAt: string
}

export interface FeedItem {
  uuid: string
  type: 'manual' | 'system'
  message: string
  edited?: boolean
  createdAt: string
  updatedAt?: string
}

export interface CourseSummary {
  uuid: string
  id?: string
  name?: string
  title?: string
  description?: string
  state: CourseState
  scheduledStart?: string | null
  isDuplicate?: boolean
  createdAt?: string
  updatedAt?: string
  ownerId?: string
}

export interface CourseDetail extends CourseSummary {
  materials?: any[]
  modules?: CourseModule[]
  quizzes?: any[]
  feed?: FeedItem[]
}

// ── State badge display helpers ──────────────────────────────────────
export const STATE_META: Record<
  CourseState,
  { label: string; color: string; bg: string; tooltip: string }
> = {
  DRAFT: {
    label: 'Koncept',
    color: '#9CA3AF',
    bg: 'rgba(156,163,175,0.15)',
    tooltip: 'Kurz je ve fázi přípravy – pouze lektor může upravovat obsah.'
  },
  SCHEDULED: {
    label: 'Naplánováno',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
    tooltip: 'Kurz je naplánován a bude zahájen v uvedený čas.'
  },
  LIVE: {
    label: 'Živě',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
    tooltip: 'Kurz právě probíhá – studenti mohou sledovat obsah v reálném čase.'
  },
  PAUSED: {
    label: 'Pozastaveno',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.15)',
    tooltip: 'Kurz je dočasně pozastaven – čeká na pokračování od lektora.'
  },
  ARCHIVED: {
    label: 'Archivováno',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
    tooltip: 'Kurz byl ukončen a je dostupný pouze pro čtení.'
  }
}

// ── Normalize helpers ────────────────────────────────────────────────
function normalizeCourse(c: any): CourseDetail {
  return {
    ...c,
    uuid: c.uuid || c.id,
    name: c.name || c.title,
    title: c.title || c.name,
    state: c.state || 'DRAFT',
    modules: (c.modules || []).map(normalizeModule),
    feed: c.feed || []
  }
}

function normalizeModule(mod: any): CourseModule {
  const normalizedOrder = Number.isFinite(Number(mod.order)) ? Number(mod.order) : 0
  return {
    ...mod,
    id: mod.id || mod.uuid,
    uuid: mod.uuid || mod.id,
    title: mod.title || 'Bez názvu modulu',
    content: mod.content || mod.description || '',
    description: mod.description || mod.content || '',
    order: normalizedOrder,
    isRevealed: Boolean(mod.isRevealed),
    materials: Array.isArray(mod.materials) ? mod.materials : [],
    quizzes: Array.isArray(mod.quizzes) ? mod.quizzes : []
  }
}

// ── Offline / cache helpers (client-only) ────────────────────────────
const CACHE_PREFIX = 'tda_course_'
const SECTION_CACHE_PREFIX = 'tda_course_section_'
type CachedSection = 'overview' | 'feed' | 'modules'

function saveCourseToLocal(id: string, data: any) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ data, cachedAt: new Date().toISOString() }))
  } catch { /* storage full */ }
}

function loadCourseFromLocal(id: string): any | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id)
    return raw ? JSON.parse(raw).data : null
  } catch { return null }
}

function saveSectionToLocal(id: string, section: CachedSection, data: any) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(`${SECTION_CACHE_PREFIX}${id}_${section}`, JSON.stringify({ data, cachedAt: new Date().toISOString() }))
  } catch { /* storage full */ }
}

function loadSectionFromLocal(id: string, section: CachedSection): any | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(`${SECTION_CACHE_PREFIX}${id}_${section}`)
    return raw ? JSON.parse(raw).data : null
  } catch { return null }
}

// ── Store definition ─────────────────────────────────────────────────
export const useCourseStore = defineStore('course', () => {
  // State
  const courses = ref<CourseSummary[]>([])
  const currentCourse = ref<CourseDetail | null>(null)
  const coursesLoading = ref(false)
  const courseLoading = ref(false)
  const courseError = ref<string | null>(null)
  const studentCount = ref(0)
  const courseOverview = ref<CourseSummary | null>(null)
  const courseFeed = ref<FeedItem[]>([])
  const courseModules = ref<CourseModule[]>([])

  // Computed
  const visibleCourses = computed(() =>
    courses.value.filter(c => c.state === 'SCHEDULED' || c.state === 'LIVE' || c.state === 'PAUSED')
  )
  const courseState = computed(() => currentCourse.value?.state ?? null)
  const isDraft = computed(() => courseState.value === 'DRAFT')
  const isScheduled = computed(() => courseState.value === 'SCHEDULED')
  const isLive = computed(() => courseState.value === 'LIVE')
  const isPaused = computed(() => courseState.value === 'PAUSED')
  const isArchived = computed(() => courseState.value === 'ARCHIVED')
  const isEditable = computed(() => courseState.value === 'DRAFT')

  // ── Fetch actions ──────────────────────────────────────────────────
  async function fetchCourses() {
    const { get } = useApi()
    coursesLoading.value = true
    courseError.value = null
    try {
      const data = await get<any[]>('/courses')
      courses.value = (data || []).map(normalizeCourse)
    } catch (err: any) {
      courseError.value = err?.message || 'Nepodařilo se načíst kurzy'
    } finally {
      coursesLoading.value = false
    }
  }

  async function fetchCourse(id: string) {
    const { get } = useApi()
    courseLoading.value = true
    courseError.value = null
    try {
      const data = await get(`/courses/${id}`)
      currentCourse.value = normalizeCourse(data)
    } catch (err: any) {
      courseError.value = err?.message || 'Nepodařilo se načíst kurz'
    } finally {
      courseLoading.value = false
    }
  }

  async function fetchOverview(id: string) {
    const { get } = useApi()
    try {
      const data = await get(`/courses/${id}/overview`)
      courseOverview.value = normalizeCourse(data)
      if (currentCourse.value) {
        currentCourse.value = { ...currentCourse.value, ...courseOverview.value }
      }
      saveSectionToLocal(id, 'overview', courseOverview.value)
      return courseOverview.value
    } catch (err) {
      const cached = loadSectionFromLocal(id, 'overview')
      if (cached) {
        courseOverview.value = normalizeCourse(cached)
        return courseOverview.value
      }
      throw err
    }
  }

  async function fetchFeed(id: string) {
    const { get } = useApi()
    try {
      const data = await get(`/courses/${id}/feed`)
      courseFeed.value = Array.isArray(data) ? data : []
      if (currentCourse.value) {
        currentCourse.value = { ...currentCourse.value, feed: courseFeed.value }
      }
      saveSectionToLocal(id, 'feed', courseFeed.value)
      return courseFeed.value
    } catch (err) {
      const cached = loadSectionFromLocal(id, 'feed')
      if (cached) {
        courseFeed.value = Array.isArray(cached) ? cached : []
        return courseFeed.value
      }
      throw err
    }
  }

  async function fetchModules(id: string) {
    const { get } = useApi()
    try {
      const data = await get<any[]>(`/courses/${id}/modules`)
      courseModules.value = (Array.isArray(data) ? data : []).map(normalizeModule)
      if (currentCourse.value) {
        currentCourse.value = { ...currentCourse.value, modules: courseModules.value }
      }
      saveSectionToLocal(id, 'modules', courseModules.value)
      return courseModules.value
    } catch (err) {
      const cached = loadSectionFromLocal(id, 'modules')
      if (cached) {
        courseModules.value = (Array.isArray(cached) ? cached : []).map(normalizeModule)
        return courseModules.value
      }
      throw err
    }
  }

  async function fetchFullCourseData(id: string) {
    const { get } = useApi()
    try {
      const data = await get(`/courses/${id}/full-data`)
      currentCourse.value = normalizeCourse(data)
      courseOverview.value = normalizeCourse(data)
      courseFeed.value = Array.isArray(data?.feed) ? data.feed : []
      courseModules.value = (Array.isArray(data?.modules) ? data.modules : []).map(normalizeModule)
      if (currentCourse.value) {
        currentCourse.value.feed = courseFeed.value
        currentCourse.value.modules = courseModules.value
      }
      saveCourseToLocal(id, data)
      saveSectionToLocal(id, 'overview', courseOverview.value)
      saveSectionToLocal(id, 'feed', courseFeed.value)
      saveSectionToLocal(id, 'modules', courseModules.value)
      return data
    } catch (err) {
      const cached = loadCourseFromLocal(id)
      if (cached) {
        currentCourse.value = normalizeCourse(cached)
        return cached
      }
      throw err
    }
  }

  // ── State transitions ──────────────────────────────────────────────
  async function scheduleCourse(courseId: string, startTime: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/schedule`, { startTime })
    if (currentCourse.value && (currentCourse.value.uuid === courseId || currentCourse.value.id === courseId)) {
      currentCourse.value.state = res.state
      currentCourse.value.scheduledStart = res.scheduledStart
    }
    return res
  }

  async function rescheduleCourse(courseId: string, startTime: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/reschedule`, { startTime })
    if (currentCourse.value) currentCourse.value.scheduledStart = res.scheduledStart
    return res
  }

  async function revertToDraft(courseId: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/revert-to-draft`, {})
    if (currentCourse.value) currentCourse.value.state = res.state
    return res
  }

  async function startCourse(courseId: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/start`, {})
    if (currentCourse.value) currentCourse.value.state = res.state
    return res
  }

  async function pauseCourse(courseId: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/pause`, {})
    if (currentCourse.value) currentCourse.value.state = res.state
    return res
  }

  async function resumeCourse(courseId: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/resume`, {})
    if (currentCourse.value) currentCourse.value.state = res.state
    return res
  }

  async function archiveCourse(courseId: string) {
    const { post } = useApi()
    const res = await post(`/courses/${courseId}/archive`, {})
    if (currentCourse.value) currentCourse.value.state = res.state
    return res
  }

  async function duplicateCourse(courseId: string) {
    const { post } = useApi()
    return post(`/courses/${courseId}/duplicate`, {})
  }

  // ── Module actions ─────────────────────────────────────────────────
  async function createModule(courseId: string, data: { title: string; content?: string; order?: number }) {
    const { post } = useApi()
    return post(`/courses/${courseId}/modules`, {
      title: data.title,
      ...(data.content !== undefined ? { description: data.content } : {}),
      ...(data.order !== undefined ? { order: data.order } : {})
    })
  }

  async function updateModule(courseId: string, moduleId: string, data: { title?: string; content?: string; order?: number }) {
    const { put } = useApi()
    return put(`/courses/${courseId}/modules/${moduleId}`, {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { description: data.content } : {}),
      ...(data.order !== undefined ? { order: data.order } : {})
    })
  }

  async function deleteModule(courseId: string, moduleId: string) {
    const { del } = useApi()
    await del(`/courses/${courseId}/modules/${moduleId}`)
  }

  async function revealModule(courseId: string, moduleId: string) {
    const { post } = useApi()
    const result = await post(`/courses/${courseId}/modules/${moduleId}/reveal`, {})
    const revealedId = result?.module?.uuid || result?.module?.id || moduleId
    courseModules.value = courseModules.value.map(mod =>
      mod.id === revealedId ? { ...mod, isRevealed: true } : mod
    )
    if (currentCourse.value?.modules) {
      currentCourse.value.modules = courseModules.value
    }
    return result
  }

  async function hideModule(courseId: string, moduleId: string) {
    const { post } = useApi()
    const result = await post(`/courses/${courseId}/modules/${moduleId}/hide`, {})
    courseModules.value = courseModules.value.map(mod =>
      mod.id === moduleId ? { ...mod, isRevealed: false } : mod
    )
    if (currentCourse.value?.modules) {
      currentCourse.value.modules = courseModules.value
    }
    return result
  }

  async function reorderModule(courseId: string, moduleId: string, newOrder: number) {
    const { patch } = useApi()
    const result = await patch(`/courses/${courseId}/modules/${moduleId}/reorder`, { newOrder })
    await fetchModules(courseId)
    return result
  }

  // ── Reset ──────────────────────────────────────────────────────────
  function $reset() {
    courses.value = []
    currentCourse.value = null
    coursesLoading.value = false
    courseLoading.value = false
    courseError.value = null
    studentCount.value = 0
    courseOverview.value = null
    courseFeed.value = []
    courseModules.value = []
  }

  return {
    // State
    courses,
    currentCourse,
    coursesLoading,
    courseLoading,
    courseError,
    studentCount,
    courseOverview,
    courseFeed,
    courseModules,

    // Computed
    visibleCourses,
    courseState,
    isDraft,
    isScheduled,
    isLive,
    isPaused,
    isArchived,
    isEditable,

    // Fetch actions
    fetchCourses,
    fetchCourse,
    fetchOverview,
    fetchFeed,
    fetchModules,
    fetchFullCourseData,

    // State transitions
    scheduleCourse,
    rescheduleCourse,
    revertToDraft,
    startCourse,
    pauseCourse,
    resumeCourse,
    archiveCourse,
    duplicateCourse,

    // Module actions
    createModule,
    updateModule,
    deleteModule,
    reorderModule,
    revealModule,
    hideModule,

    // Reset
    $reset
  }
})
