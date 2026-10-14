/* Golf Go Next: milestone 1 scaffold. One hole's real terrain and surfaces, drawn by three.js's WebGPU renderer (WebGL2 fallback),
   from data exported by the current game (next/tools/export-hole.mjs). Coordinates: yards, hole frame (tee at 0,0), x east, y south;
   in the scene x -> x, height -> y, course y -> z. See next/PLAN.md. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

const Q = new URLSearchParams(location.search);
const COURSE = Q.get('c') || 'troy', HOLE = +(Q.get('h') || 1);
const $ = id => document.getElementById(id);
const fail = e => { console.error(e); $('msg').hidden = false; $('msg').textContent = 'Could not start: ' + (e && e.message || e); };

/* ---------- data ---------- */
async function loadHole(course, hole) {
  const base = `./data/${course}/h${hole}`;
  const [meta, bin] = await Promise.all([fetch(base + '.json').then(r => { if (!r.ok) throw new Error(`no data for ${course} hole ${hole}`); return r.json(); }),
    fetch(base + '.bin').then(r => { if (!r.ok) throw new Error('missing ' + base + '.bin'); return r.arrayBuffer(); })]);
  const view = (k, T) => new T(bin, meta.bin[k].offset, meta.bin[k].length / T.BYTES_PER_ELEMENT);
  return { meta, hg: view('hg', Float32Array), gg: view('gg', Float32Array), lg: view('lg', Uint8Array) };
}
// bilinear height in yards: the 0.5-yd grid round the green where it reaches, else the 2-yd grid (as the game's hAtH/hFineH)
function heightFn(D) {
  const bil = (g, a, x, y) => { const fx = (x - g.x0) / g.st, fy = (y - g.y0) / g.st;
    if (fx < 0 || fy < 0 || fx > g.nx - 1 || fy > g.ny - 1) return null;
    const i = Math.min(g.nx - 2, fx | 0), j = Math.min(g.ny - 2, fy | 0), tx = fx - i, ty = fy - j, n = g.nx;
    return (a[j * n + i] * (1 - tx) + a[j * n + i + 1] * tx) * (1 - ty) + (a[(j + 1) * n + i] * (1 - tx) + a[(j + 1) * n + i + 1] * tx) * ty; };
  const { hg, gg } = D.meta;
  return (x, y) => bil(gg, D.gg, x, y) ?? bil(hg, D.hg, Math.max(hg.x0, Math.min(x, hg.x0 + (hg.nx - 1) * hg.st)), Math.max(hg.y0, Math.min(y, hg.y0 + (hg.ny - 1) * hg.st)));
}

