// ══════════════════════════════════════════════════════
// Cubes (React Bits) con cualquiera de los cinco sólidos, en Three.js y
// animado con el adaptador de anime.js para Three (cada instancia de un
// InstancedMesh se anima como si fuera un elemento: getInstances).
//  · Una rejilla de 8×8 sólidos que se inclinan hacia el cursor (ángulo
//    máximo 45°, radio 3 celdas, como el original).
//  · Un clic manda una onda de color que recorre la rejilla y, desde ese
//    punto, salen sólidos al hiperespacio (uno dentro de otro, como los
//    cubos flotantes de antes): vuelan hacia la cámara girando y estallan
//    en esquirlas.
//  · Cambiar de forma en la barra cambia los sólidos de la rejilla (con una
//    ola de reemplazo) y los que salen disparados.
// Sin WebGL, la tarjeta queda con su texto.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { animate, getInstances, set } from 'animejs';
import { cssVar, faceColors, makeLoop, onTheme, reduceMotion } from './kit.js';
import { geometry } from './solid-three.js';
import { shape, PLURAL } from './solids.js';

// orientación de reposo de cada sólido (para que se vea en 3D de frente)
const REST = { cubo: [0, 0, 0], tetraedro: [-35, 45, 0], octaedro: [0, 45, 0], dodecaedro: [20, 30, 0], icosaedro: [20, 20, 0] };
const restQ = name => new THREE.Quaternion().setFromEuler(new THREE.Euler(...REST[name].map(THREE.MathUtils.degToRad)));
const solidGeo = (name, r) => { const g = geometry(name, r).applyQuaternion(restQ(name)); return g.index ? g.toNonIndexed() : g; };

export function mount({ host = document.getElementById('lx-cubes'), grid = 8, maxAngle = 45, radius = 3 } = {}) {
  if (!host) return;
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return; }
  const title = host.closest('.hud')?.querySelector('h3');
  canvas.className = 'lx-cubes-gl'; canvas.tabIndex = 0; canvas.setAttribute('role', 'button');
  host.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.set(0, 0, grid / 2 / Math.tan(THREE.MathUtils.degToRad(11)) + 1.2);
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0x403848, 1.9));
  const key = new THREE.DirectionalLight(0xfffaf0, 1.8); key.position.set(-3, 5, 8); scene.add(key);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05, flatShading: true });
  const N = grid * grid, at = i => [Math.floor(i / grid), i % grid]; // [fila, columna]
  let mesh = null, inst = [], base = new THREE.Color();
  const build = name => {
    const old = mesh;
    mesh = new THREE.InstancedMesh(solidGeo(name, name === 'cubo' ? 0.62 : 0.56), mat, N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { const [r, c] = at(i); m.makeTranslation(c - (grid - 1) / 2, (grid - 1) / 2 - r, 0); mesh.setMatrixAt(i, m); mesh.setColorAt(i, base); }
    scene.add(mesh); inst = getInstances(mesh);
    if (old) { scene.remove(old); old.geometry.dispose(); }
    if (title) title.textContent = PLURAL[name];
    canvas.setAttribute('aria-label', `${PLURAL[name]}: clic para lanzar una onda y ${PLURAL[name].toLowerCase()} al hiperespacio`);
  };
  const paint = () => { base.set(cssVar('--bg3')); set(inst, { color: '#' + base.getHexString() }); };

  // inclinación hacia el cursor: cada instancia se anima a su ángulo
  let raf = 0, pr = -9, pc = -9;
  const tilt = () => {
    raf = 0;
    const ang = inst.map((_, i) => {
      const [r, c] = at(i), d = Math.hypot(r - pr, c - pc);
      if (d > radius) return [0, 0];
      const k = 1 - d / radius, ax = (pr - r) / (d || 1), ay = (c - pc) / (d || 1);
      return [-ax * maxAngle * k, ay * maxAngle * k];
    });
    animate(inst, { rotateX: (_, i) => ang[i][0], rotateY: (_, i) => ang[i][1], duration: 350, ease: 'out(3)' });
  };
  const cell = e => { const b = canvas.getBoundingClientRect(); return [(e.clientY - b.top) / b.height * grid - 0.5, (e.clientX - b.left) / b.width * grid - 0.5]; };
  canvas.addEventListener('pointermove', e => { if (reduceMotion.matches) return; [pr, pc] = cell(e); if (!raf) raf = requestAnimationFrame(tilt); });
  canvas.addEventListener('pointerleave', () => { pr = pc = -9; if (!raf) raf = requestAnimationFrame(tilt); });

  // clic: onda de color por la rejilla y sólidos al hiperespacio
  canvas.addEventListener('click', e => {
    if (reduceMotion.matches) return;
    const [r0, c0] = cell(e), pal = faceColors(), col = pal[(Math.random() * 6) | 0], b = '#' + base.getHexString();
    const dist = inst.map((_, i) => { const [r, c] = at(i); return Math.hypot(r - r0, c - c0); });
    animate(inst, { color: [{ to: col, duration: 240 }, { to: b, duration: 420 }], scale: [{ to: 1.22, duration: 240 }, { to: 1, duration: 420 }], delay: (_, i) => dist[i] * 70, ease: 'inOut(2)' });
    hyper.burst(e.clientX, e.clientY);
  });
  canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const b = canvas.getBoundingClientRect(); canvas.dispatchEvent(new MouseEvent('click', { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 })); } });

  const resize = () => { const s = host.clientWidth || 1; renderer.setSize(s, s, false); };
  resize(); new ResizeObserver(resize).observe(host);
  const face = host.closest('.lx-face');
  const loop = makeLoop(host, () => { if (face && !face.matches('.is-current, .is-arriving')) return; renderer.render(scene, camera); }, 60);

  build(shape()); paint();
  onTheme(() => { paint(); loop.still(); });
  // otra forma: la rejilla se reemplaza en ola desde la esquina
  document.addEventListener('ludus:shape', ({ detail }) => {
    if (reduceMotion.matches) { build(detail); paint(); loop.still(); return; }
    animate(inst, { scale: 0.001, duration: 220, delay: (_, i) => (at(i)[0] + at(i)[1]) * 25, ease: 'in(2)', onComplete: () => {
      build(detail); paint(); set(inst, { scale: 0.001 });
      animate(inst, { scale: [0.001, 1], duration: 520, delay: (_, i) => (at(i)[0] + at(i)[1]) * 25, ease: 'outBack(1.7)' });
    } });
  });
  const hyper = hyperspace();
}

