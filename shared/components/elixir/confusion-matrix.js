// ══════════════════════════════════════════════════════
// MATRIZ DE CONFUSIÓN · el clasificador de radiografías sobre seis
// especies del conjunto de prueba (predicciones de ejemplo, fijas: misma
// semilla siempre). Filas = especie real, columnas = predicha, más una
// columna «sin decidir» para lo que queda bajo el umbral de confianza.
// Conteos o porcentaje por fila; una sola rampa (teal, del fondo al
// tono) sobre el porcentaje de la fila, texto de cada celda elegido por
// contraste real. Precisión, recall, F1 y soporte por clase; exactitud,
// cobertura y F1 macro. Avisa con `ex:metrics` (la tarjeta de modelo).
//   mount({ el })
// ══════════════════════════════════════════════════════
import { onTheme } from './kit.js';

export const CLASSES = [
  { name: 'Tiburón cabeza de ala', sci: 'Eusphyra blochii' }, { name: 'Pez navaja', sci: 'Centriscus scutatus' },
  { name: 'Morena víbora', sci: 'Enchelynassa canina' }, { name: 'Anguila becada', sci: 'Nemichthys scolopaceus' },
  { name: 'Raya', sci: 'Raja clavata' }, { name: 'Pez globo', sci: 'Tetraodon lineatus' }
];
// Con qué se confunde cada especie (probabilidad del error, de cada 1): las alargadas entre sí, el tiburón con la raya.
const MIX = [
  [0, 0.01, 0.01, 0, 0.05, 0.01], [0.01, 0, 0.02, 0.04, 0, 0.02], [0.01, 0.01, 0, 0.11, 0, 0.01],
  [0, 0.04, 0.09, 0, 0, 0], [0.06, 0, 0, 0, 0, 0.02], [0.01, 0.02, 0, 0, 0.01, 0]
];
const SUPPORT = [96, 104, 112, 87, 92, 107];
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function samples() {
  const r = rng(7), out = [];
  SUPPORT.forEach((n, t) => { for (let i = 0; i < n; i++) {
    let u = r(), pred = t; for (let j = 0; j < MIX[t].length; j++) { if (u < MIX[t][j]) { pred = j; break; } u -= MIX[t][j]; }
    // Aciertos con confianza alta casi siempre; errores con confianza media.
    const conf = pred === t ? 0.55 + 0.44 * Math.pow(r(), 0.45) : 0.34 + 0.46 * r();
    out.push({ t, p: pred, c: conf });
  } });
  return out;
}
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Cualquier color CSS (oklab, color(), hex) a RGB, pintándolo en un lienzo de 1 px.
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const rgbOf = c => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#080C14'; probe.fillStyle = c.trim(); probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
const pct = v => (v * 100).toFixed(v >= 0.995 || v === 0 ? 0 : 1) + '%';
const f2 = v => isFinite(v) ? v.toFixed(2) : '·';

