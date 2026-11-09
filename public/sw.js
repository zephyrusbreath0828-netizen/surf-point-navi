// 四国サーフナビ Service Worker
// - アプリシェル(ページ/アセット)はキャッシュしてオフライン起動を可能にする
// - Open-Meteo API へのリクエストはキャッシュしない(予報は localStorage に最新値を保存し、オフライン時はそれを表示)
const CACHE = 'ssn-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 外部APIは素通し

  if (req.mode === 'navigate') {
    // ページ遷移: ネットワーク優先、失敗時キャッシュ
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
  } else {
    // アセット: キャッシュ優先、裏で更新
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
