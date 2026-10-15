/* Fill app/www, the web files the app carries. Run from app/: node scripts/copy-web.mjs
   - capacitor.config.json has a server url (the default): the app opens the live game at that address, so every update to the
     site reaches the app with no rebuild. www then only needs a placeholder page.
   - No server url: the game is copied in and runs from the phone's storage (page, data and character scripts, icons, manifest;
     not the service worker, next/ or the tools). It then only changes when the app is rebuilt. */
import { readdir, mkdir, copyFile, rm, stat, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const root = resolve('..'), out = resolve('www');
const cfg = JSON.parse(await readFile('capacitor.config.json', 'utf8'));
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
if (cfg.server && cfg.server.url) {
  await writeFile(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Golf Go</title><script>location.replace(${JSON.stringify(cfg.server.url)})</script>`);
  console.log(`app opens ${cfg.server.url} (placeholder page in app/www)`);
} else {
  const keep = f => f === 'index.html' || f === 'manifest.webmanifest' || /\.png$/.test(f) || (/\.js$/.test(f) && f !== 'sw.js');
  let n = 0, bytes = 0;
  for (const f of await readdir(root)) { if (!keep(f)) continue; const s = await stat(join(root, f)); if (!s.isFile()) continue;
    await copyFile(join(root, f), join(out, f)); n++; bytes += s.size; }
  console.log(`copied ${n} files (${(bytes / 1e6).toFixed(0)} MB) into app/www`);
}
