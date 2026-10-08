// ══════════════════════════════════════════════════════
// Navegación con un sólido platónico (Three.js r186 + el adaptador de
// anime.js para Three): lo mismo que el cubo de Rubik pero rígido. Cada
// uno de los seis lugares del sólido (aristas del tetraedro, vértices del
// octaedro, pares de caras del dodecaedro, pares de vértices del
// icosaedro) es una vista; su superficie se reparte en pegatinas por
// cercanía, así que tocar cualquier punto lleva a la vista más cercana.
// Se arrastra con inercia y, al cambiar de vista, da el frente a ese lugar.
// Al cambiar de sólido, el viejo se encoge girando y el nuevo crece con
// rebote (anime.js anima el Object3D directamente).
//   mount({ host, views: [{ label, token }] ×6, onSelect(i) })
//     → { setShape(name), show(i), setActive(on) } · null sin WebGL
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animate } from 'animejs';
import { cssVar, makeLoop, onTheme, reduceMotion } from '../../core/core.js';
import { geometry, layout, stickers } from './solid-three.js';

const lum = hex => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

export function mount({ host, views, onSelect = () => {}, font = 'Silkscreen' }) {
  const canvas = document.createElement('canvas'); canvas.className = 'lx-solid'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
  host.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0x5a5262, 1.6));
  const key = new THREE.DirectionalLight(0xfffaf0, 1.6); key.position.set(3, 5, 6); scene.add(key);
  const root = new THREE.Group(); scene.add(root);

  const body = new THREE.MeshStandardMaterial({ color: 0x17141c, roughness: 0.35, metalness: 0.1, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const mats = views.map(() => new THREE.MeshStandardMaterial({ roughness: 0.45, envMapIntensity: 0.25, flatShading: true }));
  // etiqueta de cada vista (una textura, compartida por los sitios de un mismo lugar)
  const labelTex = views.map(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 80; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
  const paint = () => {
    views.forEach((v, i) => {
      const hex = cssVar(v.token) || '#888888'; mats[i].color.set(hex);
      const c = labelTex[i].image, x = c.getContext('2d');
      x.clearRect(0, 0, 256, 80); x.fillStyle = hex; x.beginPath(); x.roundRect(4, 8, 248, 64, 14); x.fill();
      x.fillStyle = lum(hex) > 0.35 ? '#141118' : '#FAF8F4'; x.textAlign = 'center'; x.textBaseline = 'middle';
      let size = 34; x.font = `${size}px "${font}", monospace`;
      while (x.measureText(v.label.toUpperCase()).width > 228 && size > 16) { size -= 2; x.font = `${size}px "${font}", monospace`; }
      x.fillText(v.label.toUpperCase(), 128, 42); labelTex[i].needsUpdate = true;
    });
  };

  // ── Un sólido: cuerpo oscuro, pegatinas por lugar y etiquetas
  let shape = null, holder = null, lay = null, labels = [];
  const build = name => {
    const g = new THREE.Group(), R = 1.25;
    lay = layout(name);
    const bodyGeo = geometry(name, R);
    g.add(new THREE.Mesh(bodyGeo, body));
    stickers(lay).forEach((geo, i) => { geo.scale(R, R, R); const m = new THREE.Mesh(geo, mats[i]); m.userData.place = i; g.add(m); });
    labels = lay.sites.map(s => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex[s.place], transparent: true, depthTest: false }));
      sp.position.copy(s.point).multiplyScalar(R * 1.12); sp.scale.set(0.78, 0.245, 1); sp.renderOrder = 2; sp.userData.dir = s.dir;
      g.add(sp); return sp;
    });
    return g;
  };
  const dispose = g => g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); });

  // ── Orientación: arrastre con inercia y lugar al frente
  const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.36, -0.5, 0));
  const placeQuat = i => { const s = lay.sites.find(x => x.place === i); return new THREE.Quaternion().multiplyQuaternions(TILT, new THREE.Quaternion().setFromUnitVectors(s.dir, new THREE.Vector3(0, 0, 1))); };
  let target = null, drag = null, cur = 0, active = false;
  const w = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = e => {
    if (!holder) return -1;
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(holder.children.filter(o => o.isMesh), false)[0];
    if (!hit) return -1;
    // el sitio más cercano al punto tocado, en el espacio del sólido
    const p = holder.worldToLocal(hit.point.clone()).normalize();
    let best = -1, bd = -2; lay.sites.forEach(s => { const d = s.dir.dot(p); if (d > bd) { bd = d; best = s.place; } });
    return best;
  };
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); w.set(0, 0, 0); target = null; });
  canvas.addEventListener('pointermove', e => {
    if (!drag) { const f = pick(e); canvas.style.cursor = f >= 0 ? 'pointer' : 'grab'; canvas.title = f >= 0 ? views[f].label : ''; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(8, now - drag.t) / 1000;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    const ang = Math.hypot(dx, dy) * 0.012; if (!ang) return;
    const axis = new THREE.Vector3(dy, dx, 0).normalize();
    root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
    w.copy(axis).multiplyScalar(ang / dt * 0.5); if (!loop.running) loop.still();
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy); drag = null;
    if (moved < 6) { const f = pick(e); if (f >= 0) { onSelect(f); api.show(f); } }
  });

  const resize = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.width, false); camera.aspect = 1; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(resize).observe(host);

  let last = 0, loop = null;
  const q = new THREE.Quaternion(), z = new THREE.Vector3();
  const frame = now => {
    if (!active) return;
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    if (!drag) {
      if (w.lengthSq() > 1e-4) { root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(w.clone().normalize(), w.length() * dt)); w.multiplyScalar(Math.exp(-dt * 3)); }
      else if (target) root.quaternion.slerp(target, Math.min(1, dt * 6));
    }
    // las etiquetas solo se leen cuando su lugar mira hacia la cámara
    if (holder) { holder.getWorldQuaternion(q); labels.forEach(sp => { const d = z.copy(sp.userData.dir).applyQuaternion(q).z; sp.material.opacity = Math.max(0, Math.min(1, (d - 0.35) * 3)); }); }
    renderer.render(scene, camera);
  };
  loop = makeLoop(host, frame, 60);

  const api = {
    setShape(name) {
      if (name === shape) return; shape = name;
      const old = holder, fresh = build(name);
      holder = fresh; root.add(fresh);
      root.quaternion.copy(target = placeQuat(cur));
      if (reduceMotion.matches) { if (old) { root.remove(old); dispose(old); } loop.still(); return; }
      if (old) animate(old, { scale: 0, rotateY: 120, duration: 260, ease: 'in(2)', onComplete: () => { root.remove(old); dispose(old); } });
      fresh.scale.setScalar(0.001);
      animate(fresh, { scale: [0.001, 1], rotateY: [-120, 0], duration: 620, delay: old ? 160 : 0, ease: 'outBack(1.7)' });
    },
    show(i) { cur = i; if (lay) target = placeQuat(i); if (!loop.running) { if (target) root.quaternion.copy(target); loop.still(); } },
    setActive(on) { active = on; if (on) loop.still(); }
  };
  document.fonts?.load(`32px "${font}"`).then(paint, paint);
  paint(); onTheme(() => { paint(); loop.still(); });
  return api;
}
