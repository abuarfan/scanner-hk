// 🔥 NAIKKAN ANGKA VERSI INI SETIAP KALI UPDATE KODE KE VERCEL 🔥
const CACHE_NAME = 'ljk-scanner-v5.9'; 

const urlsToCache = [
    './',
    './index.html',
    './ui.js',
    './scanner.js',
    './storage.js',
    './analytics.js',
    './template-ljk.html',
    './manifest.json'
];

// Menginstall Service Worker dan menyimpan file ke Cache
self.addEventListener('install', event => {
    // Memaksa service worker baru langsung aktif tanpa menunggu
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Membuka cache:', CACHE_NAME);
            return cache.addAll(urlsToCache);
        })
    );
});

// 🔥 TUKANG SAPU CACHE LAMA (Wajib Ada) 🔥
// Event ini akan menghapus cache versi lama (misal v1) saat v2 berjalan
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Menghapus cache versi lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Memaksa semua tab browser yang terbuka untuk memakai versi baru
            return self.clients.claim();
        })
    );
});

// Menghidangkan file dari Cache jika offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Kembalikan file dari cache jika ada, jika tidak, ambil dari internet lalu simpan ke cache
            return response || fetch(event.request).then(fetchRes => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request.url, fetchRes.clone());
                    return fetchRes;
                });
            });
        })
    );
});
