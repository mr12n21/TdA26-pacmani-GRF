export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()
  if (!userStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
