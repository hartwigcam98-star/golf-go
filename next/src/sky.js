/* Sky, sun and the light the sky throws: a physical (Preetham) sky, the game's afternoon sun, image-based light from that sky
   (PMREM) so shade is blue-ish and every surface picks up the sky, and distance haze in the sky's horizon colour. */
import * as THREE from 'three';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

export const SUN_DIR = new THREE.Vector3(-.52, .58, .63).normalize();   // the current game's sun (SUN in index.html)

function makeSky(scale) {
  const sky = new SkyMesh(); sky.scale.setScalar(scale); sky.material.fog = false;
  sky.turbidity.value = 3.2; sky.rayleigh.value = 1.25; sky.mieCoefficient.value = .0035; sky.mieDirectionalG.value = .82;
  sky.sunPosition.value.copy(SUN_DIR); return sky;
}

export function addSky(renderer, scene, { center, span, shadowSize }) {
  scene.add(makeSky(25000));
  // light from the sky itself: a small sky in its own scene, prefiltered for diffuse and glossy reflections
  let envOK = false;
  try { const envScene = new THREE.Scene(); envScene.add(makeSky(900));
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0, .5, 2000).texture; envOK = true; }
  catch (e) { console.warn('sky lighting unavailable, using a plain fill light', e); }
  scene.environmentIntensity = .5;   // sky fill: enough to tint the shade blue, not so much it flattens the sun
  if (!envOK) scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x4a5a32, 1.1));
  // horizon haze: about a tenth at 500 yd, two fifths at 1000, most of the way by 2000
  scene.fog = new THREE.FogExp2(new THREE.Color(.66, .76, .86), .0007);

  const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
  sun.position.set(center.x + SUN_DIR.x * 900, SUN_DIR.y * 900, center.y + SUN_DIR.z * 900); sun.target.position.set(center.x, 0, center.y);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(shadowSize);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 2400 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .06;
  scene.add(sun, sun.target);
  return { sun, envOK };
}
