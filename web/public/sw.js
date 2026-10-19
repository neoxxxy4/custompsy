const CACHE_NAME = 'provodnik-v3'
const SHELL = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API и WebSocket не кэшируем
  if (url.pathname.startsWith('/api/') || url.protocol === 'wss:' || url.protocol === 'ws:') {
    return
  }

  // shell — сначала сеть, потом кэш (чтобы всегда получать свежий index.html)
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  // статика — сначала кэш, потом сеть с обновлением кэша
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // в фоне обновляем
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
            }
          })
          .catch(() => {})
        return cached
      }
      return fetch(request).then((response) => {
        if (!response.ok) return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
    }),
  )
})
