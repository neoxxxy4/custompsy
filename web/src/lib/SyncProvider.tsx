import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { LS_WRITE_EVENT, setSyncStatus } from './sync'

const API_BASE = '/api'
const SYNC_DEBOUNCE_MS = 1000

interface SyncCtx {
  lastSyncAt: Date | null
  error: string | null
}

const SyncContext = createContext<SyncCtx>({ lastSyncAt: null, error: null })

export const useSync = () => useContext(SyncContext)

const isSyncKey = (key: string) => key.startsWith('aod4-')

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isHydrating = useRef(true)
  const pending = useRef<Set<string>>(new Set())
  const timer = useRef<number | null>(null)

  // 1. При старте загружаем состояние с сервера в localStorage
  useEffect(() => {
    let cancelled = false
    setSyncStatus('syncing')
    fetch(`${API_BASE}/sync`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`sync load ${r.status}`))))
      .then((data: { state: Record<string, unknown> }) => {
        if (cancelled) return
        try {
          Object.entries(data.state ?? {}).forEach(([key, value]) => {
            if (isSyncKey(key)) {
              localStorage.setItem(key, JSON.stringify(value))
            }
          })
          setLastSyncAt(new Date())
          setError(null)
        } catch {
          /* ignore */
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
      .finally(() => {
        if (!cancelled) {
          setSyncStatus('idle')
          isHydrating.current = false
          window.dispatchEvent(new Event('aod:sync-hydrated'))
        }
      })
    return () => { cancelled = true }
  }, [])

  // 2. Отправляем изменения на сервер
  const flush = async () => {
    const keys = Array.from(pending.current)
    if (keys.length === 0) return
    pending.current.clear()

    const state: Record<string, unknown> = {}
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key)
        if (raw !== null) state[key] = JSON.parse(raw)
      } catch {
        /* ignore */
      }
    }

    setSyncStatus('syncing')
    try {
      const r = await fetch(`${API_BASE}/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      if (!r.ok) throw new Error(`sync save ${r.status}`)
      setLastSyncAt(new Date())
      setError(null)
    } catch (e) {
      setError(String(e))
      keys.forEach((k) => pending.current.add(k))
    } finally {
      setSyncStatus('idle')
    }
  }

  useEffect(() => {
    const onWrite = (e: Event) => {
      if (isHydrating.current) return
      const key = (e as CustomEvent<{ key: string }>).detail?.key
      if (!key || !isSyncKey(key)) return
      pending.current.add(key)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { void flush() }, SYNC_DEBOUNCE_MS)
    }

    window.addEventListener(LS_WRITE_EVENT, onWrite)
    return () => {
      window.removeEventListener(LS_WRITE_EVENT, onWrite)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  // 3. Раз в 30 секунд пытаемся отправить накопившиеся изменения
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (pending.current.size > 0) void flush()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <SyncContext.Provider value={{ lastSyncAt, error }}>
      {children}
    </SyncContext.Provider>
  )
}
