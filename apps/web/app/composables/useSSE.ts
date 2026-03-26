/**
 * SSR-safe SSE composable for Nuxt 3.
 *
 * EventSource is a browser-only API, so all connection logic is guarded
 * behind `import.meta.client` / `onMounted`.  The composable is still
 * importable during SSR — it simply becomes a no-op on the server.
 */
import { tokenStore } from './useApi'

export interface SSEEvent {
  type: string
  data: any
}

export function useSSE() {
  const connected = ref(false)
  const lastEvent = ref<SSEEvent | null>(null)
  const clientId = ref<string | null>(null)
  const studentCount = useState<number>('sseStudentCount', () => 0)

  let source: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const eventHandlers = new Map<string, Array<(data: any) => void>>()
  let hasConnectedOnce = false
  let reconnectAttempts = 0
  let shouldReconnect = true

  const SSE_EVENTS = [
    'state_changed',
    'module_revealed',
    'module_hidden',
    'new_post',
    'updated_post',
    'deleted_post',
    'participant_joined',
    'module_created',
    'module_updated',
    'module_deleted',
    'module_reordered',
    'material_created',
    'material_updated',
    'material_deleted',
    'material_reordered',
    'quiz_created',
    'quiz_updated',
    'quiz_deleted',
    'quiz_result_updated',
    'statistics_updated'
  ] as const

  function emit(event: string, data: any) {
    const handlers = eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((h) => {
        try { h(data) } catch { /* handler error */ }
      })
    }
  }

  function connect(courseId: string) {
    // SSE is client-only
    if (!import.meta.client) return

    disconnect()
    shouldReconnect = true

    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase as string

    try {
      const token = tokenStore.get()
      const query = token ? `?token=${encodeURIComponent(token)}` : ''
      source = new EventSource(`${apiBase}/courses/${courseId}/sse${query}`)

      source.addEventListener('connected', (ev: MessageEvent) => {
        connected.value = true
        hasConnectedOnce = true
        reconnectAttempts = 0
        try {
          const payload = JSON.parse(ev.data)
          clientId.value = payload.clientId
          if (payload.anonymousStudents !== undefined) {
            studentCount.value = payload.anonymousStudents
          }
        } catch { /* malformed payload */ }
      })

      // Register all known event types
      SSE_EVENTS.forEach((eventName) => {
        source?.addEventListener(eventName, (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data)
            lastEvent.value = { type: eventName, data: payload }
            emit(eventName, payload)
          } catch { /* malformed payload */ }
        })
      })

      source.onerror = () => {
        connected.value = false
        source?.close()
        source = null

        if (!shouldReconnect) return

        reconnectAttempts += 1

        // If we never managed to connect, give up after 2 attempts
        if (!hasConnectedOnce && reconnectAttempts >= 2) return

        const delayMs = Math.min(5000, 1000 * reconnectAttempts)
        reconnectTimer = setTimeout(() => connect(courseId), delayMs)
      }
    } catch {
      connected.value = false
    }
  }

  function disconnect() {
    shouldReconnect = false
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (source) {
      try { source.close() } catch { /* already closed */ }
      source = null
    }
    connected.value = false
    clientId.value = null
    reconnectAttempts = 0
    hasConnectedOnce = false
  }

  function on(event: string, handler: (data: any) => void) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, [])
    }
    eventHandlers.get(event)!.push(handler)
  }

  function off(event: string, handler: (data: any) => void) {
    const handlers = eventHandlers.get(event)
    if (handlers) {
      const idx = handlers.indexOf(handler)
      if (idx >= 0) handlers.splice(idx, 1)
    }
  }

  // Auto-cleanup when the component unmounts
  if (import.meta.client) {
    onBeforeUnmount(() => disconnect())
  }

  return {
    connected: readonly(connected),
    lastEvent: readonly(lastEvent),
    clientId: readonly(clientId),
    studentCount: readonly(studentCount),
    connect,
    disconnect,
    on,
    off
  }
}
