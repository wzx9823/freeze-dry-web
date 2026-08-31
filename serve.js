// PWA 静态服务（零依赖）：serve 当前目录，提供正确的 manifest/SW MIME
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8765;
const host = process.env.HOST || '127.0.0.1';
const root = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer(function (req, res) {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const fp = path.join(root, u);
  if (!fp.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, function (err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, host, function () {
  console.log('PWA 已启动: http://' + host + ':' + port + '/  (手机同 WiFi 用电脑 IP 访问可"添加到主屏幕")');
});
