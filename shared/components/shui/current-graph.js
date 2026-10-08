// ══════════════════════════════════════════════════════
// Corrientes · grafo radial como índice (mismo trazado que ShuiGraph de
// LinNeo: manantial al centro, corrientes en un anillo con arco
// proporcional a sus hijos, secciones dentro del arco de su corriente).
// Los nodos flotan; partículas bajan por las aristas como corriente.
// ══════════════════════════════════════════════════════
import { $, coarsePointer, cssVar, isDark, makeLoop, onTheme, reduceMotion, rgba } from './kit.js';

export function mount() {
(() => {
  const host = $('#sh-graph'), canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
  const GROUPS = [
    { id: 'superficie', name: 'Superficie', color: '--query', kids: [['paleta', 'Paleta'], ['galeria', 'Galería']] },
    { id: 'corrientes', name: 'Corrientes', color: '--stream', kids: [['avisos', 'Avisos'], ['badges', 'Badges'], ['botones', 'Botones']] },
    { id: 'profundidad', name: 'Profundidad', color: '--schema', kids: [['metricas', 'Métricas'], ['codigo', 'Código'], ['tabla', 'Tabla']] },
    { id: 'desembocadura', name: 'Desembocadura', color: '--store', kids: [['log', 'Pipeline log'], ['pipeline', 'Pipeline'], ['cards', 'Cards'], ['manual', 'Manual']] },
  ];
  let W = 1, H = 1, dpr = 1, nodes = [], edges = [], hover = -1, pal = {}, active = 'paleta';
  const readPal = () => { pal = {}; for (const n of ['--query', '--stream', '--schema', '--store', '--foam', '--text', '--bg', '--accent', '--white', '--light-ray', '--biolum-cyan']) pal[n] = cssVar(n); };
  const layout = () => {
    const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const m = Math.min(W, H), R1 = m * (W < 520 ? 0.2 : 0.24), R2 = m * (W < 520 ? 0.38 : 0.42), cx = W / 2, cy = H / 2;
    nodes = [{ id: 'inicio', name: 'shui', x: cx, y: cy, r: 22, color: '--accent', level: 0, phase: 0 }]; edges = [];
    const total = GROUPS.reduce((s, g) => s + g.kids.length + 1, 0); let a0 = -Math.PI / 2;
    GROUPS.forEach(g => {
      const span = (g.kids.length + 1) / total * Math.PI * 2, mid = a0 + span / 2, gi = nodes.length;
      nodes.push({ id: g.kids[0][0], name: g.name, x: cx + Math.cos(mid) * R1, y: cy + Math.sin(mid) * R1, r: 13, color: g.color, level: 1, phase: Math.random() * 6, ang: mid });
      edges.push({ a: 0, b: gi, color: g.color, w: 2.2 });
      g.kids.forEach(([id, name], k) => {
        const ang = a0 + span * (0.16 + 0.68 * (g.kids.length === 1 ? 0.5 : k / (g.kids.length - 1)));
        nodes.push({ id, name, x: cx + Math.cos(ang) * R2, y: cy + Math.sin(ang) * R2, r: 9, color: g.color, level: 2, phase: Math.random() * 6, ang });
        edges.push({ a: gi, b: nodes.length - 1, color: g.color, w: 1.4 });
      });
      a0 += span;
    });
  };
  const pos = (n, t) => reduceMotion.matches ? [n.x, n.y] : [n.x + Math.sin(t * 0.0007 + n.phase) * 3, n.y + Math.cos(t * 0.0009 + n.phase) * 3];
  const curve = (p, q) => { const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1]; return [mx - dy * 0.12, my + dx * 0.12]; };
  const draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const P = nodes.map(n => pos(n, t)), small = W < 520;
    // Aristas como corrientes
    edges.forEach(e => {
      const p = P[e.a], q = P[e.b], c = curve(p, q), on = hover === e.b || hover === e.a;
      ctx.strokeStyle = rgba(pal[e.color], on ? 0.85 : 0.4); ctx.lineWidth = e.w + (on ? 1 : 0);
      ctx.beginPath(); ctx.moveTo(...p); ctx.quadraticCurveTo(...c, ...q); ctx.stroke();
      if (!reduceMotion.matches) for (let k = 0; k < 3; k++) {
        const s = ((t * 0.00018 * (e.w > 2 ? 1 : 1.3)) + k / 3 + e.b * 0.13) % 1, u = 1 - s;
        const x = u * u * p[0] + 2 * u * s * c[0] + s * s * q[0], y = u * u * p[1] + 2 * u * s * c[1] + s * s * q[1];
        ctx.fillStyle = rgba(pal[e.color], 0.9 * Math.sin(s * Math.PI)); ctx.beginPath(); ctx.arc(x, y, isDark ? 2.4 : 2, 0, Math.PI * 2); ctx.fill();
      }
    });
    // Nodos como gotas
    nodes.forEach((n, i) => {
      const [x, y] = P[i], on = i === hover, r = n.r * (on ? 1.25 : 1), col = pal[n.color];
      ctx.save();
      if (isDark) { ctx.shadowColor = col; ctx.shadowBlur = on ? 26 : 16; }
      ctx.fillStyle = rgba(col, isDark ? 0.9 : 0.88); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = rgba(pal['--foam'], isDark ? 0.35 : 0.65); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      if (n.level === 2 && n.id === active) { ctx.strokeStyle = pal['--text']; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = rgba(isDark ? pal['--light-ray'] : pal['--white'], isDark ? 0.35 : 0.55); ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.36, r * 0.34, r * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
      // Etiqueta hacia afuera del centro
      const size = n.level === 0 ? 18 : n.level === 1 ? (small ? 13 : 15) : (small ? 12 : 14);
      ctx.font = `${n.level < 2 ? 700 : 400} ${size}px 'Recursive', monospace`; ctx.textBaseline = 'middle';
      let lx = x, ly = y + r + 14, align = 'center';
      if (n.level === 2) { const c = Math.cos(n.ang), s2 = Math.sin(n.ang); lx = x + c * (r + 8); ly = y + s2 * (r + 10); align = c > 0.25 ? 'left' : c < -0.25 ? 'right' : 'center'; if (align === 'center') ly = y + (s2 > 0 ? r + 14 : -r - 14); }
      if (n.level === 0) { ly = y; }
      // La etiqueta nunca se sale del lienzo (la columna lateral es más angosta).
      if (n.level !== 0) { const w = ctx.measureText(n.name).width, x0 = align === 'left' ? lx : align === 'right' ? lx - w : lx - w / 2, dx = Math.max(0, 4 - x0) - Math.max(0, x0 + w - (W - 4));
        // Si no cabe a un lado, baja debajo de su gota en vez de taparla.
        if (n.level === 2 && Math.abs(dx) > 2) { align = 'center'; ly = y + r + 14; lx = Math.min(W - 4 - w / 2, Math.max(4 + w / 2, x)); } else lx += dx; }
      ctx.textAlign = align; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = rgba(pal['--bg'], 0.85);
      if (n.level !== 0) { ctx.strokeText(n.name, lx, ly); ctx.fillStyle = pal['--text']; ctx.fillText(n.name, lx, ly); }
      else { ctx.fillStyle = pal['--bg']; ctx.fillText('水', x, y + 1); }
    });
  };
  const hit = e => { const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = -1, bd = coarsePointer.matches ? 30 : 22; nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < Math.max(bd, n.r + 6) && d < bd + n.r) { bd = d; best = i; } }); return best; };
  canvas.addEventListener('pointermove', e => { const h = hit(e); if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? 'pointer' : ''; loop.still(); } });
  canvas.addEventListener('pointerleave', () => { hover = -1; loop.still(); });
  canvas.addEventListener('click', e => {
    const h = hit(e); if (h < 0) return; const id = nodes[h].id;
    if (id === 'inicio') { document.getElementById('inicio').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); return; }
    if (window.shuiApp) window.shuiApp.select(id);
  });
  window.shuiGraph = { setActive(id) { active = id; loop.still(); } };
  readPal(); layout();
  const loop = makeLoop(host, draw);
  new ResizeObserver(() => { layout(); loop.still(); }).observe(host);
  onTheme(() => { readPal(); loop.still(); });
  if (document.fonts) document.fonts.ready.then(() => loop.still());
  loop.still();
})();
}
