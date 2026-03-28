<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const userStore = useUserStore()
const { isNotificationsSlideoverOpen } = useDashboard()

const open = ref(false)

const links = computed<NavigationMenuItem[][]>(() => {
  const mainLinks: NavigationMenuItem[] = []
  const bottomLinks: NavigationMenuItem[] = []

  // Super Admin section
  if (userStore.isSuperAdmin) {
    mainLinks.push(
      {
        label: 'Správa organizací',
        icon: 'i-heroicons-building-office',
        to: '/admin/namespaces',
        onSelect: () => { open.value = false }
      },
      {
        label: 'Uživatelé',
        icon: 'i-heroicons-users',
        to: '/admin/users',
        onSelect: () => { open.value = false }
      }
    )
  }

  // Org Admin section
  if (userStore.isOrgAdmin) {
    mainLinks.push(
      {
        label: 'Členové organizace',
        icon: 'i-heroicons-user-group',
        to: '/settings/members',
        onSelect: () => { open.value = false }
      },
      {
        label: 'Nastavení školy',
        icon: 'i-heroicons-cog-6-tooth',
        to: '/settings/namespace',
        onSelect: () => { open.value = false }
      }
    )
  }

  // Lecturer/Regular user section
  if (userStore.isNamespaceLecturer || !userStore.isSuperAdmin) {
    mainLinks.push(
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
    )
  }

  bottomLinks.push({
    label: 'Veřejný web',
    icon: 'i-lucide-globe',
    to: '/',
    onSelect: () => { open.value = false }
  })

  return [mainLinks, bottomLinks]
})

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
      class="dashboard-sidebar"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/dashboard" class="flex items-center gap-2.5 px-2 py-1.5 group">
          <img
            src="/brand/logos/logo-erb.svg"
            alt="TdA"
            class="h-7 w-7 shrink-0 group-hover:scale-105 transition-transform duration-200"
          />
          <span
            v-if="!collapsed"
            class="font-extrabold text-sm truncate text-highlighted"
          >
            Think different Academy
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-default/70 ring-default" />

        <!-- Namespace Switcher (only for non-super admins) -->
        <div v-if="!userStore.isSuperAdmin && userStore.hasActiveNamespace" class="px-3 py-2">
          <p v-if="!collapsed" class="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
            Aktivní organizace
          </p>
          <NamespaceSwitcher :collapsed="collapsed" />
        </div>

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

<style scoped>
.dashboard-sidebar {
  background-color: var(--ui-bg-muted);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-right: 1px solid var(--ui-border);
}
</style>
