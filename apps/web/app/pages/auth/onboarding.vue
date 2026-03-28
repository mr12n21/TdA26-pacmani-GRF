<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
    <UCard class="w-full max-w-2xl">
      <template #header>
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Vítejte v TourdeApp!
          </h1>
          <p class="text-gray-600 dark:text-gray-300">
            Dokončete nastavení svého účtu
          </p>
        </div>
      </template>

      <!-- Step 1: Výběr role -->
      <div v-if="step === 1" class="space-y-6">
        <div class="text-center mb-8">
          <h2 class="text-xl font-semibold mb-2">Kdo jste?</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Vyberte možnost, která vás nejlépe popisuje
          </p>
        </div>

        <div class="grid gap-4">
          <button
            @click="selectUserType('school_admin')"
            class="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <UIcon name="i-lucide-school" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">Zástupce školy/organizace</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Chci vytvořit novou organizaci a spravovat lektory a studenty
                </p>
              </div>
            </div>
          </button>

          <button
            @click="selectUserType('lecturer')"
            class="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <UIcon name="i-lucide-user-check" class="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">Lektor</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Chci vytvářet a vyučovat kurzy v existující organizaci
                </p>
              </div>
            </div>
          </button>

          <button
            @click="selectUserType('student')"
            class="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <UIcon name="i-lucide-graduation-cap" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-lg mb-1">Student</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Chci se přihlásit do kurzu pomocí kódu od lektora
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2a: Formulář pro vytvoření organizace -->
      <div v-if="step === 2 && userType === 'school_admin'" class="space-y-6">
        <div class="text-center mb-6">
          <h2 class="text-xl font-semibold mb-2">Vytvořit novou organizaci</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Vaše žádost bude odeslána ke schválení administrátorovi
          </p>
        </div>

        <UForm :state="organizationForm" @submit="submitOrganizationRequest">
          <div class="space-y-4">
            <UFormField label="Název organizace" name="name" required>
              <UInput v-model="organizationForm.name" placeholder="ZŠ Krásná Lípa" />
            </UFormField>

            <UFormField label="Slug (URL identifikátor)" name="slug" required>
              <UInput v-model="organizationForm.slug" placeholder="zs-krasna-lipa" />
            </UFormField>

            <UFormField label="Popis">
              <UTextarea v-model="organizationForm.description" placeholder="Základní škola s rozšířenou výukou..." :rows="3" />
            </UFormField>

            <UFormField label="Typ školy">
              <USelect
                v-model="organizationForm.schoolType"
                :options="[
                  { label: 'Základní škola', value: 'elementary' },
                  { label: 'Střední škola', value: 'high_school' },
                  { label: 'Gymnázium', value: 'gymnasium' },
                  { label: 'Univerzita', value: 'university' },
                  { label: 'Jiné', value: 'other' },
                ]"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Město">
                <UInput v-model="organizationForm.city" placeholder="Praha" />
              </UFormField>

              <UFormField label="Stát">
                <UInput v-model="organizationForm.country" placeholder="Česká republika" />
              </UFormField>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <UButton color="neutral" variant="ghost" @click="step = 1" block>
              Zpět
            </UButton>
            <UButton type="submit" :loading="submitting" block>
              Odeslat žádost
            </UButton>
          </div>
        </UForm>
      </div>

      <!-- Step 2b: Výběr existující organizace -->
      <div v-if="step === 2 && (userType === 'lecturer' || userType === 'student')" class="space-y-6">
        <div class="text-center mb-6">
          <h2 class="text-xl font-semibold mb-2">
            {{ userType === 'lecturer' ? 'Připojit se jako lektor' : 'Připojit se jako student' }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Vyberte organizaci nebo použijte pozvánkový kód
          </p>
        </div>

        <UTabs :items="tabs" v-model="activeTab">
          <template #default="{ item }">
            <!-- Tab 1: Výběr organizace -->
            <div v-if="item.key === 'select'" class="space-y-4">
              <div class="relative">
                <UInput
                  v-model="searchQuery"
                  placeholder="Hledat organizaci..."
                  icon="i-lucide-search"
                />
              </div>

              <div v-if="loadingOrgs" class="text-center py-8">
                <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
              </div>

              <div v-else-if="filteredOrganizations.length === 0" class="text-center py-8 text-gray-500">
                Žádné organizace nenalezeny
              </div>

              <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                <button
                  v-for="org in filteredOrganizations"
                  :key="org.id"
                  @click="selectOrganization(org)"
                  class="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left"
                >
                  <h3 class="font-semibold">{{ org.name }}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ org.description || 'Bez popisu' }}</p>
                </button>
              </div>
            </div>

            <!-- Tab 2: Pozvánkový kód -->
            <div v-if="item.key === 'invite'" class="space-y-4 py-4">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Máte pozvánkový kód od lektora? Vložte ho níže pro okamžité připojení.
              </p>

              <UFormField label="Pozvánkový kód">
                <UInput v-model="inviteCode" placeholder="abc123def456..." />
              </UFormField>

              <UButton @click="joinViaInvite" :loading="submitting" block>
                Připojit se pomocí kódu
              </UButton>
            </div>
          </template>
        </UTabs>

        <UButton color="neutral" variant="ghost" @click="step = 1" block>
          Zpět
        </UButton>
      </div>

      <!-- Step 3: Čekání na schválení -->
      <div v-if="step === 3" class="text-center space-y-6 py-8">
        <div class="flex justify-center">
          <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-bold mb-2">Žádost odeslána!</h2>
          <p class="text-gray-600 dark:text-gray-400">
            {{ pendingMessage }}
          </p>
        </div>

        <UButton @click="navigateTo('/login')" color="neutral" variant="ghost">
          Přejít na přihlášení
        </UButton>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Namespace } from '~/types'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const { post, get } = useApi()
