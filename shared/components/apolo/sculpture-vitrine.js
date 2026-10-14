// ══════════════════════════════════════════════════════
// La vitrina de la gliptoteca · Three.js r186. Una escultura (GLB con
// meshopt) sobre un plinto de mármol con filete de oro, bajo una luz de
// sala cenital y un contraluz frío. Gira despacio sola; se arrastra para
// girarla (con inercia). Al cambiar de pieza, la vieja se hunde y la nueva
// sube al plinto. Cada modelo se carga una vez y se guarda; cada escaneo
// trae su escala: se centra con su caja y se lleva a un alto común (o a
// un ancho, si es un grupo apaisado como el Laocoonte). `rot` corrige la
// orientación de un escaneo que venga acostado.
// Como en tarot (skull-vitrine.js), pero sin adaptador de anime.js: la
// entrada se interpola en el propio cuadro.
//   mount({ host, base }) → { show(piece) }
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeLoop, onTheme, reduceMotion, theme } from '../../core/core.js';

export function mount({ host, base = '../assets/models/apolo/' }) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.05, 4.6); camera.lookAt(0, 0.82, 0);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.3;
  const hemi = new THREE.HemisphereLight(0xfff4e4, 0x2a2420, 0.5); scene.add(hemi);
  const spot = new THREE.SpotLight(0xfff0d8, 60, 10, 0.5, 0.55, 1.6); spot.position.set(0.9, 4.2, 2); spot.target.position.set(0, 0.8, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004;
  const rim = new THREE.PointLight(0xbcd2ff, 8, 6, 1.6); rim.position.set(-1.6, 2, -1.4);
  scene.add(spot, spot.target, rim);

  // ── plinto: dos bloques de mármol con molduras y un filete de oro
  const marble = new THREE.MeshPhysicalMaterial({ color: 0xece4d4, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 1, roughness: 0.3 });
  [[1.5, 0.12, 1.0, -0.36, marble], [1.24, 0.24, 0.84, -0.18, marble], [1.28, 0.03, 0.88, -0.045, gold], [1.18, 0.06, 0.8, 0, marble]].forEach(([w, h, d, y, m]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.y = y; b.receiveShadow = true; b.castShadow = m === marble; scene.add(b);
  });
  const holder = new THREE.Group(); holder.position.y = 0.03; scene.add(holder);

  // ── modelos
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const models = new Map();
  const load = piece => {
    if (models.has(piece.file)) return models.get(piece.file);
    const p = loader.loadAsync(base + piece.file + '.glb').then(g => {
      // Los vaciados del SMK llegan sin textura (blanco puro, plano): tono de yeso mate.
      const obj = g.scene; obj.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const m = o.material; if (m) { m.envMapIntensity = 0.5; if (!m.map) { m.color.setHex(0xe4dccd); m.roughness = 0.85; m.metalness = 0; } } } });
      const pivot = new THREE.Group(), wrap = new THREE.Group();
      if (piece.rot) obj.rotation.set(...piece.rot.map(THREE.MathUtils.degToRad));
      pivot.add(obj); obj.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(pivot), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
      obj.position.sub(new THREE.Vector3(c.x, bb.min.y, c.z)); // apoyada en el plinto, centrada en el eje
      const k = Math.min(1.7 / size.y, 1.5 / Math.max(size.x, size.z));
      wrap.add(pivot); wrap.scale.setScalar(k); wrap.userData.k = k;
      return wrap;
    });
    models.set(piece.file, p); return p;
  };

  // ── arrastre con inercia
  let spin = 0.2, drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, t: performance.now() }; canvas.setPointerCapture(e.pointerId); spin = 0; });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const now = performance.now(), dx = e.clientX - drag.x; holder.rotation.y += dx * 0.01; spin = dx * 0.01 / Math.max(0.008, (now - drag.t) / 1000); drag = { x: e.clientX, t: now }; if (!loop.running) loop.still(); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.style.cursor = 'grab'; canvas.style.touchAction = 'pan-y';

  const fit = () => { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(() => { fit(); loop.still(); }).observe(host);

  // entrada y salida: 0 → 1 en ~0.7 s, con un leve rebote
  let current = null, leaving = null, enter = 1, exit = 1, last = 0;
  const outBack = t => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
  const frame = now => {
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    if (!drag) { holder.rotation.y += spin * dt; spin += (0.2 - spin) * Math.min(1, dt * 1.5); }
    if (leaving) { exit = Math.min(1, exit + dt / 0.35); leaving.position.y = -0.9 * exit * exit; leaving.scale.setScalar(leaving.userData.k * (1 - 0.4 * exit)); if (exit >= 1) { holder.remove(leaving); leaving.position.y = 0; leaving = null; } }
    if (current && enter < 1) { enter = Math.min(1, enter + dt / 0.7); const e = outBack(enter); current.position.y = -0.6 * (1 - e); current.scale.setScalar(current.userData.k * (0.6 + 0.4 * e)); }
    renderer.render(scene, camera);
  };
  const loop = makeLoop(host, frame, 60);
  const tint = () => { const night = theme.alt; rim.color.set(night ? 0xffa060 : 0xbcd2ff); hemi.intensity = night ? 0.35 : 0.5; loop.still(); };
  onTheme(tint); fit(); tint();

  let ask = 0;
  return {
    async show(piece) {
      const my = ++ask; host.classList.add('is-loading');
      const m = await load(piece).catch(() => null); if (my !== ask) return;
      host.classList.remove('is-loading');
      if (!m || m === current) return;
      if (current) { if (leaving) holder.remove(leaving); leaving = current; exit = reduceMotion.matches ? 1 : 0; }
      current = m; m.rotation.y = 0; holder.add(m);
      enter = reduceMotion.matches ? 1 : 0; m.position.y = 0; m.scale.setScalar(m.userData.k);
      if (!loop.running) { loop.still(); if (!reduceMotion.matches) loop.start(); }
    }
  };
}
