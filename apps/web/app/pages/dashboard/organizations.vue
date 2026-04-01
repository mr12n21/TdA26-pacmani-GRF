<script setup lang="ts">
import type { Namespace } from '~/types'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
})

useSeoMeta({
  title: 'Organizace a členství'
})

const userStore = useUserStore()
const toast = useToast()
const { get, post } = useApi()

const loading = ref(true)
const switchingId = ref<string | null>(null)
const requestingId = ref<string | null>(null)
const searchQuery = ref('')
const requestRole = ref<'LECTURER' | 'STUDENT'>('LECTURER')
const requestedNamespaceIds = ref<string[]>([])
const availableOrganizations = ref<Namespace[]>([])

const joinedNamespaceIds = computed(() => new Set(userStore.availableNamespaces.map(membership => membership.namespace.id)))

const memberships = computed(() =>
  userStore.availableNamespaces.map(membership => ({
    ...membership,
    isActive: membership.namespace.id === userStore.activeNamespace?.id,
  }))
)

const activeMembership = computed(() => memberships.value.find(membership => membership.isActive) ?? null)

const filteredOrganizations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return availableOrganizations.value.filter(namespace => {
    if (joinedNamespaceIds.value.has(namespace.id)) return false
    if (requestedNamespaceIds.value.includes(namespace.id)) return false

    if (!query) return true

    return namespace.name.toLowerCase().includes(query)
      || (namespace.description || '').toLowerCase().includes(query)
  })
})

onMounted(async () => {
  requestRole.value = userStore.user?.role === 'STUDENT' ? 'STUDENT' : 'LECTURER'
  await loadData()
})

