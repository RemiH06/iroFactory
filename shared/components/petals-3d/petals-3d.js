// ══════════════════════════════════════════════════════
// Pétalos 3D · Three.js r186 (shared/vendor/three, MIT).
// Una sola malla instanciada: cada pétalo es una gota ahuecada que da
// vueltas sobre un eje propio mientras el viento la arrastra, así la
// luz cambia al voltearse (cara clara, borde en sombra). Cámara
// ortográfica en píxeles: los tamaños y velocidades se piensan igual
// que en el canvas 2D al que reemplaza. Los colores salen de tokens.
// El dueño llama a frame() en su propio bucle, resize() al cambiar el
// tamaño y storm(n) para la tormenta de apertura. Sin WebGL, mount()
// devuelve null y el dueño quita el lienzo (los pétalos son decorativos).
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
const rnd = (a, b) => a + Math.random() * (b - a);

// Gota con la punta hacia +y, ahuecada a lo ancho y con la punta curvada:
// sin curvatura un pétalo de canto desaparece; así siempre se lee.
function petalGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(0.55, -0.35, 0.5, 0.25, 0, 0.5);
  s.bezierCurveTo(-0.5, 0.25, -0.55, -0.35, 0, -0.5);
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, 0.55 * x * x + 0.18 * (y + 0.5) * (y + 0.5));
  }
  g.computeVertexNormals();
  return g;
}

export function mount({ canvas, colors = [['--petal', 0.6], ['--yellow', 0.4]], max = 420, rate = 0.06 } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -400, 400);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xd8c4cc, 2.1)); // el revés también recibe luz: sin eso se leen como manchas cafés
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.4); sun.position.set(-0.4, 0.8, 0.6); scene.add(sun);

  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.InstancedMesh(petalGeometry(), material, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0;
  mesh.setColorAt(0, new THREE.Color()); // crea instanceColor
  scene.add(mesh);

  let W = 1, H = 1, storming = false;
  const petals = [];
  const pick = () => { let r = Math.random(); for (const [tok, w] of colors) { if ((r -= w) <= 0) return tok; } return colors[0][0]; };
  const make = () => {
    const big = storming ? 5 : 1; // los de la tormenta, 5 veces más grandes
    return {
      x: -30 - Math.random() * 100, y: Math.random() * H * 0.85,
      // La tormenta sube en diagonal de abajo a la izquierda hacia arriba a la derecha;
      // el viento tenue de siempre solo deriva a la derecha, casi plano.
      vx: rnd(0.8, 2) + (storming ? rnd(3.5, 6) : 0),
      vy: rnd(0.1, 0.4) - (storming ? rnd(4, 6.5) : 0),
      z: rnd(-120, 120),
      axis: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(),
      spin: rnd(0.02, 0.06) * (storming ? 1.8 : 1) * (Math.random() < 0.5 ? -1 : 1),
      angle: Math.random() * Math.PI * 2,
      w: rnd(6, 14) * big, h: rnd(8, 16) * big,
      color: new THREE.Color(cssVar(pick()) || '#f0a0b0'),
    };
  };
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3();

  function frame() {
    if (petals.length < max && Math.random() < rate) petals.push(make());
    let n = 0;
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += p.vx; p.y += p.vy; p.angle += p.spin;
      // Margen en los cuatro bordes: la tormenta sale por arriba, el viento tenue por la derecha.
      if (p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100) { petals.splice(i, 1); continue; }
    }
    for (const p of petals) {
      q.setFromAxisAngle(p.axis, p.angle);
      m4.compose(pos.set(p.x, -p.y, p.z), q, scl.set(p.w, p.h, p.w));
      mesh.setMatrixAt(n, m4); mesh.setColorAt(n, p.color); n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.right = W; camera.bottom = -H; camera.updateProjectionMatrix();
  }
  // Tormenta de apertura: cubre la pantalla de golpe y se despeja en diagonal
  // (abajo a la izquierda primero) a medida que los pétalos salen por arriba.
  function storm(count = 75) {
    storming = true;
    for (let i = 0; i < count && petals.length < max; i++) { const p = make(); p.x = Math.random() * W; p.y = Math.random() * H; petals.push(p); }
    setTimeout(() => { storming = false; }, 900);
  }
  resize();
  return { frame, resize, storm };
}
