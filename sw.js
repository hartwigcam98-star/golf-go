/* Golf Go offline cache. The page is checked online first (so updates show straight away) and falls back to the copy on
   this phone; course data carries a version tag (?v=…) and is kept until it changes; leaderboards always go to the network. */
const V='e2d73eb3a3',CORE='core-'+V,ASSETS='assets';
const CORE_FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
const DATA=["greens.js?v=274e39a7d0", "ground.js?v=c31d90b0a7", "trees.js?v=68cbcdbdc0", "char%20ch12.js?v=lg2", "char%20remy.js?v=lg2", "char%20ch01.js?v=lg2", "char_ch08.js?v=lg2", "char_ch42.js?v=lg2", "char_ch23.js?v=lg2", "char%20ch28.js?v=lg2", "char_mx_joe.js?v=lg2", "char_ch17.js?v=lg2", "char_mh_tyger.js?v=m4", "char_mh_jack.js?v=m4", "char_mh_arnie.js?v=m4", "char_mh_phil.js?v=m4", "char_mh_rory.js?v=m4", "char_mh_scotty.js?v=m4", "char_mh_seve.js?v=m4", "char_mh_barry.js?v=m4", "char_mh_hoagan.js?v=m4", "char_mh_payne.js?v=m4"];   // current versioned data files
self.addEventListener('install',e=>{e.waitUntil(caches.open(CORE).then(c=>c.addAll(CORE_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith('core-')&&k!==CORE)await caches.delete(k);
  const a=await caches.open(ASSETS);for(const r of await a.keys()){const u=new URL(r.url);if(u.searchParams.has('v')&&!DATA.includes(u.pathname.split('/').pop()+'?v='+u.searchParams.get('v')))await a.delete(r);}
  await self.clients.claim();})());});
async function networkFirst(req){const c=await caches.open(CORE),cached=(await c.match(req))||(await c.match('index.html'));
  const net=fetch(req,{cache:'no-cache'}).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r;});   // always ask the server (GitHub Pages lets phones reuse a page for 10 minutes otherwise)
  if(!cached)return net.catch(()=>Response.error());
  // on a weak signal, open the copy on this phone after 4 s; the download carries on and is used next time
  return Promise.race([net.catch(()=>cached),new Promise(res=>setTimeout(()=>res(cached),4000))]);}
async function cacheFirst(req){const a=await caches.open(ASSETS),hit=await a.match(req);if(hit)return hit;const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))a.put(req,r.clone());return r;}
async function staleWhileRevalidate(req){const a=await caches.open(ASSETS),hit=await a.match(req);
  const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))a.put(req,r.clone());return r;}).catch(()=>hit);return hit||net;}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
  if(u.hostname.endsWith('supabase.co'))return;                                   // leaderboards: always live
  if(u.origin===location.origin&&/\/next\//.test(u.pathname))return;              // the next/ prototype: straight from the network, never the cached game
  if(req.mode==='navigate'||(u.origin===location.origin&&/\/(index\.html)?$/.test(u.pathname))){e.respondWith(networkFirst(req));return;}
  if(u.origin===location.origin&&u.searchParams.has('v')){e.respondWith(cacheFirst(req));return;}
  if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){e.respondWith(staleWhileRevalidate(req));return;}});