const userStore = useUserStore()

const step = ref(1)
const userType = ref<'school_admin' | 'lecturer' | 'student' | null>(null)
const submitting = ref(false)
const loadingOrgs = ref(false)
const searchQuery = ref('')
const inviteCode = ref('')
const pendingMessage = ref('')

const activeTab = ref(0)
const tabs = [
  { key: 'select', label: 'Vybrat organizaci' },
  { key: 'invite', label: 'Pozvánkový kód' },
]

const organizationForm = reactive({
  name: '',
  slug: '',
  description: '',
  schoolType: 'elementary',
  city: '',
  country: 'Česká republika',
})

const availableOrganizations = ref<Namespace[]>([])

const filteredOrganizations = computed(() => {
  if (!searchQuery.value) return availableOrganizations.value
  
  const query = searchQuery.value.toLowerCase()
  return availableOrganizations.value.filter(org =>
    org.name.toLowerCase().includes(query) ||
    org.description?.toLowerCase().includes(query)
  )
})

function selectUserType(type: 'school_admin' | 'lecturer' | 'student') {
  userType.value = type
  step.value = 2
  
  // Načti organizace pro lektory a studenty
  if (type === 'lecturer' || type ==='student') {
    loadOrganizations()
  }
}

async function loadOrganizations() {
  loadingOrgs.value = true
  try {
    const orgs = await get<Namespace[]>('/namespaces')
    availableOrganizations.value = orgs.filter(o => o.status === 'ACTIVE')
  } catch (err) {
    console.error('Failed to load organizations:', err)
  } finally {
    loadingOrgs.value = false
  }
}

async function submitOrganizationRequest() {
  submitting.value = true
  try {
    await post('/namespaces/request', organizationForm)
    
    pendingMessage.value = 'Vaše žádost o vytvoření organizace byla odeslána. Administrátor ji posoudí a ozveme se vám e-mailem.'
    step.value = 3
  } catch (err: any) {
    console.error('Failed to submit organization request:', err)
    alert(err.response?.data?.error || 'Nepodařilo se odeslat žádost')
  } finally {
    submitting.value = false
  }
}

async function selectOrganization(org: Namespace) {
  submitting.value = true
  try {
    const role = userType.value === 'lecturer' ? 'LECTURER' : 'STUDENT'
    await post(`/namespaces/${org.id}/members`, { role })
    
    pendingMessage.value = `Vaše žádost o připojení k organizaci "${org.name}" byla odeslána. Administrátor organizace ji posoudí.`
    step.value = 3
  } catch (err: any) {
    console.error('Failed to request membership:', err)
    alert(err.response?.data?.error || 'Nepodařilo se odeslat žádost')
  } finally {
    submitting.value = false
  }
}

async function joinViaInvite() {
  if (!inviteCode.value.trim()) {
    alert('Vyplňte pozvánkový kód')
    return
  }
  
  submitting.value = true
  try {
    await post(`/invite/${inviteCode.value.trim()}`)
    
    // Načti namespace data
    await userStore.loadAvailableNamespaces()
    
    navigateTo('/auth/select-namespace')
  } catch (err: any) {
    console.error('Failed to join via invite:', err)
    alert(err.response?.data?.error || 'Neplatný pozvánkový kód')
  } finally {
    submitting.value = false
  }
}
</script>
