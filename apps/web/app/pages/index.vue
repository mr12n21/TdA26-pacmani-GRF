<script setup lang="ts">
useSeoMeta({
  titleTemplate: '',
  title: 'Think different Academy – Interaktivní vzdělávací platforma',
  ogTitle: 'Think different Academy',
  description: 'Živé kurzy s interaktivními moduly, kvízy a real-time komunikací.',
  ogDescription: 'Živé kurzy s interaktivními moduly, kvízy a real-time komunikací.'
})

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
              Interaktivní platforma do škol
            </p>
            <h1 class="mt-8 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Interaktivní platforma pro moderní výuku IT & kyberbezpečnosti
            </h1>
            <p class="mt-6 text-base leading-8 text-slate-600 dark:text-slate-200 sm:text-lg lg:text-xl">
              Zlepšujeme výuku IT o praktická a teoretická cvičení díky přehlednému prostředí, ve kterém učitelé i studenti pracují bez zbytečné složitosti.
            </p>
            <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center justify-center lg:justify-start">
              <UButton label="Výuka s TdA" to="/courses" icon="i-lucide-arrow-right" trailing color="primary" size="xl" class="btn-glow" />
              <UButton label="Přihlášení do platformy" to="/login" color="neutral" variant="outline" size="xl" />
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
            <span class="stat-value">41 902+</span>
            <p class="stat-label">studentů v moderní výuce</p>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-24 section-gradient">
      <UContainer>
        <div class="mx-auto max-w-3xl text-center mb-14">
          <p class="text-xs uppercase tracking-[0.28em] text-accent">Jak se s Haxagonem učí</p>
          <h2 class="mt-4 text-3xl font-bold">Vyberete téma, přiřadíte úlohu a sledujete výkon v reálném čase</h2>
          <p class="mt-4 text-muted">Platforma je navržena tak, aby se studenti rychle zapojili a vyučující měli okamžitý přehled o výsledcích.</p>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="step-card">
            <span class="step-number">1.</span>
            <h3>Vytvoříte virtuální třídu</h3>
            <p>Na pár kliknutí vytvoříte skupinu a pozvete do ní žáky pomocí jednoduchého importu.</p>
          </div>
          <div class="step-card">
            <span class="step-number">2.</span>
            <h3>Vyberete si úlohu</h3>
            <p>Vyberete z připravených témat a zadáte úlohu konkrétní skupině studentů.</p>
          </div>
          <div class="step-card">
            <span class="step-number">3.</span>
            <h3>Sledujete práci v reálném čase</h3>
            <p>Při plnění vidíte postup celé třídy i jednotlivých žáků a můžete rychle zasáhnout.</p>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-24">
      <UContainer>
        <div class="max-w-5xl mx-auto text-center">
          <p class="text-xs uppercase tracking-[0.28em] text-accent mb-4">Platforma a obsah</p>
          <h2 class="text-3xl font-bold mb-4">Všechny nástroje pro moderní výuku pod jednou střechou</h2>
          <p class="text-muted max-w-3xl mx-auto">Kombinujeme správu kurzu, interaktivní moduly, testování a komunikaci. Haxagonový styl je o rychlosti, přehlednosti a praktičnosti.</p>
        </div>

        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2">Živé úkoly</h3>
            <p class="text-sm text-muted leading-relaxed">Studijní úlohy, které studenty vedou krok za krokem a podporují praktické dovednosti.</p>
          </div>
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2">Správa tříd</h3>
            <p class="text-sm text-muted leading-relaxed">Seskupujte studenty, přiřazujte úlohy a spravujte průběh celé výuky z jednoho místa.</p>
          </div>
          <div class="rounded-3xl border border-default bg-elevated p-6 card-glow">
            <h3 class="font-semibold mb-2">Vyhodnocení</h3>
            <p class="text-sm text-muted leading-relaxed">Přehledné výsledky výkonu i podrobné statistiky o práci celé třídy i jednotlivců.</p>
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>
