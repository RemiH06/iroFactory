// ══════════════════════════════════════════════════════
// Estatua 3D · un modelo glTF (geometría con meshopt, textura sin luz
// horneada) que gira despacio y se puede girar arrastrando. Mismo
// lenguaje que las estatuas en foto de apolo: siempre en blanco y negro
// con tinte de un token (luminancia 0.2126/0.7152/0.0722 y tinte
// `l * tint * 1.9` al 30%, la fórmula de Ripple Distortion), y el color
// real vuelve solo alrededor del puntero.
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

export function mount({ el, src, tint = '--sky', tintAmount = 0.3, reveal = 150, speed = 0.22, yaw = 0 } = {}) {
  const media = typeof el === 'string' ? document.querySelector(el) : el;
  if (!media || !src) return;
  const figure = media.closest('figure') || media;
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); media.appendChild(canvas); media.classList.add('statue-3d');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { canvas.remove(); return; }
  // Sin conversiones de color: la textura se lee tal cual, como la foto de las otras estatuas.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 3 / 4, 0.1, 500), pivot = new THREE.Group();
  scene.add(pivot);
  const uniforms = { uMap: { value: null }, uTint: { value: new THREE.Vector3(...tokenRgb(tint)) }, uTintAmount: { value: tintAmount }, uMouse: { value: new THREE.Vector2(-1e4, -1e4) }, uReveal: { value: 0 }, uRadius: { value: reveal } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uTint; uniform float uTintAmount; uniform vec2 uMouse; uniform float uReveal; uniform float uRadius;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 mono = mix(vec3(l), l * uTint * 1.9, uTintAmount);
  float d = distance(gl_FragCoord.xy, uMouse);
  float m = uReveal * (1.0 - smoothstep(uRadius * 0.45, uRadius, d));
  gl_FragColor = vec4(mix(mono, c, m), 1.0);
}`,
    side: THREE.DoubleSide,
  });

  let angle = yaw, vel = 0, dragging = false, lastX = 0, lastT = 0, ready = false, hover = false;
  const resize = () => {
    const r = media.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    uniforms.uRadius.value = reveal * renderer.getPixelRatio();
  };
  const frame = (t) => {
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0); lastT = t;
    if (!dragging) { vel *= Math.pow(0.04, dt); angle += (reduceMotion.matches ? 0 : speed * dt) + vel * dt; }
    pivot.rotation.y = angle;
    uniforms.uReveal.value += ((hover ? 1 : 0) - uniforms.uReveal.value) * Math.min(1, dt * 6);
    renderer.render(scene, camera);
  };

  // Bucle: solo mientras la estatua se ve y la pestaña está visible.
  let raf = 0, visible = false;
  const tick = t => { raf = 0; if (!ready) return; frame(t); if (visible && !document.hidden) raf = requestAnimationFrame(tick); };
  const start = () => { if (!raf && visible && ready && !document.hidden) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '100px 0px' }).observe(media);
  document.addEventListener('visibilitychange', start);

  // Arrastrar gira la estatua (con inercia); pasar el puntero revela el color.
  const toBuffer = e => { const r = canvas.getBoundingClientRect(), pr = renderer.getPixelRatio(); return [(e.clientX - r.left) * pr, (r.bottom - e.clientY) * pr]; };
  media.addEventListener('pointerenter', () => { hover = true; start(); });
  media.addEventListener('pointerleave', () => { hover = false; dragging = false; });
  media.addEventListener('pointermove', e => {
    uniforms.uMouse.value.set(...toBuffer(e));
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; angle += dx * 0.012; vel = dx * 0.012 * 60; }
    start();
  }, { passive: true });
  media.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; media.setPointerCapture?.(e.pointerId); });
  media.addEventListener('pointerup', () => { dragging = false; if (reduceMotion.matches) vel = 0; });

  // El tinte sigue al tema: se relee el token cuando cambia la clase del body.
  new MutationObserver(() => { uniforms.uTint.value.set(...tokenRgb(tint)); start(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(() => { resize(); if (ready && !raf) frame(performance.now()); }).observe(media);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(src, gltf => {
    const model = gltf.scene;
    model.traverse(o => {
      if (!o.isMesh) return;
      const map = o.material.map; if (map) { map.colorSpace = THREE.NoColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
      uniforms.uMap.value = uniforms.uMap.value || map; o.material = material;
    });
    // Centrar en el eje de giro y encuadrar la figura completa.
    const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    model.position.set(-c.x, -c.y, -c.z); pivot.add(model); resize();
    const fitH = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))), fitW = Math.max(size.x, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.set(0, 0, Math.max(fitH, fitW) * 1.08); camera.lookAt(0, 0, 0);
    ready = true; figure.classList.add('is-gl', 'is-3d'); frame(performance.now()); start();
  }, undefined, () => canvas.remove());
}
