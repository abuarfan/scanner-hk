const CACHE_NAME = 'ljk-scanner-v1';
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
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Membuka cache');
            return cache.addAll(urlsToCache);
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