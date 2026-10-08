// ══════════════════════════════════════════════════════
// Ciudad con metro elevado · Three.js r186 con WebGPURenderer
// (shared/vendor/three, MIT; cae a WebGL 2 solo si no hay WebGPU).
// Las cuadras, torres, banquetas, autos, peatones, postes y semáforos
// salen de los generadores procedurales de Three (CityGenerator).
// Encima, tres líneas elevadas con los colores de línea del tema
// (azul, morado, naranja), sus estaciones y trenes articulados: cada
// vagón sigue la curva por su cuenta, así el tren se dobla.
// Los semáforos ciclan rojo, verde y ámbar (los cruces van alternados)
// o se quedan en un color cuando el tablero filtra por estado.
// Sin WebGPU ni WebGL 2, mount() devuelve null y queda el tablero.
// ══════════════════════════════════════════════════════
import * as THREE from 'three/webgpu';
import { attribute, color, float, fract, fwidth, instanceIndex, length, mod, positionWorld, select, smoothstep, step, uniform, varying } from 'three/tsl';
import { CityGenerator, createBuildingMaterial } from 'three/addons/generators/CityGenerator.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cssVar, metroDark, onTheme, reduceMotion, COLS_D } from './kit.js';
import { makeLoop } from '../../core/core.js';

// Líneas: esquinas del recorrido (x, z) sobre las calles, altura del viaducto y estaciones.
export const LINES = [
  { id: 'L1', token: '--blue', y: 20, corners: [[-168, -82], [168, -82], [168, -4], [-168, -4]], stations: [['Zócalo', 0, -82], ['Hidalgo', -100, -4]] },
  { id: 'L2', token: '--purple', y: 28, corners: [[-56, -112], [56, -112], [56, 112], [-56, 112]], stations: [['Insurgentes', -56, 40], ['Tacubaya', 56, -40]] },
  { id: 'L3', token: '--orange', y: 13, corners: [[-168, 4], [168, 4], [168, 82], [-168, 82]], stations: [['Pino Suárez', 100, 4], ['Chapultepec', 0, 82]] }
];
const LOOP_S = 46;      // segundos por vuelta a velocidad normal
const DWELL = 3;        // segundos en andén
const CARS = 3, CAR_LEN = 12, CAR_GAP = 0.8; // trenes a escala exagerada: a escala real no se ven desde arriba

// Esquinas redondeadas: dos puntos por esquina, la Catmull-Rom centrípeta hace la curva.
function loopCurve(corners, y, r = 18) {
  const pts = [];
  corners.forEach(([x, z], i) => {
    const [ax, az] = corners[(i + corners.length - 1) % corners.length], [bx, bz] = corners[(i + 1) % corners.length];
    const da = Math.hypot(x - ax, z - az), db = Math.hypot(bx - x, bz - z);
    pts.push(new THREE.Vector3(x - (x - ax) / da * r, y, z - (z - az) / da * r), new THREE.Vector3(x + (bx - x) / db * r, y, z + (bz - z) / db * r));
  });
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}
const nearestU = (curve, x, z) => { let best = 0, bd = Infinity; const p = new THREE.Vector3(); for (let i = 0; i < 800; i++) { curve.getPointAt(i / 800, p); const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i / 800; } } return best; };

// Semáforo: el material del generador deja solo el verde encendido; este enciende
// la lente del estado que toca. Dos grupos (instancias pares e impares) alternan.
function signalMaterial() {
  const partId = varying(attribute('partId', 'float')).setInterpolation(THREE.InterpolationSamplingType.FLAT, THREE.InterpolationSamplingMode.EITHER);
  const sA = uniform(0), sB = uniform(2); // 0 rojo · 1 ámbar · 2 verde
  const st = varying(select(instanceIndex.mod(2).equal(0), sA, sB));
  const [r, a, g] = COLS_D.map(c => color(c));
  const onR = partId.equal(1).and(st.lessThan(0.5)), onA = partId.equal(2).and(st.greaterThan(0.5)).and(st.lessThan(1.5)), onG = partId.equal(3).and(st.greaterThan(1.5));
  const m = new THREE.MeshStandardNodeMaterial();
  m.colorNode = select(partId.equal(1), select(onR, r, color(0x3a0a06)), select(partId.equal(2), select(onA, a, color(0x402608)), select(partId.equal(3), select(onG, g, color(0x0c2a14)), color(0x233029))));
  m.roughnessNode = select(partId.greaterThan(0.5), float(0.3), float(0.5));
  m.metalnessNode = select(partId.greaterThan(0.5), float(0), float(0.7));
  m.emissiveNode = select(onR, r.mul(14), select(onA, a.mul(14), select(onG, g.mul(14), color(0x000000))));
  return { m, sA, sB };
}

