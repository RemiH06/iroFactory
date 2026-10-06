// ── 03 · Grafo del pipeline: la mecánica propia de elixir ───────────
// Cuatro capas (ingest, transform, train, eval). Los pulsos viajan de
// izquierda a derecha por aristas al azar; al llegar, cada nodo late y
// se queda para siempre con el color del pulso. Cada 12 pulsos, epoch.
import { $, cssVar, isDark, onTheme, reduceMotion } from './kit.js';
import { makeLoop } from './palette-labels.js';

export function mount() {
(() => {
  const canvas = $('#ex-net'), host = canvas.parentElement, ctx = canvas.getContext('2d');
  const LAYERS = [['ingest', 3], ['transform', 5], ['train', 5], ['eval', 3]];
  const COLORS = ['--train', '--input', '--output', '--violet', '--arctic'];
  let W = 1, H = 1, dpr = 1, nodes = [], byLayer = [], pulses = [], pal = {}, epoch = 1, count = 0, spawnIn = 0.3, lastT = 0;
  const epochEl = $('#ex-epoch'), pulsesEl = $('#ex-pulses');
  const readPal = () => { pal = {}; for (const c of [...COLORS, '--border', '--text2', '--gray', '--bg']) pal[c] = cssVar(c); };
  const layout = () => {
    const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const padX = Math.max(30, W * 0.1), top = 52, bottom = 26;
    const prev = nodes; nodes = []; byLayer = [];
    LAYERS.forEach(([, n], li) => {
      const x = padX + (W - 2 * padX) * (li / (LAYERS.length - 1)); byLayer[li] = [];
      for (let k = 0; k < n; k++) {
        const y = top + (H - top - bottom) * ((k + 0.5) / n), old = prev[nodes.length];
        byLayer[li].push(nodes.length);
        nodes.push({ x, y, layer: li, color: old ? old.color : null, pColor: null, pT: 0, pDur: 0 });
      }
    });
    pulses = [];
  };
  const hit = (ni, color) => { const n = nodes[ni]; n.pColor = color; n.pT = 0; n.pDur = 500 + Math.random() * 500; };
  const spawn = () => {
    const path = byLayer.map(l => l[Math.floor(Math.random() * l.length)]);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    hit(path[0], color);
    pulses.push({ path, seg: 0, t: 0, color, speed: 1 / (0.45 + Math.random() * 0.3) });
  };
  const seedStill = () => { nodes.forEach((n, i) => { n.color = COLORS[(i * 7 + n.layer * 3) % COLORS.length]; n.pColor = null; }); };
  const draw = t => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    if (!reduceMotion.matches) {
      spawnIn -= dt; if (spawnIn <= 0) { spawn(); spawnIn = 0.35 + Math.random() * 0.55; }
      pulses.forEach(p => {
        p.t += dt * p.speed;
        if (p.t >= 1) { p.seg++; p.t = 0; if (p.seg < p.path.length - 1) hit(p.path[p.seg], p.color); else { hit(p.path[p.path.length - 1], p.color); p.done = true; count++; if (count % 12 === 0) epoch = epoch % 50 + 1; } }
      });
      pulses = pulses.filter(p => !p.done);
      epochEl.textContent = epoch; pulsesEl.textContent = count;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.font = "12px 'Iosevka', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = pal['--text2'];
    LAYERS.forEach(([name], li) => ctx.fillText(name, nodes[byLayer[li][0]].x, 26));
    ctx.lineWidth = 1; ctx.strokeStyle = pal['--border']; ctx.globalAlpha = isDark ? 0.9 : 0.75; ctx.beginPath();
    for (let li = 0; li < byLayer.length - 1; li++) for (const a of byLayer[li]) for (const b of byLayer[li + 1]) { ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    for (const p of pulses) {
      if (p.seg >= p.path.length - 1) continue;
      const a = nodes[p.path[p.seg]], b = nodes[p.path[p.seg + 1]], col = pal[p.color];
      ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      for (let k = 0; k < 4; k++) { const tt = Math.max(0, p.t - k * 0.05); ctx.globalAlpha = [1, 0.5, 0.28, 0.14][k]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt, k ? 2.2 : 3.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const baseR = Math.max(5, Math.min(9, W / 48));
    for (const n of nodes) {
      let color = n.color ? pal[n.color] : pal['--gray'], r = baseR, alpha = n.color ? 0.95 : 0.7;
      if (n.pColor && n.pDur > 0) {
        n.pT += dt * 1000; const tt = Math.min(n.pT / n.pDur, 1), e = tt < 0.5 ? 2 * tt * tt : -1 + (4 - 2 * tt) * tt;
        r = baseR + e * 5; color = pal[n.pColor]; alpha = 0.5 + e * 0.5;
        ctx.globalAlpha = 0.35 * (1 - tt); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.x, n.y, baseR + 4 + tt * 10, 0, Math.PI * 2); ctx.stroke();
        if (n.pT >= n.pDur) { n.color = n.pColor; n.pColor = null; n.pDur = 0; }
      }
      ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  readPal(); layout();
  if (reduceMotion.matches) seedStill();
  const loop = makeLoop(host, draw);
  new ResizeObserver(() => { layout(); if (reduceMotion.matches) seedStill(); loop.still(); }).observe(host);
  onTheme(() => { readPal(); loop.still(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) seedStill(); });
  loop.still();
})();
}
