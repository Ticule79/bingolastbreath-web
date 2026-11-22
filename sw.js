// Réseau d'abord (les mises à jour arrivent tout de suite), cache en secours hors connexion.
// Seuls les fichiers de l'app et la bibliothèque Supabase sont mis en cache, jamais les données.
const CACHE = 'bingo-v3'
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'medal.png', 'icon-192.png', 'apple-touch-icon.png', 'fonts/manrope.ttf', 'fonts/cormorant_italic.ttf']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || (url.origin !== location.origin && url.host !== 'cdn.jsdelivr.net')) return
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)) } return r })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  )
})
