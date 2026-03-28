import type { User, Namespace, NamespaceMembership } from '~/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const activeNamespace = ref<Namespace | null>(null)
  const availableNamespaces = ref<NamespaceMembership[]>([])

  const isAuthenticated = computed(() => !!user.value)
  const isLecturer = computed(() => user.value?.role === 'LECTURER' || user.value?.role === 'ADMIN')
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  
  // New namespace-related computed properties
  const isSuperAdmin = computed(() => user.value?.globalRole === 'SUPER_ADMIN')
  const isOrgAdmin = computed(() => user.value?.namespaceRole === 'ORG_ADMIN')
  const isNamespaceLecturer = computed(() => 
    user.value?.namespaceRole === 'LECTURER' || user.value?.namespaceRole === 'ORG_ADMIN'
  )
  const hasActiveNamespace = computed(() => !!activeNamespace.value)

  async function login(email: string, password: string) {
    const { post } = useApi()
    const data = await post<{ token: string; refreshToken: string }>('/auth/login', { email, password })
    tokenStore.set(data.token)
    tokenStore.setRefresh(data.refreshToken)
    await fetchUser()
  }

  async function register(name: string, email: string, password: string) {
    const { post } = useApi()
    const data = await post<{ token: string; refreshToken: string }>('/auth/register', { name, email, password })
    tokenStore.set(data.token)
    tokenStore.setRefresh(data.refreshToken)
    await fetchUser()
  }

  async function fetchUser() {
    const { get } = useApi()
    try {
      user.value = await get<User>('/auth/me')
      
      // Sync availableNamespaces from /me response
      if (user.value?.namespaces) {
        availableNamespaces.value = user.value.namespaces
      }
      
      // Load active namespace from localStorage or user data
      if (import.meta.client && user.value?.namespaces) {
        const savedNsId = localStorage.getItem('tda_active_namespace')
        const nsId = savedNsId || user.value?.activeNamespaceId
        
        if (nsId) {
          const membership = user.value.namespaces.find(m => m.namespace.id === nsId)
          if (membership) {
            setActiveNamespace(membership.namespace)
          }
        }
        
        // Auto-select if only one namespace
        if (!activeNamespace.value && user.value.namespaces.length === 1) {
          setActiveNamespace(user.value.namespaces[0].namespace)
        }
      }
    } catch {
      user.value = null
    }
  }

  async function initUser() {
    if (!import.meta.client) return
    if (!tokenStore.get()) return
    loading.value = true
    try {
      await fetchUser()
    } finally {
      loading.value = false
    }
  }

  function logout() {
    tokenStore.set(null)
    tokenStore.setRefresh(null)
    user.value = null
    activeNamespace.value = null
    availableNamespaces.value = []
    if (import.meta.client) {
      localStorage.removeItem('tda_active_namespace')
    }
    navigateTo('/login')
  }

  async function loadAvailableNamespaces() {
    // Data already loaded from /me response in fetchUser
    // Just re-fetch user to get fresh data
    if (!user.value) return
    await fetchUser()
  }

  async function switchNamespace(namespaceId: string) {
    const { post } = useApi()
    try {
      const data = await post<{ token: string; refreshToken: string }>('/auth/switch-namespace', { namespaceId })
      tokenStore.set(data.token)
      if (data.refreshToken) tokenStore.setRefresh(data.refreshToken)
      await fetchUser()
      
      // Update active namespace
      const membership = availableNamespaces.value.find(m => m.namespace.id === namespaceId)
      if (membership) {
        setActiveNamespace(membership.namespace)
      }
      
      // Reload courses and other namespace-scoped data
      const courseStore = useCourseStore()
      await courseStore.fetchCourses()
    } catch (err) {
      console.error('Failed to switch namespace:', err)
      throw err
    }
  }

  function setActiveNamespace(ns: Namespace) {
    activeNamespace.value = ns
    if (import.meta.client) {
      localStorage.setItem('tda_active_namespace', ns.id)
    }
  }

  return {
    user,
    loading,
    activeNamespace,
    availableNamespaces,
    isAuthenticated,
    isLecturer,
    isAdmin,
    isSuperAdmin,
    isOrgAdmin,
    isNamespaceLecturer,
    hasActiveNamespace,
    login,
    register,
    fetchUser,
    initUser,
    logout,
    loadAvailableNamespaces,
    switchNamespace,
    setActiveNamespace
  }
})
