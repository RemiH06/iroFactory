// ══════════════════════════════════════════════════════
// La vitrina · Three.js r186. El cráneo del bioma (escaneo del MUVHN,
// reducido con gltf-transform y meshopt) sobre un pedestal escalonado art
// deco, bajo una luz de museo, dentro de una caja de vidrio con aristas de
// oro. Gira despacio solo; se arrastra para girarlo (con inercia). Al
// cambiar de cráneo, el viejo baja girando y el nuevo sube al pedestal
// (adaptador de anime.js). Cada modelo se carga una vez y se guarda.
// Cada escaneo trae su escala y su orientación: se centra con su caja
// envolvente y se lleva a un tamaño común.
//   mount({ host }) → { show(skull) }
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animate } from 'animejs';
import { cssVar, makeLoop, night, onTheme, reduceMotion } from './kit.js';

const BASE = '../assets/models/tarot/';

export function mount({ host }) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 0.55, 4.1); camera.lookAt(0, 0.35, 0);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.35;
  const hemi = new THREE.HemisphereLight(0xfff2dc, 0x1a1a24, 0.45); scene.add(hemi);
  // luz de museo: un cenital cálido con sombra y un contraluz del color del bioma
  const spot = new THREE.SpotLight(0xffe2b0, 40, 9, 0.42, 0.6, 1.6); spot.position.set(0.4, 3.6, 1.4); spot.target.position.set(0, 0.4, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004;
  const rim = new THREE.PointLight(0xf6f1e6, 6, 5, 1.6); rim.position.set(-1.4, 1.2, -1.2);
  scene.add(spot, spot.target, rim);

  // ── pedestal escalonado con remates de oro
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25e, metalness: 1, roughness: 0.28 });
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x1b1d27, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const plinth = new THREE.Group(); scene.add(plinth);
  [[1.5, 0.16, -0.62], [1.2, 0.16, -0.46], [0.92, 0.22, -0.27]].forEach(([w, h, y]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.7), stone); b.position.y = y; b.receiveShadow = true; plinth.add(b);
    const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.018, w * 0.7 + 0.02), gold); t.position.y = y + h / 2; plinth.add(t);
  });
  // caja de vidrio: paneles casi invisibles y aristas de oro
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xf6f1e6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.25, 0.72), glass); box.position.y = 0.46; scene.add(box);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0xd8b25e, transparent: true, opacity: 0.85 })); edges.position.copy(box.position); scene.add(edges);
  const holder = new THREE.Group(); holder.position.y = 0.38; scene.add(holder);
  // soporte de museo: vástago y platina de oro del pedestal al cráneo
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), gold); rod.position.y = 0.0; rod.castShadow = true;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.025, 32), gold); disc.position.y = -0.15;
  scene.add(rod, disc);

  // ── modelos
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const models = new Map();
  const load = file => {
    if (models.has(file)) return models.get(file);
    const p = loader.loadAsync(BASE + file + '.glb').then(g => {
      const obj = g.scene; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.envMapIntensity = 0.6; } });
      // centrar y llevar a un tamaño común (el lado más largo mide 0.95)
      const bb = new THREE.Box3().setFromObject(obj), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
      // el modelo se centra en un pivote; el pivote se orienta; la envoltura escala y se anima
      const wrap = new THREE.Group(), pivot = new THREE.Group(), k = 0.95 / Math.max(size.x, size.y, size.z);
      obj.position.sub(c); pivot.add(obj); wrap.add(pivot); wrap.scale.setScalar(k);
      // el lado más largo (el pico) queda horizontal, de perfil a la cámara
      if (size.y > size.x && size.y > size.z) pivot.rotation.z = Math.PI / 2; else if (size.z > size.x) pivot.rotation.y = Math.PI / 2;
      return wrap;
    });
    models.set(file, p); return p;
  };

  // ── arrastre con inercia
  let spin = 0.25, drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, t: performance.now() }; canvas.setPointerCapture(e.pointerId); spin = 0; });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const now = performance.now(), dx = e.clientX - drag.x; holder.rotation.y += dx * 0.01; spin = dx * 0.01 / Math.max(0.008, (now - drag.t) / 1000); drag = { x: e.clientX, t: now }; if (!loop.running) loop.still(); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.style.cursor = 'grab'; canvas.style.touchAction = 'pan-y';

  const fit = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(() => { fit(); loop.still(); }).observe(host);
  let last = 0;
  const frame = now => {
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    if (!drag) { holder.rotation.y += spin * dt; spin += (0.25 - spin) * Math.min(1, dt * 1.5); }
    renderer.render(scene, camera);
  };
  const loop = makeLoop(host, frame, 60);
  const tint = () => { rim.color.set(cssVar('--b1') || '#f6f1e6'); stone.color.set(night() ? 0x1b1d27 : 0xd9ccb0); gold.color.set(night() ? 0xd8b25e : 0xb08a38); loop.still(); };
  onTheme(tint); document.addEventListener('tarot:biome', () => setTimeout(tint));
  fit(); tint();

  let current = null, ask = 0;
  return {
    async show(skull) {
      const my = ++ask; host.classList.add('is-loading');
      const m = await load(skull.file); if (my !== ask) return;
      host.classList.remove('is-loading');
      const old = current; current = m;
      if (old === m) return;
      if (old && !reduceMotion.matches) await animate(old, { y: -0.6, scale: old.scale.x * 0.6, rotateY: 120, duration: 380, ease: 'in(2)' }).then(() => {});
      if (old) { holder.remove(old); old.position.y = 0; }
      const k = m.userData.k ||= m.scale.x; m.scale.setScalar(k); m.position.y = 0; m.rotation.y = 0;
      holder.add(m);
      if (!reduceMotion.matches) animate(m, { y: [-0.5, 0], scale: [k * 0.6, k], rotateY: [-120, 0], duration: 720, ease: 'outBack(1.4)', onUpdate: () => { if (!loop.running) loop.still(); } });
      loop.still();
    }
  };
}
