// ══════════════════════════════════════════════════════
// Constelaciones · el fondo de ludus es un juego. Las estrellas son sólidos
// chiquitos (de alambre, de la forma elegida en la barra) que derivan
// despacio. Se unen dos con arrastrar de una a otra, o tocando una y luego
// la otra. Cerrar una figura con tantos lados como las caras del sólido
// (triángulo con tetraedro, octaedro e icosaedro; cuadrado con el cubo;
// pentágono con el dodecaedro) la rellena y suma puntos; cerrar otra antes
// de 4 s sube el combo. Pero las estrellas siguen derivando: un enlace que
// se estira demasiado se tensa (parpadea en rojo) y se rompe, y se lleva
// las figuras que sostenía.
// Se juega en los huecos: donde no hay tarjeta, texto ni control. En la
// portada no (la tapa el proun). Con reduced motion, las estrellas no se
// mueven y nada se rompe, pero se puede jugar.
// ══════════════════════════════════════════════════════
import { animate } from 'animejs';
import { faceColors, hexRgb, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';
import { solid, project, shape, SIDES, ICON } from './solids.js';

export function mount({ canvas = document.getElementById('lx-net'), hud = document.getElementById('lx-net-hud') } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, SNAP = 360, nodes = [], edges = [], polys = [], pops = [], pal = [], rgb = [];
  let sel = null, armed = false, ptr = { x: -1e4, y: -1e4 }, score = 0, closed = 0, combo = 1, lastClose = 0, form = solid(shape());
  const HIT = 24, key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const seed = () => {
    const n = Math.max(24, Math.min(64, Math.round(W * H / 26000)));
    nodes = Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * 10;
      return { id: i, x: 30 + Math.random() * (W - 60), y: 80 + Math.random() * (H - 160), vx: Math.cos(a) * v, vy: Math.sin(a) * v, ax: Math.random() * 6, ay: Math.random() * 6, spin: 0.3 + Math.random() * 0.5, c: i % 6, r: 6 + Math.random() * 3 };
    });
    edges = []; polys = [];
  };
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; SNAP = Math.max(260, Math.min(420, Math.min(W, H) * 0.5));
    if (!nodes.length) seed(); else nodes.forEach(p => { p.x = Math.min(p.x, W - 20); p.y = Math.min(p.y, H - 20); });
  };
  const paint = () => { pal = faceColors(); rgb = pal.map(hexRgb); };
  const say = () => { if (hud) hud.innerHTML = `<b>${ICON[shape()]} ${closed}</b> · ${score} pts${combo > 1 ? ` · x${combo}` : ''}<small>${SIDES[shape()]} lados cierran figura</small>`; };

  // ── Reglas
  const near = (x, y) => { let best = null, bd = HIT; for (const p of nodes) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; };
  const has = (a, b) => edges.some(e => e.k === key(a, b));
  const adj = id => edges.filter(e => e.a === id || e.b === id).map(e => (e.a === id ? e.b : e.a));
  // un camino de b a a con k-1 enlaces, sin repetir estrellas ni usar el enlace nuevo
  const cycle = (a, b, k) => {
    const path = [b];
    const dfs = u => {
      if (path.length === k) return u === a ? null : false; // ya no cabe
      for (const v of adj(u)) {
        if (path.length === 1 && u === b && v === a) continue;
        if (v === a && path.length === k - 1) return [...path, a];
        if (v === a || path.includes(v)) continue;
        path.push(v); const r = dfs(v); if (r) return r; path.pop();
      }
      return false;
    };
    return dfs(b);
  };
  const link = (p, q) => {
    if (p === q || has(p.id, q.id)) return;
    edges.push({ a: p.id, b: q.id, k: key(p.id, q.id) });
    const k = SIDES[shape()], ring = cycle(p.id, q.id, k);
    if (ring) {
      const id = [...ring].sort((x, y) => x - y).join(',');
      if (!polys.some(f => f.id === id)) {
        const now = performance.now(); combo = now - lastClose < 4000 ? Math.min(combo + 1, 9) : 1; lastClose = now;
        const pts = k * 10 * combo; score += pts; closed++;
        polys.push({ id, ring, c: (Math.random() * 6) | 0, a: 0 });
        const f = polys[polys.length - 1]; animate(f, { a: [0, 1], duration: 500, ease: 'out(3)' });
        const cx = ring.reduce((s, i) => s + nodes[i].x, 0) / k, cy = ring.reduce((s, i) => s + nodes[i].y, 0) / k;
        const pop = { x: cx, y: cy, t: `+${pts}`, a: 1, c: f.c }; pops.push(pop);
        animate(pop, { y: cy - 46, a: [1, 0], duration: 1100, ease: 'out(2)', onComplete: () => pops.splice(pops.indexOf(pop), 1) });
      }
    }
    say(); loop.still();
  };
  const snap = e => {
    edges.splice(edges.indexOf(e), 1);
    polys = polys.filter(f => !f.ring.some((id, i) => key(id, f.ring[(i + 1) % f.ring.length]) === e.k));
    const pa = nodes[e.a], pb = nodes[e.b], pop = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, t: '¡crac!', a: 1, c: -1 }; pops.push(pop);
    animate(pop, { y: pop.y + 30, a: [1, 0], duration: 900, ease: 'in(2)', onComplete: () => pops.splice(pops.indexOf(pop), 1) });
    combo = 1; say();
  };

  // ── Entrada: solo en los huecos de la vista actual
  const free = t => t instanceof Element && t.closest('.lx-face.is-current') && !t.closest('.lx-hero, a, button, input, select, textarea, label, summary, canvas, pre, table, kbd, .hud, .doc-layout, .lx-acc, .lx-crop-wrap');
  addEventListener('pointerdown', e => {
    if (!free(e.target)) { if (armed) { sel = null; armed = false; loop.still(); } return; }
    const p = near(e.clientX, e.clientY);
    if (armed && sel && p && p !== sel) { link(sel, p); sel = null; armed = false; e.preventDefault(); return; }
    sel = p; armed = false; ptr = { x: e.clientX, y: e.clientY };
    if (p) e.preventDefault(); // sin seleccionar texto al arrastrar
    loop.still();
  });
  addEventListener('pointermove', e => {
    ptr = { x: e.clientX, y: e.clientY };
    document.body.classList.toggle('lx-star-hot', free(e.target) && !!near(e.clientX, e.clientY));
    if (sel || reduceMotion.matches) loop.still();
  });
  addEventListener('pointerup', e => {
    if (!sel || armed) return;
    const p = near(e.clientX, e.clientY);
    if (p && p !== sel) { link(sel, p); sel = null; } else if (p === sel) armed = true; // tocar y luego tocar la otra
    else sel = null;
    loop.still();
  });
  document.addEventListener('selectstart', e => { if (sel && !armed) e.preventDefault(); });
  addEventListener('pointercancel', () => { if (sel && !armed) armed = true; }); // el dedo se volvió scroll: queda elegida

  // ── Dibujo
  const A = isL => (isL ? 0.75 : 1);
  let last = 0;
  const draw = now => {
    const dt = last ? Math.min(0.05, Math.max(0, now - last) / 1000) : 0; last = Math.max(last, now);
    const moving = !reduceMotion.matches;
    if (moving) for (const p of nodes) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.ax += p.spin * dt; p.ay += p.spin * 0.7 * dt;
      if (p.x < 16 || p.x > W - 16) p.vx *= -1; if (p.y < 60 || p.y > H - 16) p.vy *= -1;
    }
    if (moving) for (const e of [...edges]) { const a = nodes[e.a], b = nodes[e.b]; if (Math.hypot(a.x - b.x, a.y - b.y) > SNAP) snap(e); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const al = A(isLight);
    // figuras cerradas
    for (const f of polys) {
      ctx.beginPath(); f.ring.forEach((id, i) => { const p = nodes[id]; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath();
      ctx.fillStyle = `rgba(${rgb[f.c]},${0.16 * f.a * al})`; ctx.fill();
      ctx.strokeStyle = `rgba(${rgb[f.c]},${0.5 * f.a * al})`; ctx.lineWidth = 2; ctx.stroke();
    }
    // enlaces (se tensan cerca de romperse)
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b], len = Math.hypot(a.x - b.x, a.y - b.y), tense = Math.max(0, (len / SNAP - 0.78) / 0.22);
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, `rgba(${rgb[a.c]},${0.6 * al})`); g.addColorStop(1, `rgba(${rgb[b.c]},${0.6 * al})`);
      ctx.strokeStyle = tense > 0 && Math.sin(now / 70) > 0 ? `rgba(255,84,102,${0.85 * al})` : g;
      ctx.lineWidth = 1.6 * (1 - tense * 0.6); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // el enlace que se está tendiendo
    if (sel) {
      const p = armed ? null : ptr; ctx.setLineDash([5, 6]); ctx.strokeStyle = `rgba(${rgb[sel.c]},.8)`; ctx.lineWidth = 1.5;
      if (p) { ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(sel.x, sel.y, sel.r + 9 + Math.sin(now / 160) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    // estrellas: el sólido elegido, de alambre, girando
    for (const p of nodes) {
      const d = Math.hypot(p.x - ptr.x, p.y - ptr.y), hot = d < 110 ? 1 - d / 110 : 0, r = p.r * (1 + hot * 0.6);
      const v = project(form, p.ax, p.ay, r);
      ctx.strokeStyle = `rgba(${rgb[p.c]},${(0.55 + hot * 0.45) * al})`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const [i, j] of form.edges) { ctx.moveTo(p.x + v[i][0], p.y + v[i][1]); ctx.lineTo(p.x + v[j][0], p.y + v[j][1]); }
      ctx.stroke();
    }
    // puntos que suben
    ctx.font = '13px "Silkscreen", monospace'; ctx.textAlign = 'center';
    for (const t of pops) { ctx.fillStyle = t.c < 0 ? `rgba(255,84,102,${t.a})` : `rgba(${rgb[t.c]},${t.a})`; ctx.fillText(t.t, t.x, t.y); }
  };
  const loop = makeLoop(document.body, draw, 40);
  // para depurar desde la consola: canvas.game.nodes(), .edges(), .polys()
  Object.defineProperty(canvas, 'game', { value: { nodes: () => nodes, edges: () => edges, polys: () => polys, get score() { return score; } } });
  addEventListener('resize', () => { size(); loop.still(); });
  document.addEventListener('ludus:shape', () => { form = solid(shape()); say(); loop.still(); });
  onTheme(() => { paint(); loop.still(); });
  size(); paint(); say(); loop.still();
}
