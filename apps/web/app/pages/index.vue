<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

useSeoMeta({
  titleTemplate: '',
  title: 'Think different Academy – Interaktivní vzdělávací platforma',
  ogTitle: 'Think different Academy',
  description: 'Živé kurzy s interaktivními moduly, kvízy a real-time komunikací.',
  ogDescription: 'Živé kurzy s interaktivními moduly, kvízy a real-time komunikací.'
})

const toast = useToast()
const userStore = useUserStore()

// ── Auth form state ──
const authTab = ref<'login' | 'register'>('register')
const authLoading = ref(false)

const loginSchema = z.object({
  email: z.email('Neplatný e-mail'),
  password: z.string().min(1, 'Heslo je povinné')
})

const registerSchema = z.object({
  name: z.string().min(1, 'Jméno je povinné'),
  email: z.email('Neplatný e-mail'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků')
})

type LoginSchema = z.output<typeof loginSchema>
type RegisterSchema = z.output<typeof registerSchema>

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', password: '' })

async function onLogin(payload: FormSubmitEvent<LoginSchema>) {
  authLoading.value = true
  try {
    await userStore.login(payload.data.email, payload.data.password)
    toast.add({ title: 'Přihlášeno', description: 'Vítejte zpět!', color: 'success' })
    navigateTo('/dashboard')
  } catch (err: any) {
    toast.add({ title: 'Chyba přihlášení', description: err?.data?.message || 'Neplatné přihlašovací údaje', color: 'error' })
  } finally {
    authLoading.value = false
  }
}

async function onRegister(payload: FormSubmitEvent<RegisterSchema>) {
  authLoading.value = true
  try {
    await userStore.register(payload.data.name, payload.data.email, payload.data.password)
    toast.add({ title: 'Účet vytvořen', description: 'Vítejte v Think different Academy!', color: 'success' })
    navigateTo('/auth/onboarding')
  } catch (err: any) {
    toast.add({ title: 'Chyba registrace', description: err?.data?.message || 'Registrace se nezdařila', color: 'error' })
  } finally {
    authLoading.value = false
  }
}

const features = [
  {
    icon: '/brand/icons/playing-white.svg',
    title: 'Živé kurzy',
    description: 'Sledujte průběh kurzu v reálném čase s automatickými aktualizacemi.'
  },
  {
    icon: '/brand/icons/difficulty/medium-white.svg',
    title: 'Interaktivní moduly',
    description: 'Postupně odhalované obsahové moduly s materiály a kvízy.'
  },
  {
    icon: '/brand/icons/thinking-white.svg',
    title: 'Kvízy a testy',
    description: 'Ověřte své znalosti průběžnými kvízy s okamžitým vyhodnocením.'
  },
  {
    icon: '/brand/icons/idea-white.svg',
    title: 'Živý feed',
    description: 'Komunikace v reálném čase mezi lektorem a studenty.'
  },
  {
    icon: '/brand/icons/difficulty/hard-white.svg',
    title: 'Statistiky',
    description: 'Přehledné statistiky výsledků a účasti pro lektory.'
  },
  {
    icon: '/brand/icons/difficulty/easy-white.svg',
    title: 'Jednoduché a bezpečné',
    description: 'Čistý design bez zbytečností, zaměřený na obsah.'
  }
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden pt-24 pb-20 lg:pt-28 lg:pb-32 hero-surface">
      <div class="hero-grid-pattern text-slate-500 dark:text-white" />
      
      <div class="gradient-orb gradient-orb-blue w-[480px] h-[480px] top-0 -left-24 opacity-10 dark:opacity-20" />
      <div class="gradient-orb gradient-orb-teal w-[360px] h-[360px] top-32 right-0 opacity-10 dark:opacity-20" />

      <UContainer class="relative">
        <div class="mx-auto grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div class="max-w-2xl text-center lg:text-left">
            <p class="inline-flex items-center justify-center rounded-full border border-blue-500/20 bg-blue-50 dark:bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700 dark:text-teal-300 lg:justify-start">
              Interaktivní platforma pro školy
            </p>
            <h1 class="mt-8 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Interaktivní platforma pro moderní výuku
            </h1>
            <p class="mt-6 text-base leading-8 text-slate-600 dark:text-slate-200 sm:text-lg lg:text-xl">
              Zlepšujeme výuku IT o praktická a teoretická cvičení díky přehlednému prostředí, ve kterém učitelé i studenti pracují bez zbytečné složitosti.
            </p>
            <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center justify-center lg:justify-start">
              <UButton label="Výuka s TdA" to="/courses" icon="i-lucide-arrow-right" trailing color="primary" size="xl" class="btn-glow" />
              <UButton v-if="!userStore.isAuthenticated" label="Registrace zdarma" to="#auth" color="neutral" variant="outline" size="xl" />
              <UButton v-else label="Dashboard" to="/dashboard" color="neutral" variant="outline" size="xl" icon="i-lucide-layout-dashboard" />
            </div>
          </div>

          <div class="relative mx-auto w-full max-w-[28rem] lg:max-w-[32rem]">
            <div class="hero-preview glass border-slate-200 dark:border-white/10 p-8 shadow-2xl">
              <div class="flex items-center gap-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 dark:bg-white/10 text-white">
                  <img src="/brand/logos/logo-erb.svg" alt="TdA" class="h-8 w-8" />
                </div>
                <div>
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Think different Academy</p>
                  <h2 class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Jednoduchý start pro každou třídu</h2>
                </div>
              </div>

              <div class="mt-8 grid gap-4">
                <div class="rounded-2xl bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-white/5">
                  <p class="text-sm font-medium text-blue-600 dark:text-slate-300">Živé kurzy v reálném čase</p>
                  <p class="mt-1 text-base font-semibold text-slate-900 dark:text-white">Sledujte postup studentů a otevřete novou lekci jedním kliknutím.</p>
                </div>
                </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-20 lg:py-28 text-white dark:bg-slate-950">
      <UContainer>
        <div class="grid gap-6 md:grid-cols-3">
          <div class="stat-card">
            <span class="stat-value">434+</span>
            <p class="stat-label">praktických cvičení</p>
          </div>
          <div class="stat-card">
            <span class="stat-value">134</span>
            <p class="stat-label">škol z celé ČR</p>
          </div>
          <div class="stat-card">
            <span class="stat-value">41 902+</span>
            <p class="stat-label">studentů v moderní výuce</p>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-24 section-gradient">
      <UContainer>
        <div class="mx-auto max-w-3xl text-center mb-14">
          <p class="text-xs uppercase tracking-[0.28em] text-blue-600 dark:text-teal-400 font-semibold">
            Jak se s TdA učí
          </p>
          <h2 class="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Vyberete téma, přiřadíte úlohu a sledujete výkon v reálném čase
          </h2>
          <p class="mt-4 text-lg">
            Platforma je navržena tak, aby se studenti rychle zapojili a vyučující měli okamžitý přehled o výsledcích.
          </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="step-card bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <span class="step-number">1.</span>
            <h3 class="text-slate-900 dark:text-white font-bold text-xl mt-4">Vytvoříte virtuální třídu</h3>
            <p class="text-slate-600 dark:text-slate-400 mt-2 text-sm">
              Na pár kliknutí vytvoříte skupinu a pozvete do ní žáky pomocí jednoduchého importu.
            </p>
          </div>

          <div class="step-card bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <span class="step-number">2.</span>
            <h3 class="text-slate-900 dark:text-white font-bold text-xl mt-4">Vyberete si úlohu</h3>
            <p class="text-slate-600 dark:text-slate-400 mt-2 text-sm">
              Vyberete z připravených témat a zadáte úlohu konkrétní skupině studentů.
            </p>
          </div>

          <div class="step-card bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <span class="step-number">3.</span>
            <h3 class="text-slate-900 dark:text-white font-bold text-xl mt-4">Sledujete práci v reálném čase</h3>
            <p class="text-slate-600 dark:text-slate-400 mt-2 text-sm">
              Při plnění vidíte postup celé třídy i jednotlivých žáků a můžete rychle zasáhnout.
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-24">
      <UContainer>
        <div class="max-w-5xl mx-auto text-center">
          <p class="text-xs uppercase tracking-[0.28em] text-accent mb-4">Platforma a obsah</p>
          <h2 class="text-3xl font-bold mb-4">Všechny nástroje pro moderní výuku pod jednou střechou</h2>
          <p class="text-muted max-w-3xl mx-auto txt-lg">Kombinujeme správu kurzu, interaktivní moduly, testování a komunikaci. Haxagonový styl je o rychlosti, přehlednosti a praktičnosti.</p>
        </div>

        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2 text-xs">Živé úkoly</h3>
            <p class="text-sm text-muted leading-relaxed">Studijní úlohy, které studenty vedou krok za krokem a podporují praktické dovednosti.</p>
          </div>
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2 text-xs">Správa tříd</h3>
            <p class="text-sm text-muted leading-relaxed">Seskupujte studenty, přiřazujte úlohy a spravujte průběh celé výuky z jednoho místa.</p>
          </div>
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2 text-xs">Vyhodnocení</h3>
            <p class="text-sm text-muted leading-relaxed">Přehledné výsledky výkonu i podrobné statistiky o práci celé třídy i jednotlivců.</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Auth Section -->
    <section v-if="!userStore.isAuthenticated" class="py-24 section-gradient" id="auth">
      <UContainer>
        <div class="mx-auto max-w-5xl grid gap-12 lg:grid-cols-[1fr_1fr] items-start">
          <!-- Left: Info -->
          <div class="max-w-lg">
            <p class="text-xs uppercase tracking-[0.28em] text-blue-600 dark:text-teal-400 font-semibold">
              Začněte hned
            </p>
            <h2 class="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              Připojte se k platformě
            </h2>
            <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Zaregistrujte se jako lektor nebo student a získejte přístup k živým kurzům, interaktivním modulům a kvízům.
            </p>
            <div class="mt-8 space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UIcon name="i-lucide-zap" class="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p class="font-semibold text-sm text-slate-900 dark:text-white">Okamžitý start</p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">Registrace zabere pár sekund, žádná složitá nastavení.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <p class="font-semibold text-sm text-slate-900 dark:text-white">Bezpečný přístup</p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">Vaše data jsou chráněna, přístup přes organizace.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UIcon name="i-lucide-users" class="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p class="font-semibold text-sm text-slate-900 dark:text-white">Lektor i student</p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">Jeden účet, vše na jednom místě.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Form Card -->
          <div class="w-full max-w-md mx-auto lg:mx-0">
            <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xl p-6 sm:p-8">
              <!-- Tab switcher -->
              <div class="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
                <button
                  class="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
                  :class="authTab === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                  @click="authTab = 'register'"
                >
                  Registrace
                </button>
                <button
                  class="flex-1 py-2 text-sm font-semibold rounded-md transition-all"
                  :class="authTab === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                  @click="authTab = 'login'"
                >
                  Přihlášení
                </button>
              </div>

              <!-- Register Form -->
              <UForm v-if="authTab === 'register'" :schema="registerSchema" :state="registerForm" @submit="onRegister" class="space-y-4">
                <UFormField label="Jméno" name="name">
                  <UInput v-model="registerForm.name" placeholder="Vaše jméno" icon="i-lucide-user" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="E-mail" name="email">
                  <UInput v-model="registerForm.email" type="email" placeholder="vas@email.cz" icon="i-lucide-mail" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Heslo" name="password">
                  <UInput v-model="registerForm.password" type="password" placeholder="Alespoň 8 znaků" icon="i-lucide-lock" size="lg" class="w-full" />
                </UFormField>
                <UButton type="submit" color="primary" size="lg" block :loading="authLoading" class="btn-glow mt-2">
                  Vytvořit účet
                </UButton>
                <p class="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                  Už máte účet? <button type="button" class="text-blue-600 dark:text-teal-400 font-medium hover:underline" @click="authTab = 'login'">Přihlaste se</button>
                </p>
              </UForm>

              <!-- Login Form -->
              <UForm v-else :schema="loginSchema" :state="loginForm" @submit="onLogin" class="space-y-4">
                <UFormField label="E-mail" name="email">
                  <UInput v-model="loginForm.email" type="email" placeholder="vas@email.cz" icon="i-lucide-mail" size="lg" class="w-full" />
                </UFormField>
                <UFormField label="Heslo" name="password">
                  <UInput v-model="loginForm.password" type="password" placeholder="Zadejte heslo" icon="i-lucide-lock" size="lg" class="w-full" />
                </UFormField>
                <UButton type="submit" color="primary" size="lg" block :loading="authLoading" class="mt-2">
                  Přihlásit se
                </UButton>
                <p class="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                  Nemáte účet? <button type="button" class="text-blue-600 dark:text-teal-400 font-medium hover:underline" @click="authTab = 'register'">Zaregistrujte se</button>
                </p>
              </UForm>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- If authenticated, show dashboard CTA instead -->
    <section v-else class="py-20">
      <UContainer>
        <div class="text-center">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Vítejte zpět!</h2>
          <p class="text-slate-600 dark:text-slate-300 mb-6">Pokračujte do dashboardu a spravujte své kurzy.</p>
          <UButton label="Přejít do dashboardu" to="/dashboard" icon="i-lucide-layout-dashboard" size="xl" color="primary" class="btn-glow" />
        </div>
      </UContainer>
    </section>
  </div>
</template>
