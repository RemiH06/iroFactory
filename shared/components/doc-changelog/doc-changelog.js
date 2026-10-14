// ══════════════════════════════════════════════════════
// Doc Changelog · registro de cambios por versión (estilo Keep a
// Changelog, con versiones semánticas). Cada versión dice si fue mayor,
// menor o parche respecto a la anterior (se calcula del número). Se
// filtra por tipo de cambio y por rango («qué cambió desde la 0.2 hasta
// la 0.4»: un resumen agrupado por tipo encima de la lista) y lo que se
// ve se copia en Markdown. Vive dentro de `.doc` con las variables de doc-prose.
//   mount({ el, releases: [{ v: '0.4.0', date: '2026-10-13', notes: [['added', '…']], yanked? }] })
// `releases` va de la más nueva a la más vieja. Tipos: added, changed,
// fixed, removed, deprecated, security.
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TYPES = { added: 'Añadido', changed: 'Cambiado', fixed: 'Corregido', removed: 'Quitado', deprecated: 'Obsoleto', security: 'Seguridad' };
const BUMP = { major: 'mayor', minor: 'menor', patch: 'parche', first: 'primera' };
const parts = v => v.split(/[.-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
function bump(v, older) {
  if (!older) return 'first';
  const [a, b] = [parts(v), parts(older)];
  return a[0] !== b[0] ? 'major' : a[1] !== b[1] ? 'minor' : 'patch';
}
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export function mount({ el, releases = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root || !releases.length) return;
  const rel = releases.map((r, i) => ({ ...r, bump: bump(r.v, releases[i + 1]?.v) }));
  const used = Object.keys(TYPES).filter(t => rel.some(r => r.notes.some(([k]) => k === t)));
  const state = { off: new Set(), from: rel.length, to: 0 }; // índices: from es exclusivo (más vieja), to inclusivo
  const opt = (i, label) => `<option value="${i}">${esc(label)}</option>`;
  root.classList.add('doc-cl');
  root.innerHTML = `<div class="doc-cl-bar">
      <div class="doc-cl-types" aria-label="Tipos de cambio">${used.map(t => `<button type="button" class="doc-cl-chip" data-type="${t}" aria-pressed="true">${TYPES[t]}</button>`).join('')}</div>
      <label>desde <select class="doc-cl-from">${opt(rel.length, 'el principio')}${rel.slice(1).map((r, i) => opt(i + 1, r.v)).join('')}</select></label>
      <label>hasta <select class="doc-cl-to">${rel.map((r, i) => opt(i, r.v)).join('')}</select></label>
      <button type="button" class="doc-cl-copy">Copiar en Markdown</button>
      <span class="doc-cl-status" role="status"></span>
    </div>
    <div class="doc-cl-sum" hidden></div>
    <ol class="doc-cl-list"></ol>`;
  const $ = s => root.querySelector(s), list = $('.doc-cl-list'), sum = $('.doc-cl-sum'), status = $('.doc-cl-status');
  const shown = () => rel.slice(state.to, state.from).map(r => ({ ...r, notes: r.notes.filter(([t]) => !state.off.has(t)) }));
  const render = () => {
    const rs = shown();
    list.innerHTML = rs.map(r => `<li class="doc-cl-rel${r.yanked ? ' is-yanked' : ''}">
        <div class="doc-cl-head"><span class="doc-cl-v">${esc(r.v)}</span><span class="doc-cl-bump is-${r.bump}">${BUMP[r.bump]}</span>${r.yanked ? '<span class="doc-cl-bump is-yanked">retirada</span>' : ''}<time datetime="${esc(r.date)}">${fmtDate(r.date)}</time></div>
        ${r.notes.length ? `<ul>${r.notes.map(([t, x]) => `<li><span class="doc-cl-tag is-${t}">${TYPES[t] || t}</span>${esc(x)}</li>`).join('')}</ul>` : '<p class="doc-cl-empty">Sin cambios de los tipos elegidos.</p>'}
      </li>`).join('') || '<li class="doc-cl-empty">El rango está vacío: «hasta» debe ser más nueva que «desde».</li>';
    const ranged = state.from !== rel.length || state.to !== 0;
    sum.hidden = !ranged || !rs.length;
    if (ranged && rs.length) {
      const by = {}; rs.forEach(r => r.notes.forEach(([t, x]) => (by[t] = by[t] || []).push([r.v, x])));
      const top = rs.reduce((m, r) => (r.bump === 'major' ? 'major' : m === 'major' ? m : r.bump === 'minor' ? 'minor' : m), 'patch');
      sum.innerHTML = `<p><b>De ${esc(rel[state.from]?.v || 'el principio')} a ${esc(rel[state.to].v)}</b>: ${rs.length} ${rs.length === 1 ? 'versión' : 'versiones'}, salto ${BUMP[top]}.</p>` +
        Object.entries(by).map(([t, xs]) => `<p class="doc-cl-sumt"><span class="doc-cl-tag is-${t}">${TYPES[t]}</span>${xs.length}</p><ul>${xs.map(([v, x]) => `<li>${esc(x)} <small>${esc(v)}</small></li>`).join('')}</ul>`).join('');
    }
  };
  const md = () => shown().map(r => `## [${r.v}] · ${r.date}${r.yanked ? ' [RETIRADA]' : ''}\n` + used.filter(t => r.notes.some(([k]) => k === t)).map(t => `\n### ${TYPES[t]}\n${r.notes.filter(([k]) => k === t).map(([, x]) => `- ${x}`).join('\n')}\n`).join('')).join('\n');
  root.querySelectorAll('.doc-cl-chip').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); state.off[on ? 'delete' : 'add'](b.dataset.type); render(); }));
  $('.doc-cl-from').addEventListener('change', e => { state.from = +e.target.value; render(); });
  $('.doc-cl-to').addEventListener('change', e => { state.to = +e.target.value; render(); });
  let timer = 0;
  $('.doc-cl-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('# Cambios\n\n' + md()); status.textContent = 'Copiado'; } catch { status.textContent = 'No se pudo copiar'; }
    clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; }, 2000);
  });
  render();
}
