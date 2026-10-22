export type AppIconId = 'default' | 'moon' | 'moon-blue' | 'moon-cyan' | 'moon-pink'

export const APP_ICON_KEY = 'aod4-app-icon'

export interface AppIconDef {
  id: AppIconId
  label: string
  preview: string
}

export const APP_ICONS: AppIconDef[] = [
  { id: 'default', label: 'Проводник', preview: '/icon-192.png' },
  { id: 'moon', label: 'Луна', preview: '/icon-moon-192.png' },
  { id: 'moon-blue', label: 'Синяя луна', preview: '/icon-moon-blue-192.png' },
  { id: 'moon-cyan', label: 'Голубая луна', preview: '/icon-moon-cyan-192.png' },
  { id: 'moon-pink', label: 'Розовая луна', preview: '/icon-moon-pink-192.png' },
]

export function getAppIcon(): AppIconId {
  try {
    const raw = localStorage.getItem(APP_ICON_KEY)
    const id = raw ? (JSON.parse(raw) as AppIconId) : 'default'
    return APP_ICONS.some((i) => i.id === id) ? id : 'default'
  } catch {
    return 'default'
  }
}

export function splashFor(id: AppIconId): string {
  return id === 'default' ? '/logo-mark.png' : `/icon-${id}-512.png`
}

export function applyAppIcon(id: AppIconId) {
  const favicon = id === 'default' ? '/favicon-32.png' : `/favicon-${id}-32.png`
  const icon192 = id === 'default' ? '/icon-192.png' : `/icon-${id}-192.png`
  const apple = id === 'default' ? '/apple-touch-icon.png' : `/icon-${id}-180.png`
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((l) => {
    l.href = l.getAttribute('sizes') === '192x192' ? icon192 : favicon
  })
  document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((l) => {
    l.href = apple
  })
  // нативный мост андроид-приложения (WebView): переключает иконку на рабочем столе
  ;(window as unknown as { ProvodnikNative?: { setIcon?: (id: string) => void } }).ProvodnikNative?.setIcon?.(id)
}
