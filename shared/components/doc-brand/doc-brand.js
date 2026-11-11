// ══════════════════════════════════════════════════════
// DOC BRAND · las láminas de una guía de marca a partir del logo en SVG:
// construcción sobre su retícula de módulos, área de respeto, tamaño
// mínimo con deslizador y los usos incorrectos, que se corrigen al
// presionarlos.
//   mount({
//     el, logo: () => '<svg viewBox="0 0 m m">…</svg>',
//     modules: 8, clear: 2, min: 16, unit: 'x',
//     construction: [['circle', cx, cy, r] | ['line', x1, y1, x2, y2]],   // trazos auxiliares, en módulos
//     dims: [[x1, y1, x2, y2, 'texto']],                                   // cotas
//     wrong: [{ label, fix, svg, style }],      // `svg` o `style` deforman el logo
//     enhance(boton, uso),                      // el tema viste cada uso incorrecto
//     onWrong(boton, corregir, uso) })          // el tema decide cuándo se corrige (por defecto, al instante)
// Sin JS se queda lo que ya traiga `el`.
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount({ el, logo, modules: m = 8, clear = 2, min = 16, unit = 'x', construction = [], dims = [], wrong = [], enhance = () => {}, onWrong = (b, fix) => fix() } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return null;
  const uid = 'db-' + Math.random().toString(36).slice(2, 7);
  const placed = () => logo().replace('<svg', `<svg x="0" y="0" width="${m}" height="${m}"`);
  const grid = Array.from({ length: m + 1 }, (_, i) => `<path d="M${i} 0V${m}M0 ${i}H${m}"/>`).join('');
  const aux = construction.map(([t, a, b, c, d]) => (t === 'circle' ? `<circle cx="${a}" cy="${b}" r="${c}"/>` : `<path d="M${a} ${b}L${c} ${d}"/>`)).join('');
  const dim = ([x1, y1, x2, y2, text]) => { const v = x1 === x2; return `<path d="M${x1} ${y1}L${x2} ${y2}M${x1 - (v ? .2 : 0)} ${y1 - (v ? 0 : .2)}l${v ? .4 : 0} ${v ? 0 : .4}M${x2 - (v ? .2 : 0)} ${y2 - (v ? 0 : .2)}l${v ? .4 : 0} ${v ? 0 : .4}"/><text x="${(x1 + x2) / 2 + (v ? .35 : 0)}" y="${(y1 + y2) / 2 + (v ? .2 : .75)}" text-anchor="${v ? 'start' : 'middle'}">${esc(text)}</text>`; };
  const pad = 1.9, c = clear, box = m + 2 * c;
  root.innerHTML = `<div class="db-cards">
    <section class="db-card"><h3 class="db-h">Construcción</h3>
      <svg class="db-svg" viewBox="${-pad} ${-pad} ${m + 2 * pad} ${m + 2 * pad}" role="img" aria-label="El logo sobre su retícula de ${m} módulos, con sus trazos auxiliares">${placed()}<g class="db-grid">${grid}</g><g class="db-aux">${aux}</g><g class="db-dim">${dims.map(dim).join('')}</g></svg>
      <label class="db-check"><input type="checkbox" checked data-grid> Retícula y trazos</label></section>
    <section class="db-card"><h3 class="db-h">Área de respeto</h3>
      <svg class="db-svg" viewBox="${-c - pad} ${-c - pad} ${box + 2 * pad} ${box + 2 * pad}" role="img" aria-label="El logo con un margen libre de ${c} módulos por lado"><defs><pattern id="${uid}-h" width=".55" height=".55" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="db-hatch" d="M0 0V.55"/></pattern></defs>
        <path fill="url(#${uid}-h)" fill-rule="evenodd" d="M${-c} ${-c}h${box}v${box}h${-box}zM0 0v${m}h${m}v${-m}z"/><rect class="db-clear" x="${-c}" y="${-c}" width="${box}" height="${box}"/>${placed()}
        <g class="db-dim">${dim([-c, m + c + .7, 0, m + c + .7, c + unit])}${dim([m + c + .7, -c, m + c + .7, 0, c + unit])}</g></svg>
      <p class="db-note">Nada entra a menos de ${c}${unit} del logo. ${unit} es un módulo de su retícula.</p></section>
    <section class="db-card"><h3 class="db-h">Tamaño mínimo</h3>
      <div class="db-size"><span class="db-size-logo">${logo()}</span></div>
      <label class="db-range" for="${uid}-r">Tamaño</label><input id="${uid}-r" type="range" min="${Math.max(4, Math.round(min / 2))}" max="128" value="48" data-size>
      <p class="db-read" role="status"></p></section>
  </div>
  ${wrong.length ? `<h3 class="db-h db-h-wrong">Lo que no</h3><ul class="db-wrongs"></ul><p class="db-foot"><button type="button" class="db-reset">Restaurar los usos incorrectos</button><span class="db-status" role="status"></span></p>` : ''}`;

  root.querySelector('[data-grid]').addEventListener('change', e => root.classList.toggle('db-plain', !e.target.checked));
  const range = root.querySelector('[data-size]'), sizeLogo = root.querySelector('.db-size-logo'), read = root.querySelector('.db-read');
  const size = () => { const px = +range.value, ok = px >= min; sizeLogo.style.width = px + 'px'; read.className = 'db-read ' + (ok ? 'ok' : 'miss'); read.textContent = `${px} px · ${(px * 25.4 / 96).toFixed(1)} mm · ${ok ? 'pasa' : `debajo del mínimo (${min} px)`}`; };
  range.addEventListener('input', size); size();

  const list = root.querySelector('.db-wrongs'), status = root.querySelector('.db-status');
  function paintWrong() {
    if (!list) return;
    list.innerHTML = wrong.map((w, i) => `<li><button type="button" class="db-wrong" data-i="${i}" aria-pressed="false" aria-label="Uso incorrecto: ${esc(w.label)}. Presiona para corregirlo."><span class="db-stage"><span class="db-bad"${w.style ? ` style="${esc(w.style)}"` : ''}>${w.svg || logo()}</span><span class="db-good" aria-hidden="true">${logo()}</span></span><span class="db-label"><span class="db-label-bad">${esc(w.label)}</span><span class="db-label-good">${esc(w.fix)}</span></span></button></li>`).join('');
    list.querySelectorAll('.db-wrong').forEach(b => enhance(b, wrong[b.dataset.i]));
  }
  list?.addEventListener('click', e => {
    const b = e.target.closest('.db-wrong'); if (!b || b.classList.contains('is-fixed')) return;
    const w = wrong[b.dataset.i];
    onWrong(b, () => { b.classList.add('is-fixed'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', `Corregido: ${w.fix}`); status.textContent = `Corregido: ${w.fix}`; }, w);
  });
  root.querySelector('.db-reset')?.addEventListener('click', () => { paintWrong(); status.textContent = 'Regresaron los usos incorrectos.'; });
  paintWrong();
  return { reset: paintWrong };
}
