// ══════════════════════════════════════════════════════
// Rubik Cube · un cubo 3×3 que funciona como navegación (Three.js r186, MIT).
// Cada cara es una sección: su centro lleva el nombre y, como en un cubo
// real, los centros nunca se mueven (solo se giran capas exteriores), así
// que tocar cualquier pegatina de una cara lleva a su sección aunque el
// cubo esté revuelto.
//  · Se arrastra para girarlo entero, con inercia.
//  · Capas con notación de verdad: R L U D F B (y su inversa, R′…).
//    Con el cubo enfocado, las letras giran capas (Mayúsculas = inversa).
//  · scramble(): 20 giros al azar · solve(): deshace todos los giros, en
//    orden inverso (resolverlo de verdad, paso por paso).
//  · show(i): gira el cubo entero para dar el frente a la cara i.
//   mount({ host, faces: [{ label, token }] ×6 en orden R L U D F B,
//           onSelect(i), onChange(state) })
// Sin WebGL, devuelve null y la navegación queda en los demás controles.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cssVar, makeLoop, onTheme, reduceMotion } from '../../core/core.js';

// Cara → normal (en el espacio del cubo). Orden R L U D F B.
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(v => new THREE.Vector3(...v));
// Giro de capa: eje, capa y sentido horario visto desde esa cara.
const MOVES = { R: ['x', 1, -1], L: ['x', -1, 1], U: ['y', 1, -1], D: ['y', -1, 1], F: ['z', 1, -1], B: ['z', -1, 1] };
const LETTERS = 'RLUDFB';
const lum = hex => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

