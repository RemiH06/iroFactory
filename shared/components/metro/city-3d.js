// ══════════════════════════════════════════════════════
// Guadalajara en 3D · Three.js r186 con WebGPURenderer
// (shared/vendor/three, MIT; cae a WebGL 2 si no hay WebGPU).
// La zona donde se cruzan las tres líneas del Tren Ligero (Juárez,
// Plaza Universidad y Ávila Camacho), con datos de OpenStreetMap:
//  · Calles reales; edificios de OSM con su altura y, donde OSM no
//    tiene edificios, lotes generados sobre cada calle (casas y
//    edificios bajos, más altos sobre las avenidas), con ventanas que
//    se encienden de noche. Todo instanciado: una llamada de dibujo.
//  · Autos, semáforos, postes y peatones de los generadores de Three,
//    colocados sobre las calles reales. Los semáforos ciclan o se
//    quedan en el color del filtro del tablero.
//  · Las líneas: en esta zona casi todo va bajo tierra, así que los
//    túneles y sus trenes se ven a través del suelo, como en rayos X;
//    L3 sale a la superficie y sigue elevada por Ávila Camacho.
//  · Los trenes vienen de la simulación compartida (zmg-trains.js).
// Se arrastra para girar; expandida, también zoom y desplazamiento.
// Sin WebGPU ni WebGL 2, mount() devuelve null y queda el tablero.
// ══════════════════════════════════════════════════════
import * as THREE from 'three/webgpu';
import { attribute, color, float, floor, fract, hash, instancedBufferAttribute, instanceIndex, max, mix, normalWorld, positionWorld, select, smoothstep, step, uniform, varying } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CarGenerator } from 'three/addons/generators/city/CarGenerator.js';
import { PersonGenerator } from 'three/addons/generators/city/PersonGenerator.js';
import { StreetlightGenerator } from 'three/addons/generators/city/StreetlightGenerator.js';
import { TrafficlightGenerator } from 'three/addons/generators/city/TrafficlightGenerator.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cssVar, metroDark, onTheme, reduceMotion, COLS_D } from './kit.js';
import { makeLoop } from '../../core/core.js';
import { pointAt } from './zmg-trains.js';

const DATA = '../assets/data/metro/';
const ROAD_W = { motorway: 22, trunk: 22, primary: 20, secondary: 16, tertiary: 12, unclassified: 9, residential: 9, living_street: 7, pedestrian: 7, service: 5 };
// Fachadas tapatías: cantera, ocre, terracota, crema, blanco hueso, rosa viejo, concreto y algún añil.
const FACADES = [0xc9a27e, 0xd4a157, 0xb5654a, 0xe3d6bc, 0xe6dfd2, 0xc98e86, 0xa7a39b, 0x5e7a99];
const CAR_COLORS = [0xe9e8e3, 0xb2b5b8, 0x3e4247, 0x16181c, 0x74787c, 0x8a1c1c, 0x1c2a3f, 0xc9c2b0];
const CAR_LEN = 14, CARS = 2;

// Ventanas: rejilla por piso en los muros; las encendidas se eligen por hash y brillan de noche.
function facadeNodes(base, seed, night) {
  const n = normalWorld, wall = n.y.abs().lessThan(0.5);
  const u = positionWorld.x.mul(n.z.negate()).add(positionWorld.z.mul(n.x)), v = positionWorld.y.div(3.4);
  const cu = fract(u.div(3.2)), cv = fract(v);
  const win = step(0.3, cu).mul(step(cu, 0.7)).mul(step(0.35, cv)).mul(step(cv, 0.8)).mul(step(0.9, v));
  const isWin = select(wall, win, float(0));
  const lit = step(0.58, hash(floor(u.div(3.2)).add(floor(v).mul(17)).add(seed.mul(31)).abs()));
  return {
    colorNode: mix(base.mul(select(wall, float(1), float(0.8))), color(0x2b3440), isWin.mul(0.8)),
    emissiveNode: color(0xffc98a).mul(isWin.mul(lit).mul(night).mul(2.4))
  };
}

