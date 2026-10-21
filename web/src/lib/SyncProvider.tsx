import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  API_BASE,
  LS_WRITE_EVENT,
  cleanDirtyKeys,
  collectDirtyState,
  isDirtyKey,
  markDirtyKey,
  readLS,
  setSyncStatus,
} from './sync'

// URL ?mode=offline принудительно глушит сеть (тестовая сборка apk2)
const IS_OFFLINE_URL =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'offline'

// пользовательский переключатель из настроек; специально НЕ начинается с aod4-,
// чтобы сам режим не синхронизировался между устройствами
export const OFFLINE_MODE_KEY = 'provodnik-offline-mode'

const SYNC_DEBOUNCE_MS = 1000
const POLL_MS = 3000

interface SyncCtx {
  lastSyncAt: Date | null
  error: string | null
  connected: boolean
  offline: boolean
  offlineForced: boolean
  setOffline: (v: boolean) => void
}

const SyncContext = createContext<SyncCtx>({
  lastSyncAt: null,
  error: null,
  connected: false,
  offline: IS_OFFLINE_URL,
  offlineForced: IS_OFFLINE_URL,
  setOffline: () => {},
})

export const useSync = () => useContext(SyncContext)

const isSyncKey = (key: string) => key.startsWith('aod4-')

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [offline, setOfflineState] = useState<boolean>(() =>
    IS_OFFLINE_URL ? true : readLS(OFFLINE_MODE_KEY, false),
  )
  const isHydrating = useRef(true)
  const timer = useRef<number | null>(null)
  const offlineRef = useRef(offline)
  offlineRef.current = offline

  // входящие данные никогда не затирают грязные (редактируемые) ключи
  const applyServerState = (state: Record<string, unknown>) => {
    try {
      Object.entries(state).forEach(([key, value]) => {
        if (!isSyncKey(key)) return
        if (isDirtyKey(key)) return
        const next = JSON.stringify(value)
        if (localStorage.getItem(key) !== next) {
          localStorage.setItem(key, next)
        }
      })
      window.dispatchEvent(new Event('aod:sync-hydrated'))
    } catch {
      /* ignore */
    }
  }

  const loadState = async () => {
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
    }
  }

  // отправка только грязных ключей; грязный флаг снимается лишь после
  // подтверждения сервером и только если значение не менялось в полёте
  const flush = async () => {
    const { state, sentRaw } = collectDirtyState()
    if (sentRaw.size === 0) return

    setSyncStatus('syncing')
    try {
      const r = await fetch(`${API_BASE}/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
      if (!r.ok) throw new Error(`sync save ${r.status}`)
      cleanDirtyKeys(sentRaw)
      setLastSyncAt(new Date())
      setError(null)
      setConnected(true)
    } catch (e) {
      setError(String(e))
      setConnected(false)
    } finally {
      setSyncStatus('idle')
    }
  }

  // строгий порядок: сначала наши правки на сервер, потом свежее с сервера —
  // никаких параллельных PUT/GET, которые затирали друг друга
  const syncCycle = async () => {
    await flush()
    await loadState()
  }

  const finishHydration = () => {
    isHydrating.current = false
    window.dispatchEvent(new Event('aod:sync-hydrated'))
  }

  // запуск/остановка сетевого цикла в зависимости от режима
  useEffect(() => {
    if (offline) {
      finishHydration()
      return
    }

    void syncCycle().finally(finishHydration)
    const interval = window.setInterval(() => {
      void syncCycle()
    }, POLL_MS)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline])

  // локальные записи → грязный ключ → отложенная отправка (в онлайне)
  useEffect(() => {
    const onWrite = (e: Event) => {
      if (isHydrating.current) return
      const key = (e as CustomEvent<{ key: string }>).detail?.key
      if (!key || !isSyncKey(key)) return
      markDirtyKey(key)
      if (offlineRef.current) return
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { void flush() }, SYNC_DEBOUNCE_MS)
    }

    window.addEventListener(LS_WRITE_EVENT, onWrite)
    return () => {
      window.removeEventListener(LS_WRITE_EVENT, onWrite)
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // вернулась сеть — сразу выгружаем накопившееся
  useEffect(() => {
    const onOnline = () => {
      if (!offlineRef.current) void syncCycle()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOffline = (v: boolean) => {
    if (IS_OFFLINE_URL) return
    try {
      localStorage.setItem(OFFLINE_MODE_KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
    setOfflineState(v)
  }

  return (
    <SyncContext.Provider
      value={{ lastSyncAt, error, connected, offline, offlineForced: IS_OFFLINE_URL, setOffline }}
    >
      {children}
    </SyncContext.Provider>
  )
}
