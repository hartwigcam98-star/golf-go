/* Trees: the current game's species trees for the hole (its prototypes and placements, exported per hole), drawn instanced with
   photographed bark (normal mapped) and the game's CC0 leaf atlas, leaves glowing a little when the sun is behind them. Far trees
   are impostors: each species' light prototype photographed once from the side at load, then drawn as two crossed cards. */
import * as THREE from 'three';
import { texture, uv, vertexColor, positionWorld, cameraPosition, vec3, max, dot, pow } from 'three/tsl';
import { SUN_DIR } from './sky.js';

const load = (url, srgb) => new THREE.TextureLoader().loadAsync(url).then(t => {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true; return t; });

function geometryOf(arr, stride) {   // interleaved position, normal, linear colour (and uv when stride is 11), as the game builds them
  const ib = new THREE.InterleavedBuffer(arr, stride), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0)); g.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 3));
  g.setAttribute('color', new THREE.InterleavedBufferAttribute(ib, 3, 6)); if (stride >= 11) g.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 9));
  g.computeBoundingSphere(); return g;
}

export async function addTrees(renderer, scene, D, q, inside) {
  const M = D.meta, groups = M.treeGroups || [];
  const [bark, barkN, leafAtlas] = await Promise.all([load('./assets/bark.jpg', false), load('./assets/bark_normal.jpg', false), load('./assets/leaf_atlas.webp', true)]);
  const sun = vec3(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z), back = pow(max(dot(positionWorld.sub(cameraPosition).normalize(), sun), 0), 3);
  const mats = {
    bark: new THREE.MeshStandardMaterial({ vertexColors: true, color: new THREE.Color(2.5, 2.5, 2.5), map: bark, normalMap: barkN, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .92, metalness: 0 }),
    mass: Object.assign(new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: .88, metalness: 0 }), { emissiveNode: vertexColor().mul(back.mul(.22)) }),
    leaf: Object.assign(new THREE.MeshStandardNodeMaterial({ vertexColors: true, map: leafAtlas, alphaTest: .5, side: THREE.DoubleSide, roughness: .72, metalness: 0 }),
      { emissiveNode: texture(leafAtlas, uv()).rgb.mul(vertexColor()).mul(back.mul(.45)) }),
  };

  // near trees: one instanced draw per prototype part, every tree a copy with the game's matrix and tint
  const detail = q.treeDetail === 'lite' ? 'lite' : 'full';
  let tris = 0;
  for (const g of groups) {
    const mtx = D.chunk(g.M), col = D.chunk(g.C);
    for (const part of g[detail]) {
      const geo = geometryOf(D.chunk(part.data), part.stride), im = new THREE.InstancedMesh(geo, mats[part.kind], g.n);
      im.instanceMatrix.array.set(mtx); im.instanceMatrix.needsUpdate = true;
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(col), 3);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
      tris += geo.attributes.position.count / 3 * g.n;
    }
  }

  // far trees: impostors from each species' first light prototype
  const far = (M.far || []).filter(t => !inside || !inside(t)), bySp = {};
  for (const t of far) (bySp[t.sp] = bySp[t.sp] || []).push(t);
  const keep = q.farTrees;   // share of far trees drawn (lower tiers thin them out)
  const bakeScene = new THREE.Scene(); bakeScene.environment = scene.environment;
  const bl = new THREE.DirectionalLight(0xfff0d8, 3); bl.position.set(-1, 1.4, 1.2); bakeScene.add(bl, new THREE.AmbientLight(0xbfd6ff, .5));
  for (const sp in bySp) {
    const g = groups.find(x => x.sp === sp) || groups[0]; if (!g) break;
    const parts = g.lite.map(p => new THREE.Mesh(geometryOf(D.chunk(p.data), p.stride), mats[p.kind]));
    const box = new THREE.Box3(); parts.forEach(m => box.expandByObject(m));
    const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), h = box.max.y - Math.min(0, box.min.y), px = 256, py = Math.min(512, Math.round(px * h / w));
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h, 0, -500, 500); cam.position.set((box.min.x + box.max.x) / 2, Math.min(0, box.min.y), (box.min.z + box.max.z) / 2 + 200); cam.lookAt(cam.position.x, cam.position.y, cam.position.z - 1);
    const rt = new THREE.RenderTarget(px, py, { samples: 0 }); rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    bakeScene.add(...parts);
    const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(bakeScene, cam); renderer.setRenderTarget(null); renderer.setClearColor(prevClear, prevA);
    bakeScene.remove(...parts); parts.forEach(m => m.geometry.dispose());
    // two crossed cards, base at the ground
    const a = new THREE.PlaneGeometry(w, h); a.translate(0, h / 2, 0); const b = a.clone(); b.rotateY(Math.PI / 2);
    const cards = new THREE.BufferGeometry(); cards.setAttribute('position', new THREE.Float32BufferAttribute([...a.attributes.position.array, ...b.attributes.position.array], 3));
    cards.setAttribute('uv', new THREE.Float32BufferAttribute([...a.attributes.uv.array, ...b.attributes.uv.array], 2));
    cards.setIndex([...a.index.array, ...b.index.array.map(i => i + a.attributes.position.count)]);
    const list = bySp[sp].filter((t, i) => (i * 0.6180339) % 1 < keep);
    const im = new THREE.InstancedMesh(cards, new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: .5, side: THREE.DoubleSide }), list.length);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((t, i) => { const sc = (t.r || 9) / 10; qq.setFromAxisAngle(up, (i * 2.3999) % (Math.PI * 2)); s.set(sc, sc * 1.15, sc); p.set(t.x, t.gh - .15, t.y); m4.compose(p, qq, s); im.setMatrixAt(i, m4); });
    im.frustumCulled = false; scene.add(im); tris += 4 * list.length;
  }
  return { near: groups.reduce((a, g) => a + g.n, 0), far: far.length, tris };
}
