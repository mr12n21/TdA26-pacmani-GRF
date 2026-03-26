<script setup lang="ts">
useSeoMeta({
  title: 'O nás',
  description: 'Think different Academy – interaktivní vzdělávací platforma'
})

const features = [
  { icon: '/brand/icons/playing-white.svg', title: 'Živé kurzy', desc: 'Sledujte průběh kurzu v reálném čase s automatickými aktualizacemi' },
  { icon: '/brand/icons/difficulty/medium-white.svg', title: 'Interaktivní moduly', desc: 'Postupně odhalovaný obsah s materiály' },
  { icon: '/brand/icons/thinking-white.svg', title: 'Kvízy', desc: 'Průběžné ověřování znalostí s okamžitou zpětnou vazbou' },
  { icon: '/brand/icons/idea-white.svg', title: 'Real-time komunikace', desc: 'Živý feed pro interakci mezi lektorem a studenty' },
  { icon: '/brand/icons/difficulty/hard-white.svg', title: 'Statistiky', desc: 'Podrobné přehledy výsledků a účasti' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative py-20 overflow-hidden">
      <div class="gradient-orb gradient-orb-blue w-[400px] h-[400px] -top-24 -right-20" />
      <div class="gradient-orb gradient-orb-green w-[300px] h-[300px] bottom-0 -left-16" />

      <UContainer class="relative">
        <div class="max-w-3xl mx-auto text-center fade-in">
          <img src="/brand/logos/logo-erb.svg" alt="TdA" class="w-16 h-16 mx-auto mb-6">
          <h1 class="text-4xl font-bold mb-6">
            O <span class="text-accent">Think different Academy</span>
          </h1>
          <p class="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            Think different Academy je moderní vzdělávací platforma zaměřená na interaktivní živé kurzy.
            Naše platforma umožňuje lektorům vytvářet a řídit kurzy v reálném čase, zatímco studenti
            mohou sledovat obsah, účastnit se kvízů a komunikovat prostřednictvím živého feedu.
          </p>
        </div>
      </UContainer>
    </section>

    <div class="gradient-divider mx-auto w-2/3" />

    <!-- Features -->
    <section class="py-20 section-gradient">
      <UContainer>
        <h2 class="text-3xl font-bold text-center mb-12">Co <span class="text-accent">nabízíme</span></h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="(f, i) in features"
            :key="i"
            class="rounded-xl border border-default bg-elevated p-6 card-glow"
            :class="`fade-in-d${Math.min(i + 1, 5)}`"
          >
            <div class="icon-badge w-10 h-10 mb-4">
              <img :src="f.icon" alt="" class="w-5 h-5">
            </div>
            <h3 class="font-semibold mb-2">{{ f.title }}</h3>
            <p class="text-sm text-muted">{{ f.desc }}</p>
          </div>
        </div>
      </UContainer>
    </section>

    <div class="gradient-divider mx-auto w-2/3" />

    <!-- Target group -->
    <section class="relative py-20 overflow-hidden">
      <div class="gradient-orb gradient-orb-teal w-[350px] h-[350px] top-0 -right-24" />

      <UContainer class="relative">
        <div class="max-w-2xl mx-auto text-center fade-in">
          <h2 class="text-3xl font-bold mb-4">Pro koho je platforma <span class="text-accent">určena</span></h2>
          <p class="text-lg text-muted leading-relaxed">
            Platforma je ideální pro lektory, učitele a školitele, kteří chtějí své kurzy
            posunout na novou úroveň interaktivity. Studenti získávají moderní nástroje
            pro efektivní učení.
          </p>
        </div>
      </UContainer>
    </section>
  </div>
</template>
