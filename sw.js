// 冻干工艺优化 PWA — Service Worker（v7 版本化缓存键 + 导航 network-first）
// 关键改进（相对 v6）：
//  1) 缓存键绑定版本号：注册时 URL 带 ?v=<CACHE_STAMP>，SW 据此构造
//     CACHE = 'freeze-dry-pwa-<CACHE_STAMP>'。发新版 → 键名自然失效 →
//     activate 自动清掉旧键 → 用户打开即拿到最新版，无需硬刷/手动“立即更新”。
//  2) 导航请求（页面 HTML）改 network-first：先问网络（带 If-None-Match，命中 304 极快），
//     有新版即返回并写缓存；完全离线再回退旧缓存。根治“发版后被旧缓存卡住”。
//  3) 其他同源静态资源（图标/manifest/sw.js）仍 cache-first + 后台静默更新（秒开 + 离线兜底）。
//  4) version.json 永远走网络，保证“发现新版本”提示准确。
//  5) 保留 message{PURGE_CACHE}：清缓存后配合“立即更新”硬刷新，确保拿到真新版。
(function () {
  // 解析版本：注册 URL 形如 sw.js?v=20260829-395
  function getVer() {
    try {
      var s = self.location.search || '';
      var m = s.match(/[?&]v=([^&]+)/);
      if (m && m[1]) return m[1];
    } catch (e) {}
    return 'v6'; // 回退（兼容未带版本参数注册的旧场景）
  }
  var VER = getVer();
  var CACHE = 'freeze-dry-pwa-' + VER;
  var APP_SHELL = ['./', './index.html', './sw.js', './manifest.json', './icon-192.png', './icon-512.png'];

  self.addEventListener('install', function (e) {
    self.skipWaiting(); // 立即激活，接管页面
    e.waitUntil(caches.open(CACHE).then(function (c) {
      return c.addAll(APP_SHELL).catch(function () {}); // 预缓存 app shell（仅首次下载 3.4MB 一次）
    }));
  });

  self.addEventListener('activate', function (e) {
    e.waitUntil((function () {
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
          // 清掉所有旧版 freeze-dry-pwa 缓存（键名随版本变，旧键即失效）
          if (k.indexOf('freeze-dry-pwa-') === 0 && k !== CACHE) return caches.delete(k);
        }));
      }).then(function () { return self.clients.claim(); });
    })());
  });

  // 页面“立即更新”时调用：清空当前版本缓存，确保导航后拉到真正的最新版
  self.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'PURGE_CACHE') {
      caches.delete(CACHE).then(function () {
        Promise.all([self.clients.matchAll()]).then(function (cls) {
          cls.forEach(function (c) { c.postMessage({ type: 'CACHE_PURGED' }); });
        });
      });
    }
  });

  self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    var url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return; // 仅处理同源

    // 版本检测文件永远走网络（更新提示依赖它），失败再回退缓存
    if (url.pathname.indexOf('version.json') >= 0) {
      e.respondWith(fetch(e.request).catch(function () { return caches.match(e.request); }));
      return;
    }

    // 导航请求（页面 HTML）：network-first —— 发版即更新，离线回退缓存
    var isNav = e.request.mode === 'navigate' ||
                url.pathname === '/' ||
                url.pathname.indexOf('/index.html') >= 0;
    if (isNav) {
      e.respondWith((function () {
        return fetch(e.request).then(function (res) {
          if (res && res.status === 200) {
            caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
          }
          return res;
        }).catch(function () {
          return caches.match(e.request).then(function (hit) {
            return hit || caches.match('./index.html');
          });
        });
      })());
      return;
    }

    // 其他同源静态资源：cache-first + 后台静默更新（秒开 + 离线兜底）
    e.respondWith((function () {
      var cacheP = caches.open(CACHE);
      var cachedP = cacheP.then(function (c) { return c.match(e.request); });
      var netP = fetch(e.request).then(function (res) {
        if (res && res.status === 200) cacheP.then(function (c) { c.put(e.request, res.clone()); });
        return res;
      }).catch(function () { return null; });
      return cachedP.then(function (hit) {
        if (hit) return hit;
        return netP.then(function (net) {
          return net || caches.match('./index.html') || new Response('', { status: 504, statusText: 'offline' });
        });
      });
    })());
  });
})();
