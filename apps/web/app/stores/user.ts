import type { User, Namespace, NamespaceMembership } from '~/types'

const ACTIVE_NAMESPACE_NAME_KEY = 'tda_active_namespace'
const ACTIVE_NAMESPACE_ID_KEY = 'tda_active_namespace_id'

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

  function persistActiveNamespace(ns: Namespace | null) {
    if (!import.meta.client) return

    if (!ns) {
      localStorage.removeItem(ACTIVE_NAMESPACE_NAME_KEY)
      localStorage.removeItem(ACTIVE_NAMESPACE_ID_KEY)
      return
    }

    localStorage.setItem(ACTIVE_NAMESPACE_NAME_KEY, ns.name)
    localStorage.setItem(ACTIVE_NAMESPACE_ID_KEY, ns.id)
  }

  function syncActiveNamespaceFromUser(nextUser: User | null) {
    if (!nextUser?.namespaces?.length) {
      activeNamespace.value = null
      persistActiveNamespace(null)
      return
    }

    if (nextUser.activeNamespaceId) {
      const membership = nextUser.namespaces.find(m => m.namespace.id === nextUser.activeNamespaceId)
      if (membership) {
        setActiveNamespace(membership.namespace)
        return
      }
    }

    if (nextUser.namespaces.length === 1) {
      const onlyMembership = nextUser.namespaces[0]
      if (onlyMembership) {
        setActiveNamespace(onlyMembership.namespace)
      }
      return
    }

    activeNamespace.value = null
  }

  async function restoreStoredNamespaceSelection() {
    if (!import.meta.client || !user.value?.namespaces?.length || user.value.activeNamespaceId) {
      return
    }

    const savedNamespaceId = localStorage.getItem(ACTIVE_NAMESPACE_ID_KEY)
    const savedNamespaceName = localStorage.getItem(ACTIVE_NAMESPACE_NAME_KEY)

    const membership = user.value.namespaces.find(m => m.namespace.id === savedNamespaceId)
      ?? user.value.namespaces.find(m => m.namespace.name === savedNamespaceName)
      ?? (user.value.namespaces.length === 1 ? user.value.namespaces[0] : undefined)

    if (!membership) return

    await switchNamespace(membership.namespace.id)
  }

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

      availableNamespaces.value = user.value?.namespaces ?? []
      syncActiveNamespaceFromUser(user.value)
    } catch {
      user.value = null
      activeNamespace.value = null
      availableNamespaces.value = []
      persistActiveNamespace(null)
    }
  }

  async function initUser() {
    if (!import.meta.client) return
    if (!tokenStore.get()) return
    loading.value = true
    try {
      await fetchUser()
      await restoreStoredNamespaceSelection()
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
    persistActiveNamespace(null)
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

  function setActiveNamespace(ns: Namespace | null) {
    activeNamespace.value = ns
    persistActiveNamespace(ns)
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
