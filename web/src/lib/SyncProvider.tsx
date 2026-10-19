import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_BASE, LS_WRITE_EVENT, setSyncStatus } from './sync'

const IS_OFFLINE_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'offline'

const WS_URL = (() => {
  if (typeof window === 'undefined') return ''
  if (IS_OFFLINE_MODE) return ''
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${API_BASE}/ws`
})()

const SYNC_DEBOUNCE_MS = 300

interface SyncCtx {
  lastSyncAt: Date | null
  error: string | null
  connected: boolean
  offline: boolean
}

const SyncContext = createContext<SyncCtx>({ lastSyncAt: null, error: null, connected: false, offline: IS_OFFLINE_MODE })

export const useSync = () => useContext(SyncContext)

const isSyncKey = (key: string) => key.startsWith('aod4-')

interface WsMsg {
  type: 'sync' | 'pong'
  state?: Record<string, unknown>
}

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const pending = useRef<Set<string>>(new Set())
  const timer = useRef<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const ignoreKeys = useRef<Set<string>>(new Set())

  const applyServerState = (state: Record<string, unknown>) => {
    try {
      Object.entries(state).forEach(([key, value]) => {
        if (isSyncKey(key)) {
          ignoreKeys.current.add(key)
          localStorage.setItem(key, JSON.stringify(value))
        }
      })
      window.dispatchEvent(new Event('aod:sync-hydrated'))
    } catch {
      /* ignore */
    }
  }

  const sendPending = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
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

    if (Object.keys(state).length === 0) return
    for (const key of Object.keys(state)) ignoreKeys.current.add(key)
    setSyncStatus('syncing')
    console.log('[WS] sending sync', state)
    ws.send(JSON.stringify({ type: 'sync', state }))
  }

  // Fallback polling через REST
  useEffect(() => {
    if (IS_OFFLINE_MODE) return
    let interval = window.setInterval(() => {
      fetch(`${API_BASE}/sync`)
        .then((r) => r.json())
        .then((data) => {
          if (data.state && Object.keys(data.state).length > 0) {
            applyServerState(data.state)
            setLastSyncAt(new Date())
          }
        })
        .catch(() => {})
    }, 2000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (IS_OFFLINE_MODE) return
    let reconnectTimer: number | null = null
    let pingTimer: number | null = null
    let closeIntentional = false

    const connect = () => {
      if (!WS_URL) return
      if (wsRef.current?.readyState === WebSocket.OPEN) return
      console.log('[WS] connecting to', WS_URL)
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[WS] open')
          setConnected(true)
          setError(null)
          sendPending()
          pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
          }, 30000)
        }

        ws.onmessage = (event) => {
          console.log('[WS] message', event.data)
          try {
            const msg = JSON.parse(event.data) as WsMsg
            if (msg.type === 'sync' && msg.state) {
              applyServerState(msg.state)
              setLastSyncAt(new Date())
              setError(null)
            }
          } catch {
            /* ignore */
          }
        }

        ws.onerror = (e) => {
          console.error('[WS] error', e)
          setError('ws error')
        }

        ws.onclose = (e) => {
          console.log('[WS] close', e.code, e.reason)
          setConnected(false)
          if (pingTimer) window.clearInterval(pingTimer)
          if (!closeIntentional) {
            reconnectTimer = window.setTimeout(connect, 3000)
          }
        }
      } catch (e) {
        console.error('[WS] connect failed', e)
        setError('ws connect failed')
      }
    }

    connect()

    return () => {
      closeIntentional = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (pingTimer) window.clearInterval(pingTimer)
      wsRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const onWrite = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail?.key
      console.log('[Sync] write event', key)
      if (!key || !isSyncKey(key)) return
      if (ignoreKeys.current.has(key)) {
        ignoreKeys.current.delete(key)
        return
      }
      pending.current.add(key)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        sendPending()
      }, SYNC_DEBOUNCE_MS)
    }

    window.addEventListener(LS_WRITE_EVENT, onWrite)
    return () => {
      window.removeEventListener(LS_WRITE_EVENT, onWrite)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (pending.current.size > 0) sendPending()
    }, 1000)
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
