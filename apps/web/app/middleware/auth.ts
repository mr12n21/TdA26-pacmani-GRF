export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore()
  
  if (!userStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // Skip namespace checks for super admins and certain paths
  if (userStore.isSuperAdmin) return
  
  const excludedPaths = ['/auth/onboarding', '/auth/select-namespace']
  if (excludedPaths.some(p => to.path.startsWith(p))) return

  // Pokud uživatel nemá žádný namespace, přesměruj na onboarding
  if (userStore.availableNamespaces.length === 0) {
    return navigateTo('/auth/onboarding')
  }
})