async function loadData() {
  loading.value = true

  try {
    await userStore.loadAvailableNamespaces()
    const data = await get<Namespace[]>('/namespaces')
    availableOrganizations.value = Array.isArray(data)
      ? data.filter(namespace => namespace.status === 'ACTIVE')
      : []
  } catch (err: any) {
    toast.add({
      title: 'Nepodařilo se načíst organizace',
      description: err?.data?.message || err?.message || 'Zkuste to znovu.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function activateNamespace(namespaceId: string) {
  if (namespaceId === userStore.activeNamespace?.id) return

  switchingId.value = namespaceId
  try {
    await userStore.switchNamespace(namespaceId)
    toast.add({ title: 'Aktivní organizace změněna', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'Přepnutí organizace selhalo',
      description: err?.data?.message || err?.message || 'Zkuste to znovu.',
      color: 'error'
    })
  } finally {
    switchingId.value = null
  }
}

async function requestMembership(namespace: Namespace) {
  requestingId.value = namespace.id
  try {
    await post(`/namespaces/${namespace.id}/members`, { role: requestRole.value })
    requestedNamespaceIds.value = [...requestedNamespaceIds.value, namespace.id]
    toast.add({
      title: 'Žádost odeslána',
      description: `Do organizace ${namespace.name} byla odeslána žádost o roli ${getRoleLabel(requestRole.value).toLowerCase()}.`,
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'Žádost se nepodařilo odeslat',
      description: err?.data?.error || err?.data?.message || err?.message || 'Zkuste to znovu.',
      color: 'error'
    })
  } finally {
    requestingId.value = null
  }
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    ORG_ADMIN: 'Správce',
    LECTURER: 'Lektor',
    STUDENT: 'Student'
  }

  return map[role] || role
}
</script>

<template>
  <UDashboardPanel id="organizations">
    <template #header>
      <UDashboardNavbar title="Organizace a členství">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <section class="org-hero">
          <div>
            <p class="org-kicker">Aktivní kontext</p>
            <h1 class="org-title">
              {{ activeMembership?.namespace.name || 'Vyberte organizaci pro práci v dashboardu' }}
            </h1>
            <p class="org-copy">
              Přepněte aktivní organizaci, spravujte svoje členství a pošlete žádost do další školy nebo organizace bez hledání v onboarding flow.
            </p>
          </div>

          <div class="org-hero-actions">
            <UBadge
              v-if="activeMembership"
              color="primary"
              variant="soft"
              :label="`Role: ${getRoleLabel(activeMembership.role)}`"
            />
            <UButton v-if="userStore.availableNamespaces.length > 1" color="neutral" variant="outline" to="/auth/select-namespace">
              Rychlý výběr organizace
            </UButton>
          </div>
        </section>

        <div v-if="loading" class="flex justify-center py-20">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
        </div>

        <template v-else>
          <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="section-title">Vaše organizace</h2>
                <p class="section-copy">Tady přepnete aktivní organizaci, se kterou právě pracujete.</p>
              </div>
              <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" @click="loadData">
                Obnovit
              </UButton>
            </div>

            <div v-if="memberships.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="membership in memberships"
                :key="membership.namespace.id"
                class="membership-card"
                :class="{ 'membership-card-active': membership.isActive }"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="membership-name">{{ membership.namespace.name }}</p>
                    <p class="membership-copy">
                      {{ membership.namespace.description || 'Organizace bez vyplněného popisu.' }}
                    </p>
                  </div>
                  <UBadge
                    :color="membership.isActive ? 'primary' : 'neutral'"
                    :variant="membership.isActive ? 'solid' : 'soft'"
                    :label="membership.isActive ? 'Aktivní' : getRoleLabel(membership.role)"
                  />
                </div>

                <div class="membership-footer">
                  <span class="text-xs text-[var(--ui-text-muted)]">
                    Role: {{ getRoleLabel(membership.role) }}
                  </span>

                  <UButton
                    size="sm"
                    :color="membership.isActive ? 'neutral' : 'primary'"
                    :variant="membership.isActive ? 'outline' : 'solid'"
                    :loading="switchingId === membership.namespace.id"
                    :disabled="membership.isActive"
                    @click="activateNamespace(membership.namespace.id)"
                  >
                    {{ membership.isActive ? 'Právě používáte' : 'Přepnout sem' }}
                  </UButton>
                </div>
              </article>
            </div>

            <div v-else class="empty-state">
              <UIcon name="i-lucide-building-2" class="text-4xl text-muted/40" />
              <div>
                <p class="font-semibold">Zatím nejste členem žádné organizace.</p>
                <p class="text-sm text-[var(--ui-text-muted)]">Níže můžete rovnou poslat žádost o vstup.</p>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 class="section-title">Požádat o vstup do organizace</h2>
                <p class="section-copy">Lektor nebo student může odeslat žádost do další organizace bez odhlášení.</p>
              </div>

              <div class="grid gap-3 sm:grid-cols-[minmax(0,18rem)_12rem]">
                <UInput
                  v-model="searchQuery"
                  icon="i-lucide-search"
                  placeholder="Hledat organizaci..."
                />
                <USelectMenu
                  v-model="requestRole"
                  :options="[
                    { label: 'Lektor', value: 'LECTURER' },
                    { label: 'Student', value: 'STUDENT' }
                  ]"
                  option-attribute="label"
                  value-attribute="value"
                />
              </div>
            </div>

            <div v-if="filteredOrganizations.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="namespace in filteredOrganizations"
                :key="namespace.id"
                class="request-card"
              >
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-3">
                    <p class="request-name">{{ namespace.name }}</p>
                    <UBadge color="neutral" variant="soft" label="Aktivní" />
                  </div>
                  <p class="request-copy">{{ namespace.description || 'Organizace bez vyplněného popisu.' }}</p>
                </div>

                <div class="request-footer">
                  <span class="text-xs text-[var(--ui-text-muted)]">
                    {{ namespace._count?.members ?? 0 }} členů • {{ namespace._count?.courses ?? 0 }} kurzů
                  </span>

                  <UButton
                    size="sm"
                    color="primary"
                    :loading="requestingId === namespace.id"
                    @click="requestMembership(namespace)"
                  >
                    Poslat žádost
                  </UButton>
                </div>
              </article>
            </div>

            <div v-else class="empty-state">
              <UIcon name="i-lucide-send" class="text-4xl text-muted/40" />
              <div>
                <p class="font-semibold">Žádná další organizace neodpovídá filtru.</p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Zkuste změnit hledání nebo počkejte na schválení již odeslaných žádostí.
                </p>
              </div>
            </div>
          </section>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.org-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid color-mix(in oklab, #0070BB 25%, var(--ui-border));
  border-radius: 1rem;
  padding: 1.25rem;
  background:
    radial-gradient(circle at top right, color-mix(in oklab, #49B3B4 20%, transparent) 0, transparent 32%),
    linear-gradient(135deg, color-mix(in oklab, var(--ui-bg-elevated) 86%, #0070BB 14%) 0%, var(--ui-bg-elevated) 100%);
}

.org-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}

.org-title {
  margin: 0 0 0.35rem;
  font-size: 1.55rem;
  font-weight: 800;
}

.org-copy,
.section-copy,
.membership-copy,
.request-copy {
  margin: 0;
  color: var(--ui-text-muted);
}

.org-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.membership-card,
.request-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--ui-bg-elevated);
}

.membership-card-active {
  border-color: color-mix(in oklab, #0070BB 55%, var(--ui-border));
  box-shadow: 0 0 0 1px color-mix(in oklab, #0070BB 18%, transparent);
}

.membership-name,
.request-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.membership-footer,
.request-footer,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.empty-state {
  justify-content: flex-start;
  border: 1px dashed var(--ui-border);
  border-radius: 1rem;
  padding: 1rem;
  background: color-mix(in oklab, var(--ui-bg-muted) 75%, transparent);
}

@media (max-width: 900px) {
  .org-hero,
  .membership-footer,
  .request-footer,
  .empty-state {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>