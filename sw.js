// Primero la red (así le llegan los cambios), y si no hay internet, lo guardado.
// La música va aparte y nunca cambia: se baja una sola vez y no se borra en cada actualización.
// Para cambiar una canción, usa un archivo con otro nombre y agrégalo a TRACKS.
const CACHE = 'mi-marca-v3';
const MUSIC = 'mi-marca-music';
const TRACKS = ['music/pond.mp3', 'music/advertime.mp3', 'music/3-am-west-end.mp3'];
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png',
  'img/logo-white.png', 'img/logo-teal.png', 'img/mark-white.png', 'img/wordmark-white.png', 'fonts/poppins-700.woff2', 'fonts/montserrat.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  // la música se baja aparte, sin frenar la instalación si falla
  caches.open(MUSIC).then(c => Promise.all(TRACKS.map(u => c.match(u).then(r => r || c.add(u))))).catch(() => {});
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MUSIC).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.includes('/music/')) {
    e.respondWith(caches.open(MUSIC).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
