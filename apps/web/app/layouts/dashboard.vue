<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const userStore = useUserStore()
const { isNotificationsSlideoverOpen } = useDashboard()

const open = ref(false)

const links = computed<NavigationMenuItem[][]>(() => [[
  {
    label: 'Přehled',
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard',
    exact: true,
    onSelect: () => { open.value = false }
  },
  {
    label: 'Moje kurzy',
    icon: 'i-lucide-book-open',
    to: '/dashboard/courses',
    onSelect: () => { open.value = false }
  },
  {
    label: 'Statistiky',
    icon: 'i-lucide-bar-chart-3',
    to: '/dashboard/statistics',
    onSelect: () => { open.value = false }
  }
], [
  {
    label: 'Veřejný web',
    icon: 'i-lucide-globe',
    to: '/',
    onSelect: () => { open.value = false }
  }
]])

const searchGroups = computed(() => [{
  id: 'links',
  label: 'Navigace',
  items: links.value.flat().map(l => ({
    ...l,
    onSelect: () => navigateTo(l.to as string)
  }))
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="dashboard"
      v-model:open="open"
      collapsible
      resizable
      class="bg-muted/70 backdrop-blur border-r border-default"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 px-2 py-1 group">
          <img src="/brand/logos/logo-erb.svg" alt="TdA" class="h-7 w-7 shrink-0 group-hover:scale-105 transition-transform" />
          <span v-if="!collapsed" class="font-extrabold text-sm truncate text-highlighted">Think different Academy</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-default/70 ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <DashboardUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
