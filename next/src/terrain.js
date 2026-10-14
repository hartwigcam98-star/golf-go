/* Ground: the hole (1-yd mesh, painted surface texture with photographed turf and sand detail near you), the game's surroundings
   past it out to the horizon, water and the pin. Textures in next/assets are the current game's CC0 photo textures (ambientCG /
   Poly Haven); turf.jpg and sand.jpg are colour ratios (about 0.4 average) that multiply the painted colour, as in the game. */
import * as THREE from 'three';
import { texture, uv, positionWorld, cameraPosition, vec2, vec3, vec4, float, mix, smoothstep, dot, normalMap } from 'three/tsl';

const load = (url, srgb, repeat = true) => new THREE.TextureLoader().loadAsync(url).then(t => {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; });

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

// painted surface colour (4 px a yard): the surface map, then the mapped shapes drawn crisp on top, with the game's stripes
function surfaceCanvas(D) {
  const { meta, lg } = D, L = meta.lg, T = meta.turf || {};
  const C = { fescue: adjust('#8f9152'), rough: adjust('#4a8c3c', T.ro), cut: adjust('#5aa044', T.fw), fairway: adjust('#5ea247', T.fw), tee: adjust('#80c65a', T.te),
    green: adjust('#98d86f', T.gr), sand: T.sand || '#f4efe2', water: '#2c5f78' };
  const small = document.createElement('canvas'); small.width = L.nx; small.height = L.ny;
  const sc = small.getContext('2d', { willReadFrequently: true }), id = sc.createImageData(L.nx, L.ny), rgb = {};
  for (const k of L.codes) { sc.fillStyle = C[k] || '#556b2f'; sc.fillRect(0, 0, 1, 1); rgb[k] = sc.getImageData(0, 0, 1, 1).data.slice(0, 3); }
  for (let k = 0; k < lg.length; k++) { id.data.set(rgb[L.codes[lg[k]]] || [80, 110, 50], k * 4); id.data[k * 4 + 3] = 255; }
  sc.putImageData(id, 0, 0);
  const cv = document.createElement('canvas'); cv.width = Math.min(8192, L.nx * 4); cv.height = Math.min(8192, L.ny * 4);
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(small, 0, 0, cv.width, cv.height);
  g.setTransform(cv.width / L.nx, 0, 0, cv.height / L.ny, -L.x0 * cv.width / L.nx, -L.y0 * cv.height / L.ny);   // yards -> pixels
  const path = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const P = meta.polys, st = T.st || [11, 1, 0, 1];
  g.fillStyle = C.fairway; for (const f of P.fairways) { path(f); g.fill(); }
  g.save(); g.beginPath(); for (const f of P.fairways) { g.moveTo(f[0][0], f[0][1]); for (const p of f) g.lineTo(p[0], p[1]); g.closePath(); } g.clip();
  g.rotate(meta.axis); g.globalAlpha = .08 * st[1]; g.fillStyle = '#fff'; for (let k = -150; k < 150; k += 2) g.fillRect(-3000, k * st[0], 6000, st[0]); g.restore();
  g.fillStyle = C.tee; for (const t of P.tees) { path(t); g.fill(); }
  for (const gr of P.greens) { path(gr); g.lineWidth = 3; g.strokeStyle = C.cut; g.stroke(); g.fillStyle = C.green; g.fill(); }
  g.fillStyle = C.sand; for (const b of P.bunkers) { path(b); g.fill(); }
  g.fillStyle = C.water; for (const w of P.water) { path(w.pts); g.fill(); }
  return cv;
}
// which surface each yard is (r mown grass, g rough, b fescue, a sand), filtered so the detail blends across edges
function weightTexture(D) {
  const { meta, lg } = D, L = meta.lg, d = new Uint8Array(L.nx * L.ny * 4), code = Object.fromEntries(L.codes.map((c, i) => [c, i]));
  for (let k = 0; k < lg.length; k++) { const v = lg[k], o = k * 4;
    if (v === code.fairway || v === code.tee || v === code.green || v === code.cut) d[o] = 255; else if (v === code.rough) d[o + 1] = 255;
    else if (v === code.fescue) d[o + 2] = 255; else if (v === code.sand) d[o + 3] = 255; }
  const t = new THREE.DataTexture(d, L.nx, L.ny, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export async function addGround(scene, D, H, q) {
  const M = D.meta, L = M.lg;
  const [turf, sand, turfN, sandN, surr] = await Promise.all([load('./assets/turf.jpg', false), load('./assets/sand.jpg', false), load('./assets/turf_normal.jpg', false), load('./assets/sand_normal.jpg', false),
    M.surr && M.surr.tex ? load(D.dir + M.surr.tex, true, false) : null]);

  // detail that fades out with distance: photographed turf on grass, photographed sand in bunkers
  const detail = (baseCol, w, kTurf) => {
    const wp = positionWorld, xz = vec2(wp.x, wp.z), dist = wp.sub(cameraPosition).length();
    const fd = float(1).sub(smoothstep(30, 200, dist));
    const t1 = texture(turf, xz.div(1.7)).rgb, t2 = texture(turf, vec2(xz.x.mul(.8).sub(xz.y.mul(.6)), xz.x.mul(.6).add(xz.y.mul(.8))).div(3.9)).rgb;
    const tr = mix(t1, t2, .5).mul(2.5), tg = mix(vec3(dot(tr, vec3(1 / 3))), tr, .45);
    const s1 = texture(sand, xz.div(2.4)).rgb.mul(2.5);
    const kg = w.x.mul(.75).add(w.y).add(w.z.mul(.6)).mul(fd).mul(kTurf), ks = w.w.mul(fd);
    return baseCol.mul(mix(vec3(1), tg, kg)).mul(mix(vec3(1), s1, ks));
  };

  // the surroundings' bare ground as a sampler (the skirt is a regular grid; the hole's cut-out only drops triangles)
  let Sg = null;
  if (M.surr && M.surr.base) { const P = D.chunk(M.surr.pos), base = D.chunk(M.surr.base), st = P[3] - P[0]; let nx = 1; while (nx * 3 < P.length && P[nx * 3 + 2] === P[2]) nx++;
    const ny = base.length / nx, x0 = P[0], y0 = P[2];
    Sg = (x, y) => { const fx = Math.max(0, Math.min(nx - 1.001, (x - x0) / st)), fy = Math.max(0, Math.min(ny - 1.001, (y - y0) / st)), i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
      return (base[j * nx + i] * (1 - tx) + base[j * nx + i + 1] * tx) * (1 - ty) + (base[(j + 1) * nx + i] * (1 - tx) + base[(j + 1) * nx + i + 1] * tx) * ty; }; }
  // the hole: one vertex a yard; its outer 16 yd ease onto the surroundings so the two meet without a step (the lidar hole and the
  // coarser surrounding ground can differ by a couple of yards at the edge)
  { const nx = L.nx, ny = L.ny, pos = new Float32Array(nx * ny * 3), uvs = new Float32Array(nx * ny * 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = L.x0 + i, y = L.y0 + j;
      const e = Math.min(i, j, nx - 1 - i, ny - 1 - j), t = Sg && e < 16 ? 1 - e / 16 : 0, hh = H(x, y);
      pos[k * 3] = x; pos[k * 3 + 1] = t > 0 ? hh + (Sg(x, y) + .25 - hh) * t * t * (3 - 2 * t) : hh; pos[k * 3 + 2] = y; uvs[k * 2] = (i + .5) / nx; uvs[k * 2 + 1] = (j + .5) / ny; }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6); let o = 0;
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1; idx.set([a, c, b, b, c, e], o); o += 6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    const surf = new THREE.CanvasTexture(surfaceCanvas(D)); surf.colorSpace = THREE.SRGBColorSpace; surf.flipY = false; surf.anisotropy = 8;
    const wt = weightTexture(D), w = texture(wt, uv());
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: .95, metalness: 0 });
    const sc = texture(surf, uv()).rgb, sl = dot(sc, vec3(.299, .587, .114));
    mat.colorNode = detail(mix(vec3(sl), sc, .8).mul(.86), w, 1.3);   // as the game: a touch desaturated and darker than the painted colour
    // micro relief the sun picks out: the photographed turf and sand normal maps, near you only (no tangents on the terrain, so
    // the normal-map node builds its frame from screen derivatives)
    { const xz = vec2(positionWorld.x, positionWorld.z), near = float(1).sub(smoothstep(8, 60, positionWorld.sub(cameraPosition).length()));
      const n = mix(texture(turfN, xz.div(1.7)).rgb, texture(sandN, xz.div(2.4)).rgb, w.w);
      mat.normalNode = normalMap(n, vec2(near.mul(mix(float(.9), float(.6), w.x)))); }
    mat.roughnessNode = mix(float(.97), float(.86), w.x);   // mown grass a touch glossier
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.name = 'hole'; scene.add(m); }

  // the surroundings past the hole, as the game builds them, painted with its surroundings map
  if (M.surr) { const S = M.surr, geo = new THREE.BufferGeometry();
    // bare ground: the game lifts wooded ground 11-16 yd as a stand-in for far forest, which in this lighting reads as flat-topped
    // mesas; distant woods get proper silhouettes later (PLAN.md)
    const P = new Float32Array(D.chunk(S.pos)), base = S.base ? D.chunk(S.base) : null;
    if (base) for (let k = 0; k < base.length; k++) P[k * 3 + 1] = base[k];
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setIndex(new THREE.BufferAttribute(D.chunk(S.idx), 1)); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: .97, metalness: 0 });
    const su = vec2(positionWorld.x.sub(S.ss[0]).div(S.ss[2]), positionWorld.z.sub(S.ss[1]).div(S.ss[3]));
    mat.colorNode = surr ? detail(texture(surr, su).rgb.mul(.92), vec4(0, .6, .4, 0), .7) : vec3(.36, .42, .22);   // rough/fescue-like detail
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = q.skirtShadow; m.name = 'skirt'; scene.add(m);
    // and a flat apron beyond, just under the rim, out past the haze
    const rim = S.rim ?? -2, ap = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshStandardMaterial({ color: 0x5d6b3c, roughness: 1 }));
    ap.name = 'apron'; ap.rotation.x = -Math.PI / 2; ap.position.set(S.ss[0] + S.ss[2] / 2, rim - 2.5, S.ss[1] + S.ss[3] / 2); scene.add(ap); }

  // water at its level: dark and glossy, so it mirrors the sky through the environment light
  for (const w of M.polys.water) { const s = new THREE.Shape(w.pts.map(p => new THREE.Vector2(p[0], -p[1])));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0c2a33, roughness: .06, metalness: 0, envMapIntensity: 1.2 })); m.position.y = w.lvl; scene.add(m); }

  // the pin: a 7-ft flagstick and flag
  { const [px, py] = M.pin, gh = H(px, py);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.33, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .4 }));
    pole.position.set(px, gh + 1.165, py); pole.castShadow = true; scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.55, .38), new THREE.MeshStandardMaterial({ color: 0xffd23c, side: THREE.DoubleSide, roughness: .8 }));
    flag.position.set(px + .28, gh + 2.1, py); flag.castShadow = true; scene.add(flag); }
}
