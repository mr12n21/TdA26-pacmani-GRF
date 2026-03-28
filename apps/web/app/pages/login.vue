<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Přihlášení',
  description: 'Přihlaste se ke svému účtu'
})

const toast = useToast()
const userStore = useUserStore()
const loading = ref(false)

const fields = [
  {
    name: 'email',
    type: 'text' as const,
    label: 'E-mail',
    placeholder: 'vas@email.cz',
    required: true
  },
  {
    name: 'password',
    label: 'Heslo',
    type: 'password' as const,
    placeholder: 'Zadejte heslo'
  }
]

const schema = z.object({
  email: z.email('Neplatný e-mail'),
  password: z.string().min(1, 'Heslo je povinné')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await userStore.login(payload.data.email, payload.data.password)
    toast.add({ title: 'Přihlášeno', description: 'Vítejte zpět!', color: 'success' })
    navigateTo('/dashboard')
  } catch (err: any) {
    toast.add({
      title: 'Chyba přihlášení',
      description: err?.data?.message || err?.message || 'Neplatné přihlašovací údaje',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    title="Přihlášení"
    icon="i-lucide-lock"
    :submit="{ label: loading ? 'Přihlašování...' : 'Přihlásit se', disabled: loading }"
    @submit="onSubmit"
  >
    <template #description>
      Nemáte účet? <ULink to="/signup" class="text-primary font-medium">Zaregistrujte se</ULink>.
    </template>
  </UAuthForm>
</template>
