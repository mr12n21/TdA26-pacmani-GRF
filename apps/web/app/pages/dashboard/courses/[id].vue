<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'
import type { CourseModule } from '~/types'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const route = useRoute()
const courseId = route.params.id as string
const courseStore = useCourseStore()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)

// Editable fields
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

async function saveCourse() {
  saving.value = true
  try {
    const { put } = useApi()
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

// State transitions
const transitioning = ref(false)
const scheduleDate = ref('')

async function doTransition(action: string, body?: any) {
  transitioning.value = true
  try {
    const { post } = useApi()
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

// Modules
const newModuleTitle = ref('')
const creatingModule = ref(false)
const draggingModuleId = ref<string | null>(null)
const dragOverModuleId = ref<string | null>(null)
const reorderingModule = ref(false)

const sortedModules = computed(() =>
  [...(courseStore.courseModules || [])].sort((a: CourseModule, b: CourseModule) => a.order - b.order)
)

async function addModule() {
  if (!newModuleTitle.value.trim()) return
  creatingModule.value = true
  try {
    await courseStore.createModule(courseId, { title: newModuleTitle.value, order: courseStore.courseModules.length })
    newModuleTitle.value = ''
    await courseStore.fetchModules(courseId)
    toast.add({ title: 'Modul přidán', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se přidat modul', color: 'error' })
  } finally {
    creatingModule.value = false
  }
}

async function removeModule(moduleId: string) {
  try {
    await courseStore.deleteModule(courseId, moduleId)
    await courseStore.fetchModules(courseId)
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
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se změnit viditelnost', color: 'error' })
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
  if (dragOverModuleId.value === moduleId) {
    dragOverModuleId.value = null
  }
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
  const sourceIndex = modules.findIndex(mod => mod.id === draggingModuleId.value)
  const targetIndex = modules.findIndex(mod => mod.id === targetModuleId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    onModuleDragEnd()
    return
  }

  reorderingModule.value = true
  try {
    await courseStore.reorderModule(courseId, draggingModuleId.value, targetIndex + 1)
    toast.add({ title: 'Pořadí modulů aktualizováno', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se změnit pořadí modulů', color: 'error' })
  } finally {
    reorderingModule.value = false
    onModuleDragEnd()
  }
}

const course = computed(() => courseStore.currentCourse)
const stateMeta = computed(() => course.value?.state ? STATE_META[course.value.state] : null)
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
          <UBadge
            v-if="stateMeta"
            :label="stateMeta.label"
            :style="{ backgroundColor: stateMeta.bg, color: stateMeta.color }"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <template v-else-if="course">
        <div class="grid lg:grid-cols-3 gap-8">
          <!-- Main content (2/3) -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Edit basic info -->
            <UPageCard title="Základní údaje">
              <template #description>
                <form class="space-y-4 mt-2" @submit.prevent="saveCourse">
                  <UFormField label="Název kurzu">
                    <UInput v-model="title" placeholder="Název kurzu" class="w-full" :disabled="!courseStore.isEditable" />
                  </UFormField>
                  <UFormField label="Popis">
                    <UTextarea v-model="description" placeholder="Popis kurzu" :rows="3" class="w-full" :disabled="!courseStore.isEditable" />
                  </UFormField>
                  <UButton
                    v-if="courseStore.isEditable"
                    type="submit"
                    label="Uložit"
                    icon="i-lucide-save"
                    :loading="saving"
                  />
                </form>
              </template>
            </UPageCard>

            <!-- Modules -->
            <UPageCard title="Moduly">
              <template #description>
                <div class="space-y-3 mt-2">
                  <div
                    v-for="mod in sortedModules"
                    :key="mod.id"
                    :draggable="courseStore.isEditable"
                    class="flex items-center justify-between gap-3 p-3 rounded border transition-colors"
                    :class="[
                      dragOverModuleId === mod.id
                        ? 'border-primary bg-primary/5'
                        : 'border-default bg-default/60 hover:bg-muted/50',
                      courseStore.isEditable ? 'cursor-grab active:cursor-grabbing' : ''
                    ]"
                    @dragstart="onModuleDragStart(mod.id)"
                    @dragover="onModuleDragOver($event, mod.id)"
                    @dragleave="onModuleDragLeave(mod.id)"
                    @drop.prevent="onModuleDrop(mod.id)"
                    @dragend="onModuleDragEnd"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <UIcon
                        v-if="courseStore.isEditable"
                        name="i-lucide-grip-vertical"
                        class="text-muted shrink-0"
                      />
                      <span class="text-xs text-muted font-mono">{{ mod.order }}</span>
                      <span class="truncate font-medium">{{ mod.title }}</span>
                      <UBadge
                        :label="mod.isRevealed ? 'Viditelný' : 'Skrytý'"
                        :color="mod.isRevealed ? 'success' : 'neutral'"
                        size="sm"
                      />
                    </div>
                    <div class="flex gap-1 shrink-0">
                      <UButton
                        v-if="courseStore.isLive || courseStore.isPaused"
                        :icon="mod.isRevealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        @click="toggleReveal(mod)"
                      />
                      <UButton
                        v-if="courseStore.isEditable"
                        icon="i-lucide-trash-2"
                        size="sm"
                        color="error"
                        variant="ghost"
                        @click="removeModule(mod.id)"
                      />
                    </div>
                  </div>

                  <div v-if="sortedModules.length === 0" class="text-center py-6 text-muted text-sm">
                    Zatím žádné moduly
                  </div>

                  <p v-if="courseStore.isEditable" class="text-xs text-muted">
                    Moduly můžete přetahovat myší pro změnu pořadí.
                  </p>

                  <div v-if="reorderingModule" class="text-xs text-primary">
                    Ukládám nové pořadí modulů…
                  </div>

                  <!-- Add module -->
                  <form v-if="courseStore.isEditable" class="flex gap-2 pt-2" @submit.prevent="addModule">
                    <UInput v-model="newModuleTitle" placeholder="Nový modul..." class="flex-1" />
                    <UButton type="submit" icon="i-lucide-plus" :loading="creatingModule" :disabled="!newModuleTitle.trim()" />
                  </form>
                </div>
              </template>
            </UPageCard>
          </div>

          <!-- Sidebar (1/3) -->
          <div class="space-y-6">
            <!-- State actions -->
            <UPageCard title="Stav kurzu">
              <template #description>
                <div class="space-y-3 mt-2">
                  <!-- DRAFT actions -->
                  <template v-if="courseStore.isDraft">
                    <UFormField label="Datum zahájení">
                      <UInput v-model="scheduleDate" type="datetime-local" class="w-full" />
                    </UFormField>
                    <UButton label="Naplánovat" icon="i-lucide-calendar" color="primary" block :loading="transitioning" @click="schedule" />
                  </template>

                  <!-- SCHEDULED actions -->
                  <template v-if="courseStore.isScheduled">
                    <p class="text-sm text-muted">
                      Naplánováno na: {{ course.scheduledStart ? new Date(course.scheduledStart).toLocaleString('cs-CZ') : '—' }}
                    </p>
                    <UButton label="Spustit nyní" icon="i-lucide-play" color="primary" block :loading="transitioning" @click="doTransition('start')" />
                    <UButton label="Vrátit do konceptu" icon="i-lucide-undo" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('revert-to-draft')" />
                  </template>

                  <!-- LIVE actions -->
                  <template v-if="courseStore.isLive">
                    <UButton label="Pozastavit" icon="i-lucide-pause" color="warning" block :loading="transitioning" @click="doTransition('pause')" />
                    <UButton label="Archivovat" icon="i-lucide-archive" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('archive')" />
                  </template>

                  <!-- PAUSED actions -->
                  <template v-if="courseStore.isPaused">
                    <UButton label="Pokračovat" icon="i-lucide-play" color="primary" block :loading="transitioning" @click="doTransition('resume')" />
                    <UButton label="Archivovat" icon="i-lucide-archive" color="neutral" variant="outline" block :loading="transitioning" @click="doTransition('archive')" />
                  </template>

                  <!-- ARCHIVED actions -->
                  <template v-if="courseStore.isArchived">
                    <UButton label="Duplikovat kurz" icon="i-lucide-copy" color="primary" block :loading="transitioning" @click="doTransition('duplicate')" />
                  </template>
                </div>
              </template>
            </UPageCard>

            <!-- Quick info -->
            <UPageCard title="Informace">
              <template #description>
                <div class="space-y-2 text-sm mt-2">
                  <div class="flex justify-between">
                    <span class="text-muted">Vytvořeno</span>
                    <span>{{ course.createdAt ? new Date(course.createdAt).toLocaleDateString('cs-CZ') : '—' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Moduly</span>
                    <span>{{ courseStore.courseModules.length }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Veřejný odkaz</span>
                    <NuxtLink :to="`/courses/${courseId}`" class="text-primary hover:underline">Zobrazit</NuxtLink>
                  </div>
                </div>
              </template>
            </UPageCard>
          </div>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
