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
    <!-- ═══ HERO ═══ -->
    <section class="relative py-28 lg:py-36 overflow-hidden">
      <!-- Gradient orbs -->
      <div class="gradient-orb gradient-orb-blue w-[500px] h-[500px] -top-40 -left-32" />
      <div class="gradient-orb gradient-orb-teal w-[400px] h-[400px] top-20 -right-20" />
      <div class="gradient-orb gradient-orb-green w-[300px] h-[300px] -bottom-20 left-1/3" />

      <UContainer class="relative">
        <div class="max-w-3xl mx-auto text-center">
          <div class="fade-in mb-8">
            <div class="hero-logo-wrap">
              <div class="hero-logo-halo" aria-hidden="true" />
              <img src="/brand/logos/logo-erb.svg" alt="TdA" class="hero-logo mx-auto animate-gentle-float">
            </div>
          </div>

          <h1 class="text-4xl lg:text-5xl font-bold leading-tight mb-6 fade-in-d1">
            Vzdělávání, <span class="text-accent">které vás baví</span>
          </h1>

          <p class="text-lg text-muted leading-relaxed mb-10 max-w-xl mx-auto fade-in-d2">
            Interaktivní platforma pro živé kurzy s moduly, kvízy a komunikací v reálném čase.
          </p>

          <div class="flex flex-wrap justify-center gap-4 fade-in-d3">
            <UButton
              label="Prohlédnout kurzy"
              to="/courses"
              icon="i-lucide-arrow-right"
              trailing
              color="primary"
              size="xl"
              class="btn-glow"
            />
            <UButton
              label="Jsem lektor"
              to="/signup"
              color="neutral"
              variant="outline"
              size="xl"
            />
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ─── divider ─── -->
    <div class="gradient-divider mx-auto w-2/3" />

    <!-- ═══ FEATURES ═══ -->
    <section class="py-24 section-gradient">
      <UContainer>
        <div class="text-center mb-14 fade-in">
          <h2 class="text-3xl font-bold mb-3">Vše pro moderní <span class="text-accent">vzdělávání</span></h2>
          <p class="text-muted max-w-lg mx-auto">
            Platforma navržená pro lektory i studenty s důrazem na interaktivitu
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="(item, i) in features"
            :key="i"
            class="rounded-xl border border-default bg-elevated p-6 card-glow"
            :class="`fade-in-d${Math.min(i + 1, 5)}`"
          >
            <div class="icon-badge w-10 h-10 mb-4">
              <img :src="item.icon" alt="" class="w-5 h-5">
            </div>
            <h3 class="font-semibold mb-2">{{ item.title }}</h3>
            <p class="text-sm text-muted leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- ─── divider ─── -->
    <div class="gradient-divider mx-auto w-2/3" />

    <!-- ═══ CTA ═══ -->
    <section class="relative py-24 overflow-hidden">
      <div class="gradient-orb gradient-orb-teal w-[400px] h-[400px] -bottom-32 -right-20" />
      <div class="gradient-orb gradient-orb-blue w-[300px] h-[300px] -top-16 -left-16" />

      <UContainer class="relative">
        <div class="max-w-xl mx-auto text-center fade-in">
          <h2 class="text-3xl font-bold mb-4">Připraveni <span class="text-accent">začít?</span></h2>
          <p class="text-muted mb-10 leading-relaxed">
            Vytvořte si účet a začněte sledovat živé kurzy nebo vytvářejte vlastní obsah.
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <UButton label="Vytvořit účet" to="/signup" size="xl" color="primary" class="btn-glow" />
            <UButton label="Procházet kurzy" to="/courses" size="xl" color="neutral" variant="outline" />
          </div>
        </div>
      </UContainer>
    </section>
  </div>
</template>

<style scoped>
.hero-logo-wrap {
  position: relative;
  width: fit-content;
  margin-inline: auto;
  isolation: isolate;
}

.hero-logo-halo {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 10.5rem;
  height: 10.5rem;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background:
    radial-gradient(circle at 35% 35%, rgba(145, 245, 173, 0.34), transparent 62%),
    radial-gradient(circle at 70% 70%, rgba(0, 112, 187, 0.2), transparent 64%);
  filter: blur(18px);
  opacity: 0.9;
  z-index: -1;
}

.hero-logo {
  width: 5.4rem;
  height: 5.4rem;
}

@media (min-width: 1024px) {
  .hero-logo {
    width: 6.25rem;
    height: 6.25rem;
  }

  .hero-logo-halo {
    width: 12rem;
    height: 12rem;
  }
}

:global(.dark) .hero-logo-halo {
  opacity: 0.65;
}
</style>
