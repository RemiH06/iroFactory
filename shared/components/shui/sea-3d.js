// ══════════════════════════════════════════════════════
// El mar en 3D · Three.js r186 (shared/vendor/three, MIT).
// Una capa fija detrás del contenido, encima del agua de Ferrofluid:
//  · Animales en rayos X: modelos 3D animados (Animated Fish Pack de
//    Quaternius, CC0) con un material que solo deja ver el cuerpo en sus
//    bordes, como tejido en una placa. Tres cardúmenes de peces chicos con
//    reglas de cardumen (separación, alineación, cohesión, huir del puntero)
//    y cuatro animales grandes que cruzan cada uno a su profundidad: el
//    delfín cerca de la superficie, el tiburón a media agua, la mantarraya y
//    la ballena en lo profundo. De día, hueso claro; de noche, brillo cian.
//  · Descenso: la profundidad sigue al scroll y a la corriente abierta
//    (superficie, corrientes, profundidad, desembocadura). Al bajar, el agua
//    se oscurece hacia --deep, los rayos de luz se apagan y los peces se
//    pierden en la niebla.
//  · Noche: partículas bioluminiscentes en 3D que suben (reemplazan a las
//    de canvas 2D) y que abundan más en lo profundo.
//  · En el hero, cubos de hielo de verdad (vidrio con transmisión) flotando
//    en la superficie; se van con el scroll.
// Sin WebGL, mount() devuelve null y queda el fondo de siempre.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { isDark, makeLoop, onTheme, reduceMotion } from './kit.js';

const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, v) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
const DEPTH = { superficie: 0.2, corrientes: 0.45, profundidad: 0.72, desembocadura: 1 };

// Rayos X: opacidad por el borde (fresnel) con el esqueleto animado del modelo.
// Las partes claras del modelo original (panza, franjas) quedan un poco más densas.
const xrayVs = `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vC; varying float vZ;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vN = normalize(normalMatrix * objectNormal); vV = normalize(-mvPosition.xyz); vZ = -mvPosition.z;
  #ifdef USE_COLOR
  vC = color;
  #else
  vC = vec3(0.6);
  #endif
}`;
const xrayFs = `
uniform vec3 uColor; uniform float uAlpha; uniform float uFogNear; uniform float uFogFar;
varying vec3 vN; varying vec3 vV; varying vec3 vC; varying float vZ;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float dens = 0.75 + 0.5 * dot(vC, vec3(0.299, 0.587, 0.114));
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, vZ);
  float a = (0.1 + 0.9 * rim) * dens * uAlpha * fog;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (0.75 + 0.5 * rim), a);
}`;

// Modelos: Animated Fish Pack de Quaternius (CC0), convertidos de FBX a GLB con meshopt. Todos miran a +Z.
const MODELS = '../assets/models/shui/';
const SCHOOLS = [{ file: 'fish1', n: 12, len: [70, 95] }, { file: 'fish2', n: 6, len: [62, 80] }, { file: 'fish3', n: 4, len: [50, 64] }];
// Animales grandes: cruzan de lado a lado a su profundidad (band: tramo del descenso donde se ven).
const CRUISERS = [
  { file: 'dolphin', len: 260, band: [0, 0.4], z: -260, y: 0.18, speed: 1.7 },
  { file: 'shark', len: 340, band: [0.3, 0.8], z: -420, y: -0.04, speed: 1.15 },
  { file: 'manta-ray', len: 300, band: [0.55, 1], z: -380, y: -0.22, speed: 0.8, roll: 1.05 },
  { file: 'whale', len: 600, band: [0.78, 1.01], z: -900, y: 0.1, speed: 0.5, alpha: 0.45 }
];

