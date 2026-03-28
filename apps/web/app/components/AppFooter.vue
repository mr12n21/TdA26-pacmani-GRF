<script setup lang="ts">
const columns = [
  {
    label: 'Informace',
    children: [
      { label: 'O nás', to: '/about' },
      { label: 'FAQ', to: '/faq' }
    ]
  }
  // Sekci "Pro lektory" jsem odstranil, aby zbyla jen FAQ a O nás, jak jsi chtěl.
]
</script>

<template>
  <div class="h-px bg-slate-200 dark:bg-white/10" />

  <UFooter :ui="{ top: 'border-b border-slate-200 dark:border-white/10' }">  
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns" />
      </UContainer>
    </template>

    <template #left>
      <p class="text-slate-500 dark:text-slate-400 text-sm">
        © {{ new Date().getFullYear() }} Think different Academy
      </p>
    </template>

    <template #right>
      <div class="flex gap-4">
        </div>
    </template>
  </UFooter>
</template>