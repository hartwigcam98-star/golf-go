/* Grass blades round the camera: a few tens of thousands of instanced blades, each placed, sized, coloured and bent on the GPU.
   - Placement: every blade has a fixed random spot in a square tile of TILE yards, repeated over the ground; each frame a blade
     takes the copy of its spot nearest the patch centre (a little ahead of the camera), so blades stay put as you move.
   - They stand on the ground (a height texture baked from the same heights as the terrain mesh) and only grow where the game's
     surface map says rough (about 4 in) or fescue (knee-high, golden-tipped); none on fairways, tees, greens or sand.
   - Wind: a slow sway plus gusts rolling across the course; blades fade out with distance so the patch has no edge. */
import * as THREE from 'three';
import { Fn, uniform, instanceIndex, positionLocal, hash, texture, varying, vec2, vec3, float, sin, round, mix, smoothstep, cos, time,
  dot, select, abs } from 'three/tsl';

export function addGrass(scene, D, G, q) {
  if (!q.grass) return null;
  const layers = Array.isArray(q.grass) ? q.grass : [q.grass];
  const L = D.meta.lg, X1 = L.x0 + L.nx - 1, Y1 = L.y0 + L.ny - 1;
  // ground height on the terrain mesh's own 2-yd grid (linear filtering then follows the mesh), half floats
  const hx = Math.ceil((L.nx - 1) / 2) + 1, hy = Math.ceil((L.ny - 1) / 2) + 1, hd = new Uint16Array(hx * hy);
  for (let j = 0; j < hy; j++) for (let i = 0; i < hx; i++) hd[j * hx + i] = THREE.DataUtils.toHalfFloat(G.hAt(Math.min(L.x0 + i * 2, X1), Math.min(L.y0 + j * 2, Y1)));
  const hTex = new THREE.DataTexture(hd, hx, hy, THREE.RedFormat, THREE.HalfFloatType); hTex.magFilter = hTex.minFilter = THREE.LinearFilter; hTex.needsUpdate = true;

  const uCenter = uniform(new THREE.Vector2()), uWind = uniform(new THREE.Vector2(.8, .6).normalize());
  // smooth value noise, 64 px tiling over 16 noise cells, for the tufts
  const NS = 64, nd = new Uint8Array(NS * NS), lat = Array.from({ length: 17 * 17 }, (_, i) => { const x = Math.sin((i % 17 % 16) * 127.1 + (Math.floor(i / 17) % 16) * 311.7) * 43758.5453; return x - Math.floor(x); });
  for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) { const fx = i / 4, fy = j / 4, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const v = (lat[y0 * 17 + x0] * (1 - sx) + lat[y0 * 17 + x0 + 1] * sx) * (1 - sy) + (lat[(y0 + 1) * 17 + x0] * (1 - sx) + lat[(y0 + 1) * 17 + x0 + 1] * sx) * sy; nd[j * NS + i] = v * 255; }
  const nTex = new THREE.DataTexture(nd, NS, NS, THREE.RedFormat); nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.magFilter = nTex.minFilter = THREE.LinearFilter; nTex.needsUpdate = true;

  // blade: two tapering segments and a tip, x across (-.5..5), y up (0..1)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, -.3, .5, 0, .3, .5, 0, 0, 1, 0], 3));   // 5 vertices, 3 triangles
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);

  let N = 0; const meshes = [];
  const LIGHT = vec3(.965, 1, 1.08);   // measured: the lit ground's brightness under this sun, with the sky's faint blue
  for (const [li, { n, tile: TILE }] of layers.entries()) { N += n;
  const id = instanceIndex.add(li * 1000003);   // each layer its own random spots
  const r1 = hash(id), r2 = hash(id.add(7919)), r3 = hash(id.add(15013)), r4 = hash(id.add(23011));
  // the copy of this blade's spot nearest the patch centre
  const off = vec2(r1, r2).mul(TILE), p = off.add(round(uCenter.sub(off).div(TILE)).mul(TILE));
  const inHole = p.x.greaterThan(L.x0 + 1).and(p.x.lessThan(X1 - 1)).and(p.y.greaterThan(L.y0 + 1)).and(p.y.lessThan(Y1 - 1));
  const wuv = vec2(p.x.sub(L.x0).add(.5).div(L.nx), p.y.sub(L.y0).add(.5).div(L.ny));
  const huv = vec2(p.x.sub(L.x0).div(2).add(.5).div(hx), p.y.sub(L.y0).div(2).add(.5).div(hy));
  const w = texture(G.wt, wuv).level(0), ground = texture(hTex, huv).level(0).r;
  const dist = p.sub(vec2(uCenter.x, uCenter.y)).length();
  const fade = float(1).sub(smoothstep(TILE * .32, TILE * .5, dist));
  const rough = w.y, fescue = w.z;
  const clump = texture(nTex, p.mul(.45 / 16)).level(0).r;   // fescue grows in tufts (one lookup in a small tiling noise texture)
  const bladeH = rough.mul(mix(.08, .15, r3)).add(fescue.mul(mix(.22, .62, r3)).mul(mix(.45, 1.25, clump))).mul(fade).mul(select(inHole, float(1), float(0)));
  const width = mix(.02, .036, r4).mul(fescue.mul(.7).add(1));
  const ang = r4.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const y = positionLocal.y, x = positionLocal.x.mul(width);
  // wind: gusts rolling along the wind, a per-blade phase, and each blade's own lean
  const gust = sin(time.mul(1.7).add(dot(p, uWind).mul(.33)).add(r1.mul(6.2832))).mul(.5).add(sin(time.mul(.6).add(dot(p, uWind).mul(.07))).mul(.7));
  const lean = y.mul(y).mul(gust.mul(.35).add(r2.sub(.5).mul(.6)));
  const bend = vec2(uWind.x.mul(lean), uWind.y.mul(lean)).add(vec2(ca, sa).mul(y.mul(y).mul(r3.sub(.5)).mul(.4)));
  const pos = vec3(p.x.add(x.mul(ca)).add(bend.x.mul(bladeH)), ground.add(y.mul(bladeH).mul(float(1).sub(abs(lean).mul(.25)))).sub(.01), p.y.add(x.mul(sa)).add(bend.y.mul(bladeH)));

  // unlit: every blade faces up, so its sunlight and sky light are the same everywhere; working them out per pixel (with a shadow
  // lookup and the sky's reflections) on several layers of overlapping blades was the grass's main cost on phones. LIGHT matches
  // the lit ground under the same sun and sky. (Blades don't darken in tree shade yet.)
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  mat.positionNode = pos;
  const vY = varying(y), vF = varying(fescue), vUV = varying(wuv), vR = varying(r3);
  const base = texture(G.surf, vUV).rgb, bl = dot(base, vec3(.299, .587, .114)), tint = mix(vec3(bl), base, .8).mul(.86);
  mat.colorNode = mix(tint.mul(1.12), vec3(.78, .68, .4), vF.mul(vY).mul(vY).mul(.7)).mul(mix(.78, 1.18, vY)).mul(mix(.86, 1.12, vR)).mul(LIGHT);
  const mesh = new THREE.InstancedMesh(g, mat, n);
  mesh.frustumCulled = false; mesh.receiveShadow = false; mesh.castShadow = false; scene.add(mesh); meshes.push({ mesh, n });
  }
  // density: a share of every layer's blades is drawn (the spots are random, so fewer blades thins the grass evenly)
  let share = 1;
  let on = true;
  const setShare = v => { share = Math.max(.15, Math.min(1, v)); for (const m of meshes) m.mesh.count = Math.round(m.n * share); };
  const setOn = v => { on = v; for (const m of meshes) m.mesh.visible = v; };
  return {
    get blades() { return on ? Math.round(N * share) : 0; }, setShare, get share() { return share; }, setOn, get on() { return on; },
    // centre the patch a little ahead of the camera, along the ground
    update(camera) { const d = new THREE.Vector3(); camera.getWorldDirection(d); const k = Math.hypot(d.x, d.z) || 1;
      uCenter.value.set(camera.position.x + d.x / k * 8, camera.position.z + d.z / k * 8); },
  };
}
