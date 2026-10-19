import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runStorageMigration } from './lib/sync'

runStorageMigration()

const isOfflineMode = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mode') === 'offline'
}

if ('serviceWorker' in navigator && !isOfflineMode()) {
  window.addEventListener('load', async () => {
    try {
      // сначала снимаем все старые SW, чтобы избавиться от битого кэша
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

