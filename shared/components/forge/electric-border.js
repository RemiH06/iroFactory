// ══════════════════════════════════════════════════════
// Electric Border (React Bits) · en el taller. Mismo trazo del original: el
// perímetro redondeado desplazado por ruido de 10 octavas (lacunaridad 1.6,
// ganancia .7, caos .12, desplazamiento 60 px), con sus tres capas de brillo.
// En la forja, los mismos contenedores son metal al rojo (CSS).
// ══════════════════════════════════════════════════════
import { cssVar, isLight, makeLoop, onTheme } from './kit.js';

export function mount() {
(() => {
  const random = x => (Math.sin(x * 12.9898) * 43758.5453) % 1;
  const noise2D = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, a = random(i + j * 57), b = random(i + 1 + j * 57), c = random(i + (j + 1) * 57), d = random(i + 1 + (j + 1) * 57), ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy; };
  const oct = (x, time, seed) => { let y = 0, amp = 0.12, freq = 10; for (let i = 0; i < 10; i++) { y += (i === 0 ? 0 : amp) * noise2D(freq * x + seed * 100, time * freq * 0.3); freq *= 1.6; amp *= 0.7; } return y; };
  const corner = (cx, cy, r, a0, p) => { const a = a0 + p * Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const rrPoint = (t, L, T, w, h, r) => {
    const sw = w - 2 * r, sh = h - 2 * r, ca = Math.PI * r / 2, per = 2 * sw + 2 * sh + 4 * ca; let d = t * per;
    if (d <= sw) return [L + r + d, T]; d -= sw;
    if (d <= ca) return corner(L + w - r, T + r, r, -Math.PI / 2, d / ca); d -= ca;
    if (d <= sh) return [L + w, T + r + d]; d -= sh;
    if (d <= ca) return corner(L + w - r, T + h - r, r, 0, d / ca); d -= ca;
    if (d <= sw) return [L + w - r - d, T + h]; d -= sw;
    if (d <= ca) return corner(L + r, T + h - r, r, Math.PI / 2, d / ca); d -= ca;
    if (d <= sh) return [L, T + h - r - d]; d -= sh;
    return corner(L + r, T + r, r, Math.PI, d / ca);
  };
  document.querySelectorAll('[data-eb]').forEach(el => {
    const OFF = 60, wrap = document.createElement('div'), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    wrap.className = 'eb-canvas-container'; canvas.className = 'eb-canvas'; wrap.appendChild(canvas);
    ['eb-glow-1', 'eb-glow-2', 'eb-background-glow'].forEach(c => { const d = document.createElement('div'); d.className = c; d.setAttribute('aria-hidden', 'true'); el.appendChild(d); });
    el.appendChild(wrap);
    let w = 1, h = 1, dpr = 1, time = 0, last = 0, color = '';
    const size = () => { const r = el.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); w = r.width + OFF * 2; h = r.height + OFF * 2; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; };
    const draw = t => {
      if (!isLight) return;
      time += last ? Math.min(0.1, (t - last) / 1000) : 0; last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = ctx.lineJoin = 'round';
      const bw = w - 2 * OFF, bh = h - 2 * OFF, rad = Math.min(6, Math.min(bw, bh) / 2), n = Math.floor((2 * (bw + bh) + 2 * Math.PI * rad) / 2);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const p = i / n, [x, y] = rrPoint(p, OFF, OFF, bw, bh, rad), dx = oct(p * 8, time, 0) * 60, dy = oct(p * 8, time, 1) * 60; i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); }
      ctx.closePath(); ctx.stroke();
    };
    const colors = () => { color = cssVar('--voltage'); };
    size(); colors();
    const loop = makeLoop(el, draw, 30);
    new ResizeObserver(() => { size(); loop.still(); }).observe(el);
    onTheme(() => { colors(); last = 0; loop.still(); });
  });
})();
}
