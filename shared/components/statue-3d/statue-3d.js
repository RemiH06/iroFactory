// ══════════════════════════════════════════════════════
// Estatua 3D · un modelo glTF (geometría con meshopt, textura sin luz
// horneada) que gira despacio y se puede girar arrastrando. Mismo
// lenguaje que las estatuas en foto de apolo: Ripple Distortion de
// React Bits como postproceso. La escena se dibuja a una textura, las
// olas del puntero a un mapa de desplazamiento, y la composición las
// junta igual que en las fotos: siempre en blanco y negro con tinte de
// un token (luminancia 0.2126/0.7152/0.0722 y `l * tint * 1.9` al 30%),
// y el color real vuelve solo donde pasan las olas.
// Three.js r186 (shared/vendor/three, MIT). La página declara el import
// map de "three". Sin WebGL o si el modelo no carga, queda la <img>.
// El color sigue al tema mirando la clase del body, así sirve en
// cualquier tema sin depender de su cambio de modo.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const tokenRgb = name => {
  let h = getComputedStyle(document.body).getPropertyValue(name).trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? [0.6, 0.75, 0.9] : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Parámetros del Ripple de las estatuas en foto (statues.js).
const MAX_WAVES = 24, BRUSH = 150, SWIRL = 1, RINGS = 4, SPREAD = 5, FADE = 3, SPACING = 15, STRENGTH = 0.06;
const LIFE_K = Math.log(500);

const quadVs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const waveVs = 'varying vec2 vUv; uniform vec2 uOffset; uniform vec2 uScale; void main(){ vUv = uv; gl_Position = vec4(uOffset + position.xy * uScale, 0.0, 1.0); }';
const waveFs = `varying vec2 vUv; uniform float uOpacity; uniform float uRings;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float edge = 0.006737947;
  float brush = (exp(-r * 5.0) - edge) / (1.0 - edge);
  brush *= 0.55 + 0.45 * cos(sqrt(r) * 6.283185307 * uRings);
  gl_FragColor = vec4(vec3(brush * uOpacity * uOpacity), 1.0);
}`;
const compFs = `varying vec2 vUv;
uniform sampler2D uScene; uniform sampler2D uDisplacement;
uniform float uStrength; uniform float uSwirl; uniform vec3 uTint; uniform float uTintAmount;
void main() {
  float amount = texture2D(uDisplacement, vUv).r;
  float theta = amount * uSwirl * 6.283185307;
  vec2 uv = vUv + vec2(sin(theta), cos(theta)) * amount * uStrength;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  vec4 c = texture2D(uScene, uv); // premultiplicado: el fondo se limpió a alfa 0
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 mono = mix(vec3(l), l * uTint * 1.9, uTintAmount);
  gl_FragColor = vec4(mix(mono, c.rgb, clamp(amount * 2.0, 0.0, 1.0)), c.a);
}`;

