// ══════════════════════════════════════════════════════
// Tarjetas de papel 3D · Three.js r186 (shared/vendor/three, MIT).
// Los botones del carrusel siguen siendo el carrusel (transiciones CSS,
// arrastre, teclado, foco y lectores de pantalla), pero sin fondo: detrás,
// una tarjeta de papel por botón copia en cada cuadro la transformación 3D
// que el CSS le da, con la misma perspectiva del escenario. El papel va
// combado, con luz y sombra. La tarjeta del frente muestra su contenido
// HTML encima (nítido y seleccionable); las de los lados, giradas y
// atenuadas, llevan el contenido dibujado en su textura, porque el HTML de
// una tarjeta de atrás se vería encima del papel de la del frente.
// Sin WebGL los botones quedan como estaban.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

const PX = 3; // textura de las tarjetas de los lados: 3 px por px de CSS

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// La ilustración SVG usa clases con colores del tema: se copian a atributos antes de rasterizarla.
function svgImage(svg, w, h) {
  const clone = svg.cloneNode(true), src = [...svg.querySelectorAll('*')], dst = [...clone.querySelectorAll('*')];
  src.forEach((el, i) => { const cs = getComputedStyle(el); dst[i].setAttribute('fill', cs.fill); dst[i].setAttribute('stroke', cs.stroke); dst[i].setAttribute('stroke-width', cs.strokeWidth); });
  clone.setAttribute('width', w * PX); clone.setAttribute('height', h * PX); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clone.outerHTML); });
}

