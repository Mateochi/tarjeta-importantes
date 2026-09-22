// Guarda la pantalla del QR para que abra aunque el celular no tenga internet.
// Primero intenta la red (siempre lo más nuevo); si no hay conexión, usa la copia guardada.
var CACHE = 'qr-antonio-chica-v1';
var ARCHIVOS = [
  './qr.html',
  './manifest.webmanifest',
  '../assets/tarjeta.css',
  '../assets/qr.js',
  '../assets/icono.svg',
  '../assets/icono-192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://www.importantes.co/cdn/shop/files/manual-IMPORTANTES-26_7dac4d9c-ef88-4c66-962d-1281a2285280.png?v=1730487109&width=600'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(ARCHIVOS.map(function (u) { return c.add(u).catch(function () {}); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (r) {
        if (r.ok) {
          var copia = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
        }
        return r;
      })
      .catch(function () { return caches.match(e.request); })
  );
});
