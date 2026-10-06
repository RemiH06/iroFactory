// ══════════════════════════════════════════════════════
// Pizarrón de base · rejilla hexagonal y objetos en gis (de siempre)
// ══════════════════════════════════════════════════════
import { $, CHALK, cssVar, isLight, onTheme } from './kit.js';
import { FORMULAS } from './fluid-glass-formulas.js';

export function buildHexBg() {
  const s = 48, col = encodeURIComponent(cssVar('--border'));
  const W = +(s * Math.sqrt(3)).toFixed(4), H = +(s * 2).toFixed(4), cx = W / 2, cy = H / 2;
  const pts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 3 * i + Math.PI / 6; return `${(cx + s * Math.cos(a)).toFixed(2)},${(cy + s * Math.sin(a)).toFixed(2)}`; }).join(' ');
  const url = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' overflow='visible'%3E%3Cpolygon points='${pts}' fill='none' stroke='${col}' stroke-width='0.8'/%3E%3C/svg%3E")`;
  const el = $('#lambda-hex');
  el.style.backgroundImage = `${url}, ${url}`;
  el.style.backgroundSize = `${W}px ${H}px, ${W}px ${H}px`;
  el.style.backgroundPosition = `0 0, ${(W / 2).toFixed(2)}px ${(H / 2).toFixed(2)}px`;
  el.style.opacity = isLight ? 0.55 : 0.5;
}
export function mount() {
buildHexBg();
(() => {
  const canvas = $('#lambda-bg'), ctx = canvas.getContext('2d');
  let W, H, dpr, elements = [];
  const FORMULAS = ['E = mc²', '∇²φ = 0', 'F = ma', 'e^iπ + 1 = 0', '∂²u/∂t² = c²∇²u', 'P(A|B) = P(B|A)·P(A)/P(B)', '∑ 1/n² = π²/6', 'det(AB) = det(A)·det(B)', '∀ε>0 ∃δ>0', 'lim (1+1/n)ⁿ = e', 'Γ(n+1) = n!', 'λx.x'];
  const resize = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; };
  const build = () => {
    elements = []; const rng = (a, b) => a + Math.random() * (b - a), C = 5, R = 5, cw = W / C, ch = H / R, types = ['formula', 'formula', 'formula', 'circle', 'arrow', 'sine', 'axes']; let fi = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = (c + .5) * cw + rng(-cw * .28, cw * .28), y = (r + .5) * ch + rng(-ch * .28, ch * .28), i = r * C + c, type = types[i % types.length], ci = i % 8;
      if (type === 'formula') elements.push({ type, text: FORMULAS[fi++ % FORMULAS.length], x, y, size: rng(13, 21), ci });
      else if (type === 'circle') elements.push({ type, x, y, r: rng(24, 70), ci });
      else if (type === 'arrow') elements.push({ type, x1: x, y1: y, x2: x + rng(-90, 90), y2: y + rng(-70, 70), ci });
      else if (type === 'sine') elements.push({ type, x: x - rng(60, 100), y, w: rng(120, 200), phase: rng(0, Math.PI * 2), ci });
      else elements.push({ type, x, y, size: rng(36, 65), ci });
    }
  };
  const drawAll = (ox, oy, alpha, cols) => {
    elements.forEach(el => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = ctx.fillStyle = cols[el.ci]; ctx.lineWidth = 1;
      if (el.type === 'formula') { ctx.font = `italic ${el.size}px 'Cormorant Garamond', serif`; ctx.fillText(el.text, el.x + ox, el.y + oy); }
      else if (el.type === 'circle') { ctx.beginPath(); ctx.arc(el.x + ox, el.y + oy, el.r, 0, Math.PI * 2); ctx.stroke(); }
      else if (el.type === 'arrow') { const x1 = el.x1 + ox, y1 = el.y1 + oy, x2 = el.x2 + ox, y2 = el.y2 + oy, a = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(a - .4), y2 - 8 * Math.sin(a - .4)); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(a + .4), y2 - 8 * Math.sin(a + .4)); ctx.stroke(); }
      else if (el.type === 'sine') { ctx.beginPath(); for (let i = 0; i <= el.w; i++) { const py = el.y + oy + Math.sin(i / el.w * Math.PI * 4 + el.phase) * 18; i ? ctx.lineTo(el.x + ox + i, py) : ctx.moveTo(el.x + ox + i, py); } ctx.stroke(); }
      else { const x = el.x + ox, y = el.y + oy, s = el.size; ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x, y - s); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke(); ctx.beginPath(); for (let i = -s; i <= s; i += 2) { const py = y - i * i / (s * 1.5); i === -s ? ctx.moveTo(x + i, py) : ctx.lineTo(x + i, py); } ctx.stroke(); }
    });
    ctx.globalAlpha = 1;
  };
  const draw = () => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); const cols = CHALK.map(cssVar), a = isLight ? .2 : .22; drawAll(0, 0, a, cols); drawAll(1.5, 1, a * .35, cols); };
  resize(); build(); draw();
  if (document.fonts) document.fonts.ready.then(draw);
  onTheme(draw);
  addEventListener('resize', () => { resize(); build(); draw(); });
})();
}
