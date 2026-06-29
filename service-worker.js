const CACHE_NAME = 'batepapo-cache-v511';
const FILES = ['index.html','style.css','app.js','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).catch(()=>{}));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request).then(net => {
    try {
      const copy = net.clone();
      if (event.request.method === 'GET') caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
    } catch(e) {}
    return net;
  })).catch(()=>caches.match('index.html')));
});
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Bate-papo', {
      body: data.body || '',
      icon: data.icon || 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200,100,200],
      tag: data.tag || 'batepapo-alert'
    });
  }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) { if ('focus' in client) return client.focus(); }
    if (clients.openWindow) return clients.openWindow('./');
  }));
});
