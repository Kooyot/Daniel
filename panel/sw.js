// Service worker panelu: pozwala zainstalować panel jako aplikację.
// Celowo nie zapisuje danych zgłoszeń w pamięci urządzenia — zawsze pobiera je z serwera.
const SHELL = "panel-shell-v1";
const FILES = ["./", "panel.css", "panel.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pliki panelu: najpierw sieć (nowa wersja), bez sieci — kopia. API nigdy z pamięci.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (!url.pathname.startsWith("/panel/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./")))
  );
});
