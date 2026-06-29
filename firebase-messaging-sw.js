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

const CACHE_NAME = 'batepapo-cache-v516';
const APP_SHELL = ['./index.html?v=516','./style.css?v=516','./app.js?v=516','./manifest.json?v=516','./icon-192.png','./icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Bate-papo', {
      body: data.body || '',
      icon: data.icon || './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200,100,200],
      tag: data.tag || 'batepapo-alert',
      data
    });
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isAppFile = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/app.js') || url.pathname.endsWith('/style.css') || url.pathname.endsWith('/manifest.json') || req.mode === 'navigate';
  if (isAppFile) {
    event.respondWith(
      fetch(req, {cache:'no-store'}).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html?v=516')))
    );
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    try { const copy = resp.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{}); } catch(e) {}
    return resp;
  }).catch(()=>cached)));
});

function showPushNotification(payload){
  const n = payload.notification || {};
  const d = payload.data || {};
  const isCall = d.type === 'call' || d.callType;
  return self.registration.showNotification(n.title || (isCall ? 'Ligação recebida' : 'Bate-papo'), {
    body: n.body || (isCall ? 'Alguém está ligando para você' : 'Nova atualização'),
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: isCall ? [300,120,300,120,300,120,300] : [200,100,200],
    tag: isCall ? 'batepapo-chamada' : 'batepapo-msg',
    requireInteraction: isCall,
    renotify: true,
    data: d
  });
}

if (messaging) {
  messaging.onBackgroundMessage(payload => showPushNotification(payload));
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || './index.html?v=516';
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ('focus' in client) {
        client.focus();
        if (client.postMessage) client.postMessage({type:'OPEN_FROM_NOTIFICATION', data});
        return;
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  }));
});
