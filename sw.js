/*
 * The installed web app's service worker (the Windows app is this web app).
 *
 * Only this site's own files are ever cached. Sign-in, projects and everything
 * else from the server go straight to the network, untouched.
 *
 *   - The page itself: network first, so a new version shows on the next open;
 *     the last copy is used only when there is no connection.
 *   - Built files under assets/: their names change with every build, so a
 *     cached copy is never stale and is served first.
 */

const CACHE = 'fs-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

const keep = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => keep(request, response))
        .catch(async () => (await caches.match(request)) ?? (await caches.match(new URL('./', self.location).href)) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(request).then(hit => hit ?? fetch(request).then(response => keep(request, response))));
  }
});
