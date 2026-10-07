// ══════════════════════════════════════════════════════
// La hoja se curva en vuelo · Three.js r186 (shared/vendor/three, MIT).
// Durante un vuelo, el canvas 2D del mapa se usa como textura sobre una
// malla de papel que se levanta al centro y se asienta al llegar (con un
// leve cabeceo hacia donde va el avión). Fuera del vuelo no hay Three: se
// ve el canvas 2D de siempre. La cámara replica la perspectiva de CSS en
// píxeles, así la hoja plana coincide exacto con el canvas.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

export function mount({ stage, source }) {
  const canvas = document.createElement('canvas'); canvas.className = 'od-sheet-curl'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { return null; }
  stage.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
  // Como las tarjetas: el papel emite el color del mapa y la luz solo modela la curva.
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));
  const key = new THREE.DirectionalLight(0xfff2e0, 0.6); key.position.set(-0.6, 0.8, 1); scene.add(key);
  const tex = new THREE.CanvasTexture(source); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.9, transparent: true, side: THREE.DoubleSide });
  const SX = 48, SY = 32;
  let geo = null, mesh = null, w = 1, h = 1, flat = null;
  const resize = () => {
    const r = stage.getBoundingClientRect(); w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    const d = 1400; camera.aspect = w / h; camera.fov = 2 * Math.atan(h / 2 / d) * 180 / Math.PI; camera.position.set(0, 0, d); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    if (mesh) { scene.remove(mesh); geo.dispose(); }
    geo = new THREE.PlaneGeometry(w, h, SX, SY); flat = Float32Array.from(geo.attributes.position.array);
    mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  };
  resize(); new ResizeObserver(resize).observe(stage);
  // s: avance del vuelo (0 a 1); dir: dirección en pantalla del avión (-1 izquierda, 1 derecha).
  function frame(s, dir = 1) {
    const lift = Math.sin(Math.PI * s), p = geo.attributes.position, a = p.array;
    for (let i = 0; i < p.count; i++) {
      const x = flat[i * 3] / (w / 2), y = flat[i * 3 + 1] / (h / 2);
      // Arco a lo ancho (las orillas bajan), un poco a lo alto, y la orilla de adelante se levanta.
      a[i * 3 + 2] = lift * (90 * (1 - x * x) + 30 * (1 - y * y) + 26 * dir * x * (1 - y * y * 0.5));
    }
    p.needsUpdate = true; geo.computeVertexNormals();
    tex.needsUpdate = true;
    renderer.render(scene, camera);
  }
  const show = on => { canvas.style.opacity = on ? '1' : '0'; source.style.visibility = on ? 'hidden' : ''; };
  return { frame, show };
}
