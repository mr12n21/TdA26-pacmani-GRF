<script setup lang="ts">
/**
 * /dashboard/session/:courseId — Lecturer session management page.
 * Generates QR code, shows join code, manages participants, shows stats.
 */
import { useCourseStore, STATE_META } from '~/stores/course'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const route = useRoute()
const courseId = route.params.courseId as string
const courseStore = useCourseStore()
const toast = useToast()
const sse = useSSE()
const { get, post, del } = useApi()

useSeoMeta({
  title: () => `Relace: ${courseStore.currentCourse?.title || 'Kurz'}`
})

// ── State ──────────────────────────────────────────────────────
const loading = ref(true)
const sessionCode = ref<{
  id: string
  code: string
  courseId: string
  isActive: boolean
  expiresAt: string | null
  createdAt: string
} | null>(null)
const participants = ref<Array<{
  participantId: string
  type: string
  nickname: string
  userId: string | null
  user: { id: string; name: string } | null
  joinedAt: string
  kickedAt?: string | null
}>>([])
const creating = ref(false)
const expiresInMinutes = ref(60)

// ── Computed ───────────────────────────────────────────────────
const joinUrl = computed(() => {
  if (!sessionCode.value || !import.meta.client) return ''
  const base = window.location.origin
  return `${base}/join?code=${sessionCode.value.code}`
})

const activeParticipants = computed(() =>
  participants.value.filter(p => !p.kickedAt)
)

const kickedParticipants = computed(() =>
  participants.value.filter(p => p.kickedAt)
)

const isExpired = computed(() => {
  if (!sessionCode.value?.expiresAt) return false
  return new Date(sessionCode.value.expiresAt) < new Date()
})

// ── Load data ──────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    await courseStore.fetchCourse(courseId)
    await Promise.all([loadSession(), loadParticipants()])
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.message || 'Nepodařilo se načíst data', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function loadSession() {
  try {
    const data = await get(`/courses/${courseId}/session`)
    sessionCode.value = data
  } catch {
    sessionCode.value = null
  }
}

async function loadParticipants() {
  try {
    const data = await get<any[]>(`/courses/${courseId}/participants`)
    participants.value = data
  } catch {
    participants.value = []
  }
}

