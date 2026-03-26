<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'
import type { DropdownMenuItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

useSeoMeta({
  title: 'Dashboard'
})

const userStore = useUserStore()
const courseStore = useCourseStore()
const loading = ref(true)

const items = [[{
  label: 'Nový kurz',
  icon: 'i-lucide-plus',
  to: '/dashboard/courses'
}]] satisfies DropdownMenuItem[][]

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="`Vítejte, ${userStore.user?.name || 'Lektore'}`" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <template v-else>
        <DashboardStats class="mb-6" />

        <!-- Quick actions -->
        <div class="flex gap-3 mb-8">
          <UButton
            label="Nový kurz"
            icon="i-lucide-plus"
            color="primary"
            to="/dashboard/courses/new"
          />
          <UButton
            label="Zobrazit kurzy"
            icon="i-lucide-book-open"
            color="neutral"
            variant="outline"
            to="/dashboard/courses"
          />
        </div>

        <!-- Recent courses -->
        <h2 class="text-xl font-semibold mb-4">Nedávné kurzy</h2>
        <div v-if="courseStore.courses.length === 0" class="text-center py-12 bg-muted rounded-lg">
          <UIcon name="i-lucide-book-open" class="text-3xl text-muted mb-2" />
          <p class="text-muted">Zatím nemáte žádné kurzy</p>
          <UButton label="Vytvořit první kurz" to="/dashboard/courses/new" class="mt-4" />
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="course in courseStore.courses.slice(0, 5)"
            :key="course.uuid"
            :to="`/dashboard/courses/${course.uuid}`"
            class="block"
          >
            <UPageCard class="hover:ring-primary/50 transition-all">
              <template #title>
                <div class="flex items-center justify-between">
                  <span>{{ course.title || 'Bez názvu' }}</span>
                  <UBadge
                    :label="STATE_META[course.state]?.label || course.state"
                    :style="{ backgroundColor: STATE_META[course.state]?.bg, color: STATE_META[course.state]?.color }"
                    size="sm"
                  />
                </div>
              </template>
              <template #description>
                <p class="text-sm text-muted">{{ course.description || 'Bez popisu' }}</p>
              </template>
            </UPageCard>
          </NuxtLink>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
