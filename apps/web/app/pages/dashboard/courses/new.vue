<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

const toast = useToast()

onMounted(async () => {
  try {
    const { post } = useApi()
    const course = await post('/courses', { title: 'Nový kurz', description: '' })
    navigateTo(`/dashboard/courses/${course.uuid || course.id}`, { replace: true })
  } catch (err: any) {
    toast.add({ title: 'Chyba', description: err?.data?.message || 'Nepodařilo se vytvořit kurz', color: 'error' })
    navigateTo('/dashboard/courses', { replace: true })
  }
})
</script>

<template>
  <div class="flex justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
  </div>
</template>
