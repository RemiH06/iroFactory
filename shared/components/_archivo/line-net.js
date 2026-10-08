// ══════════════════════════════════════════════════════
// ARCHIVADO (2026-10-08): fue el fondo de ludus; se guarda solo para tenerlo.
// Ningún tema lo importa. Si se rescata, va de vuelta a shared/components/.
// Red de líneas (sin tsParticles):
// puntos que derivan y se enlazan con líneas cuando quedan a menos de 150 px;
// el cursor jala líneas hacia los puntos cercanos (modo «grab», 140 px).
// Mismos números del original: 80 puntos por cada 800×800 px, velocidad 1.5,
// grosor 1.5, opacidad de enlace .6 y .8 al jalar. Colores: las seis caras.
// Fondo fijo de todo ludus; con reduced motion, un cuadro quieto.
// ══════════════════════════════════════════════════════
import { faceColors, hexRgb, makeLoop, onTheme, reduceMotion } from '../ludus/kit.js';

export function mount({ canvas = document.getElementById('lx-net') } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, pts = [], pal = [];
  const mouse = { x: -1e4, y: -1e4 };
  const DIST = 150, GRAB = 140, SPEED = 1.5;
  const seed = () => {
    const n = Math.round(80 * (W * H) / (800 * 800));
    pts = Array.from({ length: Math.max(24, Math.min(160, n)) }, () => {
      const a = Math.random() * Math.PI * 2, v = SPEED * (0.4 + Math.random() * 0.6);
      return { x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1 + Math.random() * 2, c: (Math.random() * 6) | 0 };
    });
  };
  const colors = () => { pal = faceColors().map(h => hexRgb(h)); };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; seed(); };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!reduceMotion.matches) for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10; // outModes: out
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
    }
    ctx.lineWidth = 1.5;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
        if (d > DIST * DIST) continue;
        ctx.strokeStyle = rgba(pal[a.c], 0.6 * (1 - Math.sqrt(d) / DIST));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      const mx = a.x - mouse.x, my = a.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
      if (md < GRAB) { ctx.strokeStyle = rgba(pal[a.c], 0.8 * (1 - md / GRAB)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
    }
    for (const p of pts) { ctx.fillStyle = rgba(pal[p.c], 0.7); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  colors(); size();
  const loop = makeLoop(document.documentElement, draw, 60);
  addEventListener('resize', () => { size(); loop.still(); });
  onTheme(() => { colors(); loop.still(); });
  loop.still();
}
