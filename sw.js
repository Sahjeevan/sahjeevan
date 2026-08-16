const CACHE_VERSION = "supabase-v1";
const SHELL  = "sahjeevan-shell-" + CACHE_VERSION;
const ASSETS = "sahjeevan-assets-" + CACHE_VERSION;
const PRECACHE = ["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(ASSETS);
    await Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== ASSETS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", e => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });
const isShell = req => req.mode === "navigate" || req.destination === "document" || new URL(req.url).pathname.endsWith("/index.html");
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("supabase.co") || url.hostname.includes("accounts.google.com") ||
      url.hostname.includes("googleusercontent.com") || url.hostname.includes("oauth2.googleapis.com")) return;
  if (isShell(req)) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(SHELL);
        c.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./index.html", { ignoreSearch: true });
        return cached || new Response("<h1>Offline</h1><p>Sahjeevan Operations needs a connection the first time it is opened on this device.</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") caches.open(ASSETS).then(c => c.put(req, res.clone())).catch(() => {});
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response("", { status: 504 });
  })());
});
