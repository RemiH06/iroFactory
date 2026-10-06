// ══════════════════════════════════════════════════════
// CAPA 3 · Pétalos y hierba volando
// ══════════════════════════════════════════════════════
import { isDark } from './kit.js';

export const petalCanvas = document.getElementById('ap-petals');
export const pCtx = petalCanvas.getContext('2d');
export let petalW, petalH, petals = [];
export let avalancheActive = false;
export function makePetal() {
  const col = Math.random() < 0.6
    ? (isDark ? '#D06070' : '#F0A0B0')
    : (isDark ? '#E0A820' : '#F0C840');
  const boost = avalancheActive ? 1 : 0;
  const sizeMult = avalancheActive ? 5 : 1; // pétalos de tormenta, 500% más grandes
  return {
    type: 'petal',
    x: -30 - Math.random() * 100,
    y: Math.random() * petalH * 0.85,
    // La tormenta sube en diagonal de abajo-izquierda a arriba-derecha;
    // el viento tenue de siempre solo deriva a la derecha, casi plano.
    vx: (0.8 + Math.random() * 1.2) + boost * (3.5 + Math.random() * 2.5),
    vy: (0.1 + Math.random() * 0.3) - boost * (4 + Math.random() * 2.5),
    angle: Math.random() * Math.PI * 2,
    vAngle: (Math.random() - 0.5) * (avalancheActive ? 0.1 : 0.04),
    w: (6 + Math.random() * 8) * sizeMult,
    h: (4 + Math.random() * 5) * sizeMult,
    col,
    alpha: 0.6 + Math.random() * 0.3,
  };
}
// ── Tormenta de apertura · cubre toda la pantalla de golpe y se
// revela en diagonal (abajo-izquierda se limpia primero, arriba-
// derecha al final) a medida que los pétalos salen por ahí. ──
export function seedAvalanche() {
  avalancheActive = true;
  const n = 75; // antes 150: a la mitad, a pedido
  for (let i = 0; i < n; i++) {
    const p = makePetal();
    p.x = Math.random() * petalW;
    p.y = Math.random() * petalH;
    petals.push(p);
  }
  setTimeout(() => { avalancheActive = false; }, 900);
}
export function resizePetals() {
  petalW = petalCanvas.width  = window.innerWidth;
  petalH = petalCanvas.height = window.innerHeight;
}
export function drawPetals() {
  pCtx.clearRect(0, 0, petalW, petalH);

  // Generar nuevos a ritmo de viento tenue · el chubasco inicial ya
  // se sembró aparte en seedAvalanche(), esto no lo infla más
  if (Math.random() < 0.06) petals.push(makePetal());

  petals = petals.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.vAngle;
    // ellipse() ya acepta rotación como parámetro nativo · evita el
    // save/translate/rotate/restore por pétalo, caro multiplicado por
    // miles (era el cuello de botella real con la tormenta grande).
    pCtx.globalAlpha = p.alpha;
    pCtx.fillStyle   = p.col;
    pCtx.beginPath();
    pCtx.ellipse(p.x, p.y, p.w, p.h, p.angle, 0, Math.PI * 2);
    pCtx.fill();
    // Margen en los cuatro bordes: la tormenta sale por arriba, el
    // viento tenue por la derecha.
    return p.x > -100 && p.x < petalW + 100 && p.y > -100 && p.y < petalH + 100;
  });
  pCtx.globalAlpha = 1;
}
