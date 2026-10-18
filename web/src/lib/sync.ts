import { useEffect, useRef, useState } from 'react'

// ─── движок синхронизации ───
// Каждый ключ живёт в двух местах:
//   1. состояние React (мгновенный UI)
//   2. localStorage (персистентность; в APK — хранилище WebView)

export const readLS = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key)
    return s !== null ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
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
    localStorage.setItem(key, JSON.stringify(v))
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
      if (raw !== null) state[key] = JSON.parse(raw)
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

  const set: React.Dispatch<React.SetStateAction<T>> = (next) => {
    setV((prev) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      writeLS(keyRef.current, value)
      return value
    })
  }

  return [v, set]
}
