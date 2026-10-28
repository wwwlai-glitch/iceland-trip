/* 離線快取：有網路時抓最新版（最多等 3 秒），沒網路就用手機裡存的。 */
var VERSION="v15";
var CACHE="trip-"+VERSION;
var SHELL=["assets/daily-scenes.webp","assets/travel-cover.webp","assets/icons.svg","./","index.html","style.css","app.js","config.js","vendor/Sortable.min.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf("trip-")===0&&k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("message",function(e){ if(e.data==="skip") self.skipWaiting(); });
self.addEventListener("fetch",function(e){
  var req=e.request, url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==self.location.origin) return; /* 試算表的讀寫不經過快取 */
  e.respondWith(new Promise(function(resolve){
    var done=false;
    function fromCache(){ return caches.match(req,{ignoreSearch:true}).then(function(r){ return r||caches.match("index.html"); }); }
    var timer=setTimeout(function(){ fromCache().then(function(r){ if(r&&!done){ done=true; resolve(r); } }); },3000);
    fetch(req).then(function(res){
      if(res&&res.ok){ var copy=res.clone(); caches.open(CACHE).then(function(c){ c.put(req,copy); }); }
      clearTimeout(timer); if(!done){ done=true; resolve(res); }
    }).catch(function(){
      clearTimeout(timer); fromCache().then(function(r){ if(!done){ done=true; resolve(r||Response.error()); } });
    });
  }));
});
