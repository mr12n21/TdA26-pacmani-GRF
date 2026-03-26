import type { User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isLecturer = computed(() => user.value?.role === 'LECTURER' || user.value?.role === 'ADMIN')
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

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
    navigateTo('/login')
  }

  return {
    user,
    loading,
    isAuthenticated,
    isLecturer,
    isAdmin,
    login,
    register,
    fetchUser,
    initUser,
    logout
  }
})
