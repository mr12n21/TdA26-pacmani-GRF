<script setup lang="ts">
const columns = [
  {
    label: 'Navigace',
    children: [
      { label: 'Kurzy', to: '/courses' },
      { label: 'O nás', to: '/about' },
      { label: 'FAQ', to: '/faq' }
    ]
  },
  {
    label: 'Pro lektory',
    children: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Přihlášení', to: '/login' },
      { label: 'Registrace', to: '/signup' }
    ]
  }
]
</script>

<template>
  <div class="gradient-divider" />

  <UFooter :ui="{ top: 'border-b border-default' }" class="section-gradient">  
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns">
          <template #right>
            <div class="flex items-center gap-3">
              <img src="/brand/logos/logo-erb.svg" alt="TdA" class="h-12 w-12">
              <div>
                <p class="font-extrabold text-highlighted">
                  Think different Academy
                </p>
                <p class="text-sm text-muted">Interaktivní vzdělávací platforma</p>
              </div>
            </div>


          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #left>
      <p class="text-muted text-sm">
        © {{ new Date().getFullYear() }} Think different Academy
      </p>
    </template>
  </UFooter>
</template>
