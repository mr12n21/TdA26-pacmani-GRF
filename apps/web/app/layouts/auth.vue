<template>
  <div class="min-h-screen flex">
    <!-- Left branded panel (hidden on mobile) -->
    <div class="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-elevated border-r border-default">
      <div class="gradient-orb gradient-orb-blue w-[400px] h-[400px] -top-20 -left-20" />
      <div class="gradient-orb gradient-orb-green w-[300px] h-[300px] -bottom-16 -right-16" />
      <div class="text-center p-8 fade-in relative">
        <img src="/brand/logos/logo-erb.svg" alt="TdA" class="w-20 h-20 mx-auto mb-6 animate-gentle-float">
        <h2 class="text-2xl font-bold mb-3 text-accent">Think different Academy</h2>
        <p class="text-muted max-w-xs mx-auto">Interaktivní vzdělávací platforma pro moderní lektory i studenty</p>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="flex-1 flex items-center justify-center px-4 py-12 relative">
      <UButton
        icon="i-lucide-chevron-left"
        label="Zpět"
        to="/"
        color="neutral"
        variant="ghost"
        class="absolute left-6 top-6"
      />

      <div class="max-w-sm w-full fade-in-d1">
        <div class="flex justify-center mb-8 lg:hidden">
          <AppLogo />
        </div>

        <UPageCard variant="subtle" class="border border-default">
          <slot />
        </UPageCard>
      </div>
    </div>
  </div>
</template>
