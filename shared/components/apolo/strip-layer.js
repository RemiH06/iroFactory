// ══════════════════════════════════════════════════════
// CAPA 4b · Segunda capa de tiras, detrás del tilt-card, con
// su propio barajado independiente y SIN tilt (estática). Mismo
// slot simple/doble que la capa de enfrente (misma cuadrícula de
// columnas), pero una permutación distinta · otra reordenada,
// no un espejo de la de enfrente.
// ══════════════════════════════════════════════════════
import { COL_GAP } from './sky.js';
import { shuffledIndices } from './single-canvas.js';

export function buildBackStripes() {
  const layer = document.getElementById('ap-back-stripes');
  layer.innerHTML = '';
  const W = window.innerWidth;
  const H = window.innerHeight;
  const n = Math.ceil(W / COL_GAP) + 1;
  const pauseEvery = 7;

  const pauseSet = new Set();
  for (let i = 0; i <= n; i++) {
    if (i % pauseEvery === Math.floor(pauseEvery / 2)) pauseSet.add(i);
  }

  const heroSrc = document.getElementById('ap-hero-img').src;
  const virtualW = n * COL_GAP;
  const perm = shuffledIndices(n); // barajado propio, no el mismo que el de enfrente
  let permCursor = 0;

  for (let i = 0; i < n; i++) {
    if (pauseSet.has(i)) continue;
    const isDouble = pauseSet.has(i + 1);
    const units = isDouble ? 2 : 1;
    const width = COL_GAP * units;
    const offset = Math.min(perm[permCursor++ % perm.length], n - units);

    const div = document.createElement('div');
    div.className = 'back-stripe';
    div.style.left = (i * COL_GAP) + 'px';
    div.style.width = width + 'px';
    div.style.backgroundImage = `url("${heroSrc}")`;
    div.style.backgroundSize = `${virtualW}px ${H}px`;
    div.style.backgroundPosition = `${-offset * COL_GAP}px 0`;
    layer.appendChild(div);
  }
}
