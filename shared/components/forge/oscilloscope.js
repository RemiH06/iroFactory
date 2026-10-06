// ══════════════════════════════════════════════════════
// §3 · Osciloscopio con persistencia de fósforo: cada cuadro oscurece el
// anterior en vez de borrarlo, así la traza deja estela.
// ══════════════════════════════════════════════════════
import { $, cssVar, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#fg-scope'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, cols = [], bg = '', grid = '';
  const size = () => { const r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; };
  const colors = () => { cols = (isLight ? ['--signal', '--core', '--interrupt'] : ['--slag', '--lava', '--interrupt']).map(cssVar); bg = cssVar('--black'); grid = cssVar('--border'); };
  const CH = [{ f: 6, a: 0.13, o: 0 }, { f: 9.5, a: 0.1, o: 1.8 }, { f: 4, a: 0.15, o: 3.5 }];
  const draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = reduceMotion.matches ? 1 : 0.35; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 10; i++) { const x = W * i / 10; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let i = 1; i < 8; i++) { const y = H * i / 8; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const s = (reduceMotion.matches ? 2000 : t) * 0.0016;
    CH.forEach((c, k) => {
      const cy = H * (0.22 + k * 0.28);
      ctx.strokeStyle = cols[k]; ctx.lineWidth = 1.6; ctx.shadowColor = cols[k]; ctx.shadowBlur = 8; ctx.beginPath();
      for (let x = 0; x <= W; x += 2) { const ph = x / W * Math.PI * c.f + s + c.o, y = cy + (Math.sin(ph) + Math.sin(ph * 2.1 + c.o) * 0.25) * c.a * H; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
    });
  };
  size(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { size(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
})();
}
