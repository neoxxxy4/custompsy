import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isOfflineMode = () => {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('mode') === 'offline'
}

if ('serviceWorker' in navigator && !isOfflineMode()) {
  window.addEventListener('load', () => {
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
