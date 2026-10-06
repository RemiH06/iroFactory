// ══════════════════════════════════════════════════════
// CAPA 4 · Lienzo único: la textura de la columna (estrías +
// acentos dorados de la voluta/roseta) estirada a todo el
// fondo, con pausas rítmicas en vez de columnas completas.
// ══════════════════════════════════════════════════════
// Barajado determinístico-por-llamada (Fisher-Yates); se recalcula en
// cada buildTexture() · un resize/toggle ya reconstruye toda la
// textura de todos modos, un nuevo orden ahí no es un problema extra.
import { isDark } from './kit.js';
import { COL_GAP } from './sky.js';

export function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function buildTexture() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const marbleBase   = isDark ? '#E0CE9E' : '#FAF6EC';
  const marbleShadow = isDark ? '#5C4826' : '#B0A484';

  const gap       = COL_GAP;
  const pauseEvery = 7;  // cada N estrías, una pausa: ahí dos columnas delgadas se
                         // funden en una gruesa (se salta la estría divisoria)

  const n = Math.ceil(W / gap) + 1;

  // Posiciones de pausa: ahí se salta la estría divisoria · el div
  // real de tilt de ese hueco es el doble de ancho (buildTiltColumns()).
  const pauseSet = new Set();
  for (let i = 0; i <= n; i++) {
    if (i % pauseEvery === Math.floor(pauseEvery / 2)) pauseSet.add(i);
  }

  // Ya no dibuja las tiras de imagen (eso vive en buildTiltColumns(),
  // como divs reales tilteables) ni medallones (quitados). Solo queda
  // el mármol base + las estrías divisorias · lienzo disperso de
  // nuevo, no denso, para que Light Rays (z-index encima) no quede
  // enterrado.
  let flutes = '';
  for (let i = 0; i <= n; i++) {
    if (!pauseSet.has(i)) {
      const x = i * gap;
      flutes += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${marbleShadow}" stroke-width="1.6" opacity="0.4"/>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${marbleBase}" opacity="0.55"/>
    ${flutes}
  </svg>`;

  const el = document.getElementById('ap-texture');
  el.style.backgroundImage  = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  el.style.backgroundSize   = `${W}px ${H}px`;
  el.style.backgroundRepeat = 'no-repeat';
}
