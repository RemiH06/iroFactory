// ══════════════════════════════════════════════════════
// El mazo de la portada · Three.js r186 + el adaptador de anime.js.
// Cartas con el arte de card-art.js y el oro en relieve (relief.js): el
// dorado es metal de verdad y atrapa la luz que sigue al cursor.
//  1. Barajada en riffle: el mazo se parte en dos, las mitades se abren,
//     se intercalan cayendo una y una, y el puente (las cartas se arquean)
//     las cuadra.
//  2. Reparte una tirada de tres (pasado, presente, futuro) boca abajo y
//     las voltea una por una. Las tres salen del bioma vigente: sus
//     arcanos primero y, si faltan, cualquier otro.
//  3. En reposo flotan apenas; al pasar el cursor, la carta se inclina.
// «Barajar otra vez» repite todo con otra tirada. Con reduced motion, la
// tirada aparece ya volteada.
//   mount({ host, onDeal(cards) }) → { deal() }
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animate, createTimeline, stagger } from 'animejs';
import { card } from './card-art.js';
import { relief } from './relief.js';
import { BIOMES, ARCANA, biome } from './biomes.js';
import { makeLoop, night, onTheme, reduceMotion } from './kit.js';

const CW = 0.62, CH = 1.085, N = 16;

// material de una cara: color + relieve del oro
function face(o) {
  const { color, mask } = card({ ...o, w: 512, h: 896 });
  const { normal, mr } = relief(mask, { strength: 3 });
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); x.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; x.anisotropy = 8; return x; };
  const m = t(mr);
  return new THREE.MeshPhysicalMaterial({ map: t(color, true), normalMap: t(normal), roughnessMap: m, metalnessMap: m, clearcoat: 0.25, clearcoatRoughness: 0.35 });
}

