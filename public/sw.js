// Bump cache version on every deployment to ensure clients upgrade smoothly
const CACHE_NAME = "finlog-v9";

// Essential app shell assets and all main pages cached on install
const PRECACHE_ASSETS = [
  "/",
  "/history",
  "/add",
  "/savings",
  "/settings",
  "/reports",
  "/how-to-install",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/favicon/favicon.ico",
  "/favicon/android-chrome-192x192.png",
  "/favicon/android-chrome-512x512.png",
  "/favicon/apple-touch-icon.png",
];

// ─── Install: Pre-cache HTML shell and essential static assets ────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache core shell
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset);
          if (res.ok) {
            await cache.put(asset, res);
          }
        } catch {
          // Dev mode or missing asset fallback
        }
      }
    })
  );
  self.skipWaiting();
});

// ─── Activate: Wipe ALL old cache versions ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Helper: Network with timeout for fast offline fallback ───────────────────
function fetchWithTimeout(request, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // External APIs (Google Sheets, Gemini AI) → Always network, no SW cache
  if (url.origin !== self.location.origin) return;

  // ❶ NAVIGATION (HTML pages: /, /history, /savings, /reports, /settings, etc.)
  // Network-first when online, fallback to cached page, cached "/" shell, or offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone.clone());
              cache.put("/", clone); // Ensure root is always updated as shell
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: try specific route first, then root shell, then offline page
          const matched = await caches.match(event.request);
          if (matched) return matched;
          const rootMatched = await caches.match("/");
          if (rootMatched) return rootMatched;
          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;

          // Standalone rich fallback if cache is entirely unpopulated
          return new Response(
            `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Koneksi Belum Tersedia • FinLog</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}body{background:#0A0F1D;color:#F8FAFC;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}.card{max-width:380px;width:100%;background:#0F162A;border:1px solid #1E293B;border-radius:28px;padding:32px 24px;box-shadow:0 20px 40px -15px rgba(0,0,0,0.5)}.logo{font-size:22px;font-weight:900;margin-bottom:20px;color:#fff}.logo span{color:#10B981}.icon{width:68px;height:68px;margin:0 auto 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:22px;display:flex;align-items:center;justify-content:center;color:#F59E0B;font-size:30px}h1{font-size:18px;font-weight:800;margin-bottom:8px;color:#fff}p{font-size:13px;color:#94A3B8;line-height:1.5;margin-bottom:20px}.info{background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:14px;font-size:12px;color:#6EE7B7;margin-bottom:24px;text-align:left;line-height:1.4}.btn{width:100%;padding:14px;background:#10B981;color:#0A0F1D;border:none;border-radius:18px;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 10px 25px -5px rgba(16,185,129,0.4)}</style></head><body><div class="card"><div class="logo">Fin<span>Log</span></div><div class="icon">📶</div><h1>Koneksi Belum Tersedia</h1><p>Aplikasi belum memiliki cache offline karena belum pernah dibuka saat online di perangkat ini.</p><div class="info"><strong>Perlu Online Pertama Kali:</strong> Hubungkan internet untuk login dan mengunduh data awal. Setelah itu, FinLog dapat digunakan 100% tanpa internet.</div><button class="btn" onclick="window.location.reload()">Coba Hubungkan Kembali</button></div><script>window.addEventListener('online',()=>setTimeout(()=>window.location.reload(),500));</script></body></html>`,
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // ❷ NEXT.JS ASSETS & CHUNKS (/_next/static/...)
  // Network-first when online to get latest code; fallback to cached chunks when offline
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response("", { status: 404 });
        })
    );
    return;
  }

  // ❸ STATIC ASSETS (images, fonts, manifest, icons)
  // Cache-first for instant loading
  const isStatic =
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/) != null ||
    url.pathname === "/manifest.json";

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ❹ ALL OTHER GET REQUESTS: Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push Notification Handler ────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {
    title: "FinLog Pengingat Keuangan",
    body: "Sudah catat pengeluaran hari ini? Yuk luangkan 10 detik!",
    url: "/add",
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/favicon/android-chrome-192x192.png",
    badge: "/favicon/android-chrome-192x192.png",
    tag: "finlog-reminder",
    data: {
      url: payload.url || "/add",
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});