// ── El hiperespacio: un canvas fijo sobre toda la página que solo se crea
// (y solo dibuja) mientras hay algo volando.
function hyperspace() {
  let renderer = null, scene, camera, raf = 0, live = 0;
  const geos = {};
  const init = () => {
    const canvas = document.createElement('canvas'); canvas.className = 'lx-hyper'; canvas.setAttribute('aria-hidden', 'true');
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { renderer = false; return; }
    document.body.appendChild(canvas);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
    scene.add(new THREE.HemisphereLight(0xfffaf2, 0x403848, 2)); const k = new THREE.DirectionalLight(0xfffaf0, 1.6); k.position.set(-1, 2, 3); scene.add(k);
    const size = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.position.z = innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(25)); camera.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
  };
  const tick = () => { raf = live > 0 ? requestAnimationFrame(tick) : 0; renderer.render(scene, camera); };
  const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const geo = (name, r) => geos[name + r] ||= solidGeo(name, r);
  const toWorld = (x, y) => [x - innerWidth / 2, innerHeight / 2 - y];
  const shards = (name, x, y, z, col) => {
    const m = new THREE.InstancedMesh(geo('tetraedro', 3.2), new THREE.MeshStandardMaterial({ color: col, flatShading: true, transparent: true }), 12);
    const mx = new THREE.Matrix4(); for (let i = 0; i < 12; i++) { m.setMatrixAt(i, mx.makeTranslation(x, y, z)); }
    scene.add(m); live++;
    animate(getInstances(m), { x: () => x + (Math.random() - 0.5) * 140, y: () => y + (Math.random() - 0.5) * 140, z: () => z + (Math.random() - 0.5) * 80, rotateX: () => Math.random() * 360, rotateY: () => Math.random() * 360, scale: [1, 0.1], duration: 520, ease: 'out(2)' });
    animate(m, { opacity: [1, 0], duration: 520, ease: 'in(2)', onComplete: () => { scene.remove(m); m.material.dispose(); m.dispose(); live--; } });
  };
  return {
    burst(cx, cy) {
      if (renderer === null) init(); if (!renderer) return;
      const name = shape(), pal = faceColors(), [x0, y0] = toWorld(cx, cy);
      for (let i = 0; i < 9; i++) {
        const col = pal[(Math.random() * 6) | 0], inner = pal[(Math.random() * 6) | 0];
        const g = new THREE.Group();
        const shell = new THREE.Mesh(geo(name, 15), new THREE.MeshStandardMaterial({ color: col, flatShading: true, transparent: true, opacity: 0.55, depthWrite: false }));
        const core = new THREE.Mesh(geo(name, 7), new THREE.MeshStandardMaterial({ color: inner, flatShading: true }));
        g.add(core, shell); g.position.set(x0, y0, 0); scene.add(g); live++;
        const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * 260;
        animate(g, {
          x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d, z: 120 + Math.random() * 260, scale: [0.3, 1.3],
          rotateX: (Math.random() - 0.5) * 720, rotateY: (Math.random() - 0.5) * 720, duration: 900 + Math.random() * 500, ease: 'out(3)',
          onComplete: () => { shards(name, g.position.x, g.position.y, g.position.z, col); scene.remove(g); shell.material.dispose(); core.material.dispose(); live--; }
        });
      }
      run();
    }
  };
}
