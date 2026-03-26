<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Registrace',
  description: 'Vytvořte si účet'
})

const toast = useToast()
const userStore = useUserStore()
const loading = ref(false)

const fields = [
  {
    name: 'name',
    type: 'text' as const,
    label: 'Jméno',
    placeholder: 'Vaše jméno'
  },
  {
    name: 'email',
    type: 'text' as const,
    label: 'E-mail',
    placeholder: 'vas@email.cz'
  },
  {
    name: 'password',
    label: 'Heslo',
    type: 'password' as const,
    placeholder: 'Alespoň 8 znaků'
  }
]

const schema = z.object({
  name: z.string().min(1, 'Jméno je povinné'),
  email: z.email('Neplatný e-mail'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await userStore.register(payload.data.name, payload.data.email, payload.data.password)
    toast.add({ title: 'Účet vytvořen', description: 'Vítejte v Think different Academy!', color: 'success' })
    navigateTo('/dashboard')
  } catch (err: any) {
    toast.add({
      title: 'Chyba registrace',
      description: err?.data?.message || err?.message || 'Registrace se nezdařila',
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
    title="Vytvořit účet"
    :submit="{ label: loading ? 'Vytváření...' : 'Zaregistrovat se', disabled: loading }"
    @submit="onSubmit"
  >
    <template #description>
      Už máte účet? <ULink to="/login" class="text-primary font-medium">Přihlaste se</ULink>.
    </template>
  </UAuthForm>
</template>