export function mount({ el = document.getElementById('ex-confusion') } = {}) {
  if (!el) return;
  const data = samples(), K = CLASSES.length;
  let thr = 0, mode = 'pct';
  el.innerHTML = `<div class="cm-controls">
      <div class="cm-seg" role="group" aria-label="Valores de las celdas"><button type="button" class="btn" data-mode="pct">% por fila</button><button type="button" class="btn" data-mode="n">conteos</button></div>
      <label class="cm-thr">Umbral de confianza <output></output><input type="range" min="0" max="0.95" step="0.05" value="0"></label>
    </div>
    <div class="cm-wrap"><table class="cm-table"></table><div class="cm-tip" hidden></div></div>
    <div class="cm-totals" aria-live="polite"></div>
    <div class="cm-metrics-wrap"><table class="cm-metrics"></table></div>`;
  const $ = s => el.querySelector(s), table = $('.cm-table'), tip = $('.cm-tip');

  function compute() {
    const M = Array.from({ length: K }, () => Array(K + 1).fill(0));
    data.forEach(s => { M[s.t][s.c >= thr ? s.p : K]++; });
    const per = CLASSES.map((_, i) => {
      const tp = M[i][i], row = M[i].slice(0, K).reduce((a, b) => a + b, 0), col = M.reduce((a, r) => a + r[i], 0);
      const prec = tp / col, rec = tp / row, f1 = 2 * prec * rec / (prec + rec);
      return { prec, rec, f1, support: M[i].reduce((a, b) => a + b, 0), decided: row };
    });
    const decided = data.filter(s => s.c >= thr), correct = decided.filter(s => s.p === s.t).length;
    const ok = per.filter(x => isFinite(x.f1)), macro = ok.reduce((a, x) => a + x.f1, 0) / Math.max(1, ok.length);
    return { M, per, acc: correct / Math.max(1, decided.length), cov: decided.length / data.length, macro, n: data.length, decided: decided.length };
  }
  let S;
  function draw() {
    S = compute();
    const head = `<tr><th scope="col" class="cm-corner"><span>real ↓ · predicha →</span></th>${CLASSES.map(c => `<th scope="col" class="cm-colh"><span title="${c.sci}">${c.name}</span></th>`).join('')}<th scope="col" class="cm-colh cm-abst"><span>sin decidir</span></th></tr>`;
    const rows = S.M.map((r, i) => {
      const tot = r.reduce((a, b) => a + b, 0);
      return `<tr><th scope="row" class="cm-rowh">${CLASSES[i].name}</th>${r.map((v, j) => {
        const f = v / tot, cls = j === K ? ' abst' : i === j ? ' diag' : '';
        return `<td class="cm-cell${cls}" data-i="${i}" data-j="${j}" style="--f:${(f * 100).toFixed(1)}%">${v ? (mode === 'pct' ? pct(f) : v) : '·'}</td>`;
      }).join('')}</tr>`;
    }).join('');
    table.innerHTML = `<caption class="ex-sr">Matriz de confusión: filas especie real, columnas especie predicha</caption>${head}${rows}`;
    // Texto de cada celda: el que contraste más con su fondo real.
    const cs = getComputedStyle(el), dark = rgbOf(cs.getPropertyValue('--black') || '#080C14'), light = rgbOf(cs.getPropertyValue('--white') || '#F4F6FA');
    table.querySelectorAll('.cm-cell').forEach(td => { const bg = rgbOf(getComputedStyle(td).backgroundColor); td.classList.toggle('on-dark', ratio(light, bg) > ratio(dark, bg)); });
    $('.cm-totals').innerHTML = `<span><b>${pct(S.acc)}</b> exactitud${thr ? ' en lo decidido' : ''}</span><span><b>${pct(S.cov)}</b> cobertura (${S.decided} de ${S.n})</span><span><b>${f2(S.macro)}</b> F1 macro</span>`;
    $('.cm-metrics').innerHTML = `<tr><th>Especie</th><th>Precisión</th><th>Recall</th><th>F1</th><th>Soporte</th></tr>${S.per.map((x, i) => `<tr><td>${CLASSES[i].name}</td><td>${f2(x.prec)}</td><td>${f2(x.rec)}</td><td><span class="cm-f1">${f2(x.f1)}<i style="width:${isFinite(x.f1) ? Math.round(x.f1 * 64) : 0}px"></i></span></td><td>${x.support}</td></tr>`).join('')}`;
    el.querySelectorAll('.cm-seg .btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('.cm-thr output').textContent = thr ? thr.toFixed(2) : 'ninguno';
    const worst = S.per.map((x, i) => ({ ...x, i })).filter(x => isFinite(x.f1)).sort((a, b) => a.f1 - b.f1)[0];
    const conf = worst ? S.M[worst.i].slice(0, K).map((v, j) => ({ v, j })).filter(x => x.j !== worst.i).sort((a, b) => b.v - a.v)[0] : null;
    window.dispatchEvent(new CustomEvent('ex:metrics', { detail: { acc: S.acc, cov: S.cov, macro: S.macro, n: S.n, thr, worst: worst && { name: CLASSES[worst.i].name, f1: worst.f1, with: conf && conf.v ? CLASSES[conf.j].name : null } } }));
  }
  table.addEventListener('pointerover', e => {
    const td = e.target.closest('.cm-cell'); if (!td) { tip.hidden = true; return; }
    const i = +td.dataset.i, j = +td.dataset.j, v = S.M[i][j], tot = S.M[i].reduce((a, b) => a + b, 0);
    tip.innerHTML = j === K ? `<b>${CLASSES[i].name}</b><span>${v} sin decidir (${pct(v / tot)} de la fila): confianza bajo ${thr.toFixed(2)}</span>`
      : `<b>real: ${CLASSES[i].name}</b><span>predicha: ${CLASSES[j].name}</span><span>${v} de ${tot} (${pct(v / tot)})${i === j ? ' · acierto' : ''}</span>`;
    tip.hidden = false; const wr = el.querySelector('.cm-wrap').getBoundingClientRect(), r = td.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(wr.width - w, r.left - wr.left + r.width / 2 - w / 2)) + 'px'; tip.style.top = (r.bottom - wr.top + 6) + 'px';
  });
  table.addEventListener('pointerleave', () => { tip.hidden = true; });
  el.querySelector('.cm-seg').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { mode = b.dataset.mode; draw(); } });
  $('.cm-thr input').addEventListener('input', e => { thr = +e.target.value; draw(); });
  draw(); onTheme(() => requestAnimationFrame(draw));
  return { redraw: draw };
}
