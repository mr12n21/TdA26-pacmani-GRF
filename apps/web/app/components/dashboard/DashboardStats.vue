<script setup lang="ts">
const courseStore = useCourseStore()

const stats = computed(() => {
  const all = courseStore.courses
  return [
    {
      title: 'Celkem kurzů',
      value: all.length,
      icon: 'i-lucide-book-open',
      color: 'text-default'
    },
    {
      title: 'Živě',
      value: all.filter(c => c.state === 'LIVE').length,
      icon: 'i-lucide-radio',
      color: 'text-green-500'
    },
    {
      title: 'Koncepty',
      value: all.filter(c => c.state === 'DRAFT').length,
      icon: 'i-lucide-file-edit',
      color: 'text-muted'
    },
    {
      title: 'Archivováno',
      value: all.filter(c => c.state === 'ARCHIVED').length,
      icon: 'i-lucide-archive',
      color: 'text-blue-500'
    }
  ]
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="stat in stats"
      :key="stat.title"
      class="flex items-center gap-4 p-4 rounded-lg border border-default bg-default"
    >
      <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
        <UIcon :name="stat.icon" class="text-lg" :class="stat.color" />
      </div>
      <div>
        <p class="text-sm text-muted">{{ stat.title }}</p>
        <p class="text-2xl font-bold" :class="stat.color">{{ stat.value }}</p>
      </div>
    </div>
  </div>
</template>
