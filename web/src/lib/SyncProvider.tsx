import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_BASE, LS_WRITE_EVENT, setSyncStatus } from './sync'

const IS_OFFLINE_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'offline'

const SYNC_DEBOUNCE_MS = 1000
const POLL_MS = 3000

interface SyncCtx {
  lastSyncAt: Date | null
  error: string | null
  connected: boolean
  offline: boolean
}

const SyncContext = createContext<SyncCtx>({ lastSyncAt: null, error: null, connected: false, offline: IS_OFFLINE_MODE })

export const useSync = () => useContext(SyncContext)

const isSyncKey = (key: string) => key.startsWith('aod4-')

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const isHydrating = useRef(true)
  const pending = useRef<Set<string>>(new Set())
  const timer = useRef<number | null>(null)

  const applyServerState = (state: Record<string, unknown>) => {
    try {
      Object.entries(state).forEach(([key, value]) => {
        if (isSyncKey(key)) {
          localStorage.setItem(key, JSON.stringify(value))
        }
      })
      window.dispatchEvent(new Event('aod:sync-hydrated'))
    } catch {
      /* ignore */
    }
  }

  const loadState = async () => {
    if (IS_OFFLINE_MODE) {
      isHydrating.current = false
      window.dispatchEvent(new Event('aod:sync-hydrated'))
      return
    }
    setSyncStatus('syncing')
    try {
      const r = await fetch(`${API_BASE}/sync`)
      if (!r.ok) throw new Error(`sync load ${r.status}`)
      const data = await r.json()
      applyServerState(data.state ?? {})
      setLastSyncAt(new Date())
      setError(null)
      setConnected(true)
    } catch (e) {
      setError(String(e))
      setConnected(false)
    } finally {
      setSyncStatus('idle')
      isHydrating.current = false
      window.dispatchEvent(new Event('aod:sync-hydrated'))
    }
  }

  const flush = async () => {
    if (IS_OFFLINE_MODE) return
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
      setConnected(true)
    } catch (e) {
      setError(String(e))
      setConnected(false)
      keys.forEach((k) => pending.current.add(k))
    } finally {
      setSyncStatus('idle')
    }
  }

  // 1. Загрузка начального состояния
  useEffect(() => {
    void loadState()
  }, [])

  // 2. Отправка изменений
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

  // 3. Периодическая отправка и получение изменений
  useEffect(() => {
    if (IS_OFFLINE_MODE) return
    const interval = window.setInterval(() => {
      if (pending.current.size > 0) void flush()
      void loadState()
    }, POLL_MS)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <SyncContext.Provider value={{ lastSyncAt, error, connected, offline: IS_OFFLINE_MODE }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: 11,
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: IS_OFFLINE_MODE ? '#8b5cf6' : connected ? '#22c55e' : error ? '#ef4444' : '#eab308',
          }}
        />
        <span>{IS_OFFLINE_MODE ? 'local' : connected ? 'online' : error ? 'err' : 'off'}</span>
      </div>
    </SyncContext.Provider>
  )
}
