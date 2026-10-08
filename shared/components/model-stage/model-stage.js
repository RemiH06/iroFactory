// ══════════════════════════════════════════════════════
// Model Stage · objetos 3D que flotan en huecos de la página (Three.js
// r186, MIT). Un solo canvas fijo para toda la página dibuja cada modelo
// en el rectángulo de su hueco (`[data-model]`), así no se gasta un
// contexto WebGL por objeto (el navegador corta en ~16) y fuera de
// pantalla no se dibuja nada.
// Cada objeto gira despacio solo; se arrastra para girarlo libre en los
// tres ejes (como un trackball: el arrastre gira sobre el eje perpendicular
// a la dirección del dedo), con inercia al soltar, y vuelve a su giro.
// Con teclado: flechas giran 15°. Con reduced motion: quietos, pero se
// pueden girar.
// Objetos incluidos: `discoball` (espejos con los colores de la paleta) y
// `vinyl` (surcos y etiqueta), hechos en código; los demás, glTF.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cssVar, makeLoop, onTheme, reduceMotion } from '../../core/core.js';

// ── Objetos hechos en código
function discoball(colors) {
  const g = new THREE.Group(), R = 1, tiles = [];
  for (let i = 0; i < 26; i++) {
    const phi = (i + 0.5) / 26 * Math.PI, ring = Math.max(1, Math.round(Math.sin(phi) * 52));
    for (let j = 0; j < ring; j++) tiles.push([phi, (j + (i % 2) * 0.5) / ring * Math.PI * 2]);
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.105, 0.105, 0.02), new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.14 }), tiles.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1), s = new THREE.Vector3(1, 1, 1);
  tiles.forEach(([phi, th], k) => {
    p.setFromSphericalCoords(R, phi, th); q.setFromUnitVectors(z, p.clone().normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(z, (Math.random() - 0.5) * 0.12)); // los espejos nunca quedan parejos
    mesh.setMatrixAt(k, m.compose(p, q, s));
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.8 }));
  g.add(core, mesh);
  // espejos plateados con una parte teñida de la paleta del tema
  const paint = () => {
    const pal = colors().map(c => new THREE.Color(c)), silver = new THREE.Color(0xd8dce2), col = new THREE.Color();
    for (let k = 0; k < tiles.length; k++) mesh.setColorAt(k, col.copy(silver).lerp(pal[(k * 7) % pal.length], (k % 3 === 0) ? 0.75 : 0.18));
    mesh.instanceColor.needsUpdate = true;
  };
  paint(); g.userData.repaint = paint;
  return g;
}
function vinyl(colors) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  const draw = () => {
    const [a, b] = colors();
    x.fillStyle = '#121214'; x.fillRect(0, 0, 1024, 1024);
    for (let r = 500; r > 175; r -= 3) { x.strokeStyle = `rgba(250,248,244,${0.025 + 0.03 * Math.random()})`; x.lineWidth = 1; x.beginPath(); x.arc(512, 512, r, 0, Math.PI * 2); x.stroke(); }
    for (const r of [430, 360, 290]) { x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 6; x.beginPath(); x.arc(512, 512, r, 0, Math.PI * 2); x.stroke(); } // pausas entre canciones
    const sh = x.createConicGradient(0, 512, 512); sh.addColorStop(0, 'rgba(250,248,244,.08)'); sh.addColorStop(0.25, 'rgba(250,248,244,0)'); sh.addColorStop(0.5, 'rgba(250,248,244,.08)'); sh.addColorStop(0.75, 'rgba(250,248,244,0)'); sh.addColorStop(1, 'rgba(250,248,244,.08)');
    x.fillStyle = sh; x.beginPath(); x.arc(512, 512, 505, 0, Math.PI * 2); x.fill();
    const lg = x.createLinearGradient(342, 342, 682, 682); lg.addColorStop(0, a); lg.addColorStop(1, b);
    x.fillStyle = lg; x.beginPath(); x.arc(512, 512, 170, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(20,18,16,.85)'; x.font = '700 44px "Plus Jakarta Sans", sans-serif'; x.textAlign = 'center'; x.fillText('DISCO_', 512, 470);
    x.font = '500 24px "Fira Code", monospace'; x.fillText('lado A · 33⅓', 512, 600);
    x.fillStyle = '#121214'; x.beginPath(); x.arc(512, 512, 12, 0, Math.PI * 2); x.fill();
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.1 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.4 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.025, 128), [edge, face, face]);
  disc.rotation.x = Math.PI / 2 - 0.35; // de canto hacia el espectador
  draw(); const g = new THREE.Group(); g.add(disc); g.userData.repaint = draw;
  return g;
}

