/**
 * Nuxt 3 API composable — replaces the old services/api.ts.
 *
 * Uses `$fetch` with automatic auth-token injection and transparent
 * refresh-on-401.  All paths are resolved against `runtimeConfig.public.apiBase`.
 */

const TOKEN_KEY = 'tda_token'
const REFRESH_KEY = 'tda_refresh_token'

// ── Token helpers (client-only localStorage) ─────────────────────────
export const tokenStore = {
  get: (): string | null =>
    import.meta.client ? localStorage.getItem(TOKEN_KEY) : null,

  set: (t: string | null) => {
    if (!import.meta.client) return
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  },

  getRefresh: (): string | null =>
    import.meta.client ? localStorage.getItem(REFRESH_KEY) : null,

  setRefresh: (t: string | null) => {
    if (!import.meta.client) return
    t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY)
  }
}

// ── Singleton refresh guard ──────────────────────────────────────────
let _refreshPromise: Promise<{ token: string; refreshToken: string }> | null = null

async function doRefreshToken(apiBase: string): Promise<{ token: string; refreshToken: string }> {
  const rt = tokenStore.getRefresh()
  if (!rt) throw new Error('No refresh token')
  return $fetch<{ token: string; refreshToken: string }>(`${apiBase}/auth/refresh`, {
    method: 'POST',
    body: { refreshToken: rt }
  })
}

async function refreshAccessToken(apiBase: string): Promise<string> {
  if (!_refreshPromise) {
    _refreshPromise = doRefreshToken(apiBase).finally(() => { _refreshPromise = null })
  }
  const data = await _refreshPromise
  tokenStore.set(data.token)
  tokenStore.setRefresh(data.refreshToken)
  return data.token
}

// ── Main composable ──────────────────────────────────────────────────
export function useApi() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  /**
   * Core request helper.  Injects the auth header, and retries once on
   * 401 after a transparent token refresh.
   */
  async function request<T = any>(
    path: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> {
    const token = tokenStore.get()
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> ?? {})
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const url = path.startsWith('http') ? path : `${apiBase}${path}`

    try {
      return await $fetch<T>(url, { ...options, headers })
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode
      const isAuthEndpoint =
        path.includes('/auth/login') ||
        path.includes('/auth/register') ||
        path.includes('/auth/refresh')

      if (status === 401 && !isAuthEndpoint && tokenStore.getRefresh()) {
        try {
          const newToken = await refreshAccessToken(apiBase)
          headers.Authorization = `Bearer ${newToken}`
          return await $fetch<T>(url, { ...options, headers })
        } catch {
          throw err
        }
      }
      throw err
    }
  }

  // Convenience wrappers
  const get = <T = any>(path: string) => request<T>(path)

  const post = <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body })

  const put = <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body })

  const del = <T = any>(path: string) =>
    request<T>(path, { method: 'DELETE' })

  const patch = <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body })

  const postForm = <T = any>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form })

  const putForm = <T = any>(path: string, form: FormData) =>
    request<T>(path, { method: 'PUT', body: form })

  return { request, get, post, put, del, patch, postForm, putForm, apiBase }
}