// Semáforo: el material del generador deja solo el verde fijo; este enciende la lente del estado.
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

const yawMatrix = (x, z, yaw, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s, s));

export async function mount({ view, sim }) {
  const [city, lotsBuf] = await Promise.all([fetch(DATA + 'zmg-city.json').then(r => r.json()), fetch(DATA + 'zmg-lots.bin').then(r => r.arrayBuffer())]);
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  view.prepend(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
    await renderer.init();
  } catch { canvas.remove(); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const webgpu = !!renderer.backend.isWebGPUBackend;
  renderer.shadowMap.enabled = webgpu; renderer.shadowMap.type = THREE.PCFShadowMap;

  const [bx0, bz0, bx1, bz1] = sim.cityBox, hx = (bx1 - bx0) / 2, hz = (bz1 - bz0) / 2;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 3, 14000);
  camera.position.set(3900, 3300, 2300);
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x6a5e50, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3); sun.position.set(-900, 1600, 700); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -2300, right: 2300, top: 2300, bottom: -2300, near: 10, far: 5000 }); sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0005;
  scene.add(sun);
  const night = uniform(0);

  // ── Suelo: banqueta clara que se desvanece en las orillas del recuadro
  const edgeFade = float(1).sub(smoothstep(0.94, 1.04, max(positionWorld.x.abs().div(hx), positionWorld.z.abs().div(hz))));
  const groundMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, transparent: true, depthWrite: false });
  groundMat.colorNode = color(0xb9b2a5); groundMat.opacityNode = edgeFade;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2.2, hz * 2.2).rotateX(-Math.PI / 2), groundMat);
  ground.receiveShadow = true; ground.renderOrder = -3; scene.add(ground);

  // ── Calles: cintas sobre el trazo de OSM
  const rp = [], ri = [];
  for (const r of city.roads) {
    const w = ROAD_W[r.c] / 2, y = r.c in { primary: 1, secondary: 1, trunk: 1 } ? 0.1 : 0.06, p = r.p;
    for (let i = 0; i + 3 < p.length; i += 2) {
      if (!(Math.abs(p[i]) < hx * 1.06 && Math.abs(p[i + 1]) < hz * 1.06) && !(Math.abs(p[i + 2]) < hx * 1.06 && Math.abs(p[i + 3]) < hz * 1.06)) continue;
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * w, nz = (bx - ax) / L * w, b = rp.length / 3;
      rp.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
      ri.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const roadGeo = new THREE.BufferGeometry(); roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); roadGeo.setIndex(ri); roadGeo.computeVertexNormals();
  const roadMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, transparent: true, depthWrite: false }); roadMat.colorNode = color(0x34363c); roadMat.opacityNode = edgeFade;
  const roads = new THREE.Mesh(roadGeo, roadMat); roads.receiveShadow = true; roads.renderOrder = -2; scene.add(roads);
  // parques y jardines
  const greens = city.green.map(p => { const sh = new THREE.Shape(); for (let i = 0; i < p.length; i += 2) (i ? sh.lineTo : sh.moveTo).call(sh, p[i], -p[i + 1]); return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2).translate(0, 0.03, 0); });
  if (greens.length) { const g = new THREE.Mesh(mergeGeometries(greens), Object.assign(new THREE.MeshStandardNodeMaterial({ roughness: 1, transparent: true, depthWrite: false }), { colorNode: color(0x7f9a66), opacityNode: edgeFade })); g.receiveShadow = true; g.renderOrder = -2; scene.add(g); }

  // ── Edificios generados (Int16 ×7: x, z, frente, fondo en dm; ángulo en centésimas de grado; altura en dm; color)
  const lots = new Int16Array(lotsBuf), NL = lots.length / 7;
  const lotMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  const lotMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), lotMat, NL);
  const lotCol = new Float32Array(NL * 3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  for (let i = 0; i < NL; i++) {
    const o = i * 7, ang = ((lots[o + 4] + 18000) / 100) * Math.PI / 180;
    m4.compose(new THREE.Vector3(lots[o] / 10, 0, lots[o + 1] / 10), q.setFromAxisAngle(up, -ang), new THREE.Vector3(lots[o + 2] / 10, lots[o + 5] / 10, lots[o + 3] / 10));
    lotMesh.setMatrixAt(i, m4); c.setHex(FACADES[lots[o + 6]]).toArray(lotCol, i * 3);
  }
  Object.assign(lotMat, facadeNodes(varying(instancedBufferAttribute(new THREE.InstancedBufferAttribute(lotCol, 3))), varying(float(instanceIndex)), night));
  lotMesh.castShadow = lotMesh.receiveShadow = true; scene.add(lotMesh);
  // ── Edificios de OSM con su altura (catedral, universidad, hospitales…)
  const osm = city.buildings.map((b, i) => {
    const sh = new THREE.Shape(); for (let k = 0; k < b.p.length; k += 2) (k ? sh.lineTo : sh.moveTo).call(sh, b.p[k], -b.p[k + 1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: b.h, bevelEnabled: false }).rotateX(-Math.PI / 2); g.deleteAttribute('uv');
    const n = g.attributes.position.count, cc = new Float32Array(n * 3); c.setHex(FACADES[[0, 3, 4, 6][i % 4]]); for (let k = 0; k < n; k++) c.toArray(cc, k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); return g;
  });
  const osmMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
  Object.assign(osmMat, facadeNodes(varying(attribute('color', 'vec3')), floor(positionWorld.x.div(9)).add(floor(positionWorld.z.div(9)).mul(7)), night));
  const osmMesh = new THREE.Mesh(mergeGeometries(osm), osmMat); osmMesh.castShadow = osmMesh.receiveShadow = true; scene.add(osmMesh);

  // ── Mobiliario de los generadores, sobre las calles reales
  const cars = new CarGenerator().build(city.cars.map(([x, z, yaw], i) => ({ matrix: yawMatrix(x, z, yaw), color: CAR_COLORS[(i * 7) % CAR_COLORS.length] })));
  const people = new PersonGenerator().build(city.people.map(([x, z, yaw]) => yawMatrix(x, z, yaw)));
  const posts = new StreetlightGenerator().build(city.lights.map(([x, z, yaw]) => yawMatrix(x, z, yaw)));
  const sigGen = new TrafficlightGenerator(), signalsMesh = sigGen.build(city.signals.map(([x, z, yaw]) => yawMatrix(x, z, yaw))), sig = signalMaterial();
  signalsMesh.material = sig.m;
  for (const o of [cars, people, posts, signalsMesh]) { o.traverse(x => { if (x.isMesh) x.castShadow = webgpu; }); scene.add(o); }

  // ── Líneas: túneles en rayos X (se ven a través del suelo) y tramos en superficie o elevados
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.9 });
  const inBox = (x, z, m) => x > bx0 - m && x < bx1 + m && z > bz0 - m && z < bz1 + m;
  const pt = {};
  const lines = sim.lines.map(line => {
    const solid = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.15 });
    const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.38, depthTest: false, depthWrite: false });
    const runs = []; let cur = null;
    for (let s = 0; s <= line.len; s += 8) {
      pointAt(line, s, 0, pt);
      if (!inBox(pt.x, pt.z, 40)) { cur = null; continue; }
      const under = pt.y < -2;
      if (!cur || cur.under !== under) { const prev = cur && cur.pts[cur.pts.length - 1]; cur = { under, s0: s, pts: prev ? [prev.clone()] : [] }; runs.push(cur); }
      cur.pts.push(new THREE.Vector3(pt.x, pt.y + (under ? 0 : 1.6), pt.z)); cur.s1 = s;
    }
    const meshes = runs.filter(r => r.pts.length > 1).map(r => {
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r.pts), r.pts.length * 2, r.under ? 6 : 2.6, 8, false);
      const mesh = new THREE.Mesh(geo, r.under ? ghost : solid); mesh.renderOrder = r.under ? 10 : 0; mesh.castShadow = !r.under; mesh.visible = false; geo.setDrawRange(0, 0); scene.add(mesh);
      return { ...r, geo, mesh };
    });
    // pilares del viaducto
    const pil = [];
    for (const r of runs) if (!r.under) for (let i = 0; i < r.pts.length; i += 3) if (r.pts[i].y > 4) pil.push(r.pts[i]);
    const pillars = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 1.8, 1, 10).translate(0, 0.5, 0), concrete, Math.max(1, pil.length));
    pil.forEach((p, i) => pillars.setMatrixAt(i, new THREE.Matrix4().makeScale(1, p.y - 1, 1).setPosition(p.x, 0, p.z)));
    pillars.count = 0; pillars.visible = false; pillars.castShadow = true; scene.add(pillars);
    return { line, solid, ghost, meshes, pillars, nPil: pil.length, s0: runs.length ? runs[0].s0 : 0, s1: runs.length ? runs[runs.length - 1].s1 : 1, drawn: 0 };
  });

  // ── Estaciones: andén fantasma bajo tierra y acceso en la calle; L3 elevada con andén y techo
  const labels = [], labelLayer = view.querySelector('.metro-city-labels');
  lines.forEach(l => {
    for (const st of l.line.stations) {
      if (!inBox(st.x, st.z, -10)) continue;
      pointAt(l.line, st.s, 0, pt);
      const yaw = Math.atan2(pt.hx, pt.hz), g = new THREE.Group(); g.position.set(pt.x, 0, pt.z); g.rotation.y = yaw;
      if (pt.y < -2) {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 80), l.ghost); plat.position.y = pt.y; plat.renderOrder = 10; g.add(plat);
        const kiosk = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 8), concrete), roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 9), l.solid);
        kiosk.position.set(16, 1.6, 0); roof.position.set(16, 3.45, 0); kiosk.castShadow = roof.castShadow = true; g.add(kiosk, roof);
      } else {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 80), concrete), roof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 84), l.solid);
        plat.position.y = pt.y + 0.6; roof.position.y = pt.y + 7; plat.castShadow = roof.castShadow = true; g.add(plat, roof);
      }
      g.visible = false; scene.add(g); st.g = g; st.l = l;
      if (labelLayer && !labels.some(o => o.name === st.name && Math.hypot(o.x - st.x, o.z - st.z) < 250)) {
        const el = document.createElement('span'); el.className = 'metro-city-label'; el.textContent = st.name; el.style.setProperty('--line', `var(${l.line.token})`);
        labelLayer.appendChild(el); labels.push({ name: st.name, x: st.x, z: st.z, y: Math.max(12, pt.y + 14), el });
      }
    }
  });

  // ── Trenes de la simulación: dos vagones articulados; bajo tierra, fantasmas que brillan
  const carGeo = new THREE.BoxGeometry(2.8, 3.4, CAR_LEN - 0.6).translate(0, 1.7, 0);
  const trains = sim.trains.map(t => {
    const l = lines[t.li], ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthTest: false, depthWrite: false });
    const cars = Array.from({ length: CARS }, () => { const m = new THREE.Mesh(carGeo, l.solid); m.castShadow = true; m.visible = false; scene.add(m); return m; });
    return { t, l, ghost, cars };
  });
  const placeTrains = () => {
    for (const tr of trains) {
      tr.cars.forEach((m, i) => {
        pointAt(tr.t.line, tr.t.s - tr.t.dir * (i + 0.5) * CAR_LEN, tr.t.dir, pt);
        const vis = tr.l.drawn >= 1 && inBox(pt.x, pt.z, 30);
        m.visible = vis; if (!vis) return;
        const under = pt.y < -2;
        m.position.set(pt.x, under ? pt.y - 1.7 : pt.y + 1.6 + 2.6, pt.z); m.lookAt(pt.x + pt.hx, m.position.y, pt.z + pt.hz);
        m.material = under ? tr.ghost : tr.l.solid; m.renderOrder = under ? 11 : 0;
      });
    }
  };

  // ── Paleta
  const palette = () => {
    const n = metroDark;
    for (const l of lines) { const col = new THREE.Color(cssVar(l.line.token) || '#457bff'); l.solid.color.copy(col); l.ghost.color.copy(col); }
    for (const tr of trains) tr.ghost.color.copy(tr.l.solid.color).multiplyScalar(1.4);
    hemi.intensity = n ? 0.32 : 1.25; hemi.color.set(n ? 0x8a9ccf : 0xfff4e0); hemi.groundColor.set(n ? 0x0c0e14 : 0x6a5e50);
    sun.intensity = n ? 0.4 : 3; sun.color.set(n ? 0xa8b8ff : 0xfff0d8);
    renderer.toneMappingExposure = n ? 1.1 : 0.85; night.value = n ? 1 : 0;
    for (const l of lines) l.ghost.opacity = n ? 0.4 : 0.8; // de día el túnel compite con la ciudad clara
  };

  // ── Cámara: se arrastra para girar y gira sola despacio. Expandida funciona como mapa: un dedo
  // (o arrastrar) mueve, dos dedos (o la rueda) acercan y giran, clic derecho gira, doble toque vuela a un punto.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: true, dampingFactor: 0.08, autoRotate: !reduceMotion.matches, autoRotateSpeed: 0.3, minPolarAngle: 0.15, maxPolarAngle: 1.2, minDistance: 25, maxDistance: 9000, zoomToCursor: true, screenSpacePanning: false });
  controls.target.set(0, 0, 0); controls.enabled = !coarse; controls.update();
  if (coarse) canvas.style.touchAction = 'pan-y';
  let expanded = false;
  const ORBIT = { mouse: { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }, touch: { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN } };
  const MAP = { mouse: { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }, touch: { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE } };
  const HOME = { pos: camera.position.clone(), target: controls.target.clone() };
  // vuelo suave de la cámara (doble toque, botones + y −, vista inicial)
  let fly = null;
  const flyTo = (target, pos, dur = 0.7) => {
    if (reduceMotion.matches) { controls.target.copy(target); camera.position.copy(pos); controls.update(); loop.still(); return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), k: 0, dur }; loop.still();
  };
  const zoomBy = f => {
    const off = camera.position.clone().sub(controls.target), d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    flyTo(controls.target, controls.target.clone().add(off.setLength(d)), 0.35);
  };
  const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const flyToPoint = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    if (!ray.ray.intersectPlane(groundPlane, hit)) return;
    const off = camera.position.clone().sub(controls.target), d = Math.max(90, off.length() * 0.42);
    flyTo(hit, hit.clone().add(off.setLength(d)));
  };
  canvas.addEventListener('dblclick', e => { if (expanded) flyToPoint(e.clientX, e.clientY); });

  // ── Gestos táctiles al explorar, como en un mapa. OrbitControls no recibe el toque: con dos dedos
  // tomaba cualquier movimiento del punto medio como giro y la cámara se iba de lado al pellizcar.
  //  · un dedo: el punto del suelo que tocaste se queda bajo el dedo (y al soltar sigue con inercia)
  //  · pellizco: el punto del suelo entre los dedos se queda fijo mientras acercas o alejas
  //  · girar los dedos: rota alrededor de ese punto · subir o bajar los dos dedos juntos: inclina
  //  · doble toque: vuela hacia ese punto
  const ndc = new THREE.Vector2(), g0 = new THREE.Vector3(), g1 = new THREE.Vector3(), anchor = new THREE.Vector3(), sph = new THREE.Spherical(), UP = new THREE.Vector3(0, 1, 0);
  const groundAt = (x, y, out) => { const r = canvas.getBoundingClientRect(); ray.setFromCamera(ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera); return ray.ray.intersectPlane(groundPlane, out); };
  const moveBy = d => { controls.target.add(d); camera.position.add(d); };
  const scaleAbout = (a, f) => { camera.position.sub(a).multiplyScalar(f).add(a); controls.target.sub(a).multiplyScalar(f).add(a); };
  const rotateAbout = (a, ang) => { camera.position.sub(a).applyAxisAngle(UP, ang).add(a); controls.target.sub(a).applyAxisAngle(UP, ang).add(a); };
  const fingers = new Map(), fling = new THREE.Vector3();
  let gest = null, lastMove = 0, tap = null;
  const pair = () => { const [a, b] = [...fingers.values()]; return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
  const startPair = () => { for (const f of fingers.values()) { f.gx = f.x; f.gy = f.y; } const p = pair(); gest = { ...p, mx0: p.mx, my0: p.my, d0: p.d, ang0: p.ang, mode: null, rot: false }; };
  const redraw = () => { controls.update(); if (!loop.running) loop.still(); };
  view.addEventListener('pointerdown', e => {
    if (!expanded || e.pointerType !== 'touch' || e.target.closest('button')) return;
    e.stopPropagation(); fly = null; fling.set(0, 0, 0);
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, st: performance.now() });
    if (fingers.size === 2) startPair(); else gest = null;
  }, { capture: true });
  view.addEventListener('pointermove', e => {
    const f = fingers.get(e.pointerId); if (!f) return;
    e.stopPropagation();
    if (fingers.size === 1) {
      if (groundAt(f.x, f.y, g0) && groundAt(e.clientX, e.clientY, g1)) {
        const d = g0.sub(g1);
        if (d.length() < 1500) { moveBy(d); const now = performance.now(); fling.copy(d).multiplyScalar(1000 / Math.max(8, now - lastMove)); lastMove = now; }
      }
      f.x = e.clientX; f.y = e.clientY;
    } else if (fingers.size === 2 && gest) {
      f.x = e.clientX; f.y = e.clientY;
      const p = pair();
      // decidir el gesto tras un pequeño margen: inclinar (los dos suben o bajan juntos) o mapa (mover, acercar, girar)
      if (!gest.mode) {
        // cada dedo llega en su propio evento: se decide con lo que se movió cada uno desde el inicio
        const [a, b] = [...fingers.values()], ay = a.y - a.gy, by = b.y - b.gy, ax = a.x - a.gx, bx = b.x - b.gx;
        const ma = Math.hypot(ax, ay), mb = Math.hypot(bx, by);
        if (Math.min(ma, mb) < 12 && Math.max(ma, mb) < 40) return; // esperar a que se muevan los dos
        const ratio = Math.abs(ay) / Math.max(1, Math.abs(by)), together = Math.sign(ay) === Math.sign(by) && ratio > 0.4 && ratio < 2.5;
        gest.mode = together && Math.abs(ax) + Math.abs(bx) < 0.6 * (Math.abs(ay) + Math.abs(by)) && Math.abs(Math.sin(p.ang)) < 0.7 ? 'tilt' : 'map';
      }
      if (gest.mode === 'tilt') {
        sph.setFromVector3(camera.position.clone().sub(controls.target));
        sph.phi = THREE.MathUtils.clamp(sph.phi - (p.my - gest.my) * 0.004, controls.minPolarAngle, 1.48);
        camera.position.setFromSpherical(sph).add(controls.target);
      } else {
        if (groundAt(gest.mx, gest.my, g0) && groundAt(p.mx, p.my, g1)) { const d = g0.sub(g1); if (d.length() < 1500) moveBy(d); }
        if (groundAt(p.mx, p.my, anchor)) {
          const dist = camera.position.distanceTo(controls.target);
          scaleAbout(anchor, THREE.MathUtils.clamp(gest.d / Math.max(1, p.d), controls.minDistance / dist, controls.maxDistance / dist));
          // el giro se suelta hasta pasar 10° acumulados, para que un pellizco descuidado no gire el mapa
          if (!gest.rot && Math.abs(Math.atan2(Math.sin(p.ang - gest.ang0), Math.cos(p.ang - gest.ang0))) > 0.17) { gest.rot = true; gest.ang = p.ang; }
          const da = Math.atan2(Math.sin(p.ang - gest.ang), Math.cos(p.ang - gest.ang));
          if (gest.rot && Math.abs(da) > 0.001) rotateAbout(anchor, -da);
        }
      }
      Object.assign(gest, p);
    }
    redraw();
  }, { capture: true });
  const endTouch = e => {
    const f = fingers.get(e.pointerId); if (!f) return;
    e.stopPropagation();
    const single = fingers.size === 1; fingers.delete(e.pointerId);
    if (fingers.size === 2) startPair(); else gest = null;
    if (!single) return;
    if (performance.now() - lastMove > 90 || reduceMotion.matches) fling.set(0, 0, 0);
    // toque corto sin moverse: dos seguidos vuelan hacia ese punto
    const now = performance.now();
    if (e.type === 'pointerup' && now - f.st < 280 && Math.hypot(e.clientX - f.sx, e.clientY - f.sy) < 12) {
      if (tap && now - tap.t < 350 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 40) { tap = null; fling.set(0, 0, 0); flyToPoint(e.clientX, e.clientY); }
      else tap = { t: now, x: e.clientX, y: e.clientY };
    }
  };
  view.addEventListener('pointerup', endTouch, { capture: true });
  view.addEventListener('pointercancel', endTouch, { capture: true });
  const stepFling = dt => {
    if (fingers.size || fling.lengthSq() < 4) return;
    moveBy(g0.copy(fling).multiplyScalar(dt)); fling.multiplyScalar(Math.exp(-dt * 4.5));
  };
  const setExpanded = on => {
    expanded = on; fly = null;
    const m = on ? MAP : ORBIT; controls.mouseButtons = m.mouse; controls.touches = m.touch;
    Object.assign(controls, { enableZoom: on, enablePan: on, enabled: on || !coarse, maxPolarAngle: on ? 1.48 : 1.2 });
    if (on) controls.listenToKeyEvents(window); else controls.stopListenToKeyEvents();
    // OrbitControls deja el canvas en touch-action:none; fuera de explorar, en táctil, el dedo es para el scroll de la página
    canvas.style.touchAction = on || !coarse ? 'none' : 'pan-y'; fingers.clear(); gest = null; fling.set(0, 0, 0);
    if (labelLayer) labelLayer.hidden = !on;
    loop.still();
  };

  const resize = () => { const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 560 ? 40 : 32; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(() => { resize(); loop && loop.still(); }).observe(view);

  // ── Semáforos: ciclo de 12 s, o fijos según el filtro del tablero
  let signalMode = 'all';
  const cycle = s => (s < 5 ? 2 : s < 6.5 ? 1 : 0);
  const signals = time => {
    if (signalMode !== 'all') { sig.sA.value = sig.sB.value = { ok: 2, warn: 1, danger: 0 }[signalMode]; return; }
    const s = time % 12; sig.sA.value = cycle(s); sig.sB.value = cycle((s + 6) % 12);
  };

  // ── Trazo de las líneas (lo anima el tablero con anime.js)
  const setDrawn = (l, v) => {
    l.drawn = v; const sd = l.s0 + (l.s1 - l.s0) * v;
    for (const r of l.meshes) { const f = Math.max(0, Math.min(1, (sd - r.s0) / ((r.s1 - r.s0) || 1))); r.geo.setDrawRange(0, Math.floor(r.geo.index.count * f / 3) * 3); r.mesh.visible = f > 0; }
    l.pillars.count = Math.min(l.nPil, Math.ceil(l.nPil * v)); l.pillars.visible = l.pillars.count > 0;
    for (const st of l.line.stations) if (st.g && st.l === l) st.g.visible = sd >= st.s || v >= 1;
  };

  const v3 = new THREE.Vector3();
  const drawLabels = () => {
    if (!expanded || !labelLayer) return;
    const w = view.clientWidth, h = view.clientHeight, placed = [];
    for (const lb of labels) {
      v3.set(lb.x, lb.y, lb.z).project(camera);
      const on = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      lb.el.style.visibility = on ? '' : 'hidden';
      if (!on) continue;
      // si choca con una etiqueta ya puesta, sube un renglón (las de la misma zona quedan apiladas)
      const lw = lb.w || (lb.w = lb.el.offsetWidth || 90), x = (v3.x + 1) / 2 * w; let y = (1 - v3.y) / 2 * h;
      for (let k = 0; k < 6 && placed.some(p => Math.abs(p.x - x) < (p.w + lw) / 2 + 4 && Math.abs(p.y - y) < 22); k++) y -= 22;
      placed.push({ x, y, w: lw });
      lb.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  };

  let last = 0, loop = null, t0 = performance.now(), inFrame = false;
  const frame = now => {
    inFrame = true;
    const time = (now - t0) / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0; last = Math.max(last, now);
    placeTrains();
    signals(reduceMotion.matches ? 0 : time);
    if (fly) {
      fly.k = Math.min(1, fly.k + dt / fly.dur); const e = fly.k < 0.5 ? 4 * fly.k ** 3 : 1 - (-2 * fly.k + 2) ** 3 / 2;
      controls.target.lerpVectors(fly.t0, fly.t1, e); camera.position.lerpVectors(fly.p0, fly.p1, e);
      if (fly.k >= 1) fly = null;
    }
    stepFling(dt);
    controls.autoRotate = !reduceMotion.matches && !expanded; controls.update(dt);
    // que el centro de la vista no se salga de la zona (si no, uno se pierde en el vacío)
    const tx = THREE.MathUtils.clamp(controls.target.x, bx0, bx1) - controls.target.x, tz = THREE.MathUtils.clamp(controls.target.z, bz0, bz1) - controls.target.z;
    if (tx || tz) { controls.target.x += tx; controls.target.z += tz; camera.position.x += tx; camera.position.z += tz; }
    renderer.render(scene, camera);
    drawLabels();
    inFrame = false;
  };
  palette(); placeTrains();
  // Compilar antes del primer cuadro, sin congelar la página (el loader sigue corriendo).
  await renderer.compileAsync(scene, camera);
  loop = makeLoop(view, frame, 40);
  // fuera del loop (reduced motion o en pausa), arrastrar redibuja; dentro de un cuadro no (update() también emite change)
  controls.addEventListener('change', () => { if (!inFrame && (reduceMotion.matches || !loop.running)) loop.still(); });
  onTheme(() => { palette(); loop.still(); });
  if (labelLayer) labelLayer.hidden = true;
  loop.still();

  return {
    lines,
    setDrawn: (i, v) => { setDrawn(lines[i], v); loop.still(); },
    setSignals: mode => { signalMode = mode; loop.still(); },
    setExpanded,
    zoomBy,
    // vista inicial; en pantalla vertical, desde el sur mirando al norte para que la zona (larga de norte a sur) quepa completa
    home: () => flyTo(HOME.target, view.clientWidth / view.clientHeight < 0.8 ? new THREE.Vector3(0, 5200, 4300) : HOME.pos),
    loop
  };
}