export function mount({ models = {}, colors = ['--accent'], base = '' } = {}) {
  const slots = [...document.querySelectorAll('[data-model]')].filter(el => models[el.dataset.model]);
  if (!slots.length) return null;
  const canvas = document.createElement('canvas'); canvas.className = 'model-stage'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
  document.body.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setScissorTest(true);
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const palette = () => colors.map(n => cssVar(n) || '#ff5a5a');
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  const items = slots.map((el, i) => {
    const def = models[el.dataset.model], scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    scene.environment = env; camera.position.set(0, 0, 4.4);
    scene.add(new THREE.HemisphereLight(0xfff6ec, 0x4a4060, 1.1));
    const key = new THREE.DirectionalLight(0xfffaf0, 2.2); key.position.set(2, 3, 4); scene.add(key);
    const pivot = new THREE.Group(); scene.add(pivot);
    const it = { el, scene, camera, pivot, obj: null, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, i * 1.3, 0)), w: new THREE.Vector3(), spin: def.spin ?? 0.35, drag: null };
    // ajusta cualquier objeto a una esfera de radio 1 centrada
    const fit = o => { const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 || 1; o.position.sub(c); const g = new THREE.Group(); g.add(o); g.scale.setScalar((def.size ?? 1) / r); return g; };
    if (def.build === 'discoball') { it.obj = discoball(palette); pivot.add(it.obj); }
    else if (def.build === 'vinyl') { it.obj = vinyl(() => palette().slice(0, 2)); pivot.add(it.obj); }
    else loader.loadAsync(base + def.url).then(g => {
      g.scene.traverse(o => { if (o.isMesh && !o.geometry.attributes.normal) o.geometry.computeVertexNormals(); });
      it.obj = fit(g.scene); pivot.add(it.obj); loop.still();
    }).catch(e => console.warn('model-stage:', def.url, e));
    // arrastre libre en tres ejes, con inercia
    el.addEventListener('pointerdown', e => { it.drag = { x: e.clientX, y: e.clientY, t: performance.now() }; it.w.set(0, 0, 0); el.setPointerCapture(e.pointerId); el.classList.add('is-grabbed'); });
    el.addEventListener('pointermove', e => {
      if (!it.drag) return;
      const dx = e.clientX - it.drag.x, dy = e.clientY - it.drag.y, now = performance.now(), dt = Math.max(8, now - it.drag.t) / 1000;
      const ang = Math.hypot(dx, dy) * 0.012; it.drag = { x: e.clientX, y: e.clientY, t: now };
      if (!ang) return;
      const axis = new THREE.Vector3(dy, dx, 0).normalize();
      it.q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      it.w.copy(axis).multiplyScalar(ang / dt * 0.6); loop.still();
    });
    const up = () => { if (!it.drag) return; it.drag = null; el.classList.remove('is-grabbed'); if (reduceMotion.matches) it.w.set(0, 0, 0); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', e => {
      const k = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key]; if (!k) return;
      e.preventDefault(); it.q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(k[0], k[1], 0), Math.PI / 12)); loop.still();
    });
    return it;
  });

  const UP = new THREE.Vector3(0, 1, 0), tmpQ = new THREE.Quaternion();
  let last = 0;
  const frame = now => {
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0; last = Math.max(last, now);
    const W = innerWidth, H = innerHeight;
    renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W || !r.width) continue;
      if (!it.drag && dt) {
        // inercia del arrastre que se apaga, y debajo el giro lento de siempre
        const wl = it.w.length();
        if (wl > 0.01) { it.q.premultiply(tmpQ.setFromAxisAngle(it.w.clone().normalize(), wl * dt)); it.w.multiplyScalar(Math.exp(-dt * 2.4)); }
        if (!reduceMotion.matches) it.q.premultiply(tmpQ.setFromAxisAngle(UP, it.spin * dt * Math.max(0, 1 - wl / 2)));
      }
      it.pivot.quaternion.copy(it.q);
      it.pivot.position.y = reduceMotion.matches ? 0 : Math.sin(now / 1000 * 0.9 + it.spin * 10) * 0.05; // flota
      // encuadre: el objeto (radio 1) cabe completo aunque el hueco sea angosto
      it.camera.aspect = r.width / r.height; it.camera.position.z = 4.6 / Math.min(1, it.camera.aspect); it.camera.updateProjectionMatrix();
      const x = r.left, y = H - r.bottom;
      renderer.setViewport(x, y, r.width, r.height); renderer.setScissor(x, y, r.width, r.height);
      renderer.render(it.scene, it.camera);
    }
  };
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); loop.still(); };
  const loop = makeLoop(document.documentElement, frame, 60);
  addEventListener('resize', resize); addEventListener('scroll', () => { if (!loop.running) loop.still(); }, { passive: true });
  onTheme(() => { items.forEach(it => it.obj?.userData.repaint?.()); loop.still(); });
  resize();
  return { loop };
}
