/* Golf Go Next (milestone 2): one hole drawn as realistically as the phone allows, by three.js's WebGPU renderer (WebGL2 fallback),
   from data exported by the current game (next/tools/export-hole.mjs). Coordinates: yards, hole frame (tee at 0,0), x east, y south;
   in the scene x -> x, height -> y, course y -> z. See next/PLAN.md. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadHole, heightFn } from './src/data.js';
import { addSky } from './src/sky.js';
import { addGround } from './src/terrain.js';
import { addTrees } from './src/trees.js';

const Q = new URLSearchParams(location.search);
const COURSE = Q.get('c') || 'troy', HOLE = +(Q.get('h') || 1);
const $ = id => document.getElementById(id);
const fail = e => { console.error(e); $('msg').hidden = false; $('msg').textContent = 'Could not start: ' + (e && e.message || e); };
const PHONE = /Mobi|iPhone|iPad|Android/.test(navigator.userAgent);

// quality tiers: what each costs is what the frame readout is for
const TIERS = {
  high: { label: 'High', pr: 2, shadow: 4096, treeDetail: 'full', farTrees: 1, aa: true, skirtShadow: true },
  med: { label: 'Med', pr: 1.5, shadow: 2048, treeDetail: 'full', farTrees: 1, aa: true, skirtShadow: false },
  low: { label: 'Low', pr: 1, shadow: 1024, treeDetail: 'lite', farTrees: .5, aa: false, skirtShadow: false },
};
const tierName = TIERS[Q.get('q')] ? Q.get('q') : PHONE ? 'med' : 'high', q = TIERS[tierName];

async function start() {
  const renderer = new THREE.WebGPURenderer({ antialias: q.aa, forceWebGL: Q.get('webgl') === '1', trackTimestamp: true });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .8;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  // GPU time only where the browser reports it (WebGPU timestamp queries; not on iPhone Safari yet)
  const gpuTimer = !!(renderer.backend && renderer.backend.device && renderer.backend.device.features && renderer.backend.device.features.has('timestamp-query'));

  $('msg').textContent = 'Loading the hole…';
  const D = await loadHole(COURSE, HOLE), M = D.meta, H = heightFn(D), L = M.lg;
  $('title').textContent = `${M.name} · hole ${M.hole} · par ${M.par}`;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .2, 40000);
  const cx = L.x0 + L.nx / 2, cy = L.y0 + L.ny / 2;
  const sky = addSky(renderer, scene, { center: { x: cx, y: cy }, span: Math.max(L.nx, L.ny) * .6, shadowSize: q.shadow });
  $('msg').textContent = 'Painting the ground…'; await addGround(scene, D, H, q);
  $('msg').textContent = 'Growing the trees…'; const trees = await addTrees(renderer, scene, D, q);

  { const hide = (Q.get('hide') || '').split(','); scene.traverse(o => { if (o.name && hide.includes(o.name)) o.visible = false; }); }   // debugging: ?hide=hole,skirt,apron
  // camera views
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .495;
  const dir = [Math.sin(M.teeAim), -Math.cos(M.teeAim)];   // the game's compass angle -> hole-frame direction
  const views = {
    tee: () => { const h0 = H(0, 0); camera.position.set(-dir[0] * 9, h0 + 3.2, -dir[1] * 9); controls.target.set(dir[0] * 160, h0 + 2, dir[1] * 160); },
    green: () => { const [px, py] = M.pin, d = Math.hypot(px, py), ux = px / d, uy = py / d, ax = px - ux * 45, ay = py - uy * 45; camera.position.set(ax, H(ax, ay) + 4, ay); controls.target.set(px, H(px, py) + 1, py); },
    above: () => { camera.position.set(cx, 420, cy + 260); controls.target.set(cx, 0, cy); },
  };
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => { views[b.dataset.view](); controls.update(); };
  (views[Q.get('view')] || views.tee)(); controls.update();
  // quality switch (reloads with ?q=)
  for (const b of document.querySelectorAll('[data-q]')) { b.classList.toggle('on', b.dataset.q === tierName); b.onclick = () => { Q.set('q', b.dataset.q); location.search = Q.toString(); }; }

  // frame readout: fps and slowest frames (what you feel), plus frame cost (how hard the phone works, which a 60 fps cap hides)
  const ft = [], cpu = []; let last = performance.now(), shown = 0, gpuMs = null;
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  // shadows: nothing in the scene moves, so the shadow map is drawn once (and again only when the trees change detail)
  sky.sun.shadow.autoUpdate = false; sky.sun.shadow.needsUpdate = true;
  trees.updateLOD(camera.position, true);
  $('msg').hidden = true; $('hud').hidden = false;
  renderer.setAnimationLoop(now => {
    const dt = now - last; last = now; ft.push(dt); if (ft.length > 240) ft.shift();
    const t0 = performance.now(); controls.update(); if (trees.updateLOD(camera.position)) sky.sun.shadow.needsUpdate = true; renderer.render(scene, camera); cpu.push(performance.now() - t0); if (cpu.length > 240) cpu.shift();
    if (gpuTimer && renderer.resolveTimestampsAsync) renderer.resolveTimestampsAsync().then(() => { const v = renderer.info.render.timestamp; if (v > 0) gpuMs = v; }).catch(() => {});
    if (now - shown > 500) { shown = now; const s = ft.slice().sort((a, b) => a - b), p95 = s[Math.floor(s.length * .95)] || 0, mean = ft.reduce((a, b) => a + b, 0) / ft.length;
      const c = cpu.slice().sort((a, b) => a - b), cMed = c[c.length >> 1] || 0;
      $('stats').textContent = `${backend} · ${q.label} · ${(1000 / mean).toFixed(0)} fps · slowest 5% ${p95.toFixed(1)} ms`;
      $('cost').textContent = `frame cost: JS ${cMed.toFixed(1)} ms` + (gpuMs != null ? ` · GPU ${gpuMs.toFixed(1)} ms` : ' · GPU time n/a here') +
        ` · ${(renderer.info.render.triangles / 1e6).toFixed(2)}M tris · ${trees.near} trees + ${trees.far} far`; }
  });
}
start().catch(fail);
