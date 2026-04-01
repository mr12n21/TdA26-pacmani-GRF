<script setup lang="ts">
import { STATE_META, useCourseStore } from '~/stores/course'

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
const activeMembership = computed(() =>
  userStore.availableNamespaces.find(membership => membership.namespace.id === userStore.activeNamespace?.id) ?? null
)

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
          <TdaButton icon="i-lucide-plus" size="sm" to="/dashboard/courses/new">
            Nový kurz
          </TdaButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <section v-else class="admin-dashboard">
        <header class="admin-head">
          <h1 class="admin-title">Administrační panel</h1>
          <p class="admin-lead">
            Centrální rozhraní pro správu kurzů, modulů a statistik platformy.
          </p>
        </header>

        <section v-if="!userStore.isSuperAdmin" class="namespace-banner">
          <div>
            <p class="namespace-kicker">Organizace</p>
            <h2 class="namespace-title">
              {{ userStore.activeNamespace?.name || 'Není vybraná aktivní organizace' }}
            </h2>
            <p class="namespace-copy">
              <template v-if="activeMembership">
                Pracujete jako {{ activeMembership.role === 'ORG_ADMIN' ? 'správce organizace' : activeMembership.role === 'LECTURER' ? 'lektor' : 'student' }}.
                Přepnutí organizace i žádosti o nové členství najdete na jednom místě.
              </template>
              <template v-else>
                Vyberte aktivní organizaci nebo odešlete žádost o vstup do další organizace.
              </template>
            </p>
          </div>

          <div class="namespace-actions">
            <TdaButton
              icon="i-lucide-building-2"
              :to="userStore.availableNamespaces.length > 1 ? '/auth/select-namespace' : '/dashboard/organizations'"
            >
              {{ userStore.hasActiveNamespace ? 'Přepnout organizaci' : 'Vybrat organizaci' }}
            </TdaButton>
            <TdaButton variant="outline" icon="i-lucide-send" to="/dashboard/organizations">
              Žádost do organizace
            </TdaButton>
          </div>
        </section>

        <DashboardStats class="mb-6" />

        <section class="management-section">
          <h2 class="section-title">Správa obsahu</h2>
          <div class="action-grid">
            <NuxtLink to="/dashboard/courses" class="action-card action-card-accent">
              <h3>Spravovat kurzy</h3>
              <p>Vytváření, editace, změny stavů a práce s moduly.</p>
              <span class="action-pill">Otevřít správu</span>
            </NuxtLink>

            <NuxtLink to="/dashboard/statistics" class="action-card">
              <h3>Statistiky kurzů</h3>
              <p>Přehled metrik, úspěšnosti a aktivity účastníků.</p>
              <span class="action-pill">Zobrazit statistiky</span>
            </NuxtLink>

            <NuxtLink to="/courses" class="action-card">
              <h3>Veřejný katalog</h3>
              <p>Kontrola toho, jak kurzy vidí studenti na veřejném webu.</p>
              <span class="action-pill">Otevřít katalog</span>
            </NuxtLink>
          </div>
        </section>

        <div class="quick-actions">
          <TdaButton icon="i-lucide-plus" to="/dashboard/courses/new">
            Nový kurz
          </TdaButton>
          <TdaButton variant="outline" icon="i-lucide-book-open" to="/dashboard/courses">
            Zobrazit kurzy
          </TdaButton>
        </div>

        <h2 class="section-title">Nedávné kurzy</h2>
        <div v-if="courseStore.courses.length === 0" class="empty-box">
          <UIcon name="i-lucide-book-open" class="text-3xl text-muted mb-2" />
          <p class="text-muted">Zatím nemáte žádné kurzy</p>
          <TdaButton to="/dashboard/courses/new" class="mt-3">Vytvořit první kurz</TdaButton>
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="course in courseStore.courses.slice(0, 5)"
            :key="course.uuid"
            :to="`/dashboard/courses/${course.uuid}`"
            class="block course-mini-card"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-semibold truncate">{{ course.title || 'Bez názvu' }}</h3>
                <p class="text-sm text-muted truncate">{{ course.description || 'Bez popisu' }}</p>
              </div>
              <UBadge
                :label="STATE_META[course.state]?.label || course.state"
                :style="{ backgroundColor: STATE_META[course.state]?.bg, color: STATE_META[course.state]?.color }"
                size="sm"
              />
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.admin-dashboard {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border-muted);
  border-radius: 1rem;
  padding: 1.25rem;
}

.admin-head {
  margin-bottom: 1.25rem;
}

.namespace-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border: 1px solid color-mix(in oklab, #0070BB 22%, var(--ui-border));
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  background:
    radial-gradient(circle at top right, color-mix(in oklab, #49B3B4 24%, transparent) 0, transparent 35%),
    linear-gradient(135deg, color-mix(in oklab, var(--ui-bg-elevated) 82%, #0070BB 18%) 0%, var(--ui-bg-elevated) 100%);
}

.namespace-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}

.namespace-title {
  margin: 0 0 0.3rem;
  font-size: 1.35rem;
  font-weight: 800;
}

.namespace-copy {
  margin: 0;
  max-width: 42rem;
  color: var(--ui-text-muted);
}

.namespace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.admin-lead {
  margin: 0;
  color: var(--ui-text-muted);
}

.section-title {
  font-size: 1.325rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.management-section {
  margin-bottom: 1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.action-card {
  display: block;
  text-decoration: none;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border-muted);
  border-radius: 0.85rem;
  padding: 1rem;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  border-color: #0070BB;
}

.action-card-accent {
  border-color: var(--ui-border);
}

.action-card h3 {
  margin: 0 0 0.4rem;
  font-size: 1.175rem;
}

.action-card p {
  margin: 0 0 0.75rem;
  color: var(--ui-text-muted);
  line-height: 1.5;
}

.action-pill {
  display: inline-flex;
  border-radius: 999px;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
  padding: 0.35rem 0.75rem;
  font-size: 0.965rem;
  font-weight: 700;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.empty-box {
  text-align: center;
  padding: 2.5rem 1rem;
  border: 1px solid var(--ui-border-muted);
  border-radius: 0.85rem;
  background: var(--ui-bg-muted);
}

.course-mini-card {
  border: 1px solid var(--ui-border-muted);
  background: var(--ui-bg-elevated);
  border-radius: 0.85rem;
  padding: 0.9rem;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.course-mini-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, #0070BB 55%, var(--ui-border));
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 0.95rem;
  }

  .admin-title {
    font-size: 1.35rem;
  }

  .namespace-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .namespace-actions {
    width: 100%;
  }
}
</style>
