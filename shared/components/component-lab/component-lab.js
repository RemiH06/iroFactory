// ══════════════════════════════════════════════════════
// COMPONENT LAB · un banco de pruebas al estilo Storybook para los
// componentes del tema: se elige uno, se mueven sus controles (variante,
// texto, estado…) y se ve en vivo con el HTML listo para copiar. Revisa lo
// que se puede medir en día y en noche: contraste real del texto contra el
// fondo que de verdad tiene detrás (mezclando las capas semitransparentes),
// área táctil y nombre accesible. Cada modo se mide cambiando la clase de
// <body> y regresándola en la misma tarea, sin que se pinte.
//   mount({ el, altClass, components: { id: { name, props, render(p), checks } } })
//   props: [[clave, etiqueta, 'select' | 'text' | 'bool', opciones o valor inicial]]
//   checks: [[selector, qué es, { text?, target?, name? }]]
// ══════════════════════════════════════════════════════
import { onTheme } from '../../core/core.js';

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const rgba = css => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#080808'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); return a ? [0, 1, 2].map(i => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a) : [0, 0, 0, 0]; };
const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Fondo efectivo: se mezclan las capas desde <html> hasta el elemento.
const noTransitions = Object.assign(document.createElement('style'), { textContent: '*,*::before,*::after{transition:none!important}' });
const backdrop = el => { const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(rgba(getComputedStyle(n).backgroundColor)); return chain.reduce((acc, c) => over(c, acc), [255, 255, 255, 1]); };
const big = el => { const cs = getComputedStyle(el), px = parseFloat(cs.fontSize), w = +cs.fontWeight; return px >= 24 || (px >= 18.66 && w >= 700); };
const accName = el => (el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || '').trim();

export function mount({ el = document.getElementById('component-lab'), altClass = 'dark', components = {} } = {}) {
  const ids = Object.keys(components); if (!el || !ids.length) return;
  let cur = ids[0]; const state = {};
  ids.forEach(id => { state[id] = Object.fromEntries(components[id].props.map(([k, , t, v]) => [k, t === 'select' ? v[0][0] : v])); });
  el.innerHTML = `<div class="cl-pick" role="tablist" aria-label="Componente">${ids.map(id => `<button type="button" role="tab" class="cl-tab" data-id="${id}">${esc(components[id].name)}</button>`).join('')}</div>
    <div class="cl-main"><form class="cl-knobs" aria-label="Controles"></form>
      <div class="cl-view"><div class="cl-stage"></div><table class="cl-checks"></table></div></div>
    <div class="cl-out"><div class="cl-head"><span>HTML</span><button type="button" class="cl-copy">copiar</button></div><pre><code></code></pre></div>`;
  const $ = s => el.querySelector(s), stage = $('.cl-stage'), knobs = $('.cl-knobs');

  function controls() {
    const c = components[cur], s = state[cur];
    knobs.innerHTML = c.props.map(([k, label, type, v]) => type === 'select'
      ? `<label><span>${esc(label)}</span><select name="${k}">${v.map(([val, txt]) => `<option value="${esc(val)}"${s[k] === val ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select></label>`
      : type === 'bool' ? `<label class="cl-bool"><input type="checkbox" name="${k}"${s[k] ? ' checked' : ''}> ${esc(label)}</label>`
      : `<label><span>${esc(label)}</span><input name="${k}" value="${esc(s[k])}" maxlength="60" autocomplete="off"></label>`).join('');
  }
  // Mide en el modo pedido, y deja <body> como estaba.
  function measure(alt) {
    const body = document.body, had = body.classList.contains(altClass); document.head.appendChild(noTransitions); body.classList.toggle(altClass, alt);
    const rows = (components[cur].checks || []).flatMap(([sel, what, kinds]) => [...stage.querySelectorAll(sel)].slice(0, 1).flatMap(n => {
      const out = [];
      if (kinds.text) { const r = ratio(rgba(getComputedStyle(n).color), backdrop(n)), need = big(n) ? 3 : 4.5; out.push([`Contraste · ${what}`, `${r.toFixed(2)}:1`, r >= need, `AA pide ${need}:1`]); }
      if (kinds.target) { const b = n.getBoundingClientRect(), m = Math.min(b.width, b.height); out.push([`Área táctil · ${what}`, `${Math.round(b.width)} × ${Math.round(b.height)} px`, m >= 24, m >= 44 ? 'cómoda (44 px)' : 'mínimo AA 24 px']); }
      if (kinds.name) { const nm = accName(n); out.push([`Nombre accesible · ${what}`, nm ? `«${nm.slice(0, 28)}»` : 'vacío', !!nm, 'lo que lee un lector de pantalla']); }
      return out;
    }));
    body.classList.toggle(altClass, had); getComputedStyle(body).color; noTransitions.remove();
    return rows;
  }
  function draw() {
    const c = components[cur], html = c.render(state[cur]);
    stage.innerHTML = html;
    stage.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
    const day = measure(false), night = measure(true), isAlt = document.body.classList.contains(altClass);
    $('.cl-checks').innerHTML = `<tr><th>Revisión</th><th${isAlt ? '' : ' class="is-now"'}>Día</th><th${isAlt ? ' class="is-now"' : ''}>Noche</th></tr>` + day.map((r, i) => {
      const cell = x => `<td class="${x[2] ? 'ok' : 'bad'}"><span aria-hidden="true">${x[2] ? '✓' : '✕'}</span> ${esc(x[1])}<span class="cl-sr">${x[2] ? ', pasa' : ', no pasa'}</span></td>`;
      return `<tr><th scope="row">${esc(r[0])}<small>${esc(r[3])}</small></th>${cell(r)}${cell(night[i])}</tr>`;
    }).join('');
    $('.cl-out code').textContent = html.trim();
    el.querySelectorAll('.cl-tab').forEach(b => { const a = b.dataset.id === cur; b.setAttribute('aria-selected', String(a)); b.tabIndex = a ? 0 : -1; });
  }
  el.querySelector('.cl-pick').addEventListener('click', e => { const b = e.target.closest('.cl-tab'); if (b) { cur = b.dataset.id; controls(); draw(); } });
  el.querySelector('.cl-pick').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault();
    const i = (ids.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length; cur = ids[i]; controls(); draw(); el.querySelector(`[data-id="${cur}"]`).focus();
  });
  knobs.addEventListener('input', e => { const t = e.target; state[cur][t.name] = t.type === 'checkbox' ? t.checked : t.value; draw(); });
  knobs.addEventListener('submit', e => e.preventDefault());
  $('.cl-copy').addEventListener('click', e => { const b = e.currentTarget, o = b.textContent; (navigator.clipboard ? navigator.clipboard.writeText($('.cl-out code').textContent) : Promise.reject()).then(() => { b.textContent = 'copiado'; }, () => { b.textContent = 'no se pudo'; }).finally(() => setTimeout(() => { b.textContent = o; }, 1300)); });
  // Al cambiar de modo solo cambia la columna «ahora» (las mediciones propias no disparan esto).
  onTheme(() => draw());
  controls(); draw();
}