/* ---------- surface texture: the surface map, then the mapped shapes drawn crisp on top (4 px a yard) ---------- */
// the game's base turf colours, nudged per course by its measured hue/saturation/lightness (TURF in index.html)
function adjust(hex, a) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  if (!a) return `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, l = (mx + mn) / 2, s = 0;
  if (d > 1e-6) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; }
  h = (h + a[0] / 360 + 1) % 1; s = Math.min(1, s * a[1]); l = Math.min(.97, l * a[2]);
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return `rgb(${f(h + 1 / 3) * 255 | 0},${f(h) * 255 | 0},${f(h - 1 / 3) * 255 | 0})`;
}
function surfaceTexture(D, maxAniso) {
  const { meta, lg } = D, L = meta.lg, T = meta.turf || {}, PX = 4;
  const C = { fescue: adjust('#8f9152'), rough: adjust('#4a8c3c', T.ro), cut: adjust('#5aa044', T.fw), fairway: adjust('#5ea247', T.fw), tee: adjust('#80c65a', T.te),
    green: adjust('#98d86f', T.gr), sand: T.sand || '#f4efe2', water: '#2c5f78' };
  const small = document.createElement('canvas'); small.width = L.nx; small.height = L.ny;
  const sc = small.getContext('2d', { willReadFrequently: true }), id = sc.createImageData(L.nx, L.ny), rgb = {};
  for (const k of L.codes) { sc.fillStyle = C[k] || '#556b2f'; sc.fillRect(0, 0, 1, 1); rgb[k] = sc.getImageData(0, 0, 1, 1).data.slice(0, 3); }
  for (let k = 0; k < lg.length; k++) { const c = rgb[L.codes[lg[k]]] || [80, 110, 50]; id.data.set(c, k * 4); id.data[k * 4 + 3] = 255; }
  sc.putImageData(id, 0, 0);
  const cv = document.createElement('canvas'); cv.width = Math.min(8192, L.nx * PX); cv.height = Math.min(8192, L.ny * PX);
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(small, 0, 0, cv.width, cv.height);
  g.setTransform(cv.width / L.nx, 0, 0, cv.height / L.ny, -L.x0 * cv.width / L.nx, -L.y0 * cv.height / L.ny);   // yards -> pixels
  const path = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const P = meta.polys, st = T.st || [11, 1, 0, 1];
  g.fillStyle = C.fairway; for (const f of P.fairways) { path(f); g.fill(); }
  // mown stripes in the game's frame (canvas rotated by the hole's compass axis), so both versions stripe alike
  g.save(); g.beginPath(); for (const f of P.fairways) { g.moveTo(f[0][0], f[0][1]); for (const p of f) g.lineTo(p[0], p[1]); g.closePath(); } g.clip();
  g.rotate(meta.axis); g.globalAlpha = .1 * st[1]; g.fillStyle = '#fff'; for (let k = -150; k < 150; k += 2) g.fillRect(-3000, k * st[0], 6000, st[0]); g.restore();
  g.fillStyle = C.tee; for (const t of P.tees) { path(t); g.fill(); }
  for (const gr of P.greens) { path(gr); g.lineWidth = 3; g.strokeStyle = C.cut; g.stroke(); g.fillStyle = C.green; g.fill(); }
  g.fillStyle = C.sand; for (const b of P.bunkers) { path(b); g.fill(); }
  g.fillStyle = C.water; for (const w of P.water) { path(w.pts); g.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = maxAniso; tex.generateMipmaps = true;
  return tex;
}

/* ---------- scene ---------- */
async function start() {
  if (!navigator.gpu && Q.get('webgl') !== '0') console.info('WebGPU not available here: using the WebGL2 backend');
  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: Q.get('webgl') === '1' });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';

  const D = await loadHole(COURSE, HOLE), M = D.meta, H = heightFn(D);
  $('title').textContent = `${M.name} · hole ${M.hole} · par ${M.par}`;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .2, 30000);

  // sky and light: the game's afternoon sun direction
  const sunDir = new THREE.Vector3(-.52, .58, .63).normalize();
  const sky = new SkyMesh(); sky.scale.setScalar(25000);
  sky.material.fog = false; sky.turbidity.value = 4; sky.rayleigh.value = 1.4; sky.mieCoefficient.value = .004; sky.mieDirectionalG.value = .8; sky.sunPosition.value.copy(sunDir);
  scene.add(sky);
  scene.fog = new THREE.FogExp2(new THREE.Color(.72, .8, .88), .00045);
  scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x4a5a32, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
  const L = M.lg, cx = L.x0 + L.nx / 2, cy = L.y0 + L.ny / 2, span = Math.max(L.nx, L.ny) * .6;
  sun.position.set(cx + sunDir.x * 800, sunDir.y * 800, cy + sunDir.z * 800); sun.target.position.set(cx, 0, cy);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(/Mobi|iPhone|Android/.test(navigator.userAgent) ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 2000 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
  scene.add(sun, sun.target);

  // terrain: one vertex a yard over the surface map's extent
  { const nx = L.nx, ny = L.ny, pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = L.x0 + i, y = L.y0 + j;
      pos[k * 3] = x; pos[k * 3 + 1] = H(x, y); pos[k * 3 + 2] = y; uv[k * 2] = (i + .5) / nx; uv[k * 2 + 1] = (j + .5) / ny; }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6); let o = 0;
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: surfaceTexture(D, renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 8), roughness: .95, metalness: 0 });
    const terrain = new THREE.Mesh(geo, mat); terrain.receiveShadow = true; scene.add(terrain); }

  // until the surroundings arrive (milestone 2): a ground skirt out to the horizon just under the lowest edge, so the hole doesn't end in a cliff
  { let lo = 1e9; for (let i = 0; i < L.nx; i += 4) lo = Math.min(lo, H(L.x0 + i, L.y0), H(L.x0 + i, L.y0 + L.ny - 1)); for (let j = 0; j < L.ny; j += 4) lo = Math.min(lo, H(L.x0, L.y0 + j), H(L.x0 + L.nx - 1, L.y0 + j));
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: 0x6f7a45, roughness: 1 }));
    skirt.rotation.x = -Math.PI / 2; skirt.position.set(cx, lo - .6, cy); skirt.receiveShadow = true; scene.add(skirt); }

  // water at its level
  for (const w of M.polys.water) { const s = new THREE.Shape(w.pts.map(p => new THREE.Vector2(p[0], -p[1])));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1d4e63, roughness: .08, metalness: 0, transparent: true, opacity: .92 })); m.position.y = w.lvl; scene.add(m); }

  // pin: a 7-ft flagstick and flag
  { const [px, py] = M.pin, gh = H(px, py);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.33, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .4 }));
    pole.position.set(px, gh + 1.165, py); pole.castShadow = true; scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.55, .38), new THREE.MeshStandardMaterial({ color: 0xffd23c, side: THREE.DoubleSide, roughness: .8 }));
    flag.position.set(px + .28, gh + 2.1, py); flag.castShadow = true; scene.add(flag); }

  // placeholder trees (milestone 2 replaces these): instanced trunk + crown, sized by each tree's mapped crown radius
  { const inside = t => t.x > L.x0 + 2 && t.y > L.y0 + 2 && t.x < L.x0 + L.nx - 3 && t.y < L.y0 + L.ny - 3;   // trees past the exported terrain wait for the surroundings (milestone 2)
    const all = [...M.trees, ...M.far].filter(inside);
    const trunkG = new THREE.CylinderGeometry(.18, .28, 1, 6), crownG = new THREE.IcosahedronGeometry(1, 1);
    const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 }), all.length);
    const crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, flatShading: true }), all.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    const tint = { pine: 0x2f4a2a, spruce: 0x2d4630, redcedar: 0x35502e, lpine: 0x3a5530, birch: 0x6e8a3d, willow: 0x7d9446, cottonwood: 0x5f7f38, maple: 0x4f7a34, buroak: 0x46682f, oak: 0x48692f, liveoak: 0x3e5d2c };
    all.forEach((t, i) => { const r = Math.max(2, t.r), h = t.h || r * 2.4 + 3, conifer = /pine|spruce|cedar/.test(t.sp || '');
      m4.compose(new THREE.Vector3(t.x, t.gh + h * .3, t.y), q, new THREE.Vector3(r * .25, h * .6, r * .25)); trunk.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(t.x, t.gh + h * (conifer ? .55 : .62), t.y), q, new THREE.Vector3(r * (conifer ? .6 : 1), h * (conifer ? .5 : .38), r * (conifer ? .6 : 1))); crown.setMatrixAt(i, m4);
      crown.setColorAt(i, c.setHex(tint[t.sp] || 0x4a6b32).multiplyScalar(.85 + ((i * 2654435761) >>> 0) % 1000 / 3300)); });
    trunk.castShadow = crown.castShadow = true; scene.add(trunk, crown); }

  // camera views
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .495;
  const dir = [Math.sin(M.teeAim), -Math.cos(M.teeAim)];   // the game's compass angle -> hole frame direction
  const views = {
    tee: () => { const h0 = H(0, 0); camera.position.set(-dir[0] * 9, h0 + 3.2, -dir[1] * 9); controls.target.set(dir[0] * 160, h0 + 2, dir[1] * 160); },
    green: () => { const [px, py] = M.pin, d = Math.hypot(px, py), ux = px / d, uy = py / d, ax = px - ux * 45, ay = py - uy * 45; camera.position.set(ax, H(ax, ay) + 4, ay); controls.target.set(px, H(px, py) + 1, py); },
    above: () => { camera.position.set(cx, 420, cy + 260); controls.target.set(cx, 0, cy); },
  };
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => { views[b.dataset.view](); controls.update(); };
  views.tee(); controls.update();

  // frame stats: fps and the slowest frames, so smoothness is visible from day one
  const ft = []; let last = performance.now(), acc = 0, n = 0, shown = 0;
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  $('msg').hidden = true; $('hud').hidden = false;
  renderer.setAnimationLoop(now => {
    const dt = now - last; last = now; ft.push(dt); if (ft.length > 240) ft.shift(); acc += dt; n++;
    controls.update(); renderer.render(scene, camera);
    if (now - shown > 500) { shown = now; const s = ft.slice().sort((a, b) => a - b), p95 = s[Math.floor(s.length * .95)] || 0;
      $('stats').textContent = `${backend} · ${(1000 * n / acc).toFixed(0)} fps · slowest 5% ${p95.toFixed(1)} ms · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`; acc = 0; n = 0; }
  });
}
start().catch(fail);
