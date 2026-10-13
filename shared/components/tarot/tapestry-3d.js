// ══════════════════════════════════════════════════════
// Tapiz en relieve · Three.js r186. El tapiz de deco-pattern.js se vuelve
// una placa: el oro levantado y pulido (metal), los mosaicos hundidos y
// laqueados (clearcoat). El dibujo y su relieve (relief.js) se hacen en un
// Worker y se guardan por bioma y modo: cambiar de vitrina no congela la
// página y volver a una ya vista es inmediato.
// El brillo que corre por las líneas doradas de mosaico en mosaico sale de:
//  · el entorno (RoomEnvironment) girando despacio, que desliza los
//    reflejos sobre los biseles del oro,
//  · una luz que sigue al cursor muy cerca de la placa (en táctil, al dedo
//    o al giroscopio) y otra que barre sola,
//  · la cámara que se inclina un poco con el cursor (profundidad).
// Al cambiar de bioma o de modo, el tapiz nuevo entra con un fundido.
// Canvas fijo detrás de toda la página. Sin WebGL, el tapiz plano.
//   mount({ host, palette: () => opts de paint }) → { set(), preload(opts) }
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animate } from 'animejs';
import { makeLoop, reduceMotion } from '../../core/core.js';

const W = 2048, H = 1152;

// ── Taller del tapiz: Worker si se puede; si no, en el hilo principal
let worker = null, seq = 0;
const waiting = new Map(), cache = new Map();
const keyOf = o => JSON.stringify([o.colors, o.base, o.gold, o.motif, o.memento]);
function build(opts) {
  const key = keyOf(opts);
  if (cache.has(key)) return cache.get(key);
  let job;
  try { worker ||= new Worker(new URL('./tapestry-worker.js', import.meta.url), { type: 'module' }); } catch { worker = false; }
  if (worker && typeof OffscreenCanvas !== 'undefined') {
    job = new Promise(res => { const id = ++seq; waiting.set(id, res); worker.postMessage({ id, opts: { w: W, h: H, ...opts } }); });
    worker.onmessage = ({ data }) => { waiting.get(data.id)?.(data.bitmaps); waiting.delete(data.id); };
  } else {
    job = Promise.all([import('./deco-pattern.js'), import('./relief.js')]).then(([d, r]) => { const { color, mask } = d.paint({ w: W, h: H, ...opts }); const { normal, mr } = r.relief(mask); return [color, normal, mr]; });
  }
  cache.set(key, job);
  return job;
}

export function mount({ host = document.body, palette }) {
  const canvas = document.createElement('canvas'); canvas.className = 'tr-tapestry'; canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { renderer = null; }
  if (!renderer) { // sin WebGL: el tapiz plano como imagen
    const show = () => build(palette()).then(([c]) => { const x = canvas.getContext('2d'); canvas.width = c.width; canvas.height = c.height; x.drawImage(c, 0, 0); });
    show(); return { set: show, preload() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.3;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x202030, 0.35));
  const cursor = new THREE.PointLight(0xffe6b0, 9, 7, 1.6), sweep = new THREE.PointLight(0xfff0d0, 6, 9, 1.6);
  scene.add(cursor, sweep);
  const geo = new THREE.PlaneGeometry(16, 9);
  let mesh = null, ask = 0;
  const texOf = (img, srgb) => { const t = img instanceof ImageBitmap ? new THREE.Texture(img) : new THREE.CanvasTexture(img); if (img instanceof ImageBitmap) t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const dispose = o => { const m = o.material; m.map.dispose(); m.normalMap.dispose(); m.roughnessMap.dispose(); m.dispose(); };

  // ── tamaño: la placa cubre la vista, con margen para la inclinación
  const fit = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const dist = 9 / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.985;
    camera.position.z = dist / Math.max(1, camera.aspect / (16 / 9)); camera.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', () => { fit(); loop.still(); });

  // ── luces y cámara siguen al cursor (suavizado); en táctil, el dedo o el giroscopio
  const aim = { x: 0.2, y: 0.1 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => { aim.x = e.clientX / innerWidth * 2 - 1; aim.y = -(e.clientY / innerHeight * 2 - 1); });
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; aim.x = Math.max(-1, Math.min(1, e.gamma / 30)); aim.y = Math.max(-1, Math.min(1, (45 - e.beta) / 30)); });
  const t0 = performance.now(); let last = 0;
  const frame = now => {
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    const k = 1 - Math.exp(-dt * 3); cur.x += (aim.x - cur.x) * k; cur.y += (aim.y - cur.y) * k;
    cursor.position.set(cur.x * 8, cur.y * 4.5, 1.1);
    sweep.position.set(Math.sin(t * 0.21) * 9, Math.cos(t * 0.13) * 4, 1.6);
    scene.environmentRotation.set(Math.sin(t * 0.07) * 0.5, t * 0.05, 0);
    camera.position.x = cur.x * 0.35; camera.position.y = cur.y * 0.2; camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  const loop = makeLoop(document.body, frame, 60);

  return {
    async set() {
      const my = ++ask, [c, nm, mr] = await build(palette());
      if (my !== ask) return; // llegó otro pedido mientras se dibujaba
      const m = texOf(mr);
      const fresh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: texOf(c, true), normalMap: texOf(nm), roughnessMap: m, metalnessMap: m, normalScale: new THREE.Vector2(1.2, 1.2), clearcoat: 0.2, clearcoatRoughness: 0.4, transparent: true }));
      scene.add(fresh);
      const old = mesh; mesh = fresh;
      const done = () => { if (old) { scene.remove(old); dispose(old); } fresh.material.transparent = false; fresh.position.z = 0; loop.still(); };
      if (!old || reduceMotion.matches) return done();
      fresh.position.z = 0.002; fresh.material.opacity = 0;
      animate(fresh.material, { opacity: 1, duration: 900, ease: 'inOut(2)', onUpdate: () => { if (!loop.running) loop.still(); }, onComplete: done });
    },
    preload(opts) { build(opts); } // calentar la caché (otro bioma, el otro modo)
  };
}
