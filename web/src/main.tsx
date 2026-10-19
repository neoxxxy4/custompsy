import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runStorageMigration } from './lib/sync'

const APP_VERSION = '5'

// если версия приложения изменилась — очищаем localStorage и SW, чтобы не было
// несовместимости старых данных с новым кодом
const checkVersion = () => {
  try {
    if (localStorage.getItem('aod4-app-version') !== APP_VERSION) {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('aod4-')) keys.push(key)
      }
      keys.forEach((k) => localStorage.removeItem(k))
      localStorage.setItem('aod4-app-version', APP_VERSION)
    }
  } catch {
    /* ignore */
  }
}
checkVersion()
runStorageMigration()

const isOfflineMode = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mode') === 'offline'
}

if ('serviceWorker' in navigator && !isOfflineMode()) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((reg) => reg.unregister()))
    } catch (e) {
      console.warn('[SW] unregister old failed', e)
    }
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[SW] registered', reg.scope))
      .catch((err) => console.error('[SW] registration failed', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setTimeout(() => {
  const fb = document.getElementById('boot-fallback')
  if (fb) fb.remove()
}, 0)

