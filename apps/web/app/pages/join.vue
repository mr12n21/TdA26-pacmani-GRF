<script setup lang="ts">
/**
 * /join — Public page: students scan QR / enter 6-digit code to join a course.
 * Two steps: 1) enter code → 2) enter nickname → join.
 */

definePageMeta({
  layout: 'default'
})

useSeoMeta({ title: 'Připojit se ke kurzu' })

const route = useRoute()
const toast = useToast()
const { post } = useApi()

// Step 1: code, Step 2: nickname
const step = ref<'code' | 'name'>('code')
const code = ref((route.query.code as string) || '')
const nickname = ref('')
const loading = ref(false)
const courseInfo = ref<{ courseId: string; course: { id: string; title: string; description?: string; owner?: { name: string } } } | null>(null)
const joined = ref(false)
const participantData = ref<{ participantId: string; courseId: string; nickname: string } | null>(null)

// Auto-validate if code came from QR scan (query param)
onMounted(() => {
  if (code.value && code.value.length === 6) {
    validateCode()
  }
})

async function validateCode() {
  if (code.value.length !== 6) {
    toast.add({ title: 'Neplatný kód', description: 'Kód musí mít 6 číslic', color: 'error' })
    return
  }
  loading.value = true
  try {
    const data = await post<any>('/session/validate', { code: code.value })
    courseInfo.value = data
    step.value = 'name'
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Neplatný nebo expirovaný kód'
    toast.add({ title: 'Chyba', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function joinCourse() {
  if (!nickname.value.trim()) {
    toast.add({ title: 'Zadejte jméno', color: 'warning' })
    return
  }
  loading.value = true
  try {
    const data = await post<any>('/session/join', {
      code: code.value,
      nickname: nickname.value.trim(),
    })
    participantData.value = data
    joined.value = true

    // Store participant info for the course page
    if (import.meta.client) {
      localStorage.setItem(`tda_participant_${data.courseId}`, JSON.stringify({
        participantId: data.participantId,
        nickname: data.nickname,
      }))
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || 'Nepodařilo se připojit'
    toast.add({ title: 'Chyba', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

function goToCourse() {
  if (participantData.value) {
    navigateTo(`/courses/${participantData.value.courseId}`)
  }
}

function onCodeInput(e: Event) {
  const input = e.target as HTMLInputElement
  // Allow only digits
  code.value = input.value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <UIcon name="i-lucide-qr-code" class="text-3xl text-primary" />
        </div>
        <h1 class="text-2xl font-bold font-[Dosis]">Připojit se ke kurzu</h1>
        <p class="text-muted mt-1">Zadejte kód z obrazovky lektora</p>
      </div>

      <!-- Step 1: Enter code -->
      <div v-if="!joined && step === 'code'" class="space-y-6">
        <div class="bg-elevated rounded-xl border border-default p-6 space-y-4">
          <UFormField label="Kód relace">
            <UInput
              :model-value="code"
              placeholder="000000"
              size="xl"
              class="text-center text-2xl tracking-[0.3em] font-mono"
              maxlength="6"
              inputmode="numeric"
              autocomplete="off"
              @input="onCodeInput"
              @keydown.enter="validateCode"
            />
          </UFormField>

          <TdaButton
            block
            :loading="loading"
            :disabled="code.length !== 6"
            icon="i-lucide-arrow-right"
            @click="validateCode"
          >
            Pokračovat
          </TdaButton>
        </div>
      </div>

      <!-- Step 2: Enter nickname -->
      <div v-if="!joined && step === 'name'" class="space-y-6">
        <!-- Course info card -->
        <div class="bg-elevated rounded-xl border border-default p-5">
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-book-open" class="text-primary" />
            </div>
            <div class="min-w-0">
              <h3 class="font-semibold truncate">{{ courseInfo?.course?.title }}</h3>
              <p v-if="courseInfo?.course?.description" class="text-sm text-muted mt-0.5 line-clamp-2">
                {{ courseInfo.course.description }}
              </p>
              <p v-if="courseInfo?.course?.owner?.name" class="text-xs text-dimmed mt-1">
                Lektor: {{ courseInfo.course.owner.name }}
              </p>
            </div>
          </div>
        </div>

        <!-- Nickname form -->
        <div class="bg-elevated rounded-xl border border-default p-6 space-y-4">
          <UFormField label="Vaše jméno / přezdívka">
            <UInput
              v-model="nickname"
              placeholder="Zadejte své jméno..."
              size="lg"
              maxlength="50"
              autocomplete="off"
              @keydown.enter="joinCourse"
            />
          </UFormField>

          <div class="flex gap-2">
            <UButton
              label="Zpět"
              variant="outline"
              color="neutral"
              icon="i-lucide-arrow-left"
              @click="step = 'code'"
            />
            <TdaButton
              block
              :loading="loading"
              :disabled="!nickname.trim()"
              icon="i-lucide-log-in"
              @click="joinCourse"
            >
              Připojit se
            </TdaButton>
          </div>
        </div>
      </div>

      <!-- Success state -->
      <div v-if="joined" class="space-y-6">
        <div class="bg-elevated rounded-xl border border-success/30 p-6 text-center space-y-4">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10">
            <UIcon name="i-lucide-check-circle-2" class="text-3xl text-success" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Úspěšně připojeno!</h2>
            <p class="text-muted mt-1">
              Jste připojeni jako <strong>{{ participantData?.nickname }}</strong>
            </p>
          </div>
          <TdaButton
            block
            icon="i-lucide-play"
            @click="goToCourse"
          >
            Přejít do kurzu
          </TdaButton>
        </div>
      </div>
    </div>
  </div>
</template>
