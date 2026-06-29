importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyCdI11L3Y2GFCy4XzbpSwYGchEtFBzj6Sw",
  authDomain: "ferramentas-projeto.firebaseapp.com",
  databaseURL: "https://ferramentas-projeto.firebaseio.com",
  projectId: "ferramentas-projeto",
  storageBucket: "ferramentas-projeto.appspot.com",
  messagingSenderId: "877191590019",
  appId: "1:877191590019:web:5288a02e29c7718753abb6",
  measurementId: "G-78H1JXYJXQ"
};
try { firebase.initializeApp(firebaseConfig); } catch(e) {}
let messaging = null;
try { messaging = firebase.messaging(); } catch(e) {}

const CACHE_NAME = 'batepapo-cache-v517';
const FILES = ['index.html?v=517','index.html','style.css?v=517','style.css','app.js?v=517','app.js','manifest.json','icon-192.png','icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).catch(()=>{}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(resp => {
      try {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(()=>{});
      } catch(e) {}
      return resp;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('index.html')))
  );
});

if (messaging) {
  messaging.onBackgroundMessage(payload => {
    const n = payload.notification || {};
    const d = payload.data || {};
    const isCall = d.type === 'call' || d.callType || String(n.title || '').toLowerCase().includes('chamada');
    self.registration.showNotification(n.title || (isCall ? 'Chamada recebida' : 'Bate-papo'), {
      body: n.body || (isCall ? 'Alguém está ligando para você' : 'Nova atualização'),
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: isCall ? [300,120,300,120,300,120,300] : [200,100,200],
      tag: isCall ? 'batepapo-chamada' : 'batepapo-msg',
      renotify: true,
      requireInteraction: isCall,
      data: d
    });
  });
}

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Bate-papo', {
      body: data.body || '',
      icon: data.icon || 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200,100,200],
      tag: data.tag || 'batepapo-alert',
      data: data.data || {}
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.callId ? './index.html?v=517&callId=' + encodeURIComponent(d.callId) : './index.html?v=517';
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ('focus' in client) {
        client.focus();
        try { client.postMessage({type:'OPEN_FROM_NOTIFICATION', data:d}); } catch(e) {}
        return;
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
