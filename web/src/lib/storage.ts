// Offline-first хранилище: IndexedDB как основа, localStorage — fallback/миграция.

const DB_NAME = 'provodnik'
const DB_VERSION = 1
const STORE_NAME = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('indexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
  return dbPromise
}

const readLegacy = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeLegacy = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

const removeLegacy = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const value = req.result
        if (value !== undefined) {
          resolve(String(value))
          return
        }
        // миграция из localStorage
        const legacy = readLegacy(key)
        if (legacy !== null) {
          setItem(key, legacy).catch(() => {})
        }
        resolve(legacy)
      }
    })
  } catch {
    return readLegacy(key)
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  writeLegacy(key, value)
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(value, key)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch {
    // fallback уже записан в localStorage
  }
}

export async function removeItem(key: string): Promise<void> {
  removeLegacy(key)
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(key)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch {
    // ignore
  }
}

export async function keys(): Promise<string[]> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAllKeys()
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result as string[])
    })
  } catch {
    const list: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) list.push(k)
    }
    return list
  }
}
