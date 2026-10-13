// ══════════════════════════════════════════════════════
// Placa en relieve · Three.js r186. Lo que dibuja el pintor de un tema
// (paint(opts) → { color, mask }, con el pincel de pen.js) se vuelve una
// placa que cubre la vista: lo alto de la máscara se levanta (normales de
// relief.js), lo metálico brilla y lo demás queda mate o laqueado. El
// dibujo y su relieve se hacen en un Worker y se guardan por opciones:
// cambiar de piel no congela la página y volver a una ya vista es
// inmediato. Al cambiar, la placa nueva entra con un fundido.
// La luz es del tema: `setup` recibe la escena y devuelve qué hacer en
// cada cuadro (tarot: luz que sigue al cursor; apolo: el sol del día).
// Canvas fijo detrás de toda la página. Sin WebGL, la placa plana.
//   mount({ painter, palette: () => opts, setup, className, reliefOpts,
//     material, fps }) → { set(), preload(opts), still() }
//   painter: URL absoluta del módulo pintor (new URL(…, import.meta.url)).
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { animate } from 'animejs';
import { makeLoop, reduceMotion } from '../../core/core.js';

const W = 2048, H = 1152;

// ── Taller de la placa: Worker si se puede; si no, en el hilo principal
let worker = null, seq = 0;
const waiting = new Map(), cache = new Map();
function build(painter, opts, reliefOpts) {
  const key = JSON.stringify([painter, opts, reliefOpts]);
  if (cache.has(key)) return cache.get(key);
  let job;
  try { worker ??= new Worker(new URL('./plate-worker.js', import.meta.url), { type: 'module' }); } catch { worker = false; }
  if (worker && typeof OffscreenCanvas !== 'undefined') {
    job = new Promise(res => { const id = ++seq; waiting.set(id, res); worker.postMessage({ id, painter, opts: { w: W, h: H, ...opts }, reliefOpts }); });
    worker.onmessage = ({ data }) => { waiting.get(data.id)?.(data.bitmaps); waiting.delete(data.id); };
  } else {
    job = Promise.all([import(painter), import('./relief.js')]).then(([d, r]) => { const { color, mask } = d.paint({ w: W, h: H, ...opts }); const { normal, mr } = r.relief(mask, reliefOpts); return [color, normal, mr]; });
  }
  cache.set(key, job);
  return job;
}

export function mount({ host = document.body, painter, palette, setup, className = 'relief-plate', reliefOpts, material = {}, fps = 60 }) {
  const canvas = document.createElement('canvas'); canvas.className = className; canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { renderer = null; }
  if (!renderer) { // sin WebGL: la placa plana como imagen
    const show = () => build(painter, palette(), reliefOpts).then(([c]) => { const x = canvas.getContext('2d'); canvas.width = c.width; canvas.height = c.height; x.drawImage(c, 0, 0); });
    show(); return { set: show, preload() {}, still() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const geo = new THREE.PlaneGeometry(16, 9);
  let mesh = null, ask = 0;
  const texOf = (img, srgb) => { const t = img instanceof ImageBitmap ? new THREE.Texture(img) : new THREE.CanvasTexture(img); if (img instanceof ImageBitmap) t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const dispose = o => { const m = o.material; m.map.dispose(); m.normalMap.dispose(); m.roughnessMap.dispose(); m.dispose(); };

  // ── tamaño: la placa cubre la vista (la cámara no se mueve)
  const fit = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const dist = 9 / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.985;
    camera.position.z = dist / Math.max(1, camera.aspect / (16 / 9)); camera.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', () => { fit(); loop.still(); });

  const tick = setup({ THREE, scene, camera, renderer });
  const t0 = performance.now(); let last = 0;
  const frame = now => {
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    tick?.(t, dt);
    renderer.render(scene, camera);
  };
  const loop = makeLoop(document.body, frame, fps);

  return {
    async set() {
      const my = ++ask, [c, nm, mr] = await build(painter, palette(), reliefOpts);
      if (my !== ask) return; // llegó otro pedido mientras se dibujaba
      const m = texOf(mr);
      const opaque = !material.transparent;
      const fresh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ normalScale: new THREE.Vector2(1.2, 1.2), clearcoat: 0.2, clearcoatRoughness: 0.4, ...material, map: texOf(c, true), normalMap: texOf(nm), roughnessMap: m, metalnessMap: m, transparent: true }));
      scene.add(fresh);
      const old = mesh; mesh = fresh;
      const done = () => { if (old) { scene.remove(old); dispose(old); } fresh.material.transparent = !opaque; fresh.position.z = 0; loop.still(); };
      if (!old || reduceMotion.matches) return done();
      fresh.position.z = 0.002; fresh.material.opacity = 0;
      animate(fresh.material, { opacity: 1, duration: 900, ease: 'inOut(2)', onUpdate: () => { if (!loop.running) loop.still(); }, onComplete: done });
    },
    preload(opts) { build(painter, opts, reliefOpts); }, // calentar la caché (otra piel, el otro modo)
    still: () => loop.still()
  };
}