export function mount({ host, faces, onSelect = () => {}, onChange = () => {}, font = 'Silkscreen' }) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
  host.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping; // los colores de la paleta, sin deslavar
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 11.5);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0x5a5262, 1.6));
  const key = new THREE.DirectionalLight(0xfffaf0, 1.6); key.position.set(3, 5, 6); scene.add(key);

  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.MeshStandardMaterial({ color: 0x17141c, roughness: 0.35, metalness: 0.1 });
  const stickerMats = faces.map(() => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, envMapIntensity: 0.25 }));
  const centerMats = faces.map(() => new THREE.MeshStandardMaterial({ roughness: 0.45, envMapIntensity: 0.25 }));
  const centerTex = faces.map(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; });
  centerMats.forEach((m, i) => { m.map = centerTex[i]; });
  const cubieGeo = new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.1);
  const sticker = (() => { const s = new THREE.Shape(), r = 0.1, h = 0.4; s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r); s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h); return new THREE.ShapeGeometry(s, 6); })();
  // UV de 0 a 1 para que la etiqueta del centro ocupe la pegatina
  { const p = sticker.attributes.position, uv = sticker.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.8 + 0.5, p.getY(i) / 0.8 + 0.5); uv.needsUpdate = true; }

  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(new THREE.Mesh(cubieGeo, body));
    NORMALS.forEach((n, f) => {
      if (n.x && n.x !== x || n.y && n.y !== y || n.z && n.z !== z) return;
      const isCenter = Math.abs(x) + Math.abs(y) + Math.abs(z) === 1;
      const m = new THREE.Mesh(sticker, isCenter ? centerMats[f] : stickerMats[f]);
      m.position.copy(n).multiplyScalar(0.485); m.lookAt(m.position.clone().add(n));
      if (f === 2) m.rotation.z = 0; // etiquetas derechas vistas de frente
      m.userData.face = f; g.add(m);
    });
    root.add(g); cubies.push(g);
  }

  const paint = () => {
    faces.forEach((f, i) => {
      const hex = cssVar(f.token) || '#888888';
      stickerMats[i].color.set(hex); centerMats[i].color.set(0xfafaf8);
      const c = centerTex[i].image, x = c.getContext('2d');
      x.fillStyle = hex; x.fillRect(0, 0, 256, 256);
      x.fillStyle = lum(hex) > 0.35 ? '#141118' : '#FAF8F4';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const words = f.label.toUpperCase().split(' ');
      let size = 46; x.font = `${size}px "${font}", monospace`;
      while (words.some(w => x.measureText(w).width > 220) && size > 20) { size -= 2; x.font = `${size}px "${font}", monospace`; }
      words.forEach((w, k) => x.fillText(w, 128, 128 + (k - (words.length - 1) / 2) * size * 1.1));
      centerTex[i].needsUpdate = true;
    });
  };

  // ── Giros de capa
  const pivot = new THREE.Group(); root.add(pivot);
  const queue = [], history = [];
  let turning = null, mode = 'idle';
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const turn = (move, record = true, dur = 170) => queue.push({ move, record, dur });
  const startTurn = () => {
    const t = queue.shift(); if (!t) return;
    const [letter, prime] = [t.move[0], t.move.endsWith("'")];
    const [axis, layer, dir] = MOVES[letter];
    pivot.rotation.set(0, 0, 0); pivot.updateMatrixWorld();
    cubies.forEach(c => { if (Math.round(c.position[axis]) === layer) pivot.attach(c); });
    turning = { axis, angle: dir * (prime ? -1 : 1) * Math.PI / 2, k: 0, dur: reduceMotion.matches ? 1 : t.dur };
    if (t.record) history.push(t.move);
  };
  const endTurn = () => {
    pivot.rotation.set(0, 0, 0); pivot.setRotationFromAxisAngle(AX[turning.axis], turning.angle); pivot.updateMatrixWorld();
    [...pivot.children].forEach(c => {
      root.attach(c);
      c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      const e = new THREE.Euler().setFromQuaternion(c.quaternion); e.set(...['x', 'y', 'z'].map(a => Math.round(e[a] / (Math.PI / 2)) * (Math.PI / 2)));
      c.quaternion.setFromEuler(e);
    });
    pivot.rotation.set(0, 0, 0); turning = null;
    if (!queue.length && mode !== 'idle') { mode = 'idle'; onChange({ mode, moves: history.length }); }
  };
  // sin animación (reduced motion o el bucle detenido): aplicar todo de una vez
  const settle = () => {
    if (loop && loop.running) return;
    while (queue.length) { startTurn(); endTurn(); }
    if (target) root.quaternion.copy(target);
    if (mode !== 'idle') { mode = 'idle'; onChange({ mode, moves: history.length }); }
    loop && loop.still();
  };
  const inv = m => (m.endsWith("'") ? m[0] : m + "'");
  const api = {
    scramble() {
      if (mode !== 'idle') return; mode = 'scrambling'; onChange({ mode });
      let prev = '';
      for (let i = 0; i < 20; i++) { let l; do l = LETTERS[(Math.random() * 6) | 0]; while (l === prev); prev = l; turn(l + (Math.random() < 0.5 ? "'" : ''), true, 120); }
      settle();
    },
    solve() {
      if (mode !== 'idle' || !history.length) return; mode = 'solving'; onChange({ mode });
      while (history.length) turn(inv(history.pop()), false, 110);
      settle();
    },
    turn(m) { if (mode === 'idle') { turn(m); onChange({ mode, moves: history.length + 1 }); settle(); } },
    get moves() { return history.length; },
    show(i) { target = faceQuat(i); settle(); }
  };

  // ── Orientación del cubo entero: arrastre con inercia y cara al frente
  const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.62, 0));
  const faceQuat = i => new THREE.Quaternion().multiplyQuaternions(TILT, new THREE.Quaternion().setFromUnitVectors(NORMALS[i], new THREE.Vector3(0, 0, 1)));
  let target = faceQuat(4), drag = null;
  const w = new THREE.Vector3();
  root.quaternion.copy(target);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = e => {
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(root.children, true).find(h => h.object.userData.face !== undefined);
    if (!hit) return -1;
    // la cara por la normal en el espacio del cubo (los centros no se mueven)
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).applyQuaternion(root.quaternion.clone().invert());
    return NORMALS.findIndex(v => v.dot(n) > 0.9);
  };
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); w.set(0, 0, 0); target = null; });
  canvas.addEventListener('pointermove', e => {
    if (!drag) { const f = pick(e); canvas.style.cursor = f >= 0 ? 'pointer' : 'grab'; canvas.title = f >= 0 ? faces[f].label : ''; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(8, now - drag.t) / 1000;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    const ang = Math.hypot(dx, dy) * 0.012; if (!ang) return;
    const axis = new THREE.Vector3(dy, dx, 0).normalize();
    root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
    w.copy(axis).multiplyScalar(ang / dt * 0.5); if (!loop.running) loop.still();
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    drag = null;
    if (moved < 6) { const f = pick(e); if (f >= 0) { onSelect(f); target = faceQuat(f); w.set(0, 0, 0); settle(); } }
  });
  host.addEventListener('keydown', e => {
    const l = e.key.toUpperCase(); if (!LETTERS.includes(l) || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); api.turn(l + (e.shiftKey ? "'" : ''));
  });

  const resize = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.width, false); camera.aspect = 1; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(resize).observe(host);

  let last = 0, loop = null;
  const frame = now => {
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    if (!turning && queue.length) startTurn();
    if (turning) { turning.k = Math.min(1, turning.k + dt * 1000 / turning.dur); const e = 1 - (1 - turning.k) ** 3; pivot.setRotationFromAxisAngle(AX[turning.axis], turning.angle * e); if (turning.k >= 1) endTurn(); }
    if (!drag) {
      if (w.lengthSq() > 1e-4) { root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(w.clone().normalize(), w.length() * dt)); w.multiplyScalar(Math.exp(-dt * 3)); }
      else if (target) root.quaternion.slerp(target, Math.min(1, dt * 6));
    }
    renderer.render(scene, camera);
  };
  loop = makeLoop(host, frame, 60);
  document.fonts?.load(`32px "${font}"`).then(paint, paint);
  paint(); onTheme(() => { paint(); loop.still(); });
  loop.still();
  return api;
}