export function mount({ el, src, tint = '--sky', tintAmount = 0.3, speed = 0.22, yaw = 0 } = {}) {
  const media = typeof el === 'string' ? document.querySelector(el) : el;
  if (!media || !src) return;
  const figure = media.closest('figure') || media;
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); media.appendChild(canvas); media.classList.add('statue-3d');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true }); }
  catch { canvas.remove(); return; }
  // Sin conversiones de color: la textura se lee tal cual, como la foto de las otras estatuas.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.autoClear = false;

  // Pasada 1 · la estatua con su color real, a una textura con MSAA.
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 3 / 4, 0.1, 500), pivot = new THREE.Group();
  scene.add(pivot);
  const sceneRT = new THREE.WebGLRenderTarget(2, 2, { samples: 4 });
  const modelMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(uMap, vUv).rgb, 1.0); }',
    side: THREE.DoubleSide,
  });

  // Pasada 2 · olas del puntero sumadas en un mapa de desplazamiento a 0.6 de resolución.
  const waveRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const plane = new THREE.PlaneGeometry(2, 2);
  const waveMat = new THREE.ShaderMaterial({
    uniforms: { uOffset: { value: new THREE.Vector2() }, uScale: { value: new THREE.Vector2() }, uOpacity: { value: 0 }, uRings: { value: RINGS } },
    vertexShader: waveVs, fragmentShader: waveFs, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
  });
  const waveScene = new THREE.Scene(), waveMesh = new THREE.Mesh(plane, waveMat);
  waveMesh.frustumCulled = false; waveScene.add(waveMesh);

  // Pasada 3 · composición: desplazamiento, blanco y negro con tinte, color donde pasan las olas.
  const compU = { uScene: { value: sceneRT.texture }, uDisplacement: { value: waveRT.texture }, uStrength: { value: STRENGTH }, uSwirl: { value: SWIRL }, uTint: { value: new THREE.Vector3(...tokenRgb(tint)) }, uTintAmount: { value: tintAmount } };
  const compScene = new THREE.Scene(), compMesh = new THREE.Mesh(plane, new THREE.ShaderMaterial({ uniforms: compU, vertexShader: quadVs, fragmentShader: compFs, depthTest: false, depthWrite: false }));
  compMesh.frustumCulled = false; compScene.add(compMesh);

  const waves = Array.from({ length: MAX_WAVES }, () => ({ x: 0, y: 0, scale: 1.5, target: 1.5, opacity: 0 }));
  let current = 0, cssW = 1, cssH = 1;
  const spawn = (x, y) => { const w = waves[current]; current = (current + 1) % MAX_WAVES; Object.assign(w, { x, y, scale: 1.5, target: 1.5 * SPREAD, opacity: 1 }); };

  let angle = yaw, vel = 0, dragging = false, lastX = 0, lastT = 0, ready = false;
  const resize = () => {
    const r = media.getBoundingClientRect(); if (!r.width || !r.height) return;
    cssW = r.width; cssH = r.height;
    renderer.setSize(cssW, cssH, false); camera.aspect = cssW / cssH; camera.updateProjectionMatrix();
    const db = renderer.getDrawingBufferSize(new THREE.Vector2());
    sceneRT.setSize(db.x, db.y);
    waveRT.setSize(Math.max(2, Math.round(cssW * 0.6)), Math.max(2, Math.round(cssH * 0.6)));
  };
  const frame = (t) => {
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0); lastT = t;
    if (!dragging) { vel *= Math.pow(0.04, dt); angle += (reduceMotion.matches ? 0 : speed * dt) + vel * dt; }
    pivot.rotation.y = angle;

    renderer.setRenderTarget(sceneRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);

    const growth = 1 - Math.exp(-dt * 1.09), decay = Math.exp((-dt * LIFE_K) / FADE);
    renderer.setRenderTarget(waveRT); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (const w of waves) {
      if (w.opacity <= 0) continue;
      w.opacity *= decay; w.scale += (w.target - w.scale) * growth;
      if (w.opacity < 0.002) { w.opacity = 0; continue; }
      const half = (w.scale * BRUSH) / 2;
      waveMat.uniforms.uOffset.value.set((w.x / cssW) * 2 - 1, (w.y / cssH) * 2 - 1);
      waveMat.uniforms.uScale.value.set((half / cssW) * 2, (half / cssH) * 2);
      waveMat.uniforms.uOpacity.value = w.opacity;
      renderer.render(waveScene, flat);
    }

    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(compScene, flat);
  };

  // Bucle: solo mientras la estatua se ve y la pestaña está visible.
  let raf = 0, visible = false;
  const tick = t => { raf = 0; if (!ready) return; frame(t); if (visible && !document.hidden) raf = requestAnimationFrame(tick); };
  const start = () => { if (!raf && visible && ready && !document.hidden) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '100px 0px' }).observe(media);
  document.addEventListener('visibilitychange', start);

  // Arrastrar gira la estatua (con inercia); mover el puntero suelta olas, como en las fotos.
  let prevX = -999, prevY = -999;
  media.addEventListener('pointermove', e => {
    const r = media.getBoundingClientRect(), x = e.clientX - r.left, y = r.height - (e.clientY - r.top);
    if (!reduceMotion.matches && (Math.abs(x - prevX) > SPACING || Math.abs(y - prevY) > SPACING)) { spawn(x, y); prevX = x; prevY = y; }
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.012; vel = dx * 0.012 * 60; }
    start();
  }, { passive: true });
  media.addEventListener('pointerleave', () => { dragging = false; });
  media.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; media.setPointerCapture?.(e.pointerId); });
  media.addEventListener('pointerup', () => { dragging = false; if (reduceMotion.matches) vel = 0; });

  // El tinte sigue al tema: se relee el token cuando cambia la clase del body.
  new MutationObserver(() => { compU.uTint.value.set(...tokenRgb(tint)); if (ready && !raf) frame(performance.now()); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(() => { resize(); if (ready && !raf) frame(performance.now()); }).observe(media);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(src, gltf => {
    const model = gltf.scene;
    model.traverse(o => {
      if (!o.isMesh) return;
      const map = o.material.map; if (map) { map.colorSpace = THREE.NoColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
      modelMat.uniforms.uMap.value = modelMat.uniforms.uMap.value || map; o.material = modelMat;
    });
    // Centrar en el eje de giro y encuadrar la figura completa.
    const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    model.position.set(-c.x, -c.y, -c.z); pivot.add(model); resize();
    const fitH = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))), fitW = Math.max(size.x, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.set(0, 0, Math.max(fitH, fitW) * 1.08); camera.lookAt(0, 0, 0);
    ready = true; figure.classList.add('is-gl', 'is-3d'); frame(performance.now()); start();
  }, undefined, () => canvas.remove());
}
