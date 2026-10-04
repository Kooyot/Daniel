// Service worker panelu: pozwala zainstalować panel jako aplikację.
// Celowo nie zapisuje danych zgłoszeń w pamięci urządzenia — zawsze pobiera je z serwera.
const SHELL = "panel-shell-v3";
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

// Powiadomienie o nowym zgłoszeniu (wysyła je serwer przez Web Push).
self.addEventListener("push", (e) => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch (err) { msg = { title: "Nowe zgłoszenie", body: e.data && e.data.text() }; }
  const title = msg.title || "Nowe zgłoszenie";
  const jobs = [
    self.registration.showNotification(title, {
      body: msg.body || "Stuknij, aby otworzyć panel.",
      icon: "icons/icon-192.png",
      badge: "icons/badge-96.png",
      tag: msg.tag || "zgloszenie",
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: msg.url || "/panel/" },
    }),
  ];
  if (typeof msg.badge === "number" && self.navigator && self.navigator.setAppBadge) {
    jobs.push(msg.badge ? self.navigator.setAppBadge(msg.badge) : self.navigator.clearAppBadge());
  }
  e.waitUntil(Promise.all(jobs).catch(() => {}));
});

// Stuknięcie w powiadomienie: otwórz zgłoszenie (w otwartym panelu albo w nowym oknie).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/panel/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin + "/panel/"));
      if (open) return open.focus().then((c) => c.navigate(url)).catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    })
  );
});
