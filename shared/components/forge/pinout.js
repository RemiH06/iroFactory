// ══════════════════════════════════════════════════════
// DIAGRAMA DE PINES · el chip en DIP-28 visto desde arriba (muesca
// arriba, pin 1 arriba a la izquierda, numeración en U). Cada pata con su
// nombre, funciones y pin de Arduino; el color es el de su grupo y el
// nombre siempre va escrito. Filtros por función; al tocar un pin, su
// ficha. Las patas del puerto B muestran DDRB y PORTB en vivo (flecha de
// salida o entrada y un punto encendido si está en alto). Se enciende la
// fila de ese pin en el diagrama de tiempos, y al revés.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { PINS, GROUPS, CHIP, state, on, pinFocus } from './datasheet-data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const REG_OF = { spi: 'SPCR', uart: 'UCSR0C', adc: 'ADCSRA', pwm: 'TCCR0A' };

export function mount({ el = document.getElementById('fg-pinout') } = {}) {
  if (!el) return;
  let filter = null, sel = 19, hot = 0;
  el.innerHTML = `<div class="po-filters" role="group" aria-label="Filtrar por función"><button type="button" class="po-chip" data-g="" aria-pressed="true">todas</button>${GROUPS.map(([g, n, c]) => `<button type="button" class="po-chip" data-g="${g}" aria-pressed="false" style="--c:var(${c})"><i></i>${n}</button>`).join('')}</div>
    <div class="po-main"><div class="po-chipview"></div><aside class="po-card" aria-live="polite"></aside></div>`;
  const view = el.querySelector('.po-chipview'), card = el.querySelector('.po-card');
  const color = p => { const g = GROUPS.find(x => x[0] === p.groups[0]); return g ? `var(${g[2]})` : 'var(--ash)'; };
  const portB = p => /^PB\d$/.test(p.name) ? +p.name[2] : null;

  function draw() {
    const W = Math.max(300, view.clientWidth || 520), compact = W < 500, bodyW = compact ? 96 : 120, rowH = compact ? 21 : 24;
    const cx = W / 2, top = 26, H = top + 14 * rowH + 24, bx = cx - bodyW / 2, legW = 14;
    const pinY = i => top + 12 + i * rowH;
    let g = '';
    PINS.forEach(p => {
      const left = p.n <= 14, i = left ? p.n - 1 : 28 - p.n, y = pinY(i);
      const lx = left ? bx - legW : bx + bodyW, tx = left ? bx - legW - 20 : bx + bodyW + legW + 20, anchor = left ? 'end' : 'start';
      const dim = filter && !p.groups.includes(filter) ? ' is-dim' : '';
      const main = p.funcs.find(f => !/^PCINT/.test(f) && f !== p.name);
      const label = compact ? `${p.name}${p.ard && p.ard !== p.name ? ' · ' + p.ard : ''}` : `${p.name}${main ? ' · ' + main : ''}${p.ard && p.ard !== p.name && p.ard !== main ? ' · ' + p.ard : ''}`;
      const b = portB(p); let io = '';
      if (b != null) {
        const out = (state.DDRB >> b) & 1, high = (state.PORTB >> b) & 1, ax = left ? lx + 4 : lx + legW - 4;
        io = `<text class="po-io" x="${left ? lx - 3 : lx + legW + 3}" y="${y + 4}" text-anchor="${left ? 'end' : 'start'}" aria-hidden="true">${out ? (left ? '←' : '→') : (left ? '→' : '←')}</text>${out && high ? `<circle class="po-led" cx="${ax + (left ? -2 : 2)}" cy="${y - 9}" r="3"/>` : ''}`;
      }
      g += `<g class="po-pin${dim}${p.n === sel ? ' is-sel' : ''}${p.n === hot ? ' is-hot' : ''}" data-n="${p.n}" tabindex="0" role="button" aria-pressed="${p.n === sel}" aria-label="Pin ${p.n}, ${esc(p.name)}: ${esc(p.funcs.join(', '))}${p.ard ? ', Arduino ' + p.ard : ''}" style="--pc:${color(p)}">
        <rect class="po-hit" x="${left ? 0 : bx + bodyW}" y="${y - rowH / 2}" width="${left ? bx : W - bx - bodyW}" height="${rowH}"/>
        <rect class="po-leg" x="${lx}" y="${y - 5}" width="${legW}" height="10" rx="1.5"/>
        <text class="po-num" x="${left ? bx + 8 : bx + bodyW - 8}" y="${y + 4}" text-anchor="${left ? 'start' : 'end'}">${p.n}</text>
        <text class="po-lab" x="${tx}" y="${y + 4}" text-anchor="${anchor}">${esc(label)}</text>${io}</g>`;
    });
    view.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${CHIP.name} en ${CHIP.pkg}, pines">
      <rect class="po-body" x="${bx}" y="${top - 6}" width="${bodyW}" height="${14 * rowH + 12}" rx="4"/>
      <path class="po-notch" d="M${cx - 12},${top - 6} a12,12 0 0 0 24,0"/>
      <text class="po-name" x="${cx}" y="${top + 7 * rowH + 6}" text-anchor="middle" transform="rotate(-90 ${cx} ${top + 7 * rowH + 6})">${CHIP.name}</text>
      ${g}</svg>`;
  }
  function info() {
    const p = PINS.find(x => x.n === sel); if (!p) return;
    const b = portB(p), groups = p.groups.map(g => GROUPS.find(x => x[0] === g));
    const port = b != null ? `<p class="po-port"><b>DDRB${b} = ${(state.DDRB >> b) & 1}</b>, <b>PORTB${b} = ${(state.PORTB >> b) & 1}</b>: ${(state.DDRB >> b) & 1 ? `salida en ${(state.PORTB >> b) & 1 ? 'alto' : 'bajo'}` : (state.PORTB >> b) & 1 ? 'entrada con pull-up' : 'entrada flotante'}.</p>` : '';
    const reg = p.groups.map(g => REG_OF[g]).find(Boolean) || (b != null ? 'DDRB' : null);
    card.innerHTML = `<p class="po-k">Pin ${p.n}${p.ard ? ` · Arduino ${esc(p.ard)}` : ''}</p><h4>${esc(p.name)}</h4>
      <p class="po-funcs">${p.funcs.map(f => `<span class="badge">${esc(f)}</span>`).join(' ')}</p>
      ${groups.length ? `<p class="po-groups">${groups.map(([, n, c]) => `<span style="--c:var(${c})"><i></i>${n}</span>`).join('')}</p>` : ''}
      <p>${esc(p.note)}</p>${port}${reg ? `<button type="button" class="btn po-reg" data-reg="${reg}">ver ${reg} en la tabla</button>` : ''}`;
  }
  const choose = (n, focus) => { sel = n; draw(); info(); pinFocus(n, 'pinout'); if (focus) view.querySelector(`.po-pin[data-n="${n}"]`)?.focus(); };
  view.addEventListener('click', e => { const g = e.target.closest('.po-pin'); if (g) choose(+g.dataset.n); });
  view.addEventListener('keydown', e => {
    const g = e.target.closest('.po-pin'); if (!g) return; const n = +g.dataset.n;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(n, true); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const d = e.key === 'ArrowDown' ? 1 : -1, next = n <= 14 ? n + d : n - d; if (next >= 1 && next <= 28) choose(next, true); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); choose(29 - n, true); }
  });
  view.addEventListener('pointerover', e => { const g = e.target.closest('.po-pin'); if (g && +g.dataset.n !== hot) { hot = +g.dataset.n; pinFocus(hot, 'hover'); view.querySelectorAll('.po-pin').forEach(x => x.classList.toggle('is-hot', +x.dataset.n === hot)); } });
  view.addEventListener('pointerleave', () => { hot = 0; pinFocus(0, 'hover'); view.querySelectorAll('.po-pin.is-hot').forEach(x => x.classList.remove('is-hot')); });
  el.querySelector('.po-filters').addEventListener('click', e => {
    const c = e.target.closest('.po-chip'); if (!c) return; filter = c.dataset.g || null;
    el.querySelectorAll('.po-chip').forEach(x => x.setAttribute('aria-pressed', String(x === c))); draw();
  });
  card.addEventListener('click', e => {
    const b = e.target.closest('.po-reg'); if (!b) return;
    const t = document.querySelector(`#fg-regs [data-reg="${b.dataset.reg}"]`); if (!t) return;
    t.hidden = false; t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    t.classList.remove('is-flash'); void t.offsetWidth; t.classList.add('is-flash'); t.querySelector('.rg-bit[data-i]')?.focus({ preventScroll: true });
  });
  on('change', () => { draw(); info(); });
  on('pin', ({ n, source }) => { if (source !== 'timing') return; hot = n; view.querySelectorAll('.po-pin').forEach(x => x.classList.toggle('is-hot', +x.dataset.n === n)); });
  new ResizeObserver(() => { const w = view.clientWidth; if (w && w !== draw.w) { draw.w = w; draw(); } }).observe(view);
  draw(); info();
}
