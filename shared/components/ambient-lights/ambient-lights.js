// Luces ambientales: manchas radiales de la paleta que rebotan por la vista;
// el CSS las funde con multiply (claro) o screen (oscuro).
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const canvas = $(opts.canvas ?? '#disco-lights'); if (!canvas) return; const ctx = canvas.getContext('2d'), PALETTE = opts.palette;
  let W = 0, H = 0;
  const lights = PALETTE.map((n, i) => { const a = Math.PI * 2 / PALETTE.length * i; return { n, x: .5, y: .5, vx: Math.cos(a) * .0008 + (Math.random() - .5) * .0004, vy: Math.sin(a) * .0008 + (Math.random() - .5) * .0004, r: .28 + Math.random() * .15, o: .18 + Math.random() * .12 }; });
  let cols = [];
  const pal = () => { cols = lights.map(l => cssVar(l.n)); };
  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    lights.forEach((l, i) => {
      l.x += l.vx; l.y += l.vy;
      if (l.x < -.1) l.vx = Math.abs(l.vx); if (l.x > 1.1) l.vx = -Math.abs(l.vx);
      if (l.y < -.1) l.vy = Math.abs(l.vy); if (l.y > 1.1) l.vy = -Math.abs(l.vy);
      const px = l.x * W, py = l.y * H, rad = l.r * Math.min(W, H), g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, rgba(cols[i], l.o)); g.addColorStop(.5, rgba(cols[i], l.o * .4)); g.addColorStop(1, rgba(cols[i], 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
    });
  };
  pal(); resize(); addEventListener('resize', () => { resize(); draw(); });
  const loop = makeLoop(document.body, draw, 30);
  onTheme(() => { pal(); loop.still(); });
  draw();
}