export function mount({ host = document.querySelector('.tr-deck'), onDeal = () => {} } = {}) {
  if (!host) return null;
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; // ACES deslava los colores de las cartas
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, -1.2, 4.6); camera.lookAt(0, 0.05, 0);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x202030, 0.5));
  const lamp = new THREE.PointLight(0xffe6b0, 7, 6, 1.5); lamp.position.set(0.6, 0.4, 1.4); scene.add(lamp);

  // ── cartas: dos planos espalda con espalda y un canto dorado
  const plane = new THREE.PlaneGeometry(CW, CH), edgeGeo = new THREE.BoxGeometry(CW * 0.995, CH * 0.995, 0.006);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 1, roughness: 0.3 });
  let backMat = null;
  const deck = [];
  const makeCard = () => {
    const g = new THREE.Group(), front = new THREE.Mesh(plane, backMat), back = new THREE.Mesh(plane, backMat);
    front.position.z = 0.0035; back.position.z = -0.0035; back.rotation.y = Math.PI;
    g.add(new THREE.Mesh(edgeGeo, edgeMat), front, back); g.userData.front = front; g.userData.back = back; return g;
  };
  const paintBacks = () => { const old = backMat; backMat = face({ kind: 'back', biome: biome(), night: night() }); deck.forEach(c => { c.userData.back.material = backMat; if (!c.userData.dealt) c.userData.front.material = backMat; }); if (old) { old.map.dispose(); old.normalMap.dispose(); old.roughnessMap.dispose(); old.dispose(); } };
  const stackAt = (c, i) => { c.position.set(0, 0, i * 0.008); c.rotation.set(0, Math.PI, (Math.random() - 0.5) * 0.04); c.scale.setScalar(1); };

  const ready = document.fonts ? Promise.all(['16px "Grenadier NF"', '16px "Busorama"'].map(f => document.fonts.load(f))) : Promise.resolve();

  // ── tamaño
  const fit = () => { const r = host.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(() => { fit(); loop.still(); }).observe(host);

  // ── cursor: la lámpara lo sigue; la carta bajo el cursor se inclina
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9);
  let hover = null;
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); });
  canvas.addEventListener('pointerleave', () => ndc.set(9, 9));

  let last = 0;
  const frame = now => {
    const t = now / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    lamp.position.x += (ndc.x * 1.6 - lamp.position.x) * Math.min(1, dt * 4); lamp.position.y += (ndc.y * 1.2 - lamp.position.y) * Math.min(1, dt * 4);
    if (ndc.x > 5) { lamp.position.x = Math.sin(t * 0.5) * 1.2; lamp.position.y = Math.cos(t * 0.37) * 0.6; }
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(spread, true)[0]; const h = hit ? spread.find(c => c === hit.object.parent) : null;
    if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : ''; }
    spread.forEach((c, i) => { if (busy) return; const tx = c === hover ? -0.18 : 0, tz = c === hover ? 0.12 : 0; c.rotation.x += (tx - c.rotation.x) * Math.min(1, dt * 8); c.position.z += (c.userData.z + tz + Math.sin(t * 1.1 + i) * 0.015 - c.position.z) * Math.min(1, dt * 6); });
    renderer.render(scene, camera);
  };
  const loop = makeLoop(host, frame, 60);

  // ── barajar y repartir
  let spread = [], busy = false;
  const SLOTS = [-0.78, 0, 0.78];
  const pick = () => { const b = biome(), own = [...b.arcana].sort(() => Math.random() - 0.5), rest = ARCANA.map((_, i) => i).filter(i => !own.includes(i)).sort(() => Math.random() - 0.5); return [...own, ...rest].slice(0, 3); };
  const deal = async () => {
    if (busy) return; busy = true; await ready;
    if (!backMat) paintBacks();
    // recoger lo repartido
    spread.forEach(c => { c.userData.dealt = false; c.userData.front.material.map !== backMat.map && disposeFace(c.userData.front.material); c.userData.front.material = backMat; });
    spread = [];
    while (deck.length < N) { const c = makeCard(); deck.push(c); scene.add(c); }
    deck.forEach(stackAt);
    const draw = pick(), names = draw.map(n => ARCANA[n]);
    const top = deck.slice(-3).reverse();
    top.forEach((c, i) => { c.userData.front.material = arcanaFace(draw[i]); c.userData.dealt = true; c.userData.n = draw[i]; c.userData.z = 0.02; });
    if (reduceMotion.matches) { top.forEach((c, i) => { c.position.set(SLOTS[i], 0, 0.02); c.rotation.set(0, 0, 0); }); deck.slice(0, -3).forEach((c, i) => { c.position.set(0, -2.4, i * 0.003); c.visible = false; }); spread = top; busy = false; onDeal(names); loop.still(); return; }
    deck.forEach(c => { c.visible = true; });
    const left = deck.filter((_, i) => i % 2 === 0), right = deck.filter((_, i) => i % 2 === 1);
    const tl = createTimeline({ defaults: { ease: 'inOut(3)' }, onUpdate: () => { if (!loop.running) loop.still(); } });
    // 1 · partir y abrir
    tl.add(left, { x: -0.55, rotateZ: 9, z: (_, i) => i * 0.008, duration: 500 })
      .add(right, { x: 0.55, rotateZ: -9, z: (_, i) => i * 0.008, duration: 500 }, '<<')
      // 2 · intercalar: caen una y una, alternando mitades
      .add(deck, { x: 0, rotateZ: () => (Math.random() - 0.5) * 2.5, z: (_, i) => i * 0.008, duration: 260, delay: stagger(45), ease: 'out(2)' }, '+=120')
      // 3 · el puente: el mazo se arquea y se cuadra
      .add(deck, { y: [{ to: 0.12, duration: 220 }, { to: 0, duration: 260 }], rotateX: [{ to: -14, duration: 220 }, { to: 0, duration: 260 }], delay: stagger(12, { from: 'center' }) }, '+=80');
    // 4 · repartir boca abajo y voltear una por una
    top.forEach((c, i) => {
      tl.add(c, { x: SLOTS[i], y: 0.05, z: 0.02 + i * 0.001, rotateZ: (Math.random() - 0.5) * 6, duration: 520, ease: 'out(3)' }, i ? '-=330' : '+=150');
    });
    top.forEach((c, i) => {
      tl.add(c, { z: [{ to: 0.42, duration: 260, ease: 'out(2)' }, { to: 0.02, duration: 300, ease: 'in(2)' }], rotateY: [{ to: 180 + 0, duration: 0 }, { to: 0, duration: 560 }], rotateZ: 0, duration: 560 }, i ? '-=280' : '+=180');
    });
    // el resto del mazo baja y se aparta
    tl.add(deck.slice(0, -3), { y: -2.3, z: (_, i) => i * 0.003, rotateZ: 0, duration: 600, delay: stagger(10) }, '<<');
    await tl.then();
    spread = top; busy = false; onDeal(names); loop.still();
  };
  const disposeFace = m => { m.map.dispose(); m.normalMap.dispose(); m.roughnessMap.dispose(); m.dispose(); };
  const arcanaFace = n => face({ kind: 'arcana', n, biome: BIOMES.find(b => b.arcana.includes(n)) || biome(), night: night() });
  onTheme(() => ready.then(() => { paintBacks(); spread.forEach(c => { const old = c.userData.front.material; c.userData.front.material = arcanaFace(c.userData.n); disposeFace(old); }); loop.still(); }));
  document.addEventListener('tarot:biome', () => ready.then(() => { paintBacks(); loop.still(); }));
  fit();
  return { deal };
}