// Asfalto: los carriles y cruces peatonales del createRoadMaterial de Three, sin su ruido
// procedural (tardaba ~2.5 s en compilar y desde esta altura no se ve).
function roadMaterial(L) {
  const p = positionWorld, line = (c, hw) => { const aa = fwidth(c).max(0.0001); return smoothstep(float(hw).add(aa), float(hw).sub(aa), c.abs()); };
  const grid = (c, period, hw) => { const g = c.div(period), d = float(0.5).sub(fract(g).sub(0.5).abs()), aa = fwidth(g).max(0.0001); return smoothstep(float(hw / period).add(aa), float(hw / period).sub(aa), d); };
  const fx = mod(p.x.add(L.cityW / 2), L.blockW + L.street), fz = mod(p.z.add(L.cityD / 2), L.blockD + L.street);
  const inX = step(L.blockW, fx), inZ = step(L.blockD, fz), su = fx.sub(L.blockW), sv = fz.sub(L.blockD);
  const laneV = line(su.sub(L.street / 2), 0.12).max(line(su.sub(L.street / 4), 0.1).max(line(su.sub(L.street * 3 / 4), 0.1)).mul(step(fract(p.z.div(7)), 0.5))).mul(inX).mul(inZ.oneMinus());
  const laneH = line(sv.sub(L.street / 2), 0.12).max(line(sv.sub(L.street / 4), 0.1).max(line(sv.sub(L.street * 3 / 4), 0.1)).mul(step(fract(p.x.div(7)), 0.5))).mul(inZ).mul(inX.oneMinus());
  const nearZ = step(fz, 5).max(step(L.blockD - 5, fz)), nearX = step(fx, 5).max(step(L.blockW - 5, fx));
  const cross = grid(su, 1.2, 0.38).mul(inX).mul(inZ.oneMinus()).mul(nearZ).max(grid(sv, 1.2, 0.38).mul(inZ).mul(inX.oneMinus()).mul(nearX));
  // El piso se desvanece en círculo: la ciudad queda como maqueta sobre el panel.
  const R = Math.hypot(L.cityW, L.cityD) / 2;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, transparent: true, depthWrite: false });
  m.opacityNode = smoothstep(R + 70, R + 10, length(p.xz));
  m.colorNode = color(0x2c2e33).mix(color(0xd0ccc0), laneV.max(laneH).max(cross).mul(0.8));
  return m;
}

