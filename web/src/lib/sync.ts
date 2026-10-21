import { useEffect, useRef, useState } from 'react'

// ─── движок синхронизации ───
// Каждый ключ живёт в двух местах:
//   1. состояние React (мгновенный UI)
//   2. localStorage (персистентность; в APK — хранилище WebView)

export const readLS = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key)
    if (s === null) return fallback
    const parsed = JSON.parse(s)
    // если в localStorage случайно записался null — отдаём fallback, а не null
    return parsed === null ? fallback : (parsed as T)
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

// если обнаруживаем битые wrapped-значения в localStorage — очищаем всё и
// подтягиваем свежие данные с сервера, чтобы не было чёрного экрана
const STORAGE_RESET_KEY = 'aod4-storage-reset-v5'
export function runStorageMigration() {
  try {
    if (localStorage.getItem(STORAGE_RESET_KEY)) return

    let hasWrapped = false
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('aod4-')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && 'v' in parsed && 't' in parsed) {
          hasWrapped = true
          break
        }
      } catch {
        // не JSON — тоже считаем битым
        hasWrapped = true
        break
      }
    }

    if (hasWrapped) {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('aod4-') && key !== STORAGE_RESET_KEY) keys.push(key)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    }

    localStorage.setItem(STORAGE_RESET_KEY, '1')
  } catch {
    /* ignore */
  }
}

export const writeLS = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(LS_WRITE_EVENT, { detail: { key } })))
  } catch {
    /* переполнение — не критично */
  }
}

// ─── offline-first: «грязные» ключи ───
// Ключ становится грязным при локальной правке и остаётся таким, пока
// сервер не подтвердил сохранение именно этой версии. Грязный ключ
// никогда не затирается входящей синхронизацией — отсюда нет откатов
// текста на полуслове. Список переживает перезапуск приложения.
// Не начинается с aod4-, чтобы не синхронизироваться и не стираться миграциями.

const DIRTY_KEYS = 'provodnik-dirty-keys'

const loadDirtyKeys = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DIRTY_KEYS) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : []
  } catch {
    return []
  }
}

// единый модульный набор — им пользуются и провайдер, и ручное «Сохранить»
const dirtySet = new Set<string>(typeof window === 'undefined' ? [] : loadDirtyKeys())

const persistDirtyKeys = () => {
  try {
    localStorage.setItem(DIRTY_KEYS, JSON.stringify([...dirtySet]))
  } catch {
    /* ignore */
  }
}

export const getDirtySet = () => dirtySet

export const markDirtyKey = (key: string) => {
  dirtySet.add(key)
  persistDirtyKeys()
}

export const isDirtyKey = (key: string) => dirtySet.has(key)

// снимаем грязный флаг только если значение не менялось с момента отправки
export const cleanDirtyKeys = (sentRaw: Map<string, string>) => {
  sentRaw.forEach((raw, key) => {
    if (localStorage.getItem(key) === raw) dirtySet.delete(key)
  })
  persistDirtyKeys()
}

// собираем грязные ключи в тело запроса; sentRaw — снимок для cleanDirtyKeys
export const collectDirtyState = (): { state: Record<string, unknown>; sentRaw: Map<string, string> } => {
  const state: Record<string, unknown> = {}
  const sentRaw = new Map<string, string>()
  dirtySet.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw === null) {
      dirtySet.delete(key) // ключа больше нет — грязнить нечего
      return
    }
    try {
      state[key] = JSON.parse(raw)
      sentRaw.set(key, raw)
    } catch {
      /* битое значение — пропускаем */
    }
  })
  persistDirtyKeys()
  return { state, sentRaw }
}

export async function saveAllToServer(): Promise<void> {
  const state: Record<string, unknown> = {}
  const sentRaw = new Map<string, string>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('aod4-')) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        state[key] = JSON.parse(raw)
        sentRaw.set(key, raw)
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
  // всё уехало на сервер — эти ключи больше не грязные
  cleanDirtyKeys(sentRaw)
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
    window.addEventListener('aod:sync-hydrated', reload)
    window.addEventListener('storage', reload)
    return () => {
      window.removeEventListener('aod:sync-hydrated', reload)
      window.removeEventListener('storage', reload)
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
