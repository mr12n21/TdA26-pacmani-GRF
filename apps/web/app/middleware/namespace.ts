/**
 * Namespace middleware - ensures user has active namespace selected
 * Redirects to namespace selection if needed
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore()
  
  // Skip if not authenticated (auth middleware will handle)
  if (!userStore.isAuthenticated) return

  // Exclude pages that don't need namespace context
  const excludedPaths = ['/auth/select-namespace', '/auth/onboarding', '/invite/', '/login', '/signup']
  if (excludedPaths.some(p => to.path.startsWith(p))) return

  // Super admins can access everything without namespace
  if (userStore.isSuperAdmin) return

  // Regular users need active namespace
  if (!userStore.hasActiveNamespace) {
    return navigateTo('/auth/select-namespace')
  }
})
