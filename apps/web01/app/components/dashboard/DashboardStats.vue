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
      value: all.filter((c: any) => c.state === 'LIVE').length,
      icon: 'i-lucide-radio',
      color: 'text-green-500'
    },
    {
      title: 'Koncepty',
      value: all.filter((c: any) => c.state === 'DRAFT').length,
      icon: 'i-lucide-file-edit',
      color: 'text-muted'
    },
    {
      title: 'Archivováno',
      value: all.filter((c: any) => c.state === 'ARCHIVED').length,
      icon: 'i-lucide-archive',
      color: 'text-blue-500'
    }
  ]
})
</script>

<template>
  <div class="stats-grid">
    <div
      v-for="stat in stats"
      :key="stat.title"
      class="stat-card"
    >
      <div class="stat-icon">
        <UIcon :name="stat.icon" class="text-lg" :class="stat.color" />
      </div>
      <div>
        <p class="text-sm text-muted">{{ stat.title }}</p>
        <p class="text-2xl font-bold" :class="stat.color">{{ stat.value }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 88%, transparent);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, #0070BB 50%, var(--ui-border));
}

.stat-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.7rem;
  background: color-mix(in oklab, var(--ui-bg-muted) 84%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
