import { useEffect, useRef, useState } from 'react'

// ─── движок синхронизации ───
// Каждый ключ живёт в двух местах:
//   1. состояние React (мгновенный UI)
//   2. localStorage (персистентность; в APK — хранилище WebView)
//
// В localStorage храним обёртку { v: значение, t: timestamp_в_мс }.
// Timestamp приходит с сервера (updated_at * 1000) и используется для
// разрешения конфликтов между вкладками и устройствами.

export interface SyncWrapper<T> {
  v: T
  t: number
}

export const readLS = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key)
    if (s === null) return fallback
    const parsed = JSON.parse(s) as SyncWrapper<T> | T
    // обратная совместимость: ранее хранились сырые значения
    if (parsed && typeof parsed === 'object' && 'v' in parsed && 't' in parsed) {
      return parsed.v
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export const readLSWrapper = <T,>(key: string): SyncWrapper<T> | null => {
  try {
    const s = localStorage.getItem(key)
    if (s === null) return null
    const parsed = JSON.parse(s) as SyncWrapper<T> | T
    if (parsed && typeof parsed === 'object' && 'v' in parsed && 't' in parsed) {
      return parsed as SyncWrapper<T>
    }
    return { v: parsed as T, t: 0 }
  } catch {
    return null
  }
}

// событие записи — чтобы статус-бары мгновенно пересчитывали микро-статусы
export const LS_WRITE_EVENT = 'aod:ls-write'

export type SyncStatus = 'idle' | 'syncing' | 'error'
let syncStatus: SyncStatus = 'idle'
export const getSyncStatus = () => syncStatus
export const setSyncStatus = (s: SyncStatus) => { syncStatus = s }

export const API_BASE = '/api'

export const writeLS = (key: string, v: unknown) => {
  try {
    const wrapped: SyncWrapper<unknown> = { v, t: Date.now() }
    localStorage.setItem(key, JSON.stringify(wrapped))
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(LS_WRITE_EVENT, { detail: { key } })))
  } catch {
    /* переполнение — не критично */
  }
}

export async function saveAllToServer(): Promise<void> {
  const state: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('aod4-')) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as SyncWrapper<unknown> | unknown
        if (parsed && typeof parsed === 'object' && 'v' in parsed) {
          state[key] = (parsed as SyncWrapper<unknown>).v
        } else {
          state[key] = parsed
        }
      }
    } catch {
      /* ignore */
    }
  }
  const r = await fetch(`${API_BASE}/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  if (!r.ok) throw new Error(`sync save ${r.status}`)
}

// тик, который растёт при любой записи через useSyncedLS + раз в intervalMs
// (для «живых» статусов в сайдбаре/статус-баре вне дерева редактируемых данных)
export function useLSTick(intervalMs = 30000): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((k) => k + 1)
    window.addEventListener(LS_WRITE_EVENT, bump)
    const t = window.setInterval(bump, intervalMs)
    return () => {
      window.removeEventListener(LS_WRITE_EVENT, bump)
      window.clearInterval(t)
    }
  }, [intervalMs])
  return tick
}

export function useSyncedLS<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [v, setV] = useState<T>(() => readLS(key, initial))
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    setV(readLS(keyRef.current, initial))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // перезагружаем значение из localStorage при синхронизации с сервера или из другой вкладки
  useEffect(() => {
    const reload = () => setV(readLS(keyRef.current, initial))
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyRef.current) reload()
    }
    window.addEventListener('aod:sync-hydrated', reload)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('aod:sync-hydrated', reload)
      window.removeEventListener('storage', onStorage)
    }
  }, [key, initial])

  const set: React.Dispatch<React.SetStateAction<T>> = (next) => {
    setV((prev) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      writeLS(keyRef.current, value)
      return value
    })
  }

  return [v, set]
}
