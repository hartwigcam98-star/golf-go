/* Tiny static server for the snapshot check. Serves a site folder; index.html gets one line added (window.__ev) so the check can
   reach into the game's own scope. Nothing on disk changes. */
const http = require('http'), fs = require('fs'), path = require('path');
const ANCHOR = 'if(window.claude?.hot?.ready)window.claude.hot.ready(boot);';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2', '.svg': 'image/svg+xml', '.css': 'text/css', '.wasm': 'application/wasm' };
function serve(root) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      let body = fs.readFileSync(f);
      if (p === '/index.html') {
        const s = body.toString('utf8'), i = s.indexOf(ANCHOR);
        if (i < 0) { r.writeHead(500); r.end('snapshot check: boot anchor not found in index.html'); return; }
        body = Buffer.from(s.slice(0, i) + 'window.__ev=s=>eval(s);\n' + s.slice(i), 'utf8');
      }
      r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(body);
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}
module.exports = { serve };
