// MUZIO's service worker:
//  * push notifications (see src/lib/push.ts and api/notify.ts);
//  * opening the app offline: the page (network first, the saved copy when
//    offline) and the built files under /assets/ (their names change with
//    every build, so a saved copy is always right), plus the logos and icons.
//    Nothing else is cached - data, recordings and /api always come from
//    the network.

const CACHE = 'muzio-app-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  ),
)

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // The app page: fresh when online (so updates arrive), the saved one offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && (response.headers.get('content-type') ?? '').includes('text/html')) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/').then((saved) => saved || Response.error())),
    )
    return
  }

  // Built files and the app's own pictures (logos, icons): saved the first
  // time they're used.
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (saved) =>
          saved ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'MUZIO', {
      body: data.body || '',
      icon: '/icon-192.png',
      // The small icon in the phone's status bar: Android draws only its
      // transparency, so it must be a white shape on transparent (a full
      // picture would show as a white square).
      badge: '/notification-badge.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

// A tap opens the page it's about - in an open MUZIO tab if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) return open.navigate(url).then((w) => (w || open).focus())
      return self.clients.openWindow(url)
    }),
  )
})
