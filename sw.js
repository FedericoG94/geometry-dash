const CACHE='geometry-dash-v10';
const ASSETS=['./','./index.html','./app.js?v=10','./levels.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 let url;try{url=new URL(req.url)}catch{return}
 if(url.protocol!=='http:'&&url.protocol!=='https:')return;
 event.respondWith(caches.match(req).then(cached=>{
  if(cached)return cached;
  return fetch(req).then(res=>{
   if(res&&res.ok&&(res.type==='basic'||res.type==='cors')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
   return res;
  }).catch(()=>caches.match('./index.html'));
 }));
});