// ══════════════════════════════════════════════════════
// Grafo de Laboratorio (como la sección Laboratorio de Signa_Lab, réplica):
// 120 nodos con brillo y profundidad (tamaño y opacidad según z), enlaces
// con degradado entre los colores de sus nodos, polígonos grises casi
// transparentes al fondo y líneas del cursor a los nodos a menos de 180 px.
// Al pasar el cursor, los nodos cercanos crecen y brillan más: parecen
// seleccionables, pero no lo son (a propósito).
// El brillo se hornea una vez por color (sprite), no con shadowBlur por nodo.
// ══════════════════════════════════════════════════════
import { faceColors, hexRgb, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

export function mount({ canvas = document.getElementById('lx-lab') } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, nodes = [], shapes = [], pal = [], sprites = [];
  const mouse = { x: null, y: null };
  const sprite = c => {
    const S = 128, s = document.createElement('canvas'); s.width = s.height = S; const x = s.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(0.28, `rgba(${c},.95)`); g.addColorStop(0.36, `rgba(${c},.35)`); g.addColorStop(1, `rgba(${c},0)`);
    x.fillStyle = g; x.fillRect(0, 0, S, S); return s;
  };
  const colors = () => { pal = faceColors().map(h => hexRgb(h)); sprites = pal.map(c => sprite(c.join(','))); };
  const seed = () => {
    const n = Math.round(Math.min(120, 120 * (W * H) / (1200 * 520)));
    nodes = Array.from({ length: Math.max(36, n) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 50 + Math.random() * 200, c: (Math.random() * 6) | 0, r: 4 + Math.random() * 8, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, h: 0 }));
    shapes = Array.from({ length: 24 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 100 + Math.random() * 300, k: 3 + ((Math.random() * 3) | 0), rot: Math.random() * 6.28, a: 0.01 + Math.random() * 0.04 }));
  };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; /* tamaño de diseño: la cara puede estar girada */ canvas.width = W * dpr; canvas.height = H * dpr; seed(); };
  const face = canvas.closest('.lx-face');
  const draw = () => {
    if (face && !face.matches('.is-current, .is-arriving')) return; // cara de atrás del prisma: no se dibuja
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const ink = isLight ? '60,50,80' : '40,45,60';
    for (const s of shapes) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.beginPath();
      for (let k = 0; k < s.k; k++) { const a = k / s.k * Math.PI * 2; ctx.lineTo(Math.cos(a) * s.s, Math.sin(a) * s.s); }
      ctx.closePath(); ctx.fillStyle = `rgba(${ink},${isLight ? s.a * 0.35 : s.a})`; ctx.fill(); ctx.restore();
    }
    for (const n of nodes) {
      if (!reduceMotion.matches) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1; }
      const md = mouse.x === null ? 1e9 : Math.hypot(n.x - mouse.x, n.y - mouse.y);
      n.h += ((md < 120 ? 1 - md / 120 : 0) - n.h) * 0.15; // crece y brilla al acercarse el cursor
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (mouse.x !== null) {
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 180) { ctx.strokeStyle = `rgba(${pal[a.c].join(',')},${(1 - md / 180) * 0.5})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 130) continue;
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y), al = (1 - d / 130) * 0.35;
        g.addColorStop(0, `rgba(${pal[a.c].join(',')},${al})`); g.addColorStop(1, `rgba(${pal[b.c].join(',')},${al})`);
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // los lejanos primero
    for (const n of [...nodes].sort((p, q) => q.z - p.z)) {
      const sc = 150 / n.z, r = n.r * sc * (1 + n.h * 0.7), R = r * 3.2;
      ctx.globalAlpha = Math.min(1, sc * 0.7 + n.h * 0.4);
      ctx.drawImage(sprites[n.c], n.x - R, n.y - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
  };
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; if (!loop.running) loop.still(); });
  canvas.addEventListener('pointerleave', () => { mouse.x = mouse.y = null; });
  colors(); size();
  const loop = makeLoop(canvas, draw, 50);
  new ResizeObserver(() => { size(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
}