export function mount() {
  const canvas = document.createElement('canvas'); canvas.id = 'sh-sea'; canvas.setAttribute('aria-hidden', 'true');
  document.getElementById('sh-bio').after(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { canvas.remove(); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, 10, 3000);
  camera.position.set(0, 0, 900);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xe8fbff, 0x10324a, 1.4));
  const sun = new THREE.DirectionalLight(0xfffaf0, 2); sun.position.set(-0.3, 1, 0.5); scene.add(sun);

  let W = 1, H = 1, depth = 0, depthT = 0, night = isDark, t0 = performance.now();
  const visibleAt = z => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - z); // alto visible a profundidad z

  // ── Fondo del descenso: velo hacia --deep y rayos de luz que bajan de la superficie
  const veilMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), veilMat); veil.position.z = -900; veil.renderOrder = -2; scene.add(veil);
  const rayTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(250,253,255,.55)'); g.addColorStop(1, 'rgba(250,253,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256); const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 64, 256); return new THREE.CanvasTexture(c); })();
  const rays = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    m.userData = { x: (i / 5 - 0.5) * 1.6 + rnd(-0.1, 0.1), w: rnd(0.08, 0.2), tilt: rnd(0.12, 0.3), ph: rnd(0, 6) }; m.position.z = -600; m.renderOrder = -1; scene.add(m); return m;
  });

  // ── Animales en rayos X
  const xray = () => new THREE.ShaderMaterial({ vertexShader: xrayVs, fragmentShader: xrayFs, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 }, uFogNear: { value: 700 }, uFogFar: { value: 1500 } } });
  const mats = [], fish = [], cruisers = [], mixers = [];
  // Copia del modelo con su esqueleto, centrada y escalada a `len`, dentro de un grupo que se orienta con lookAt.
  const spawn = (gltf, mat, len) => {
    const model = cloneSkinned(gltf.scene); model.updateMatrixWorld(true);
    // Caja con los huesos aplicados: la armadura del FBX trae su propia escala y la geometría sola mide otra cosa.
    const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3()), k = len / size.z;
    model.scale.setScalar(k); model.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-k));
    model.traverse(o => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; } });
    const g = new THREE.Group(); g.add(model); scene.add(g);
    const clip = gltf.animations[0], mixer = new THREE.AnimationMixer(model), act = mixer.clipAction(clip);
    act.play(); act.time = Math.random() * clip.duration; mixers.push(mixer);
    return { g, act };
  };
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  Promise.all([...SCHOOLS, ...CRUISERS].map(m => loader.loadAsync(MODELS + m.file + '.glb'))).then(gltfs => {
    SCHOOLS.forEach((sc, si) => {
      const mat = xray(); mats.push({ mat, kind: 'school' });
      for (let i = 0; i < sc.n; i++) {
        const { g, act } = spawn(gltfs[si], mat, rnd(...sc.len));
        fish.push({ g, act, school: si, pos: new THREE.Vector3(rnd(-500, 500), rnd(-250, 250), rnd(-350, 120)), vel: new THREE.Vector3(rnd(-1, 1) > 0 ? 1.2 : -1.2, rnd(-0.2, 0.2), rnd(-0.2, 0.2)) });
      }
    });
    CRUISERS.forEach((c, ci) => {
      const mat = xray(); mats.push({ mat, kind: 'cruiser' });
      const { g, act } = spawn(gltfs[SCHOOLS.length + ci], mat, c.len);
      // Empiezan a media pasada (así el que toca a esa profundidad ya se ve) y alternan sentido.
      cruisers.push({ ...c, g, act, mat, dir: ci % 2 ? -1 : 1, x: (ci % 2 ? 1 : -1) * 0.3 * (visibleAt(c.z) * camera.aspect / 2), wait: 0, dy: 0 });
    });
    palette(); loop && loop.still();
  }).catch(e => console.warn('shui: modelos', e));
  const goal = new THREE.Vector3(), mouse = new THREE.Vector3(1e5, 1e5, 0), tmp = new THREE.Vector3(), acc = new THREE.Vector3();
  let wanderT = 0;
  addEventListener('pointermove', e => { mouse.set((e.clientX / W - 0.5) * visibleAt(0) * camera.aspect, -(e.clientY / H - 0.5) * visibleAt(0), 0); }, { passive: true });

  // ── Partículas bioluminiscentes (noche)
  const PN = 260, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pSize = new Float32Array(PN), pPh = new Float32Array(PN), pVy = new Float32Array(PN);
  const bioGeo = new THREE.BufferGeometry();
  bioGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); bioGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  bioGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1)); bioGeo.setAttribute('aPhase', new THREE.BufferAttribute(pPh, 1));
  const bioU = { uTime: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 0 } };
  const bio = new THREE.Points(bioGeo, new THREE.ShaderMaterial({ uniforms: bioU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute vec3 aColor; attribute float aSize; attribute float aPhase; uniform float uTime; uniform float uPx; varying vec3 vC; varying float vF; void main(){ vC = aColor; vF = 0.65 + 0.35 * sin(uTime * 1.6 + aPhase); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPx * (900.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uAlpha; varying vec3 vC; varying float vF; void main(){ float d = length(gl_PointCoord - 0.5); float core = smoothstep(0.18, 0.0, d); float halo = smoothstep(0.5, 0.0, d) * 0.35; float a = (core + halo) * vF * uAlpha; gl_FragColor = vec4(vC, a); }' }));
  scene.add(bio);
  const bioCols = () => ['--biolum-violet', '--biolum-rose', '--biolum-cyan', '--biolum-green', '--schema', '--cache'].map(n => new THREE.Color(cssVar(n) || '#40e0d0'));
  let cols = bioCols();
  const seedBio = (i, anywhere) => {
    const hh = visibleAt(-300);
    pPos[i * 3] = rnd(-1, 1) * hh * camera.aspect * 0.7; pPos[i * 3 + 1] = anywhere ? rnd(-0.6, 0.6) * hh : -0.65 * hh; pPos[i * 3 + 2] = rnd(-700, 250);
    const c = cols[(Math.random() * cols.length) | 0]; pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
    pSize[i] = rnd(9, 24); pPh[i] = rnd(0, 6.28); pVy[i] = rnd(0.25, 0.8);
  };

  // ── Cubos de hielo en la superficie (hero)
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe6f8fc, transparent: true, opacity: 0.3, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, depthWrite: false });
  const ice = Array.from({ length: 4 }, (_, i) => {
    const s = rnd(55, 85), m = new THREE.Mesh(new RoundedBoxGeometry(s, s * rnd(0.8, 1), s * rnd(0.85, 1), 4, s * 0.16), iceMat);
    m.userData = { fx: [0.6, 0.74, 0.88, 0.97][i], fy: [0.08, 0.03, 0.12, 0.06][i], z: rnd(-40, 140), ph: rnd(0, 6.28), spin: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize() };
    m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); scene.add(m); return m;
  });

  const palette = () => {
    night = isDark; cols = bioCols();
    const ink = new THREE.Color(cssVar('--foam') || '#c8f0f8'), glow = new THREE.Color(cssVar('--biolum-cyan') || '#00e8d8');
    for (const { mat } of mats) { mat.uniforms.uColor.value.copy(night ? glow : ink); mat.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending; }
    veilMat.color.set(cssVar('--deep') || '#062030');
    for (let i = 0; i < PN; i++) seedBio(i, true);
    bioGeo.attributes.position.needsUpdate = bioGeo.attributes.aColor.needsUpdate = true;
  };
  const resize = () => {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const vh = visibleAt(veil.position.z); veil.scale.set(vh * camera.aspect * 1.1, vh * 1.1, 1);
    bioU.uPx.value = renderer.getPixelRatio();
  };
  // Profundidad: el scroll baja del hero a la app; la corriente abierta marca el fondo.
  const readDepth = () => {
    const app = document.getElementById('corrientes'), open = document.querySelector('.sh-sec:not([hidden])');
    const fromScroll = app ? smooth(0, Math.max(1, app.offsetTop), scrollY) : 0;
    const group = open ? DEPTH[open.dataset.group] ?? 0.2 : 0.2;
    depthT = fromScroll * group;
  };

  let last = 0, loop = null;
  const frame = now => {
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0.016; last = Math.max(last, now);
    readDepth(); depth += (depthT - depth) * Math.min(1, dt * 1.5);
    const still = reduceMotion.matches;
    // Velo y rayos
    veilMat.opacity = 0.12 + depth * (night ? 0.5 : 0.62);
    const rh = visibleAt(-600), rw = rh * camera.aspect;
    for (const r of rays) {
      const u = r.userData; r.scale.set(rw * u.w, rh * 1.15, 1); r.position.x = u.x * rw * 0.5 + Math.sin(t * 0.15 + u.ph) * rw * 0.02; r.position.y = rh * 0.05; r.rotation.z = u.tilt;
      r.material.opacity = (night ? 0.06 : 0.22) * (1 - smooth(0.1, 0.75, depth)) * (0.75 + 0.25 * Math.sin(t * 0.4 + u.ph));
    }
    // Cardúmenes: cada uno con un objetivo que deriva; cada pez busca a su grupo y huye del puntero.
    if (!still) wanderT += dt;
    const hw = visibleAt(0) * camera.aspect * 0.55, hh = visibleAt(0) * 0.42;
    const goals = SCHOOLS.map((_, i) => goal.clone().set(Math.sin(wanderT * 0.13 + i * 2.1) * hw * 0.8, Math.sin(wanderT * 0.21 + 1 + i * 1.3) * hh * 0.6, -150 + Math.sin(wanderT * 0.17 + i) * 180));
    const fogFar = 1550 - depth * 650;
    for (const { mat, kind } of mats) if (kind === 'school') { const u = mat.uniforms; u.uAlpha.value = (night ? 0.75 : 0.6) * (1 - depth * 0.35); u.uFogFar.value = fogFar; u.uFogNear.value = fogFar - 800; }
    for (const f of fish) {
      if (!still) {
        acc.set(0, 0, 0);
        let n = 0; const sep = new THREE.Vector3(), ali = new THREE.Vector3(), coh = new THREE.Vector3();
        for (const o of fish) { if (o === f) continue; const d = f.pos.distanceTo(o.pos); if (d < 70) sep.add(tmp.copy(f.pos).sub(o.pos).divideScalar(d * d + 1)); if (o.school === f.school && d < 220) { n++; ali.add(o.vel); coh.add(o.pos); } }
        if (n) { acc.add(ali.divideScalar(n).sub(f.vel).multiplyScalar(0.07)); acc.add(coh.divideScalar(n).sub(f.pos).multiplyScalar(0.0012)); }
        acc.add(sep.multiplyScalar(60));
        acc.add(tmp.copy(goals[f.school]).sub(f.pos).multiplyScalar(0.00035));
        const dm = tmp.copy(f.pos).setZ(0).distanceTo(mouse); if (dm < 220) acc.add(tmp.copy(f.pos).setZ(0).sub(mouse).normalize().multiplyScalar((220 - dm) * 0.012));
        f.vel.add(acc); const sp = f.vel.length(), max = 2.6, min = 0.9; if (sp > max) f.vel.multiplyScalar(max / sp); else if (sp < min) f.vel.multiplyScalar(min / sp);
        f.vel.z *= 0.96; f.vel.y *= 0.97; f.pos.addScaledVector(f.vel, dt * 60);
      }
      f.g.position.copy(f.pos); f.g.lookAt(tmp.copy(f.pos).add(f.vel));
      f.act.timeScale = 0.7 + f.vel.length() / 2.6;
    }
    // Animales grandes: cruzan, esperan fuera de cuadro y vuelven en sentido contrario.
    for (const c of cruisers) {
      const edge = visibleAt(c.z) * camera.aspect / 2 + c.len;
      if (!still) {
        if (c.wait > 0) c.wait -= dt;
        else { c.x += c.dir * c.speed * dt * 60; if (Math.abs(c.x) > edge) { c.x = Math.sign(c.x) * edge; c.dir *= -1; c.wait = rnd(5, 12); c.dy = rnd(-0.08, 0.08); } }
      }
      const y = (c.y + c.dy) * visibleAt(c.z) + Math.sin(t * 0.25 + c.len) * 18;
      c.g.position.set(c.x, y, c.z); c.g.lookAt(c.x + c.dir * 100, y + Math.cos(t * 0.25 + c.len) * 4, c.z);
      if (c.roll) c.g.rotateZ(c.roll * c.dir);
      const w = smooth(c.band[0] - 0.12, c.band[0], depth) * (1 - smooth(c.band[1], c.band[1] + 0.12, depth));
      const u = c.mat.uniforms; u.uAlpha.value = (night ? 0.7 : 0.55) * (c.alpha ?? 1) * w; u.uFogNear.value = 1400; u.uFogFar.value = 2700;
      c.g.visible = w > 0.01;
    }
    if (!still) for (const m of mixers) m.update(dt);
    // Partículas: suben y vuelven abajo; más visibles cuanto más profundo.
    bio.visible = night; bioU.uTime.value = t; bioU.uAlpha.value = 0.55 + depth * 0.45;
    if (night && !still) { const top = visibleAt(-300) * 0.62; for (let i = 0; i < PN; i++) { pPos[i * 3 + 1] += pVy[i] * dt * 30; pPos[i * 3] += Math.sin(t * 0.5 + pPh[i]) * 0.08; if (pPos[i * 3 + 1] > top) seedBio(i, false); } bioGeo.attributes.position.needsUpdate = true; }
    // Hielo: flota en la superficie del hero y se va con el scroll.
    const ih = visibleAt(0), iw = ih * camera.aspect;
    for (const m of ice) {
      const u = m.userData; m.visible = scrollY < H * 1.2;
      m.position.set((u.fx - 0.5) * iw, (0.5 - u.fy) * ih + scrollY * (ih / H) + Math.sin(t * 0.9 + u.ph) * 6, u.z);
      if (!still) m.rotateOnAxis(u.spin, dt * 0.12);
    }
    renderer.render(scene, camera);
  };
  palette(); resize();
  for (let i = 0; i < PN; i++) seedBio(i, true);
  loop = makeLoop(document.documentElement, frame, 40);
  addEventListener('resize', () => { resize(); loop.still(); });
  addEventListener('scroll', () => { if (reduceMotion.matches) loop.still(); }, { passive: true });
  onTheme(() => { palette(); loop.still(); });
  document.body.classList.add('sea-3d');
  loop.still();
  return { loop };
}
