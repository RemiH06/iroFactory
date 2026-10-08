// ludus · base del tema sobre el núcleo: modo (con Pixel Swap) y las seis
// caras de la paleta, que son las del proun, las del cubo y las del prisma.
import { $, $$, cssVar, hexRgb, initTheme, onTheme, theme, makeLoop, reduceMotion, updateHexes } from '../../core/core.js';

export { $, $$, cssVar, hexRgb, onTheme, makeLoop, reduceMotion, updateHexes };
// Caras en el orden del cubo: R L U D F B
export const FACES = ['--r', '--l', '--u', '--d', '--f', '--b'];
export const faceColors = () => FACES.map(cssVar);
export let isLight = false;
onTheme(() => { isLight = theme.alt; });

// ── Pixel Swap (React Bits) al cambiar de modo: una rejilla de pixeles de las
// seis caras tapa la vista en orden aleatorio, cambia el modo detrás y se
// destapa. Canvas 2D; con reduced motion, cambio directo.
let ctl, busy = false;
function pixelSwap(done) {
  if (reduceMotion.matches) { done(); return; }
  busy = true;
  const c = document.createElement('canvas'), x = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  c.className = 'lx-pixel-swap'; c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c); x.scale(dpr, dpr);
  const S = Math.max(28, Math.round(Math.min(W, H) / 18)), cols = Math.ceil(W / S), rows = Math.ceil(H / S);
  const cells = [], pal = faceColors();
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) cells.push([i, j, pal[(Math.random() * pal.length) | 0], Math.random()]);
  const T = 300, t0 = performance.now();
  let swapped = false;
  const step = now => {
    const k = (now - t0) / T;
    x.clearRect(0, 0, W, H);
    for (const [i, j, col, r] of cells) {
      const on = k < 1 ? r < k : k < 2 ? r >= k - 1 : false; // tapa (0 a 1) y destapa (1 a 2)
      if (on) { x.fillStyle = col; x.fillRect(i * S, j * S, S + 0.5, S + 0.5); }
    }
    if (k >= 1 && !swapped) { swapped = true; done(); }
    if (k < 2) requestAnimationFrame(step); else { c.remove(); busy = false; }
  };
  requestAnimationFrame(step);
}
export const toggleTheme = () => { if (!busy && ctl) pixelSwap(() => ctl.toggle()); };
export function mount() {
  ctl = initTheme({ altClass: 'light', label: alt => (alt ? '☾ noche' : '☀ día'), aria: alt => (alt ? 'Cambiar a modo noche' : 'Cambiar a modo día'), hexes: updateHexes });
  // el botón del modo pasa por el Pixel Swap
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', e => { e.stopImmediatePropagation(); e.preventDefault(); toggleTheme(); }, { capture: true }));
}