// Papel: forma redondeada con el color y el borde de los tokens (el botón ya es
// transparente en modo 3D, así que se leen con un elemento de prueba).
function paintPaper(card, ctx, W, H) {
  const probe = document.createElement('span'); probe.style.cssText = `position:absolute;visibility:hidden;background:var(--bg2);border:1px solid ${card.getAttribute('aria-current') === 'true' ? 'var(--route-ink)' : 'var(--glass-edge)'}`;
  document.body.appendChild(probe); const pb = getComputedStyle(probe), paper = pb.backgroundColor, edge = pb.borderTopColor; probe.remove();
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 12); ctx.fillStyle = paper; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = edge; ctx.stroke();
}
// Contenido del botón (medido sin transformar): píldora, punto, ilustración, nombre y lugar.
async function paintContent(card, ctx, W) {
  const prev = card.style.transform; card.style.transform = 'none';
  const box = card.getBoundingClientRect(), k = W / box.width, at = el => { const r = el.getBoundingClientRect(); return { x: (r.left - box.left) * k, y: (r.top - box.top) * k, w: r.width * k, h: r.height * k }; };
  const pill = card.querySelector('.od-pill'), dot = card.querySelector('.od-dot'), ill = card.querySelector('.od-ill'), name = card.querySelector('.od-card-name'), sub = card.querySelector('.od-card-sub');
  const L = { pill: at(pill), dot: at(dot), ill: at(ill), name: at(name), sub: at(sub) };
  card.style.transform = prev;
  const img = await svgImage(ill, L.ill.w, L.ill.h);
  const ps = getComputedStyle(pill); roundRect(ctx, L.pill.x, L.pill.y, L.pill.w, L.pill.h, L.pill.h / 2); ctx.strokeStyle = ps.borderTopColor; ctx.stroke();
  ctx.fillStyle = ps.color; ctx.font = `${ps.fontSize} ${ps.fontFamily}`; ctx.textBaseline = 'middle'; ctx.fillText(pill.textContent, L.pill.x + parseFloat(ps.paddingLeft) + 1, L.pill.y + L.pill.h / 2 + 1);
  const ds = getComputedStyle(dot); ctx.save(); ctx.shadowColor = ds.backgroundColor; ctx.shadowBlur = 8; ctx.fillStyle = ds.backgroundColor; ctx.beginPath(); ctx.arc(L.dot.x + L.dot.w / 2, L.dot.y + L.dot.h / 2, L.dot.w / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  roundRect(ctx, L.ill.x, L.ill.y, L.ill.w, L.ill.h, 8); ctx.fillStyle = getComputedStyle(ill).backgroundColor; ctx.fill();
  if (img) ctx.drawImage(img, L.ill.x, L.ill.y, L.ill.w, L.ill.h);
  const ns = getComputedStyle(name); ctx.fillStyle = ns.color; ctx.font = `${ns.fontSize} ${ns.fontFamily}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(name.textContent, L.name.x, L.name.y + parseFloat(ns.fontSize) * 0.92, W - 2 * L.name.x);
  const ss = getComputedStyle(sub); ctx.fillStyle = ss.color; ctx.font = `${ss.fontSize} ${ss.fontFamily}`; ctx.fillText(sub.textContent, L.sub.x, L.sub.y + parseFloat(ss.fontSize), W - 2 * L.sub.x);
}
async function paint(card, canvas, withContent) {
  const W = card.offsetWidth, H = card.offsetHeight, ctx = canvas.getContext('2d');
  canvas.width = W * PX; canvas.height = H * PX; ctx.setTransform(PX, 0, 0, PX, 0, 0);
  paintPaper(card, ctx, W, H);
  if (withContent) await paintContent(card, ctx, W);
}

// Papel apenas combado a lo ancho: así la luz lo modela al girar.
function paperGeometry(w, h) {
  const g = new THREE.PlaneGeometry(w, h, 24, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2); p.setZ(i, -6 * x * x); }
  g.computeVertexNormals(); return g;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(30,18,6,.55)'); g.addColorStop(1, 'rgba(30,18,6,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function mount({ stage, track, onTheme, makeLoop }) {
  const cards = [...track.querySelectorAll('.od-card')];
  const canvas = document.createElement('canvas'); canvas.className = 'od-cards-3d'; canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch { return null; }
  stage.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 10, 4000);
  // El papel emite su propio color (el de los tokens, igual que el botón) y la luz
  // solo agrega el modelado de la curva: así no se lava de día ni se apaga de noche.
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.DirectionalLight(0xfff2e0, 0.45); key.position.set(-0.5, 0.7, 1); scene.add(key);
  const W = cards[0].offsetWidth, H = cards[0].offsetHeight, geo = paperGeometry(W, H), shadowGeo = new THREE.PlaneGeometry(W * 1.25, H * 1.15), shadowTex = shadowTexture();
  const makeTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const items = cards.map(card => {
    const full = document.createElement('canvas'), paper = document.createElement('canvas');
    const texFull = makeTex(full), texPaper = makeTex(paper);
    const mat = new THREE.MeshStandardMaterial({ map: texFull, emissiveMap: texFull, emissive: 0xffffff, emissiveIntensity: 0.82, roughness: 0.88, metalness: 0, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); mesh.matrixAutoUpdate = false;
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.matrixAutoUpdate = false;
    scene.add(shadow, mesh);
    return { card, full, paper, texFull, texPaper, mat, mesh, shadow, key: '', front: null };
  });
  let sw = 1, sh = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect(); sw = r.width; sh = r.height;
    const persp = parseFloat(getComputedStyle(stage).perspective) || 900;
    renderer.setSize(sw, sh, false);
    camera.aspect = sw / sh; camera.fov = 2 * Math.atan(sh / 2 / persp) * 180 / Math.PI; camera.position.set(0, 0, persp); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  };
  // Repinta las caras cuando cambia lo que muestran (puerto actual, visitado, modo).
  const repaint = async (force) => {
    for (const it of items) {
      const k = [it.card.getAttribute('aria-current'), it.card.querySelector('.od-dot').className, document.body.className].join('|');
      if (!force && k === it.key) continue; it.key = k;
      await paint(it.card, it.full, true); await paint(it.card, it.paper, false);
      it.texFull.needsUpdate = true; it.texPaper.needsUpdate = true;
    }
  };
  const flip = new THREE.Matrix4().makeScale(1, -1, 1), css = new THREE.Matrix4(), base = new THREE.Matrix4(), off = new THREE.Matrix4();
  const frame = () => {
    for (const it of items) {
      // La del frente (la enfocable) muestra su HTML; las demás, su textura con contenido.
      const front = it.card.tabIndex === 0;
      if (front !== it.front) { it.front = front; it.card.classList.toggle('is-front', front); const t = front ? it.texPaper : it.texFull; it.mat.map = t; it.mat.emissiveMap = t; it.mat.needsUpdate = true; }
      const cs = getComputedStyle(it.card), t = cs.transform, op = parseFloat(cs.opacity);
      it.mesh.visible = it.shadow.visible = op > 0.01;
      if (!it.mesh.visible) continue;
      if (t && t !== 'none') { const m = new DOMMatrix(t); css.set(m.m11, m.m21, m.m31, m.m41, m.m12, m.m22, m.m32, m.m42, m.m13, m.m23, m.m33, m.m43, m.m14, m.m24, m.m34, m.m44); }
      else css.identity();
      // Centro de la tarjeta sin transformar, en coordenadas del escenario (y hacia arriba).
      const cx = it.card.offsetLeft + it.card.offsetWidth / 2 + it.card.offsetParent.offsetLeft - sw / 2, cy = sh / 2 - (it.card.offsetTop + it.card.offsetHeight / 2 + it.card.offsetParent.offsetTop);
      base.makeTranslation(cx, cy, 0).multiply(flip).multiply(css).multiply(flip);
      it.mesh.matrix.copy(base); it.mat.opacity = op;
      it.shadow.matrix.copy(base).multiply(off.makeTranslation(6, -14, -10)); it.shadow.material.opacity = op * 0.8;
      it.mesh.renderOrder = it.shadow.renderOrder = parseInt(cs.zIndex, 10) || 0;
    }
    renderer.render(scene, camera);
  };
  const loop = makeLoop(stage, frame);
  resize();
  new ResizeObserver(() => { resize(); loop.still(); }).observe(stage);
  const fonts = document.fonts ? document.fonts.load("20px 'Debonair Inline'").catch(() => {}) : Promise.resolve();
  fonts.then(() => repaint(true)).then(() => { stage.classList.add('is-3d'); loop.still(); });
  new MutationObserver(() => repaint(false).then(() => loop.still())).observe(track, { attributes: true, subtree: true, attributeFilter: ['aria-current', 'class'] });
  onTheme(() => setTimeout(() => repaint(true).then(() => loop.still()), 450)); // tras la transición de color del tema
  return { repaint };
}
