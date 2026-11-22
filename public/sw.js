// Cache the app shell so the ledger opens instantly and offline. Voice itself needs the network.
const V = 'vk-v3';
const SHELL = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/agent.js', 'js/ledger.js', 'js/i18n.js', 'js/store.js', 'js/voice.js', 'js/nlu/parse.js', 'js/nlu/numbers.js', 'js/viz.js', 'js/insight.js', 'js/onboard.js', 'js/chat.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api') || u.pathname.startsWith('/ws')) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((ch) => ch.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
