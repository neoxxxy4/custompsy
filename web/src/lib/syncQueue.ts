// Очередь изменений для offline-first синхронизации.
// Каждое изменение кладётся сюда сразу, а при появлении сети — отправляется на сервер.

const DB_NAME = 'provodnik-sync'
const DB_VERSION = 1
const QUEUE_STORE = 'queue'

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
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
  return dbPromise
}

export interface QueueItem {
  id?: number
  key: string
  value: unknown
  createdAt: number
}

export async function enqueue(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const req = store.add({ key, value, createdAt: Date.now() })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function dequeue(id: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const req = store.delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function peekAll(): Promise<QueueItem[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const store = tx.objectStore(QUEUE_STORE)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result as QueueItem[])
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const req = store.clear()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}
