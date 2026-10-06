const CACHE = "apoio-v2";
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("apoio-") && key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname === "/sw.js") return;
  if (isDevAsset(url)) return;

  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkOrOffline(request));
    return;
  }

  const destination = request.destination;
  if (
    destination === "script" ||
    destination === "style" ||
    destination === "image" ||
    destination === "font" ||
    destination === "manifest"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isDevAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith("/@") ||
    path.startsWith("/src/") ||
    path.startsWith("/node_modules/") ||
    path.startsWith("/.tanstack")
  );
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("Sem conexão.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await fetched;
  if (response) return response;
  return new Response("", { status: 504, statusText: "Offline" });
}
