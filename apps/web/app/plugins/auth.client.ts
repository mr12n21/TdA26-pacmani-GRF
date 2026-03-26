export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()
  if (import.meta.client) {
    await userStore.initUser()
  }
})