// ── Create session ─────────────────────────────────────────────
async function createSession() {
  creating.value = true
  try {
    const data = await post(`/courses/${courseId}/session`, {
      expiresInMinutes: expiresInMinutes.value || undefined,
    })
    sessionCode.value = data
    toast.add({ title: 'Relace vytvořena', description: `Kód: ${data.code}`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se vytvořit relaci', color: 'error' })
  } finally {
    creating.value = false
  }
}

// ── Deactivate session ─────────────────────────────────────────
async function deactivateSession() {
  try {
    await del(`/courses/${courseId}/session`)
    sessionCode.value = null
    toast.add({ title: 'Relace ukončena', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se ukončit relaci', color: 'error' })
  }
}

// ── Kick participant ───────────────────────────────────────────
async function kickParticipant(participantId: string, nickname: string) {
  if (!confirm(`Opravdu vyloučit účastníka "${nickname}"?`)) return
  try {
    await del(`/courses/${courseId}/participants/${participantId}`)
    await loadParticipants()
    toast.add({ title: 'Účastník vyloučen', description: nickname, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se vyloučit účastníka', color: 'error' })
  }
}

// ── Copy to clipboard ──────────────────────────────────────────
async function copyCode() {
  if (!sessionCode.value) return
  try {
    await navigator.clipboard.writeText(sessionCode.value.code)
    toast.add({ title: 'Kód zkopírován', color: 'success' })
  } catch {
    toast.add({ title: 'Nepodařilo se zkopírovat', color: 'error' })
  }
}

async function copyLink() {
  if (!joinUrl.value) return
  try {
    await navigator.clipboard.writeText(joinUrl.value)
    toast.add({ title: 'Odkaz zkopírován', color: 'success' })
  } catch {
    toast.add({ title: 'Nepodařilo se zkopírovat', color: 'error' })
  }
}

// ── SSE for live updates ───────────────────────────────────────
onMounted(async () => {
  await loadAll()

  sse.connect(courseId)
  sse.on('participant_joined', () => {
    loadParticipants()
  })
  sse.on('participant_kicked', () => {
    loadParticipants()
  })
  sse.on('state_changed', (data: any) => {
    if (courseStore.currentCourse) {
      courseStore.currentCourse.state = data.state || data.newState
    }
  })
})

onBeforeUnmount(() => {
  sse.disconnect()
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('cs-CZ')
}
</script>

<template>
  <UDashboardPanel id="session">
    <template #header>
      <UDashboardNavbar :title="`Relace: ${courseStore.currentCourse?.title || '...'}`">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            :to="`/dashboard/courses/${courseId}`"
            class="mr-2"
          />
        </template>
        <template #right>
          <UBadge
            v-if="courseStore.currentCourse?.state"
            :label="STATE_META[courseStore.currentCourse.state]?.label || courseStore.currentCourse.state"
            :color="STATE_META[courseStore.currentCourse.state]?.color || 'neutral'"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else class="max-w-5xl mx-auto p-6 space-y-6">
        <!-- ── QR Code & Session Code Section ──────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: QR Code / Create Session -->
          <div class="bg-elevated rounded-xl border border-default p-6">
            <h2 class="text-lg font-semibold font-[Dosis] mb-4 flex items-center gap-2">
              <UIcon name="i-lucide-qr-code" class="text-primary" />
              QR kód pro připojení
            </h2>

            <!-- Active session -->
            <div v-if="sessionCode && !isExpired" class="space-y-4">
              <!-- QR Code display -->
              <div class="flex justify-center">
                <div class="bg-white p-4 rounded-xl shadow-lg">
                  <img
                    :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}&format=svg`"
                    :alt="`QR kód: ${sessionCode.code}`"
                    width="250"
                    height="250"
                    class="block"
                  >
                </div>
              </div>

              <!-- Code display -->
              <div class="text-center">
                <p class="text-sm text-muted mb-1">Kód relace</p>
                <div class="flex items-center justify-center gap-3">
                  <span class="text-4xl font-bold font-mono tracking-[0.2em] text-primary">
                    {{ sessionCode.code }}
                  </span>
                  <UButton icon="i-lucide-copy" size="sm" variant="ghost" color="neutral" @click="copyCode" />
                </div>
              </div>

              <!-- Join URL -->
              <div class="bg-muted/30 rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-link" class="text-muted shrink-0" />
                  <span class="text-sm text-muted truncate flex-1">{{ joinUrl }}</span>
                  <UButton icon="i-lucide-copy" size="xs" variant="ghost" color="neutral" @click="copyLink" />
                </div>
              </div>

              <!-- Expiry info -->
              <div v-if="sessionCode.expiresAt" class="text-center text-sm text-muted">
                Platnost do: {{ formatDate(sessionCode.expiresAt) }}
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <TdaButton
                  block
                  variant="outline"
                  icon="i-lucide-refresh-cw"
                  :loading="creating"
                  @click="createSession"
                >
                  Vygenerovat nový kód
                </TdaButton>
                <UButton
                  icon="i-lucide-square"
                  color="error"
                  variant="outline"
                  @click="deactivateSession"
                >
                  Ukončit
                </UButton>
              </div>
            </div>

            <!-- No active session / Expired -->
            <div v-else class="space-y-4">
              <div class="text-center py-8">
                <UIcon name="i-lucide-qr-code" class="text-5xl text-muted/40 mb-3" />
                <p class="text-muted">
                  {{ isExpired ? 'Relace vypršela.' : 'Žádná aktivní relace.' }}
                </p>
                <p class="text-sm text-dimmed mt-1">
                  Vytvořte novou relaci pro připojení studentů.
                </p>
              </div>

              <UFormField label="Platnost (minuty)">
                <UInput v-model.number="expiresInMinutes" type="number" min="5" max="1440" placeholder="60" />
              </UFormField>

              <TdaButton
                block
                :loading="creating"
                icon="i-lucide-plus"
                @click="createSession"
              >
                Vytvořit relaci
              </TdaButton>
            </div>
          </div>

          <!-- Right: Quick Stats -->
          <div class="space-y-4">
            <!-- Participant count -->
            <div class="bg-elevated rounded-xl border border-default p-6">
              <h2 class="text-lg font-semibold font-[Dosis] mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-users" class="text-primary" />
                Přehled účastníků
              </h2>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-3xl font-bold text-primary">{{ activeParticipants.length }}</div>
                  <div class="text-xs text-muted">Aktivních</div>
                </div>
                <div>
                  <div class="text-3xl font-bold text-error">{{ kickedParticipants.length }}</div>
                  <div class="text-xs text-muted">Vyloučených</div>
                </div>
                <div>
                  <div class="text-3xl font-bold text-teal-400">{{ participants.length }}</div>
                  <div class="text-xs text-muted">Celkem</div>
                </div>
              </div>
            </div>

            <!-- Quick actions -->
            <div class="bg-elevated rounded-xl border border-default p-6">
              <h3 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Rychlé akce</h3>
              <div class="space-y-2">
                <NuxtLink
                  :to="`/dashboard/courses/${courseId}`"
                  class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <UIcon name="i-lucide-settings" class="text-muted" />
                  <span class="text-sm">Upravit kurz</span>
                </NuxtLink>
                <NuxtLink
                  :to="`/courses/${courseId}`"
                  class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <UIcon name="i-lucide-eye" class="text-muted" />
                  <span class="text-sm">Zobrazit kurz (studentský pohled)</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Participants List ────────────────────────────── -->
        <div class="bg-elevated rounded-xl border border-default p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold font-[Dosis] flex items-center gap-2">
              <UIcon name="i-lucide-users" class="text-primary" />
              Účastníci ({{ activeParticipants.length }})
            </h2>
            <UButton
              icon="i-lucide-refresh-cw"
              size="sm"
              variant="ghost"
              color="neutral"
              @click="loadParticipants"
            />
          </div>

          <!-- Active participants -->
          <div v-if="activeParticipants.length" class="space-y-2">
            <div
              v-for="p in activeParticipants"
              :key="p.participantId"
              class="flex items-center justify-between gap-3 p-3 rounded-lg border border-default hover:bg-muted/20 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UIcon
                    :name="p.type === 'REGISTERED' ? 'i-lucide-user-check' : 'i-lucide-user'"
                    class="text-sm"
                    :class="p.type === 'REGISTERED' ? 'text-primary' : 'text-muted'"
                  />
                </div>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ p.nickname || 'Bez jména' }}</div>
                  <div class="text-xs text-muted">
                    {{ p.type === 'REGISTERED' ? p.user?.name || 'Registrovaný' : 'Anonymní' }}
                    · připojeno {{ formatDate(p.joinedAt) }}
                  </div>
                </div>
              </div>
              <UButton
                icon="i-lucide-user-x"
                size="sm"
                color="error"
                variant="ghost"
                title="Vyloučit účastníka"
                @click="kickParticipant(p.participantId, p.nickname || 'Bez jména')"
              />
            </div>
          </div>

          <div v-else class="text-center py-8 text-muted">
            <UIcon name="i-lucide-users" class="text-4xl text-muted/30 mb-2" />
            <p>Zatím žádní účastníci</p>
            <p class="text-sm text-dimmed mt-1">Sdílejte QR kód nebo kód relace se studenty</p>
          </div>

          <!-- Kicked participants (collapsed) -->
          <div v-if="kickedParticipants.length" class="mt-4 pt-4 border-t border-default">
            <details>
              <summary class="text-sm text-muted cursor-pointer hover:text-foreground transition-colors">
                Vyloučení účastníci ({{ kickedParticipants.length }})
              </summary>
              <div class="mt-2 space-y-1">
                <div
                  v-for="p in kickedParticipants"
                  :key="p.participantId"
                  class="flex items-center gap-3 p-2 rounded-lg text-muted/60"
                >
                  <UIcon name="i-lucide-user-x" class="text-error/50" />
                  <span class="text-sm line-through">{{ p.nickname || 'Bez jména' }}</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
