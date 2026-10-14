// ══════════════════════════════════════════════════════
// CURVA DE PÉRDIDA · un juguete de entrenamiento. Tasa de aprendizaje,
// abandono (dropout) y suavizado mueven las curvas de entrenamiento y
// validación de un modelo de juguete (no es una red: son las formas que
// se ven en TensorBoard, con ruido fijo por época para que no tiemble).
// Parada temprana con paciencia 4, como en el Manual: marca el punto de
// control y oscurece lo que ya no se entrenó. Diagnóstico en una línea.
// Dos series (teal y índigo validados para los dos modos, la de
// validación punteada y con etiqueta directa), cruz con tooltip y la
// misma información en tabla.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

const E = 40, PATIENCE = 4;
const hash = i => { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmtLr = v => v.toExponential(1).replace('.0e', 'e');
const PRESETS = [
  ['bien', { lr: 3e-4, drop: 0.2 }], ['lr alta', { lr: 4e-3, drop: 0.2 }], ['diverge', { lr: 9e-3, drop: 0.2 }],
  ['lr baja', { lr: 1.5e-5, drop: 0.2 }], ['sin abandono', { lr: 3e-4, drop: 0 }], ['demasiado abandono', { lr: 3e-4, drop: 0.6 }]
];

// El modelo de juguete: devuelve las dos curvas crudas, época 1 a E.
function simulate({ lr, drop }) {
  const L0 = 2.3, k = Math.min(0.9, 0.22 * Math.pow(lr / 3e-4, 0.55));
  const high = Math.max(0, Math.log10(lr / 2e-3)), diverge = lr > 7e-3;
  const floorT = 0.06 + 0.22 * drop, under = Math.max(0, drop - 0.4) * 1.1;
  const floorV = 0.24 - 0.12 * Math.min(drop, 0.4) + under;
  const e0 = 3.2 / k, over = 0.016 * Math.pow(1 - Math.min(drop, 0.6) / 0.6, 2);
  const train = [], valid = [];
  for (let e = 1; e <= E; e++) {
    const decay = Math.exp(-k * e), osc = high * 0.32 * Math.sin(e * 1.9) * Math.exp(-0.01 * e);
    let t = floorT + (L0 - floorT) * decay + osc + (hash(e) - 0.5) * 0.03;
    let v = floorV + (L0 - floorV) * decay + osc * 1.3 + Math.max(0, e - e0) * over + (hash(e + 99) - 0.5) * 0.06;
    if (diverge && e > 6) { const g = Math.exp((e - 6) * 0.22) - 1; t += g * 0.25; v += g * 0.3; }
    train.push(Math.max(0.01, t)); valid.push(Math.max(0.02, v));
  }
  return { train, valid };
}
const ema = (a, s) => { let m = a[0]; return a.map(x => (m = s * m + (1 - s) * x)); };
function earlyStop(valid) {
  let best = 0, wait = 0;
  for (let i = 1; i < valid.length; i++) { if (valid[i] < valid[best] - 1e-3) { best = i; wait = 0; } else if (++wait >= PATIENCE) return { best, stop: i }; }
  return { best, stop: valid.length - 1 };
}
function diagnose(p, r, es) {
  const last = r.valid.length - 1;
  if (p.lr > 7e-3) return ['danger', 'Diverge: la tasa es tan alta que cada paso empeora la pérdida. Bájala un orden de magnitud.'];
  if (p.lr > 2e-3) return ['warn', `Tasa alta: la pérdida oscila y el mejor punto (época ${es.best + 1}) es peor que con una tasa menor.`];
  if (es.best >= last - 1 && r.valid[es.best] > 0.4) return ['warn', `Aprende muy despacio: en ${E} épocas la validación apenas llega a ${r.valid[es.best].toFixed(2)} y sigue bajando. Sube la tasa.`];
  if (p.drop > 0.45) return ['warn', `Demasiado abandono: la validación no baja de ${r.valid[es.best].toFixed(2)} (con 0.2 llega a 0.26); el modelo no alcanza a aprender (subajuste).`];
  if (r.valid[last] - r.valid[es.best] > 0.12) return ['warn', `Sobreajuste: la validación toca fondo en la época ${es.best + 1} y luego sube mientras el entrenamiento sigue bajando. La parada temprana corta en la ${es.stop + 1}.`];
  return ['ok', `Converge: la parada temprana guarda la época ${es.best + 1} (validación ${r.valid[es.best].toFixed(3)}) y corta en la ${es.stop + 1}.`];
}

export function mount({ el = document.getElementById('ex-loss') } = {}) {
  if (!el) return;
  const p = { lr: 3e-4, drop: 0.2, smooth: 0.6 };
  el.innerHTML = `<div class="lc-top">
      <div class="lc-legend" aria-hidden="true"><span class="lc-key train"><i></i>entrenamiento</span><span class="lc-key valid"><i></i>validación</span><span class="lc-key ckpt"><i></i>punto de control</span></div>
      <div class="lc-presets" role="group" aria-label="Escenarios">${PRESETS.map(([n], i) => `<button type="button" class="btn lc-preset" data-i="${i}">${n}</button>`).join('')}</div>
    </div>
    <div class="lc-body">
      <figure class="lc-chart"><div class="lc-plot"></div><div class="lc-tip" hidden></div><figcaption class="lc-diag" aria-live="polite"></figcaption></figure>
      <div class="lc-knobs">
        <label>Tasa de aprendizaje <output class="lc-v-lr"></output><input type="range" class="lc-lr" min="-5" max="-2" step="0.05" aria-label="Tasa de aprendizaje (escala logarítmica)"></label>
        <label>Abandono <output class="lc-v-drop"></output><input type="range" class="lc-drop" min="0" max="0.6" step="0.05"></label>
        <label>Suavizado <output class="lc-v-smooth"></output><input type="range" class="lc-smooth" min="0" max="0.95" step="0.05"></label>
        <button type="button" class="btn train lc-play">▶ entrenar</button>
      </div>
    </div>
    <details class="lc-table"><summary>Ver como tabla</summary><div class="lc-table-wrap"></div></details>`;
  const $ = s => el.querySelector(s), plot = $('.lc-plot'), tip = $('.lc-tip');
  let shown = E, res, es, sm, anim = 0;

  function compute() { res = simulate(p); es = earlyStop(res.valid); sm = { train: ema(res.train, p.smooth), valid: ema(res.valid, p.smooth) }; }
  function draw() {
    const W = Math.max(240, plot.clientWidth || 600), H = Math.round(Math.min(320, Math.max(220, W * 0.42))), L = 40, R = 92, T = 12, B = 30;
    const yMax = 2.5, x = i => L + (W - L - R) * (i / (E - 1)), y = v => T + (H - T - B) * (1 - Math.min(v, yMax) / yMax);
    const n = Math.max(1, Math.min(shown, E));
    const path = a => a.slice(0, n).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const grid = [0, 0.5, 1, 1.5, 2, 2.5].map(v => `<line class="lc-grid${v ? '' : ' base'}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="lc-ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
    const xt = [1, 10, 20, 30, 40].map(e => `<text class="lc-ax" x="${x(e - 1)}" y="${H - 10}" text-anchor="middle">${e}</text>`).join('') + `<text class="lc-ax" x="${W - R}" y="${H - 10}" text-anchor="start" dx="8">época</text>`;
    const stopped = n > es.stop + 1 ? `<rect class="lc-after" x="${x(es.stop)}" y="${T}" width="${x(E - 1) - x(es.stop)}" height="${H - T - B}"/><text class="lc-ax lc-after-t" x="${(x(es.stop) + x(E - 1)) / 2}" y="${T + 14}" text-anchor="middle">ya no se entrenó</text>` : '';
    const ck = n > es.best ? `<line class="lc-ckpt" x1="${x(es.best)}" x2="${x(es.best)}" y1="${T}" y2="${H - B}"/><circle class="lc-ckpt-dot" cx="${x(es.best)}" cy="${y(res.valid[es.best])}" r="5"/>` : '';
    const lab = (a, cls, name) => { const v = a[n - 1]; return `<text class="lc-lab ${cls}" x="${x(n - 1) + 8}" y="${y(v) + 4}">${name} ${v.toFixed(2)}</text>`; };
    let lt = lab(sm.train, 'train', 'entren.'), lv = lab(sm.valid, 'valid', 'valid.');
    // Etiquetas directas sin encimarse.
    const yt = y(sm.train[n - 1]), yv = y(sm.valid[n - 1]);
    if (Math.abs(yt - yv) < 14) { const mid = (yt + yv) / 2, up = yv < yt ? -1 : 1; lv = lv.replace(/y="[^"]+"/, `y="${mid + up * 7 + 4}"`); lt = lt.replace(/y="[^"]+"/, `y="${mid - up * 7 + 4}"`); }
    const over = res.valid.some(v => v > yMax) ? `<text class="lc-ax lc-warn" x="${W - R - 4}" y="${T + 14}" text-anchor="end">↑ fuera de escala</text>` : '';
    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pérdida por época. Entrenamiento termina en ${sm.train[n - 1].toFixed(2)}, validación en ${sm.valid[n - 1].toFixed(2)}; mejor época ${es.best + 1}.">
      ${grid}${xt}${stopped}
      <path class="lc-raw train" d="${path(res.train)}"/><path class="lc-raw valid" d="${path(res.valid)}"/>
      <path class="lc-line train" d="${path(sm.train)}"/><path class="lc-line valid" d="${path(sm.valid)}"/>
      ${ck}${lt}${lv}${over}<line class="lc-cross" y1="${T}" y2="${H - B}" x1="-9" x2="-9"/></svg>`;
    plot.dataset.geo = JSON.stringify({ L, R, W, T, B, H });
    const [kind, text] = diagnose(p, res, es);
    const d = $('.lc-diag'); d.className = 'lc-diag ' + kind; d.textContent = shown < E ? `Entrenando… época ${n} de ${E}` : text;
    $('.lc-table-wrap').innerHTML = `<table><tr><th>Época</th><th>Entrenamiento</th><th>Validación</th></tr>${res.train.map((t, i) => `<tr${i === es.best ? ' class="is-best"' : ''}><td>${i + 1}${i === es.best ? ' · punto de control' : ''}</td><td>${t.toFixed(3)}</td><td>${res.valid[i].toFixed(3)}</td></tr>`).join('')}</table>`;
  }
  plot.addEventListener('pointermove', e => {
    const g = plot.dataset.geo && JSON.parse(plot.dataset.geo), svg = plot.querySelector('svg'); if (!g || !svg) return;
    const r = svg.getBoundingClientRect(), px = e.clientX - r.left, i = Math.round((px - g.L) / (g.W - g.L - g.R) * (E - 1));
    if (i < 0 || i >= Math.min(shown, E)) { tip.hidden = true; return; }
    const cx = g.L + (g.W - g.L - g.R) * (i / (E - 1)), cross = svg.querySelector('.lc-cross'); cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    tip.innerHTML = `<b>época ${i + 1}${i === es.best ? ' · punto de control' : ''}</b><span><i class="sw train"></i>entrenamiento ${res.train[i].toFixed(3)}</span><span><i class="sw valid"></i>validación ${res.valid[i].toFixed(3)}</span>`;
    tip.hidden = false; const fr = el.querySelector('.lc-chart').getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(fr.width - w, cx + (r.left - fr.left) + 12 - (cx > g.W / 2 ? w + 24 : 0))) + 'px'; tip.style.top = '8px';
  });
  plot.addEventListener('pointerleave', () => { tip.hidden = true; const c = plot.querySelector('.lc-cross'); if (c) { c.setAttribute('x1', -9); c.setAttribute('x2', -9); } });

  const lr = $('.lc-lr'), drop = $('.lc-drop'), smooth = $('.lc-smooth');
  const sync = () => {
    lr.value = Math.log10(p.lr); drop.value = p.drop; smooth.value = p.smooth;
    $('.lc-v-lr').textContent = fmtLr(p.lr); $('.lc-v-drop').textContent = p.drop.toFixed(2); $('.lc-v-smooth').textContent = p.smooth.toFixed(2);
    el.querySelectorAll('.lc-preset').forEach((b, i) => b.setAttribute('aria-pressed', String(PRESETS[i][1].lr === p.lr && PRESETS[i][1].drop === p.drop)));
  };
  const update = () => { cancelAnimationFrame(anim); anim = 0; shown = E; compute(); sync(); draw(); };
  lr.addEventListener('input', () => { p.lr = +Math.pow(10, +lr.value).toPrecision(2); update(); });
  drop.addEventListener('input', () => { p.drop = +drop.value; update(); });
  smooth.addEventListener('input', () => { p.smooth = +smooth.value; update(); });
  el.querySelector('.lc-presets').addEventListener('click', e => { const b = e.target.closest('.lc-preset'); if (!b) return; Object.assign(p, PRESETS[+b.dataset.i][1]); update(); });
  $('.lc-play').addEventListener('click', () => {
    if (reduceMotion.matches) { update(); return; }
    cancelAnimationFrame(anim); const t0 = performance.now();
    const step = now => { shown = Math.min(E, 1 + Math.floor((now - t0) / 70)); draw(); anim = shown < E ? requestAnimationFrame(step) : 0; };
    anim = requestAnimationFrame(step);
  });
  new ResizeObserver(() => { const w = plot.clientWidth; if (w && w !== draw.w) { draw.w = w; draw(); } }).observe(plot);
  compute(); sync(); draw();
}
