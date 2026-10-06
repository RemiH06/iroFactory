// ══════════════════════════════════════════════════════
// Chispas · forja: brasas que suben y ceniza que deriva; taller: chispas de
// arco que caen. Colores de los tokens del oficio.
// ══════════════════════════════════════════════════════
import { $, cssVar, isLight, makeLoop, onTheme } from './kit.js';

export function mount() {
(() => {
  const canvas = $('#fg-sparks'), ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, parts = [], cols = {};
  const resize = () => { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; };
  const colors = () => { cols = { hot: ['--slag', '--lava', '--heat'].map(cssVar), ash: [cssVar('--ash'), cssVar('--gray')], arc: [cssVar('--voltage'), cssVar('--white')] }; parts = []; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!isLight) {
      if (Math.random() < 0.35) parts.push({ k: 's', x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 1.6, vy: -(1.6 + Math.random() * 2.8), r: 0.7 + Math.random() * 1.3, life: 1, decay: 0.008 + Math.random() * 0.012, c: pick(cols.hot) });
      if (Math.random() < 0.08) parts.push({ k: 'a', x: Math.random() * W, y: -6, vx: 0.3 + Math.random() * 0.6, vy: 0.2 + Math.random() * 0.4, r: 1.2 + Math.random() * 2, life: 1, decay: 0.002, w: Math.random() * 6, c: pick(cols.ash) });
    } else if (Math.random() < 0.1) {
      const x0 = W * (0.4 + Math.random() * 0.5), y0 = H * (0.1 + Math.random() * 0.4);
      for (let i = 0; i < 4; i++) parts.push({ k: 'e', x: x0, y: y0, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3, g: 0.12, r: 0.6 + Math.random(), life: 1, decay: 0.03 + Math.random() * 0.03, c: pick(cols.arc) });
    }
    parts = parts.filter(p => {
      if (p.k === 'a') { p.w += 0.02; p.x += p.vx + Math.sin(p.w) * 0.3; p.y += p.vy; p.life -= p.decay; }
      else { p.vx *= 0.985; p.vy += p.g || 0; p.x += p.vx; p.y += p.vy; p.life -= p.decay; }
      ctx.globalAlpha = Math.max(0, p.life) * (p.k === 'a' ? 0.35 : 0.9);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      if (p.k !== 'a') { ctx.globalAlpha *= 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill(); }
      return p.life > 0 && p.y > -20 && p.y < H + 20 && p.x > -20 && p.x < W + 20;
    });
    ctx.globalAlpha = 1;
  };
  resize(); colors();
  addEventListener('resize', resize);
  const loop = makeLoop(document.documentElement, draw, 30);
  onTheme(() => { colors(); loop.still(); });
})();
}
