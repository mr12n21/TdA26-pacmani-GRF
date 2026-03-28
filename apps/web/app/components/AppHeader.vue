<script setup lang="ts">
const route = useRoute()
const userStore = useUserStore()

// ── Scroll-driven shrink ──
const scrolled = ref(false)
const onScroll = () => {
  scrolled.value = window.scrollY > 24
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

// ── Mobile drawer ──
const mobileOpen = ref(false)
const closeMobile = () => { mobileOpen.value = false }

// ── Mega-menu (Kurzy) ──
const megaOpen = ref(false)
let megaTimeout: ReturnType<typeof setTimeout> | null = null
const openMega = () => { if (megaTimeout) clearTimeout(megaTimeout); megaOpen.value = true }
const closeMega = () => { megaTimeout = setTimeout(() => { megaOpen.value = false }, 180) }

const navItems = computed(() => [
  { label: 'Kurzy', to: '/courses', active: route.path.startsWith('/courses'), mega: true },
  { label: 'O nás', to: '/about' },
  { label: 'FAQ', to: '/faq' }
])
</script>

<template>
  <!-- Glassmorphism sticky header -->
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
    :class="[
      scrolled
        ? 'py-2 shadow-lg shadow-black/5 dark:shadow-black/20'
        : 'py-3.5',
      'glass'
    ]"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
      <!-- Left: Logo -->
      <AppLogo :size="scrolled ? 'sm' : 'md'" class="transition-transform duration-300" />

      <!-- Center: Desktop nav -->
      <nav class="hidden lg:flex items-center gap-1">
        <template v-for="item in navItems" :key="item.label">
          <div
            v-if="item.mega"
            class="relative"
            @mouseenter="openMega"
            @mouseleave="closeMega"
          >
            <NuxtLink
              :to="item.to"
              class="nav-link"
              :class="{ 'nav-link--active': item.active }"
            >
              {{ item.label }}
              <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 transition-transform duration-200" :class="megaOpen ? 'rotate-180' : ''" />
            </NuxtLink>

            <!-- Mega-menu dropdown -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="megaOpen"
                class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] rounded-xl border border-default glass p-4"
              >
                <div class="grid grid-cols-2 gap-3">
                  <NuxtLink
                    to="/courses"
                    class="mega-item"
                    @click="closeMega"
                  >
                    <div class="mega-icon bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400">
                      <UIcon name="i-lucide-book-open" class="w-5 h-5" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm text-highlighted">Všechny kurzy</p>
                      <p class="text-xs text-muted">Prohlédněte si nabídku</p>
                    </div>
                  </NuxtLink>
                  <NuxtLink
                    v-if="userStore.isAuthenticated"
                    to="/dashboard/courses"
                    class="mega-item"
                    @click="closeMega"
                  >
                    <div class="mega-icon bg-teal-400/10 text-teal-500 dark:bg-teal-400/10 dark:text-teal-400">
                      <UIcon name="i-lucide-folder-kanban" class="w-5 h-5" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm text-highlighted">Moje kurzy</p>
                      <p class="text-xs text-muted">Správa vašich kurzů</p>
                    </div>
                  </NuxtLink>
                  <NuxtLink
                    v-if="userStore.isLecturer"
                    to="/dashboard/courses/new"
                    class="mega-item"
                    @click="closeMega"
                  >
                    <div class="mega-icon bg-green-300/10 text-green-500 dark:bg-green-400/10 dark:text-green-400">
                      <UIcon name="i-lucide-plus-circle" class="w-5 h-5" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm text-highlighted">Nový kurz</p>
                      <p class="text-xs text-muted">Vytvořte kurz</p>
                    </div>
                  </NuxtLink>
                  <NuxtLink
                    to="/about"
                    class="mega-item"
                    @click="closeMega"
                  >
                    <div class="mega-icon bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400">
                      <UIcon name="i-lucide-info" class="w-5 h-5" />
                    </div>
                    <div>
                      <p class="font-semibold text-sm text-highlighted">O platformě</p>
                      <p class="text-xs text-muted">Jak to funguje</p>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </Transition>
          </div>

          <NuxtLink
            v-else
            :to="item.to"
            class="nav-link"
            :class="{ 'nav-link--active': route.path === item.to }"
          >
            {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <UColorModeButton />

        <template v-if="userStore.isAuthenticated">
          <UButton
            label="Dashboard"
            icon="i-lucide-layout-dashboard"
            color="primary"
            variant="subtle"
            to="/dashboard"
            class="hidden lg:inline-flex"
            :size="scrolled ? 'xs' : 'sm'"
          />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            :size="scrolled ? 'xs' : 'sm'"
            @click="userStore.logout()"
            class="hidden lg:inline-flex"
          />
        </template>

        <template v-else>
          <UButton
            label="Přihlásit se"
            color="neutral"
            variant="outline"
            to="/login"
            :size="scrolled ? 'xs' : 'sm'"
            class="hidden lg:inline-flex"
          />
          <UButton
            label="Registrace"
            color="primary"
            to="/signup"
            :size="scrolled ? 'xs' : 'sm'"
            class="hidden lg:inline-flex btn-glow"
          />
        </template>

        <!-- Mobile hamburger -->
        <button
          class="lg:hidden p-2 rounded-lg hover:bg-accented transition-colors"
          aria-label="Menu"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Brand gradient line under header -->
    <div class="gradient-divider absolute bottom-0 inset-x-0" />
  </header>

  <!-- Mobile slide-down drawer -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 lg:hidden"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeMobile" />

      <!-- Drawer panel -->
      <div class="absolute top-16 inset-x-3 rounded-xl glass border border-default p-5 shadow-xl max-h-[80vh] overflow-y-auto">
        <nav class="flex flex-col gap-1 mb-4">
          <NuxtLink
            v-for="item in navItems"
            :key="item.label"
            :to="item.to"
            class="mobile-link"
            :class="{ 'mobile-link--active': item.active || route.path === item.to }"
            @click="closeMobile"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="gradient-divider my-4" />

        <div class="flex flex-col gap-2">
          <template v-if="userStore.isAuthenticated">
            <UButton label="Dashboard" color="primary" to="/dashboard" block @click="closeMobile" />
            <UButton label="Odhlásit se" color="neutral" variant="subtle" block @click="userStore.logout(); closeMobile()" />
          </template>
          <template v-else>
            <UButton label="Přihlásit se" color="neutral" variant="outline" to="/login" block @click="closeMobile" />
            <UButton label="Registrace" color="primary" to="/signup" block @click="closeMobile" />
          </template>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Spacer to prevent content from being hidden under fixed header -->
  <div class="h-16" />
</template>

<style scoped>
/* ── Nav links ── */
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  transition: color 0.2s ease, background-color 0.2s ease;
}
.nav-link:hover {
  color: var(--ui-text-highlighted);
  background: var(--ui-bg-accented);
}
.nav-link--active {
  color: var(--ui-text-tinted);
}

/* ── Mega-menu items ── */
.mega-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s ease;
}
.mega-item:hover { background: var(--ui-bg-accented); }
.mega-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  flex-shrink: 0;
}

/* ── Mobile links ── */
.mobile-link {
  display: block;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease;
}
.mobile-link:hover { color: var(--ui-text-highlighted); background: var(--ui-bg-accented); }
.mobile-link--active { color: var(--ui-text-tinted); }
</style>
