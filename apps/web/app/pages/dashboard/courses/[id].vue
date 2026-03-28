<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'
import type { CourseModule, Material, Quiz, Question } from '~/types'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const route = useRoute()
const courseId = route.params.id as string
const courseStore = useCourseStore()
const toast = useToast()
const { post, put, del, postForm, putForm, get } = useApi()
const loading = ref(true)
const saving = ref(false)

const title = ref('')
const description = ref('')

useSeoMeta({
  title: () => `Upravit: ${courseStore.currentCourse?.title || 'Kurz'}`
})

async function loadCourse() {
  loading.value = true
  try {
    await courseStore.fetchFullCourseData(courseId)
    if (courseStore.currentCourse) {
      title.value = courseStore.currentCourse.title || ''
      description.value = courseStore.currentCourse.description || ''
    }
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.message || 'Nepodařilo se načíst kurz', color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(loadCourse)

async function reloadModules() {
  await courseStore.fetchModules(courseId)
}

async function saveCourse() {
  saving.value = true
  try {
    await put(`/courses/${courseId}`, { title: title.value, description: description.value })
    toast.add({ title: 'Uloženo', color: 'success' })
    await courseStore.fetchCourse(courseId)
    if (courseStore.currentCourse) {
      title.value = courseStore.currentCourse.title || ''
      description.value = courseStore.currentCourse.description || ''
    }
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se uložit', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── State transitions ─────────────────────────────────────────
const transitioning = ref(false)
const scheduleDate = ref('')

async function doTransition(action: string, body?: any) {
  transitioning.value = true
  try {
    const res = await post(`/courses/${courseId}/${action}`, body || {})
    if (courseStore.currentCourse) {
      courseStore.currentCourse.state = res.state
      if (res.scheduledStart) courseStore.currentCourse.scheduledStart = res.scheduledStart
    }
    toast.add({ title: 'Stav změněn', description: `Kurz je nyní: ${STATE_META[res.state]?.label || res.state}`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se změnit stav', color: 'error' })
  } finally {
    transitioning.value = false
  }
}

async function schedule() {
  if (!scheduleDate.value) return toast.add({ title: 'Zadejte datum', color: 'warning' })
  await doTransition('schedule', { startTime: new Date(scheduleDate.value).toISOString() })
}

// ── Modules ───────────────────────────────────────────────────
const newModuleTitle = ref('')
const creatingModule = ref(false)
const expandedModuleId = ref<string | null>(null)
const editingModuleId = ref<string | null>(null)
const editModuleTitle = ref('')
const editModuleDesc = ref('')
const draggingModuleId = ref<string | null>(null)
const dragOverModuleId = ref<string | null>(null)

const sortedModules = computed(() =>
  [...(courseStore.courseModules || [])].sort((a: CourseModule, b: CourseModule) => a.order - b.order)
)

function toggleExpand(modId: string) {
  expandedModuleId.value = expandedModuleId.value === modId ? null : modId
}

function startEditModule(mod: CourseModule) {
  editingModuleId.value = mod.id
  editModuleTitle.value = mod.title
  editModuleDesc.value = mod.description || ''
}

async function saveEditModule(modId: string) {
  try {
    await courseStore.updateModule(courseId, modId, { title: editModuleTitle.value, content: editModuleDesc.value })
    editingModuleId.value = null
    await reloadModules()
    toast.add({ title: 'Modul upraven', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se upravit modul', color: 'error' })
  }
}

async function addModule() {
  if (!newModuleTitle.value.trim()) return
  creatingModule.value = true
  try {
    await courseStore.createModule(courseId, { title: newModuleTitle.value, order: courseStore.courseModules.length })
    newModuleTitle.value = ''
    await reloadModules()
    toast.add({ title: 'Modul přidán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se přidat modul', color: 'error' })
  } finally {
    creatingModule.value = false
  }
}

async function removeModule(moduleId: string) {
  if (!confirm('Opravdu smazat modul a veškerý jeho obsah?')) return
  try {
    await courseStore.deleteModule(courseId, moduleId)
    if (expandedModuleId.value === moduleId) expandedModuleId.value = null
    await reloadModules()
    toast.add({ title: 'Modul smazán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se smazat modul', color: 'error' })
  }
}

async function toggleReveal(mod: CourseModule) {
  try {
    if (mod.isRevealed) {
      await courseStore.hideModule(courseId, mod.id)
    } else {
      await courseStore.revealModule(courseId, mod.id)
    }
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Viditelnost se nepodařilo změnit', color: 'error' })
  }
}

function onModuleDragStart(moduleId: string) {
  if (!courseStore.isEditable) return
  draggingModuleId.value = moduleId
}
function onModuleDragOver(event: DragEvent, moduleId: string) {
  if (!courseStore.isEditable || draggingModuleId.value === moduleId) return
  event.preventDefault()
  dragOverModuleId.value = moduleId
}
function onModuleDragLeave(moduleId: string) {
  if (dragOverModuleId.value === moduleId) dragOverModuleId.value = null
}
function onModuleDragEnd() {
  draggingModuleId.value = null
  dragOverModuleId.value = null
}
async function onModuleDrop(targetModuleId: string) {
  if (!courseStore.isEditable || !draggingModuleId.value || draggingModuleId.value === targetModuleId) {
    onModuleDragEnd()
    return
  }
  const modules = sortedModules.value
  const targetIndex = modules.findIndex(mod => mod.id === targetModuleId)
  if (targetIndex < 0) { onModuleDragEnd(); return }
  try {
    await courseStore.reorderModule(courseId, draggingModuleId.value, targetIndex + 1)
    toast.add({ title: 'Pořadí aktualizováno', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se změnit pořadí', color: 'error' })
  } finally {
    onModuleDragEnd()
  }
}

// ── Materials ─────────────────────────────────────────────────
const addingMaterialTo = ref<string | null>(null)
const matType = ref<'TEXT' | 'FILE' | 'URL'>('TEXT')
const matTitle = ref('')
const matDesc = ref('')
const matUrl = ref('')
const matFile = ref<File | null>(null)
const matSaving = ref(false)

const editingMaterial = ref<{ moduleId: string; material: Material } | null>(null)
const editMatTitle = ref('')
const editMatDesc = ref('')
const editMatUrl = ref('')

function startAddMaterial(modId: string) {
  addingMaterialTo.value = modId
  matType.value = 'TEXT'
  matTitle.value = ''
  matDesc.value = ''
  matUrl.value = ''
  matFile.value = null
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  matFile.value = input.files?.[0] || null
}

async function submitMaterial(moduleId: string) {
  if (!matTitle.value.trim()) return
  matSaving.value = true
  try {
    if (matType.value === 'FILE' && matFile.value) {
      const fd = new FormData()
      fd.append('type', 'FILE')
      fd.append('title', matTitle.value)
      fd.append('description', matDesc.value)
      fd.append('file', matFile.value)
      await postForm(`/courses/${courseId}/modules/${moduleId}/materials`, fd)
    } else {
      await post(`/courses/${courseId}/modules/${moduleId}/materials`, {
        type: matType.value,
        title: matTitle.value,
        description: matDesc.value,
        ...(matType.value === 'URL' ? { url: matUrl.value } : {})
      })
    }
    addingMaterialTo.value = null
    await reloadModules()
    toast.add({ title: 'Materiál přidán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se přidat materiál', color: 'error' })
  } finally {
    matSaving.value = false
  }
}

function startEditMaterial(moduleId: string, mat: Material) {
  editingMaterial.value = { moduleId, material: mat }
  editMatTitle.value = mat.title || ''
  editMatDesc.value = mat.description || ''
  editMatUrl.value = mat.url || ''
}

async function saveEditMaterial() {
  if (!editingMaterial.value) return
  const { moduleId, material } = editingMaterial.value
  try {
    await put(`/courses/${courseId}/modules/${moduleId}/materials/${material.id}`, {
      title: editMatTitle.value,
      description: editMatDesc.value,
      ...(material.type === 'URL' ? { url: editMatUrl.value } : {})
    })
    editingMaterial.value = null
    await reloadModules()
    toast.add({ title: 'Materiál upraven', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se upravit materiál', color: 'error' })
  }
}

async function deleteMaterial(moduleId: string, materialId: string) {
  if (!confirm('Smazat materiál?')) return
  try {
    await del(`/courses/${courseId}/modules/${moduleId}/materials/${materialId}`)
    await reloadModules()
    toast.add({ title: 'Materiál smazán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se smazat', color: 'error' })
  }
}

function materialTypeLabel(type: string) {
  return { TEXT: 'Článek', FILE: 'Soubor', URL: 'Odkaz', VIDEO: 'Video' }[type] || type
}

function materialTypeIcon(type: string) {
  return { TEXT: 'i-lucide-file-text', FILE: 'i-lucide-file-down', URL: 'i-lucide-link', VIDEO: 'i-lucide-video' }[type] || 'i-lucide-file'
}

// ── Quizzes ───────────────────────────────────────────────────
const addingQuizTo = ref<string | null>(null)
const quizTitle = ref('')
const quizQuestions = ref<Array<{ text: string; type: string; choices: string; correctAnswer: string }>>([])
const quizSaving = ref(false)

const editingQuiz = ref<{ moduleId: string; quiz: Quiz } | null>(null)
const editQuizTitle = ref('')
const editQuizQuestions = ref<Array<{ text: string; type: string; choices: string; correctAnswer: string }>>([])

function emptyQuestion() {
  return { text: '', type: 'SINGLE_CHOICE', choices: '', correctAnswer: '0' }
}

function startAddQuiz(modId: string) {
  addingQuizTo.value = modId
  quizTitle.value = ''
  quizQuestions.value = [emptyQuestion()]
}

function addQuestion(arr: typeof quizQuestions.value) {
  arr.push(emptyQuestion())
}

function removeQuestion(arr: typeof quizQuestions.value, idx: number) {
  if (arr.length > 1) arr.splice(idx, 1)
}

function buildQuestions(arr: typeof quizQuestions.value) {
  return arr.map(q => {
    const base: any = { text: q.text, type: q.type }
    if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
      base.choices = q.choices.split('\n').map((c: string) => c.trim()).filter(Boolean)
    }
    if (q.type === 'SINGLE_CHOICE') base.correctAnswer = parseInt(q.correctAnswer) || 0
    else if (q.type === 'MULTIPLE_CHOICE') base.correctAnswer = q.correctAnswer.split(',').map((x: string) => parseInt(x.trim())).filter((n: number) => !isNaN(n))
    else if (q.type === 'TRUE_FALSE') base.correctAnswer = q.correctAnswer === 'true'
    else base.correctAnswer = q.correctAnswer
    return base
  })
}

async function submitQuiz(moduleId: string) {
  if (!quizTitle.value.trim()) return
  quizSaving.value = true
  try {
    await post(`/courses/${courseId}/modules/${moduleId}/quizzes`, {
      title: quizTitle.value,
      questions: buildQuestions(quizQuestions.value)
    })
    addingQuizTo.value = null
    await reloadModules()
    toast.add({ title: 'Kvíz přidán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se přidat kvíz', color: 'error' })
  } finally {
    quizSaving.value = false
  }
}

function startEditQuiz(moduleId: string, quiz: Quiz) {
  editingQuiz.value = { moduleId, quiz }
  editQuizTitle.value = quiz.title
  editQuizQuestions.value = (quiz.questions || []).map((q: Question) => ({
    text: q.text,
    type: q.type,
    choices: (q.choices || []).join('\n'),
    correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : String(q.correctAnswer ?? '')
  }))
  if (editQuizQuestions.value.length === 0) editQuizQuestions.value = [emptyQuestion()]
}

async function saveEditQuiz() {
  if (!editingQuiz.value) return
  const { moduleId, quiz } = editingQuiz.value
  try {
    await put(`/courses/${courseId}/modules/${moduleId}/quizzes/${quiz.id}`, {
      title: editQuizTitle.value,
      questions: buildQuestions(editQuizQuestions.value)
    })
    editingQuiz.value = null
    await reloadModules()
    toast.add({ title: 'Kvíz upraven', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se upravit kvíz', color: 'error' })
  }
}

async function deleteQuiz(moduleId: string, quizId: string) {
  if (!confirm('Smazat kvíz?')) return
  try {
    await del(`/courses/${courseId}/modules/${moduleId}/quizzes/${quizId}`)
    await reloadModules()
    toast.add({ title: 'Kvíz smazán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se smazat kvíz', color: 'error' })
  }
}

async function toggleQuizVisibility(moduleId: string, quiz: Quiz) {
  try {
    await put(`/courses/${courseId}/modules/${moduleId}/quizzes/${quiz.id}`, {
      isVisible: !quiz.isVisible,
    })
    await reloadModules()
    toast.add({ title: quiz.isVisible ? 'Kvíz skryt' : 'Kvíz zobrazen', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se změnit viditelnost', color: 'error' })
  }
}

const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Jedna odpověď' },
  { value: 'MULTIPLE_CHOICE', label: 'Více odpovědí' },
  { value: 'TRUE_FALSE', label: 'Ano / Ne' },
  { value: 'TEXT', label: 'Textová odpověď' }
]

const course = computed(() => courseStore.currentCourse)
const stateMeta = computed(() => course.value?.state ? STATE_META[course.value.state] : null)
const editable = computed(() => courseStore.isEditable)
const scheduledStartText = computed(() => {
  if (!course.value?.scheduledStart) return '—'
  return new Date(course.value.scheduledStart).toLocaleString('cs-CZ')
})

const topQuizRows = computed(() => quizPerformanceRows.value.slice(0, 5))
</script>

<template>
  <UDashboardPanel id="course-edit">
    <template #header>
      <UDashboardNavbar :title="course?.title || 'Kurz'" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-arrow-left" label="Zpět" to="/dashboard/courses" variant="ghost" color="neutral" />
          <UBadge v-if="stateMeta" :label="stateMeta.label" :style="{ backgroundColor: stateMeta.bg, color: stateMeta.color }" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <template v-else-if="course">
        <div class="grid lg:grid-cols-3 gap-8">
          <!-- ─── MAIN CONTENT (2/3) ──────────────────────── -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Basic info -->
            <UPageCard title="Základní údaje">
              <template #description>
                <form class="space-y-4 mt-2" @submit.prevent="saveCourse">
                  <UFormField label="Název kurzu">
                    <UInput v-model="title" placeholder="Název kurzu" class="w-full" :disabled="!editable" />
                  </UFormField>
                  <UFormField label="Popis">
                    <UTextarea v-model="description" placeholder="Popis kurzu" :rows="3" class="w-full" :disabled="!editable" />
                  </UFormField>
                  <UButton v-if="editable" type="submit" label="Uložit" icon="i-lucide-save" :loading="saving" />
                </form>
              </template>
            </UPageCard>

            <!-- ─── MODULES with expand ────────────────────── -->
            <UPageCard title="Moduly">
              <template #description>
                <div class="space-y-3 mt-2">

                  <!-- Module list -->
                  <div
                    v-for="mod in sortedModules"
                    :key="mod.id"
                    class="rounded-lg border transition-colors overflow-hidden"
                    :class="[
                      dragOverModuleId === mod.id ? 'border-primary bg-primary/5' : 'border-default',
                    ]"
                  >
                    <!-- Module header row -->
                    <div
                      :draggable="editable"
                      class="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      :class="editable ? 'cursor-grab active:cursor-grabbing' : ''"
                      @click="toggleExpand(mod.id)"
                      @dragstart.stop="onModuleDragStart(mod.id)"
                      @dragover="onModuleDragOver($event, mod.id)"
                      @dragleave="onModuleDragLeave(mod.id)"
                      @drop.prevent="onModuleDrop(mod.id)"
                      @dragend="onModuleDragEnd"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <UIcon v-if="editable" name="i-lucide-grip-vertical" class="text-muted shrink-0" />
                        <UIcon :name="expandedModuleId === mod.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="text-muted shrink-0" />
                        <span class="text-xs text-muted font-mono">{{ mod.order }}</span>
                        <span class="truncate font-medium">{{ mod.title }}</span>
                        <UBadge :label="mod.isRevealed ? 'Viditelný' : 'Skrytý'" :color="mod.isRevealed ? 'success' : 'neutral'" size="sm" />
                        <span class="text-xs text-dimmed">
                          {{ (mod.materials?.length || 0) + (mod.quizzes?.length || 0) }} položek
                        </span>
                      </div>
                      <div class="flex gap-1 shrink-0" @click.stop>
                        <UButton v-if="editable" icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startEditModule(mod)" />
                        <UButton v-if="courseStore.isLive || courseStore.isPaused" :icon="mod.isRevealed ? 'i-lucide-eye-off' : 'i-lucide-eye'" size="xs" color="neutral" variant="ghost" @click="toggleReveal(mod)" />
                        <UButton v-if="editable" icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="removeModule(mod.id)" />
                      </div>
                    </div>

                    <!-- Module edit form (inline) -->
                    <div v-if="editingModuleId === mod.id" class="p-4 border-t border-default bg-muted/30" @click.stop>
                      <div class="space-y-3">
                        <UFormField label="Název modulu">
                          <UInput v-model="editModuleTitle" class="w-full" />
                        </UFormField>
                        <UFormField label="Popis">
                          <UTextarea v-model="editModuleDesc" :rows="2" class="w-full" />
                        </UFormField>
                        <div class="flex gap-2">
                          <UButton label="Uložit" icon="i-lucide-check" size="sm" @click="saveEditModule(mod.id)" />
                          <UButton label="Zrušit" size="sm" color="neutral" variant="outline" @click="editingModuleId = null" />
                        </div>
                      </div>
                    </div>

                    <!-- Expanded module content -->
                    <div v-if="expandedModuleId === mod.id && editingModuleId !== mod.id" class="border-t border-default">

                      <!-- Module description -->
                      <div v-if="mod.description" class="px-4 py-3 text-sm text-muted border-b border-default">
                        {{ mod.description }}
                      </div>

                      <!-- ── Materials list ─────────────── -->
                      <div class="px-4 py-3">
                        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Materiály</h4>
                        <div v-if="!mod.materials?.length" class="text-xs text-dimmed py-1">Žádné materiály</div>
                        <div v-for="mat in mod.materials" :key="mat.id" class="flex items-center justify-between gap-2 py-2 border-b border-default last:border-0">
                          <!-- Editing material inline -->
                          <template v-if="editingMaterial?.material.id === mat.id">
                            <div class="flex-1 space-y-2" @click.stop>
                              <UInput v-model="editMatTitle" placeholder="Název" size="sm" class="w-full" />
                              <UTextarea v-model="editMatDesc" placeholder="Popis" :rows="2" size="sm" class="w-full" />
                              <UInput v-if="mat.type === 'URL'" v-model="editMatUrl" placeholder="URL" size="sm" class="w-full" />
                              <div class="flex gap-2">
                                <UButton label="Uložit" icon="i-lucide-check" size="xs" @click="saveEditMaterial" />
                                <UButton label="Zrušit" size="xs" color="neutral" variant="outline" @click="editingMaterial = null" />
                              </div>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex items-center gap-2 min-w-0">
                              <UIcon :name="materialTypeIcon(mat.type)" class="text-muted shrink-0" />
                              <span class="truncate text-sm font-medium">{{ mat.title }}</span>
                              <UBadge :label="materialTypeLabel(mat.type)" size="xs" color="neutral" />
                            </div>
                            <div class="flex gap-1 shrink-0" @click.stop>
                              <UButton v-if="editable" icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startEditMaterial(mod.id, mat)" />
                              <UButton v-if="editable" icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteMaterial(mod.id, mat.id)" />
                            </div>
                          </template>
                        </div>
                      </div>

                      <!-- ── Quizzes list ───────────────── -->
                      <div class="px-4 py-3 border-t border-default">
                        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Kvízy</h4>
                        <div v-if="!mod.quizzes?.length" class="text-xs text-dimmed py-1">Žádné kvízy</div>
                        <div v-for="quiz in mod.quizzes" :key="quiz.id" class="flex items-center justify-between gap-2 py-2 border-b border-default last:border-0">
                          <!-- Editing quiz inline -->
                          <template v-if="editingQuiz?.quiz.id === quiz.id">
                            <div class="flex-1 space-y-3" @click.stop>
                              <UInput v-model="editQuizTitle" placeholder="Název kvízu" size="sm" class="w-full" />
                              <div v-for="(q, qi) in editQuizQuestions" :key="qi" class="p-3 rounded border border-default space-y-2">
                                <div class="flex items-center gap-2">
                                  <span class="text-xs text-muted font-mono">{{ qi + 1 }}.</span>
                                  <UInput v-model="q.text" placeholder="Otázka" size="sm" class="flex-1" />
                                  <UButton v-if="editQuizQuestions.length > 1" icon="i-lucide-x" size="xs" color="error" variant="ghost" @click="removeQuestion(editQuizQuestions, qi)" />
                                </div>
                                <select v-model="q.type" class="w-full text-sm rounded border border-default bg-default px-2 py-1">
                                  <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                                </select>
                                <UTextarea v-if="q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE'" v-model="q.choices" placeholder="Možnosti (každá na nový řádek)" :rows="3" size="sm" class="w-full" />
                                <UInput v-if="q.type === 'SINGLE_CHOICE'" v-model="q.correctAnswer" placeholder="Index správné odpovědi (0, 1, ...)" size="sm" class="w-full" />
                                <UInput v-if="q.type === 'MULTIPLE_CHOICE'" v-model="q.correctAnswer" placeholder="Indexy oddělené čárkou (0,2)" size="sm" class="w-full" />
                                <select v-if="q.type === 'TRUE_FALSE'" v-model="q.correctAnswer" class="w-full text-sm rounded border border-default bg-default px-2 py-1">
                                  <option value="true">Ano</option>
                                  <option value="false">Ne</option>
                                </select>
                                <UInput v-if="q.type === 'TEXT'" v-model="q.correctAnswer" placeholder="Správná textová odpověď" size="sm" class="w-full" />
                              </div>
                              <UButton label="+ Otázka" size="xs" color="neutral" variant="outline" @click="addQuestion(editQuizQuestions)" />
                              <div class="flex gap-2">
                                <UButton label="Uložit kvíz" icon="i-lucide-check" size="xs" @click="saveEditQuiz" />
                                <UButton label="Zrušit" size="xs" color="neutral" variant="outline" @click="editingQuiz = null" />
                              </div>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex items-center gap-2 min-w-0">
                              <UIcon name="i-lucide-brain" class="text-muted shrink-0" />
                              <span class="truncate text-sm font-medium">{{ quiz.title }}</span>
                              <UBadge :label="quiz.isVisible !== false ? 'Viditelný' : 'Skrytý'" :color="quiz.isVisible !== false ? 'success' : 'warning'" size="xs" />
                              <span class="text-xs text-dimmed">{{ quiz.questions?.length || 0 }} otázek</span>
                            </div>
                            <div class="flex gap-1 shrink-0" @click.stop>
                              <UButton :icon="quiz.isVisible !== false ? 'i-lucide-eye-off' : 'i-lucide-eye'" size="xs" :color="quiz.isVisible !== false ? 'warning' : 'success'" variant="ghost" @click="toggleQuizVisibility(mod.id, quiz)" />
                              <UButton v-if="editable" icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="startEditQuiz(mod.id, quiz)" />
                              <UButton v-if="editable" icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="deleteQuiz(mod.id, quiz.id)" />
                            </div>
                          </template>
                        </div>
                      </div>

                      <!-- ── Add content buttons ────────── -->
                      <div v-if="editable" class="px-4 py-3 border-t border-default flex gap-2 flex-wrap">
                        <UButton label="Přidat materiál" icon="i-lucide-plus" size="xs" color="neutral" variant="outline" @click.stop="startAddMaterial(mod.id)" />
                        <UButton label="Přidat kvíz" icon="i-lucide-brain" size="xs" color="neutral" variant="outline" @click.stop="startAddQuiz(mod.id)" />
                      </div>

                      <!-- ── Add material form ──────────── -->
                      <div v-if="addingMaterialTo === mod.id" class="px-4 py-4 border-t border-default bg-muted/30 space-y-3" @click.stop>
                        <h4 class="font-medium text-sm">Nový materiál</h4>
                        <div class="flex gap-3">
                          <label class="flex items-center gap-1 text-sm cursor-pointer">
                            <input v-model="matType" type="radio" value="TEXT"> Článek
                          </label>
                          <label class="flex items-center gap-1 text-sm cursor-pointer">
                            <input v-model="matType" type="radio" value="FILE"> Soubor
                          </label>
                          <label class="flex items-center gap-1 text-sm cursor-pointer">
                            <input v-model="matType" type="radio" value="URL"> Odkaz
                          </label>
                        </div>
                        <UInput v-model="matTitle" placeholder="Název materiálu" size="sm" class="w-full" />
                        <UTextarea v-model="matDesc" placeholder="Popis" :rows="2" size="sm" class="w-full" />
                        <UInput v-if="matType === 'URL'" v-model="matUrl" placeholder="https://..." size="sm" class="w-full" />
                        <input v-if="matType === 'FILE'" type="file" class="text-sm" @change="onFileChange">
                        <div class="flex gap-2">
                          <UButton label="Přidat" icon="i-lucide-plus" size="sm" :loading="matSaving" @click="submitMaterial(mod.id)" />
                          <UButton label="Zrušit" size="sm" color="neutral" variant="outline" @click="addingMaterialTo = null" />
                        </div>
                      </div>

                      <!-- ── Add quiz form ──────────────── -->
                      <div v-if="addingQuizTo === mod.id" class="px-4 py-4 border-t border-default bg-muted/30 space-y-3" @click.stop>
                        <h4 class="font-medium text-sm">Nový kvíz</h4>
                        <UInput v-model="quizTitle" placeholder="Název kvízu" size="sm" class="w-full" />
                        <div v-for="(q, qi) in quizQuestions" :key="qi" class="p-3 rounded border border-default space-y-2">
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-muted font-mono">{{ qi + 1 }}.</span>
                            <UInput v-model="q.text" placeholder="Otázka" size="sm" class="flex-1" />
                            <UButton v-if="quizQuestions.length > 1" icon="i-lucide-x" size="xs" color="error" variant="ghost" @click="removeQuestion(quizQuestions, qi)" />
                          </div>
                          <select v-model="q.type" class="w-full text-sm rounded border border-default bg-default px-2 py-1">
                            <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                          </select>
                          <UTextarea v-if="q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE'" v-model="q.choices" placeholder="Možnosti (každá na nový řádek)" :rows="3" size="sm" class="w-full" />
                          <UInput v-if="q.type === 'SINGLE_CHOICE'" v-model="q.correctAnswer" placeholder="Index správné (0, 1, ...)" size="sm" class="w-full" />
                          <UInput v-if="q.type === 'MULTIPLE_CHOICE'" v-model="q.correctAnswer" placeholder="Indexy oddělené čárkou (0,2)" size="sm" class="w-full" />
                          <select v-if="q.type === 'TRUE_FALSE'" v-model="q.correctAnswer" class="w-full text-sm rounded border border-default bg-default px-2 py-1">
                            <option value="true">Ano</option>
                            <option value="false">Ne</option>
                          </select>
                          <UInput v-if="q.type === 'TEXT'" v-model="q.correctAnswer" placeholder="Správná textová odpověď" size="sm" class="w-full" />
                        </div>
                        <UButton label="+ Otázka" size="xs" color="neutral" variant="outline" @click="addQuestion(quizQuestions)" />
                        <div class="flex gap-2">
                          <UButton label="Přidat kvíz" icon="i-lucide-brain" size="sm" :loading="quizSaving" @click="submitQuiz(mod.id)" />
                          <UButton label="Zrušit" size="sm" color="neutral" variant="outline" @click="addingQuizTo = null" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="sortedModules.length === 0" class="text-center py-6 text-muted text-sm">
                    Zatím žádné moduly
                  </div>

                  <p v-if="editable" class="text-xs text-muted">Moduly můžete přetahovat myší pro změnu pořadí.</p>

                  <!-- Add module -->
                  <form v-if="editable" class="flex gap-2 pt-2" @submit.prevent="addModule">
                    <UInput v-model="newModuleTitle" placeholder="Nový modul..." class="flex-1" />
                    <UButton type="submit" icon="i-lucide-plus" :loading="creatingModule" :disabled="!newModuleTitle.trim()" />
                  </form>
                </div>
              </template>
            </UPageCard>
          </div>

          <!-- ─── SIDEBAR (1/3) ───────────────────────────── -->
          <div class="space-y-6">
            <UPageCard title="Akce kurzu">
              <template #description>
                <div class="space-y-3 mt-2">
                  <template v-if="courseStore.isDraft">
                    <UFormField label="Datum zahájení">
                      <UInput v-model="scheduleDate" type="datetime-local" class="w-full" />
                    </UFormField>
                    <div class="grid grid-cols-1 gap-2">
                      <UButton label="Naplánovat" icon="i-lucide-calendar" color="primary" block :loading="transitioning" @click="schedule" />
                      <UButton label="Spustit nyní" icon="i-lucide-play" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('start')" />
                      <UButton label="Duplikovat" icon="i-lucide-copy" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('duplicate')" />
                    </div>
                  </template>

                  <template v-if="courseStore.isScheduled">
                    <p class="text-sm text-muted">Naplánováno na: {{ scheduledStartText }}</p>
                    <div class="grid grid-cols-1 gap-2">
                      <UButton label="Spustit nyní" icon="i-lucide-play" color="primary" block :loading="transitioning" @click="doTransition('start')" />
                      <UButton label="Vrátit do konceptu" icon="i-lucide-undo" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('revert-to-draft')" />
                      <UButton label="Duplikovat" icon="i-lucide-copy" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('duplicate')" />
                    </div>
                  </template>

                  <template v-if="courseStore.isLive">
                    <div class="grid grid-cols-1 gap-2">
                      <TdaButton label="Spravovat relaci" icon="i-lucide-qr-code" block :to="`/dashboard/session/${courseId}`" />
                      <UButton label="Pozastavit" icon="i-lucide-pause" color="warning" block :loading="transitioning" @click="doTransition('pause')" />
                      <UButton label="Archivovat" icon="i-lucide-archive" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('archive')" />
                    </div>
                  </template>

                  <template v-if="courseStore.isPaused">
                    <div class="grid grid-cols-1 gap-2">
                      <UButton label="Pokračovat" icon="i-lucide-play" color="primary" block :loading="transitioning" @click="doTransition('resume')" />
                      <UButton label="Archivovat" icon="i-lucide-archive" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('archive')" />
                    </div>
                  </template>

                  <template v-if="courseStore.isArchived">
                    <UButton label="Duplikovat kurz" icon="i-lucide-copy" color="primary" block :loading="transitioning" @click="doTransition('duplicate')" />
                  </template>
                </div>
              </template>
            </UPageCard>

            <UPageCard title="Statistiky kurzu">
              <template #description>
                <div class="space-y-3 mt-2">
                  <p v-if="!canShowStats" class="text-sm text-muted">
                    Statistiky se zobrazí po spuštění kurzu (LIVE/PAUSED/ARCHIVED).
                  </p>
                  <p v-else-if="statsLoading" class="text-sm text-muted">Načítám statistiky…</p>
                  <p v-else-if="statsError" class="text-sm text-error">{{ statsError }}</p>
                  <template v-else>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div class="rounded-md border border-default px-2 py-1.5">
                        <p class="text-xs text-muted">Účastníci</p>
                        <p class="font-semibold">{{ quizDashboard?.summary?.totalParticipants ?? 0 }}</p>
                      </div>
                      <div class="rounded-md border border-default px-2 py-1.5">
                        <p class="text-xs text-muted">Pokusy</p>
                        <p class="font-semibold">{{ quizDashboard?.summary?.totalAttempts ?? 0 }}</p>
                      </div>
                      <div class="rounded-md border border-default px-2 py-1.5">
                        <p class="text-xs text-muted">Průměr</p>
                        <p class="font-semibold">{{ quizDashboard?.summary?.averageScore ?? 0 }} %</p>
                      </div>
                      <div class="rounded-md border border-default px-2 py-1.5">
                        <p class="text-xs text-muted">Úspěšnost</p>
                        <p class="font-semibold">{{ quizDashboard?.summary?.passRate ?? 0 }} %</p>
                      </div>
                    </div>

                    <div class="space-y-1.5">
                      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Top kvízy</p>
                      <div
                        v-for="quiz in topQuizRows"
                        :key="quiz.quizId"
                        class="rounded-md border border-default px-2 py-1.5"
                      >
                        <p class="text-sm font-medium truncate">{{ quiz.quizTitle }}</p>
                        <p class="text-xs text-muted">
                          Skóre {{ quiz.averageScore }} % • Úspěšnost {{ quiz.passRate }} % • Pokusy {{ quiz.attempts }}
                        </p>
                      </div>
                      <p v-if="!topQuizRows.length" class="text-xs text-muted">Zatím nejsou data ke kvízům.</p>
                    </div>
                  </template>
                </div>
              </template>
            </UPageCard>

            <UPageCard title="Informace">
              <template #description>
                <div class="space-y-2 text-sm mt-2">
                  <div class="flex justify-between"><span class="text-muted">Vytvořeno</span><span>{{ course.createdAt ? new Date(course.createdAt).toLocaleDateString('cs-CZ') : '—' }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Moduly</span><span>{{ courseStore.courseModules.length }}</span></div>
                  <div class="flex justify-between"><span class="text-muted">Veřejný odkaz</span><NuxtLink :to="`/courses/${courseId}`" class="text-primary hover:underline">Zobrazit</NuxtLink></div>
                </div>
              </template>
            </UPageCard>
          </div>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
