const CACHE='geometry-dash-v27';
const ASSETS=['./','./index.html','./styles.css?v=27','./app.js?v=27','./engine.js','./renderer.js','./levels.js','./storage.js','./editor.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;let u;try{u=new URL(r.url)}catch{return}if(u.protocol!=='http:'&&u.protocol!=='https:')return;e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&(res.type==='basic'||res.type==='cors')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{})}return res}).catch(()=>caches.match('./index.html'))))});