export async function mount({ view }) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  view.appendChild(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
    await renderer.init();
  } catch { canvas.remove(); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // En el respaldo WebGL 2 los shaders de los generadores tardan mucho en compilar: sin sombras (la mitad de programas).
  const webgpu = !!renderer.backend.isWebGPUBackend;
  renderer.shadowMap.enabled = webgpu; renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 5, 4000);
  camera.position.set(410, 300, 450);
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x6a5e50, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3); sun.position.set(-160, 260, 120); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 700 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ── Ciudad
  const city = new CityGenerator({ seed: 7, blocksX: 3, blocksZ: 2 });
  scene.add(city.build({ building: createBuildingMaterial(city.layout, city.seedNode) }));
  const L = city.layout;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L.cityW + 2 * L.street + 240, L.cityD + 2 * L.street + 280), roadMaterial(L));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.renderOrder = -1; scene.add(ground);
  // Árboles, bancas, hidrantes y botes no se distinguen desde esta altura y suman ~5.6 s de compilación.
  for (const k of ['tree', 'bench', 'hydrant', 'trashcan']) city.furniture[k].mesh?.removeFromParent();
  // Respaldo WebGL 2: compilar las torres detalladas tarda ~20 s; van como cajas con su color (buildProxy).
  if (!webgpu) {
    for (const o of [...city.group.children]) if (o.isMesh) o.removeFromParent();
    for (const k of ['person', 'streetlight']) city.furniture[k].mesh?.removeFromParent();
    city.group.add(city.buildProxy());
  }
  const sig = signalMaterial(), lights = city.furniture.trafficlight.mesh;
  if (lights) lights.material = sig.m;

  // ── Líneas, pilares, estaciones y trenes
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8c877e, roughness: 0.9 });
  const lines = LINES.map(def => {
    const curve = loopCurve(def.corners, def.y), len = curve.getLength();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 });
    const geo = new THREE.TubeGeometry(curve, 600, 1.2, 8, true), track = new THREE.Mesh(geo, mat);
    track.castShadow = true; track.visible = false; geo.setDrawRange(0, 0); scene.add(track);
    // pilares cada ~26 m, ordenados por avance para que aparezcan con el trazo
    const nP = Math.round(len / 26), pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1.2, 1, 10).translate(0, 0.5, 0), concrete, nP), m4 = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < nP; i++) { curve.getPointAt(i / nP, p); m4.makeScale(1, def.y - 1.2, 1).setPosition(p.x, 0, p.z); pil.setMatrixAt(i, m4); }
    pil.count = 0; pil.visible = false; pil.castShadow = true; scene.add(pil);
    const stations = def.stations.map(([name, x, z]) => {
      const u = nearestU(curve, x, z), pos = curve.getPointAt(u), tan = curve.getTangentAt(u);
      const g = new THREE.Group(), plat = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 26), concrete), roof = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 28), mat);
      plat.position.set(5.5, -1, 0); roof.position.set(4.5, 5.5, 0); plat.castShadow = roof.castShadow = true;
      g.add(plat, roof); g.position.copy(pos); g.lookAt(pos.clone().add(tan)); g.visible = false; scene.add(g);
      return { name, u, g };
    }).sort((a, b) => a.u - b.u);
    const body = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1c2230, emissive: 0xffe6b0, emissiveIntensity: 0, roughness: 0.2 });
    const trains = [0.08, 0.47].map((u0, k) => {
      const cars = Array.from({ length: CARS }, () => {
        const c = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, CAR_LEN), body), w = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.9, CAR_LEN - 1.4), glass);
        b.position.y = 2.8; w.position.y = 3.3; b.castShadow = true; c.add(b, w); c.visible = false; scene.add(c); return c;
      });
      return { line: def, k, u: u0, speed: 1, status: 'ok', until: 0, dwell: 0, cars, next: null, eta: 0 };
    });
    return { def, curve, len, mat, geo, track, pil, nP, stations, body, trains, drawn: 0 };
  });

  // ── Paleta
  const palette = () => {
    for (const l of lines) { const c = new THREE.Color(cssVar(l.def.token) || '#457bff'); l.mat.color.copy(c); l.body.color.copy(c); }
    const night = metroDark;
    hemi.intensity = night ? 0.35 : 1.25; hemi.color.set(night ? 0x8a9ccf : 0xfff4e0); hemi.groundColor.set(night ? 0x0c0e14 : 0x6a5e50);
    sun.intensity = night ? 0.45 : 3; sun.color.set(night ? 0xa8b8ff : 0xfff0d8);
    renderer.toneMappingExposure = night ? 1.1 : 0.85;
    for (const l of lines) l.trains[0].cars[0].children[1].material.emissiveIntensity = night ? 1.4 : 0.15;
  };

  // ── Cámara: se arrastra para girar; sola gira despacio
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: true, dampingFactor: 0.08, autoRotate: !reduceMotion.matches, autoRotateSpeed: 0.35, minPolarAngle: 0.45, maxPolarAngle: 1.2 });
  controls.target.set(0, 30, 0);
  if (matchMedia('(pointer: coarse)').matches) controls.enabled = false; // en táctil, el dedo es para el scroll
  controls.update();

  const resize = () => { const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 560 ? 38 : 32; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(() => { resize(); loop && loop.still(); }).observe(view);

  // ── Trenes: andén, demoras y retenciones; ETA hasta la siguiente estación
  const placeTrain = (l, t) => {
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    t.cars.forEach((c, i) => {
      const u = ((t.u - i * (CAR_LEN + CAR_GAP) / l.len) % 1 + 1) % 1;
      l.curve.getPointAt(u, p); l.curve.getPointAt((u + 0.002) % 1, q);
      c.position.copy(p); c.lookAt(q); c.visible = l.drawn >= 1;
    });
  };
  const nextStation = (l, u) => l.stations.find(s => s.u > u + 1e-4) || l.stations[0];
  const roll = (t, now) => {
    const r = Math.random();
    t.status = r < 0.68 ? 'ok' : r < 0.88 ? 'warn' : 'danger';
    t.speed = t.status === 'ok' ? 1 : t.status === 'warn' ? 0.45 : 0;
    t.until = now + (t.status === 'danger' ? 5 + Math.random() * 4 : 12 + Math.random() * 14);
  };
  const stepTrain = (l, t, dt, now) => {
    if (now > t.until) roll(t, now);
    const before = t.u, n = nextStation(l, before);
    if (t.dwell > 0) t.dwell -= dt;
    else {
      t.u = (t.u + dt * t.speed / LOOP_S) % 1;
      const crossed = before <= n.u ? t.u >= n.u || t.u < before : t.u >= n.u && t.u < before;
      if (crossed && t.speed > 0) { t.u = n.u; t.dwell = DWELL; }
    }
    t.next = t.dwell > 0 ? n : nextStation(l, t.u);
    t.eta = t.dwell > 0 ? 0 : (((t.next.u - t.u) % 1 + 1) % 1) * LOOP_S;
    placeTrain(l, t);
  };

  // ── Semáforos: ciclo de 12 s, o fijos según el filtro del tablero
  let signalMode = 'all';
  const cycle = s => (s < 5 ? 2 : s < 6.5 ? 1 : 0);
  const signals = time => {
    if (signalMode !== 'all') { sig.sA.value = sig.sB.value = { ok: 2, warn: 1, danger: 0 }[signalMode]; return; }
    const s = time % 12; sig.sA.value = cycle(s); sig.sB.value = cycle((s + 6) % 12);
  };

  // ── Trazo de las líneas (lo anima el tablero con anime.js)
  const setDrawn = (l, v) => {
    l.drawn = v; l.track.visible = v > 0;
    l.geo.setDrawRange(0, Math.floor(l.geo.index.count * v / 3) * 3);
    l.pil.count = Math.min(l.nP, Math.ceil(l.nP * v)); l.pil.visible = l.pil.count > 0;
    for (const s of l.stations) s.g.visible = v >= s.u;
    for (const t of l.trains) placeTrain(l, t);
  };

  let last = 0, loop = null, t0 = performance.now();
  const frame = now => {
    const time = (now - t0) / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0; last = Math.max(last, now); // still() usa performance.now() y el rAF trae marcas anteriores: dt nunca negativo
    if (!reduceMotion.matches) for (const l of lines) if (l.drawn >= 1) for (const t of l.trains) stepTrain(l, t, dt, time);
    signals(reduceMotion.matches ? 0 : time);
    controls.autoRotate = !reduceMotion.matches; controls.update(dt);
    renderer.render(scene, camera);
  };
  palette();
  for (const l of lines) for (const t of l.trains) { t.next = nextStation(l, t.u); t.eta = (((t.next.u - t.u) % 1 + 1) % 1) * LOOP_S; placeTrain(l, t); }
  // Compilar antes del primer cuadro, sin congelar la página (el loader sigue corriendo).
  await renderer.compileAsync(scene, camera);
  loop = makeLoop(view, frame, 40);
  controls.addEventListener('change', () => { if (reduceMotion.matches) loop.still(); });
  onTheme(() => { palette(); loop.still(); });
  loop.still();

  return {
    lines, trains: lines.flatMap(l => l.trains),
    setDrawn: (i, v) => { setDrawn(lines[i], v); loop.still(); },
    setSignals: mode => { signalMode = mode; loop.still(); },
    loop
  };
}
