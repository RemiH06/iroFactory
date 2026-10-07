// ══════════════════════════════════════════════════════
// El mar en 3D · Three.js r186 (shared/vendor/three, MIT).
// Una capa fija detrás del contenido, encima del agua de Ferrofluid:
//  · Cardumen de peces navaja (Centriscus scutatus) recortados de su
//    radiografía. Cada pez es una tira de malla que ondula a lo largo del
//    cuerpo (la cola mueve más que la cabeza) y nada con reglas simples de
//    cardumen: separación, alineación, cohesión y huir del puntero.
//    La radiografía da la forma: su luminancia es la opacidad. De día, hueso
//    claro como las radiografías del hero; de noche, brillo cian.
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
import { isDark, makeLoop, onTheme, reduceMotion } from './kit.js';

const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, v) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
const DEPTH = { superficie: 0.2, corrientes: 0.45, profundidad: 0.72, desembocadura: 1 };

const fishVs = `
uniform float uTime; uniform float uPhase; uniform float uSwim;
varying vec2 vUv; varying float vZ;
void main() {
  vUv = uv;
  vec3 p = position;
  // La cabeza va a la izquierda de la textura (uv.x = 0); la ola crece hacia la cola.
  float k = pow(uv.x, 1.5);
  float w = sin(uTime * (5.0 + 3.0 * uSwim) - uv.x * 7.0 + uPhase);
  p.z += w * k * 0.16;
  p.y += w * k * 0.03;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const fishFs = `
uniform sampler2D uMap; uniform vec3 uColor; uniform float uAlpha; uniform float uNight; uniform float uFogNear; uniform float uFogFar;
varying vec2 vUv; varying float vZ;
void main() {
  float l = texture2D(uMap, vUv).r;
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, vZ);
  float a = smoothstep(0.08, 0.7, l) * uAlpha * fog;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * (uNight > 0.5 ? (0.55 + l) : 1.0), a);
}`;

// Peces: recortes de la radiografía de Centriscus scutatus (src/img/fish), la cabeza a la izquierda.
const FISH = [1, 2, 3, 4].map(i => `../assets/img/shui/razorfish-${i}.webp`);

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

  // ── Cardumen
  const loader = new THREE.TextureLoader(), N = 18, fish = [];
  const texs = FISH.map(src => { const tex = loader.load(src, () => loop && loop.still()); tex.colorSpace = THREE.NoColorSpace; return tex; });
  // Un material por pez (fase y nado propios) que comparte la textura de su recorte.
  const fishMat = tex => new THREE.ShaderMaterial({ vertexShader: fishVs, fragmentShader: fishFs, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uPhase: { value: 0 }, uSwim: { value: 0 }, uColor: { value: new THREE.Color() }, uAlpha: { value: 0.5 }, uNight: { value: 0 }, uFogNear: { value: 700 }, uFogFar: { value: 1500 } } });
  const fishGeo = new THREE.PlaneGeometry(1, 1, 28, 1);
  for (let i = 0; i < N; i++) {
    const mat = fishMat(texs[i % texs.length]);
    const mesh = new THREE.Mesh(fishGeo, mat); scene.add(mesh);
    const len = rnd(110, 175);
    fish.push({ mesh, mat, len, pos: new THREE.Vector3(rnd(-500, 500), rnd(-250, 250), rnd(-350, 120)), vel: new THREE.Vector3(rnd(-1, 1) > 0 ? 1.2 : -1.2, rnd(-0.2, 0.2), rnd(-0.2, 0.2)), phase: rnd(0, 6.28) });
    mat.uniforms.uPhase.value = fish[i].phase;
  }
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
    for (const f of fish) { f.mat.uniforms.uColor.value.copy(night ? glow : ink); f.mat.uniforms.uNight.value = night ? 1 : 0; }
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
    const t = (now - t0) / 1000, dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    readDepth(); depth += (depthT - depth) * Math.min(1, dt * 1.5);
    const still = reduceMotion.matches;
    // Velo y rayos
    veilMat.opacity = 0.12 + depth * (night ? 0.5 : 0.62);
    const rh = visibleAt(-600), rw = rh * camera.aspect;
    for (const r of rays) {
      const u = r.userData; r.scale.set(rw * u.w, rh * 1.15, 1); r.position.x = u.x * rw * 0.5 + Math.sin(t * 0.15 + u.ph) * rw * 0.02; r.position.y = rh * 0.05; r.rotation.z = u.tilt;
      r.material.opacity = (night ? 0.06 : 0.22) * (1 - smooth(0.1, 0.75, depth)) * (0.75 + 0.25 * Math.sin(t * 0.4 + u.ph));
    }
    // Cardumen: un objetivo que deriva; cada pez busca el grupo y huye del puntero.
    if (!still) wanderT += dt;
    const hw = visibleAt(0) * camera.aspect * 0.55, hh = visibleAt(0) * 0.42;
    goal.set(Math.sin(wanderT * 0.13) * hw * 0.8, Math.sin(wanderT * 0.21 + 1) * hh * 0.6, -150 + Math.sin(wanderT * 0.17) * 180);
    const fogFar = 1550 - depth * 650;
    for (const f of fish) {
      if (!still) {
        acc.set(0, 0, 0);
        let n = 0; const sep = new THREE.Vector3(), ali = new THREE.Vector3(), coh = new THREE.Vector3();
        for (const o of fish) { if (o === f) continue; const d = f.pos.distanceTo(o.pos); if (d < 220) { n++; ali.add(o.vel); coh.add(o.pos); if (d < 70) sep.add(tmp.copy(f.pos).sub(o.pos).divideScalar(d * d + 1)); } }
        if (n) { acc.add(ali.divideScalar(n).sub(f.vel).multiplyScalar(0.07)); acc.add(coh.divideScalar(n).sub(f.pos).multiplyScalar(0.0012)); }
        acc.add(sep.multiplyScalar(60));
        acc.add(tmp.copy(goal).sub(f.pos).multiplyScalar(0.00035));
        const dm = tmp.copy(f.pos).setZ(0).distanceTo(mouse); if (dm < 220) acc.add(tmp.copy(f.pos).setZ(0).sub(mouse).normalize().multiplyScalar((220 - dm) * 0.012));
        f.vel.add(acc); const sp = f.vel.length(), max = 2.6, min = 0.9; if (sp > max) f.vel.multiplyScalar(max / sp); else if (sp < min) f.vel.multiplyScalar(min / sp);
        f.vel.z *= 0.96; f.vel.y *= 0.97; f.pos.addScaledVector(f.vel, dt * 60);
      }
      // Orientación: el pez mira hacia donde nada (la textura mira a la izquierda).
      const left = f.vel.x < 0, ang = Math.atan2(f.vel.y, Math.abs(f.vel.x));
      f.mesh.position.copy(f.pos);
      f.mesh.scale.set(f.len * (left ? 1 : -1), f.len * 0.17, 1);
      f.mesh.rotation.set(0, f.vel.z * 0.25, left ? -ang : ang);
      const u = f.mat.uniforms; u.uTime.value = still ? 0 : t; u.uSwim.value = Math.min(1, f.vel.length() / 2.6);
      u.uAlpha.value = (night ? 0.6 : 0.5) * (1 - depth * 0.35); u.uFogFar.value = fogFar; u.uFogNear.value = fogFar - 800;
    }
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
