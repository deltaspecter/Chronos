/* CHRONOS – Service Worker
 *
 * Wird beim Build (vite.config.ts → serviceWorkerPlugin) nach dist/sw.js geschrieben;
 * Die Platzhalter für Version und Dateiliste werden dabei ersetzt.
 *
 * Caches:
 *   chronos-shell-<VERSION>  App-Hülle und Kerndaten dieser Version (wird bei jedem Update ersetzt)
 *   chronos-recent           Zuletzt gelesene Artikel (max. RECENT_LIMIT, älteste fliegen raus)
 *   chronos-media-recent     Zuletzt angezeigte Bilder (max. MEDIA_LIMIT)
 *   chronos-offline          Vom Nutzer ausdrücklich offline gespeicherte Artikel und Bilder
 *                            (verwaltet von der App, src/offline/offline.ts – nie automatisch gelöscht)
 *
 * Strategien:
 *   Seitenaufrufe            Netz zuerst (max. 4 s), sonst gespeicherte App-Hülle
 *   Dateien mit Hash im Namen  Speicher zuerst (Inhalt ändert sich nie)
 *   Artikel und Bilder       Speicher zuerst (offline gespeichert oder zuletzt gelesen), sonst Netz
 *
 * Updates: Ein neuer Service Worker wartet, bis die App „Neu laden“ meldet (SKIP_WAITING),
 * damit niemand mitten im Lesen eine neue Version untergeschoben bekommt. Alte Versionen der
 * App-Hülle werden beim Aktivieren gelöscht – veraltete Inhalte bleiben nicht hängen.
 */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const SHELL = `chronos-shell-${VERSION}`
const RECENT = 'chronos-recent'
const MEDIA = 'chronos-media-recent'
const RECENT_LIMIT = 30
const MEDIA_LIMIT = 60
const NETWORK_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('chronos-shell-') && k !== SHELL).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  if (event.data === 'VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION })
})

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  // Cache API liefert Einträge in Einfügereihenfolge – älteste zuerst
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i])
}

async function networkFirst(request, fallbackUrl) {
  const shell = await caches.open(SHELL)
  try {
    const response = await withTimeout(fetch(request, { cache: 'no-cache' }), NETWORK_TIMEOUT_MS)
    if (response.ok) return response
    throw new Error(`HTTP ${response.status}`)
  } catch {
    const cached = (await shell.match(fallbackUrl ?? request, { ignoreVary: true })) ?? (await caches.match(fallbackUrl ?? request, { ignoreVary: true }))
    return cached ?? Response.error()
  }
}

async function cacheFirst(request, runtimeCache, limit) {
  // ignoreVary: Server senden oft "Vary: Origin"; Modul-Skripte werden aber mit Origin-Header angefragt
  const cached = await caches.match(request, { ignoreVary: true })
  if (cached) {
    if (runtimeCache) {
      // Als „zuletzt verwendet“ markieren: ans Ende verschieben
      const cache = await caches.open(runtimeCache)
      if (await cache.match(request, { ignoreVary: true })) {
        await cache.delete(request, { ignoreVary: true })
        await cache.put(request, cached.clone())
      }
    }
    return cached
  }
  const response = await fetch(request)
  if (response.ok && runtimeCache) {
    const cache = await caches.open(runtimeCache)
    await cache.put(request, response.clone())
    trim(runtimeCache, limit)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname === '/sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'))
  } else if (url.pathname.startsWith('/data/a/')) {
    event.respondWith(cacheFirst(request, RECENT, RECENT_LIMIT))
  } else if (url.pathname.startsWith('/media/')) {
    event.respondWith(cacheFirst(request, MEDIA, MEDIA_LIMIT))
  } else {
    event.respondWith(cacheFirst(request))
  }
})
