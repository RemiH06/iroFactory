// Asanoha (hoja de cáñamo): el patrón se genera por trigonometría (hexágono,
// líneas centro-vértice y centro-arista) como SVG de fondo, dos veces con desfase.
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const s = opts.size ?? 80, col = '%23888888', W = +(s * Math.sqrt(3)).toFixed(4), H = +(s * 2).toFixed(4), cx = W / 2, cy = H / 2;
  const verts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 3 * i - Math.PI / 6; return [cx + s * Math.cos(a), cy + s * Math.sin(a)]; });
  const attr = `fill='none' stroke='${col}' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'`;
  const ln = (a, b, c, d) => `%3Cline x1='${a.toFixed(2)}' y1='${b.toFixed(2)}' x2='${c.toFixed(2)}' y2='${d.toFixed(2)}' ${attr}/%3E`;
  let paths = `%3Cpolygon points='${verts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}' ${attr}/%3E`;
  verts.forEach(([x, y]) => { paths += ln(cx, cy, x, y); });
  for (let i = 0; i < 6; i++) {
    const [bx, by] = verts[i], [ex, ey] = verts[(i + 1) % 6], gx = (cx + bx + ex) / 3, gy = (cy + by + ey) / 3;
    paths += ln(cx, cy, gx, gy) + ln(bx, by, gx, gy) + ln(ex, ey, gx, gy);
  }
  const url = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' overflow='visible'%3E${paths}%3C/svg%3E")`;
  const el = typeof opts.el === 'string' || !opts.el ? $(opts.el ?? '.asanoha-bg') : opts.el; if (!el) return;
  el.style.backgroundImage = `${url}, ${url}`; el.style.backgroundSize = `${W}px ${H}px, ${W}px ${H}px`; el.style.backgroundPosition = '0 0, 0 80px'; el.style.opacity = opts.opacity ?? .15;
}
