// ══════════════════════════════════════════════════════
// mirai · plate: el compositor de las piezas. Reparte formas planas sobre
// una retícula de módulos (masas de sumi, una sola tinta y celdas vacías:
// 間) y arma la pieza completa con su texto. La misma función dibuja el
// cartel de la portada y los cuatro formatos del tablero; cómo se acomoda
// cada formato lo decide plate.css con container queries.
//   compose(semilla, columnas, filas, forma) → [{ x, y, w, h, shape, k }]
//   artHTML(columnas, filas, { forma, seed }) → HTML del bloque de formas
//   pieceHTML(formato, { titular, tinta, forma, seed }) → HTML de la pieza
// ══════════════════════════════════════════════════════
import { BRAND, logo } from '../../../assets/data/mirai/campaign.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// mulberry32: misma semilla, misma pieza
const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Tamaños de tesela por forma, en módulos. El 1 × 1 va siempre: garantiza que algo quepa.
const POOLS = {
  circulo: [[3, 3], [2, 2], [2, 2], [1, 1], [1, 1]],
  capsula: [[3, 1], [1, 3], [2, 1], [1, 2], [2, 1], [1, 2], [1, 1]],
  cuarto: [[2, 2], [2, 1], [1, 2], [1, 1], [1, 1]],
};

export function compose(seed, cols, rows, form = 'circulo') {
  const pool = POOLS[form] || POOLS.circulo, r = rng(seed * 7919 + cols * 131 + rows * 17 + pool.length);
  const used = Array.from({ length: rows }, () => Array(cols).fill(false)), tiles = [];
  const fits = (x, y, w, h) => { if (x + w > cols || y + h > rows) return false; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (used[j][i]) return false; return true; };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (used[y][x]) continue;
    const ok = pool.filter(([w, h]) => fits(x, y, w, h)), [w, h] = ok[Math.floor(r() * ok.length)];
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) used[j][i] = true;
    if (w * h === 1 && r() < 0.45) continue; // 間: la celda se queda vacía
    const q = Math.floor(r() * 4);
    const shape = form === 'cuarto' ? (w === h ? 'quarter q' + q : 'half ' + (w > h ? 'tb'[q % 2] : 'lr'[q % 2])) : w === h ? 'circle' : 'cap ' + (w > h ? 'h' : 'v') + (q % 2 ? ' end' : '');
    tiles.push({ x, y, w, h, shape, k: '' });
  }
  if (!tiles.length) tiles.push({ x: 0, y: 0, w: 1, h: 1, shape: 'circle', k: '' });
  // una sola tinta: la tesela más grande (si es cápsula, su ojo); una más queda hueca
  const hero = tiles.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
  hero.k = hero.shape.startsWith('cap') ? 'eye-ink' : 'ink';
  const rest = tiles.filter(t => t !== hero && t.w === t.h && !t.shape.startsWith('quarter'));
  if (rest.length > 1) rest[Math.floor(r() * rest.length)].k = 'void';
  return tiles;
}

const tileHTML = (t, i, cols, rows) => {
  // entra desde el borde más cercano, por módulos
  const cx = t.x + t.w / 2 - cols / 2, cy = t.y + t.h / 2 - rows / 2, horiz = Math.abs(cx) / cols > Math.abs(cy) / rows;
  const dx = horiz ? Math.sign(cx) || 1 : 0, dy = horiz ? 0 : Math.sign(cy) || 1;
  return `<i class="pl pl-${t.shape}${t.k ? ' ' + t.k : ''}" style="grid-area:${t.y + 1}/${t.x + 1}/span ${t.h}/span ${t.w};--w:${t.w};--i:${i};--dx:${dx};--dy:${dy}"></i>`;
};

// solo el bloque de formas (lo usan la pieza y la lámina de la galería)
export const artHTML = (c, r, { forma, seed }) => `<div class="pc-art" style="--c:${c};--r:${r}">${compose(seed, c, r, forma).map((t, i) => tileHTML(t, i, c, r)).join('')}</div>`;

export function pieceHTML(fmt, state) {
  return `<div class="pc" data-ink="${esc(state.tinta)}">${artHTML(fmt.art[0], fmt.art[1], state)}`
    + `<div class="pc-text"><p class="pc-title">${esc(state.titular)}</p><span class="pc-logo">${logo()}</span><p class="pc-ja" lang="ja">${BRAND.claimJa}</p></div></div>`;
}
