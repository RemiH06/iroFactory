// ══════════════════════════════════════════════════════
// Noche · partículas bioluminiscentes que suben (las del shui anterior,
// recuperadas tal cual: halo radial, parpadeo y deriva lenta hacia arriba).
// Colores de los tokens bioluminiscentes del modo.
// ══════════════════════════════════════════════════════
import { $, cssVar, isDark, onTheme, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#sh-bio'), ctx = canvas.getContext('2d');
  const COLS = ['--biolum-violet', '--biolum-rose', '--biolum-cyan', '--biolum-green', '--schema', '--cache'];
  let W = 1, H = 1, dpr = 1, parts = [], raf = 0, last = 0, on = false, cols = [];
  const resize = () => { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); };
  const make = y => ({ x: Math.random() * W, y: y ?? H + 10 + Math.random() * 60, vy: -(0.15 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.2, r: 1 + Math.random() * 2.5, col: cols[Math.floor(Math.random() * cols.length)], alpha: 0.4 + Math.random() * 0.5, flicker: Math.random() * Math.PI * 2, fs: 0.02 + Math.random() * 0.04 });
  const paint = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const fa = p.alpha * (0.7 + Math.sin(p.flicker) * 0.3), halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      halo.addColorStop(0, p.col + 'CC'); halo.addColorStop(0.4, p.col + '44'); halo.addColorStop(1, p.col + '00');
      ctx.globalAlpha = fa * 0.6; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
      ctx.globalAlpha = fa; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.col; ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const frame = t => {
    raf = on && !document.hidden && !reduceMotion.matches ? requestAnimationFrame(frame) : 0;
    const k = last ? Math.min(3, (t - last) / 16.67) : 1; last = t;
    if (Math.random() < 0.08 * k) parts.push(make());
    parts = parts.filter(p => { p.x += p.vx * k; p.y += p.vy * k; p.flicker += p.fs * k; return p.y > -20; });
    paint();
  };
  const set = v => {
    on = v; cols = COLS.map(n => cssVar(n)).filter(Boolean);
    if (v) { resize(); parts = Array.from({ length: 36 }, () => make(Math.random() * H)); canvas.style.visibility = ''; if (reduceMotion.matches) paint(); else if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    else { if (raf) cancelAnimationFrame(raf); raf = 0; parts = []; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.visibility = 'hidden'; }
  };
  window.addEventListener('resize', () => { if (on) { resize(); paint(); } });
  document.addEventListener('visibilitychange', () => { if (on && !document.hidden && !raf && !reduceMotion.matches) { last = 0; raf = requestAnimationFrame(frame); } });
  onTheme(() => set(isDark)); set(isDark);
})();
// El proun del hero cambia con el modo.
(() => { const img = $('.sh-proun img'); if (!img) return; img.dataset.light = img.getAttribute('src'); onTheme(() => { img.src = isDark ? img.dataset.dark : img.dataset.light; }); })();
}
