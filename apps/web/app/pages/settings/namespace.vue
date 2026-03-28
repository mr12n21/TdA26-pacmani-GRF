<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Nastavení organizace" />

      <div v-if="loading" class="flex justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-muted" />
      </div>

      <div v-else-if="namespace" class="p-6 space-y-6">
        <!-- Namespace Info -->
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-6">
          <h2 class="text-lg font-bold mb-4">Informace o organizaci</h2>

          <form @submit.prevent="saveNamespace" class="space-y-4">
            <UFormField label="Název organizace">
              <UInput v-model="form.name" />
            </UFormField>

            <UFormField label="Slug (URL identifikátor)">
              <UInput v-model="form.slug" disabled />
              <template #hint>
                <span class="text-xs text-[var(--ui-text-muted)]">Slug nelze měnit</span>
              </template>
            </UFormField>

            <UFormField label="Popis">
              <UTextarea v-model="form.description" :rows="3" placeholder="Popis organizace" />
            </UFormField>

            <div class="flex justify-end pt-2">
              <UButton type="submit" :loading="saving">
                Uložit změny
              </UButton>
            </div>
          </form>
        </div>

        <!-- Status -->
        <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-6">
          <h2 class="text-lg font-bold mb-2">Status organizace</h2>
          <div class="flex items-center gap-3">
            <UBadge
              :color="getStatusColor(namespace.status) as any"
              :label="getStatusLabel(namespace.status)"
              size="lg"
            />
            <span class="text-sm text-[var(--ui-text-muted)]">
              Vytvořeno {{ formatDate(namespace.createdAt) }}
            </span>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.members ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Členové</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.courses ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Kurzy</p>
          </div>
          <div class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-center">
            <p class="text-2xl font-bold">{{ namespace._count?.documents ?? 0 }}</p>
            <p class="text-sm text-[var(--ui-text-muted)]">Dokumenty</p>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-20">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-3xl text-amber-500 mb-3" />
        <p class="text-[var(--ui-text-muted)]">Nepodařilo se načíst informace o organizaci.</p>
      </div>
    </UDashboardPanel>
  </UDashboardPage>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'namespace']
})

const userStore = useUserStore()
const { get, patch } = useApi()
const toast = useToast()

const namespace = ref<any>(null)
const loading = ref(true)
const saving = ref(false)

const form = reactive({
  name: '',
  slug: '',
  description: ''
})

const nsId = computed(() => userStore.activeNamespace?.id)

onMounted(async () => {
  if (nsId.value) await loadNamespace()
})

async function loadNamespace() {
  loading.value = true
  try {
    namespace.value = await get(`/namespaces/${nsId.value}`)
    form.name = namespace.value.name
    form.slug = namespace.value.slug
    form.description = namespace.value.description || ''
  } catch (err) {
    console.error('Failed to load namespace:', err)
  } finally {
    loading.value = false
  }
}

async function saveNamespace() {
  saving.value = true
  try {
    await patch(`/namespaces/${nsId.value}`, {
      name: form.name,
      description: form.description
    })
    toast.add({ title: 'Nastavení uloženo', color: 'success' })
    await loadNamespace()
  } catch (err) {
    console.error('Failed to save namespace:', err)
    toast.add({ title: 'Chyba při ukládání', color: 'error' })
  } finally {
    saving.value = false
  }
}

function getStatusColor(status: string) {
  return { ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'error' }[status] || 'neutral'
}

function getStatusLabel(status: string) {
  return { ACTIVE: 'Aktivní', PENDING: 'Čeká na schválení', SUSPENDED: 'Pozastaveno' }[status] || status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('cs-CZ')
}
</script>
