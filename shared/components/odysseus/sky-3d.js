// ══════════════════════════════════════════════════════
// Esfera celeste · Three.js r186 (shared/vendor/three, MIT).
// La carta nocturna mira desde adentro de una esfera: las estrellas de la
// Osa Mayor, el Boyero y las Pléyades (las del canto V de la Odisea) van en
// sus coordenadas reales (ascensión recta y declinación, J2000), con sus
// líneas, sobre un campo de estrellas de fondo que titila. Se dibuja fuera
// del DOM y world-map.js la pega en la hoja, encima de Galaxy, como antes
// el dibujo plano. Arrastrar gira la vista; sola, deriva despacio como el
// cielo. Los colores salen de tokens (--white para las estrellas, --compass
// para las líneas).
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

const H = h => h / 24 * Math.PI * 2, D = d => d * Math.PI / 180;
// [ascensión recta en horas decimales, declinación en grados]
const CONST = [
  { name: 'Osa Mayor', stars: [[11.062, 61.75], [11.031, 56.38], [11.897, 53.69], [12.257, 57.03], [12.900, 55.96], [13.399, 54.93], [13.792, 49.31]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  { name: 'Boyero', stars: [[13.911, 18.40], [14.261, 19.18], [14.750, 27.07], [15.258, 33.31], [15.032, 40.39], [14.535, 38.31], [14.530, 30.37]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]] },
  { name: 'Pléyades', stars: [[3.791, 24.11], [3.820, 24.05], [3.749, 24.11], [3.763, 24.37], [3.772, 23.95], [3.753, 24.47], [3.819, 24.14]], lines: [] },
];
const R = 100;
const toVec = (ra, dec) => new THREE.Vector3(Math.cos(D(dec)) * Math.cos(H(ra)) * R, Math.sin(D(dec)) * R, -Math.cos(D(dec)) * Math.sin(H(ra)) * R);
const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();

export function createSky({ reduceMotion } = {}) {
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true }); }
  catch { return null; }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(100, 1.6, 1, 400);

  // Estrellas: un solo Points con tamaño y fase propios; las de las constelaciones, más grandes.
  const pos = [], size = [], phase = [];
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 1800; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.push(r * Math.cos(th) * R, u * R, r * Math.sin(th) * R);
    const m = Math.pow(rnd(), 3); size.push(1 + m * 2.6); phase.push(rnd() * 6.28);
  }
  CONST.forEach(c => c.stars.forEach(([ra, dec], i) => { const v = toVec(ra, dec); pos.push(v.x, v.y, v.z); size.push(c.lines.length ? 5.2 : 3.6); phase.push(i); }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  const starU = { uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uPx: { value: 1 } };
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aSize; attribute float aPhase; uniform float uTime; uniform float uPx; varying float vTw; void main(){ vTw = 0.75 + 0.25 * sin(uTime * 1.7 + aPhase * 3.1); gl_PointSize = aSize * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; varying float vTw; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); float a = smoothstep(0.5, 0.0, d); a = a * a; gl_FragColor = vec4(uColor * a * vTw, a * vTw); }',
  }));
  scene.add(stars);
  // Líneas de las constelaciones
  const lp = [];
  CONST.forEach(c => c.lines.forEach(([a, b]) => { const A = toVec(...c.stars[a]), B = toVec(...c.stars[b]); lp.push(A.x, A.y, A.z, B.x, B.y, B.z); }));
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false });
  scene.add(new THREE.LineSegments(lg, lineMat));
  const centers = CONST.map(c => ({ name: c.name, v: c.stars.reduce((s, st) => s.add(toVec(...st)), new THREE.Vector3()).multiplyScalar(1 / c.stars.length), low: c.stars.reduce((m, st) => Math.min(m, st[1]), 90) }));

  const refresh = () => { starU.uColor.value.set(cssVar('--white') || '#f4efe6'); lineMat.color.set(cssVar('--compass') || '#d8b060'); };
  refresh();
  // Mirada inicial: hacia la Osa Mayor y el Boyero, con la vista baja para que
  // queden en la parte alta de la hoja (la franja ártica, sin alfileres).
  let yaw = H(13.4), pitch = D(14), drift = 0, w = 1, h = 1;
  const look = new THREE.Vector3();
  const aim = () => { look.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)); camera.lookAt(look); };
  const tmp = new THREE.Vector3();
  return {
    canvas,
    resize(cw, ch) {
      w = Math.max(1, Math.round(cw)); h = Math.max(1, Math.round(ch));
      const px = Math.min(devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(px); renderer.setSize(w, h, false); starU.uPx.value = px;
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
    drag(dx, dy) { yaw += dx * 0.0035; pitch = Math.max(D(-30), Math.min(D(85), pitch + dy * 0.0035)); },
    render(t) {
      if (!reduceMotion || !reduceMotion.matches) drift = t * 0.000004; // deriva muy lenta, como el cielo
      const y0 = yaw; yaw += drift; aim(); yaw = y0;
      starU.uTime.value = reduceMotion && reduceMotion.matches ? 0 : t * 0.001;
      renderer.render(scene, camera);
    },
    // Nombres de las constelaciones a la vista, en fracción de la hoja (debajo de su estrella más baja).
    labels() {
      const out = [];
      for (const c of centers) {
        tmp.copy(c.v).project(camera);
        if (tmp.z > 1 || Math.abs(tmp.x) > 0.95 || Math.abs(tmp.y) > 0.95) continue;
        out.push({ name: c.name, x: (tmp.x + 1) / 2, y: (1 - tmp.y) / 2 + 0.07 });
      }
      return out;
    },
    refresh,
  };
}
