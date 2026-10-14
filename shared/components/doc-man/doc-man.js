// ══════════════════════════════════════════════════════
// Doc Man · referencia de una herramienta de línea de comandos al estilo
// de `man`: cabecera y pie con NOMBRE(sección), y las secciones NOMBRE,
// SINOPSIS, DESCRIPCIÓN, OPCIONES, EJEMPLOS, SALIDA y VER TAMBIÉN.
// Encima, un armador de comandos: marcar una opción (y darle valor) la
// agrega al comando, que se copia de un clic; cada ejemplo también se
// copia. Las opciones se filtran escribiendo. Vive dentro de `.doc` y se
// viste con las variables de doc-prose.
//   mount({ el, name, section = 1, manual, version, date, summary,
//     synopsis: ['nombre [opciones] archivo'], description: '<p>…</p>',
//     operand: { name: 'imagen', value: 'foto.jpg' },
//     options: [{ short, long, arg?, value?, desc, def? }],
//     examples: [{ cmd, desc }], exit: [[código, qué]], seeAlso: [] })
// `description` es HTML de confianza (lo escribe el tema).
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const quote = v => (/^[\w./:=@%+-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);
const flagOf = o => o.long || o.short;

export function mount({ el, name, section = 1, manual = 'Manual de usuario', version = '', date = '', summary = '', synopsis = [], description = '', operand = null, options = [], examples = [], exit = [], seeAlso = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const id = root.id || 'man-' + name;
  const head = `${name.toUpperCase()}(${section})`;
  const on = new Map();
  root.classList.add('doc-man');
  root.innerHTML = `<header class="doc-man-rule"><span>${esc(head)}</span><span>${esc(manual)}</span><span>${esc(head)}</span></header>
    <h4 class="doc-man-h">Nombre</h4>
    <p class="doc-man-p"><b>${esc(name)}</b> · ${esc(summary)}</p>
    <h4 class="doc-man-h">Sinopsis</h4>
    ${synopsis.map(s => `<p class="doc-man-p doc-man-syn">${esc(s).replace(new RegExp('^' + name), `<b>${esc(name)}</b>`).replace(/\[([^\]]+)\]/g, '[<i>$1</i>]')}</p>`).join('')}
    <div class="doc-man-build">
      <p class="doc-man-cap">Arma el comando</p>
      <div class="doc-man-line"><code class="doc-man-cmd" aria-live="polite"></code><button type="button" class="doc-man-copy" data-copy="build">Copiar</button></div>
      ${operand ? `<label class="doc-man-op">${esc(operand.name)} <input type="text" value="${esc(operand.value || '')}" spellcheck="false" autocomplete="off"></label>` : ''}
    </div>
    <h4 class="doc-man-h">Descripción</h4>
    <div class="doc-man-p">${description}</div>
    <h4 class="doc-man-h">Opciones</h4>
    <label class="doc-man-filter">Filtrar <input type="search" placeholder="--seed, color…" spellcheck="false" aria-controls="${id}-opts"></label>
    <dl class="doc-man-opts" id="${id}-opts">${options.map((o, i) => `<div class="doc-man-opt" data-i="${i}" data-q="${esc((flagOf(o) + ' ' + (o.short || '') + ' ' + o.desc).toLowerCase())}">
        <dt><label><input type="checkbox" aria-label="Usar ${esc(flagOf(o))}"> <span>${[o.short, o.long].filter(Boolean).map(f => `<b>${esc(f)}</b>`).join(', ')}${o.arg ? ` <i>${esc(o.arg)}</i>` : ''}</span></label>${o.arg ? `<input class="doc-man-val" type="text" value="${esc(o.value ?? o.def ?? '')}" aria-label="Valor de ${esc(flagOf(o))}" spellcheck="false" autocomplete="off">` : ''}</dt>
        <dd>${esc(o.desc)}${o.def != null ? ` <span class="doc-man-def">Por omisión: ${esc(o.def)}.</span>` : ''}</dd></div>`).join('')}</dl>
    <p class="doc-man-none" hidden>Ninguna opción coincide.</p>
    ${examples.length ? `<h4 class="doc-man-h">Ejemplos</h4>${examples.map((x, i) => `<div class="doc-man-ex"><p class="doc-man-p">${esc(x.desc)}</p><div class="doc-man-line"><code>$ ${esc(x.cmd)}</code><button type="button" class="doc-man-copy" data-copy="${i}">Copiar</button></div></div>`).join('')}` : ''}
    ${exit.length ? `<h4 class="doc-man-h">Estado de salida</h4><dl class="doc-man-exit">${exit.map(([c, d]) => `<dt>${esc(c)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>` : ''}
    ${seeAlso.length ? `<h4 class="doc-man-h">Ver también</h4><p class="doc-man-p">${seeAlso.map(s => `<b>${esc(s)}</b>`).join(', ')}</p>` : ''}
    <footer class="doc-man-rule"><span>${esc(name)} ${esc(version)}</span><span>${esc(date)}</span><span>${esc(head)}</span></footer>
    <span class="doc-man-status" role="status"></span>`;

  const $ = s => root.querySelector(s), cmdEl = $('.doc-man-cmd'), status = $('.doc-man-status');
  const build = () => {
    const parts = [name];
    options.forEach((o, i) => { if (!on.has(i)) return; const v = on.get(i); parts.push(o.arg ? `${flagOf(o)} ${quote(v || o.def || '')}` : flagOf(o)); });
    const op = $('.doc-man-op input')?.value.trim();
    if (op) parts.push(quote(op));
    return parts.join(' ');
  };
  const paint = () => { cmdEl.textContent = '$ ' + build(); };
  let timer = 0;
  const say = t => { status.textContent = t; clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; }, 2000); };
  root.querySelectorAll('.doc-man-opt').forEach(row => {
    const i = +row.dataset.i, box = row.querySelector('input[type=checkbox]'), val = row.querySelector('.doc-man-val');
    const sync = () => { box.checked ? on.set(i, val ? val.value.trim() : '') : on.delete(i); row.classList.toggle('is-on', box.checked); paint(); };
    box.addEventListener('change', sync);
    val?.addEventListener('input', () => { if (!box.checked) box.checked = true; sync(); });
  });
  $('.doc-man-op input')?.addEventListener('input', paint);
  $('.doc-man-filter input').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    let n = 0;
    root.querySelectorAll('.doc-man-opt').forEach(r => { const hit = !q || r.dataset.q.includes(q); r.hidden = !hit; n += hit; });
    $('.doc-man-none').hidden = n > 0;
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy === 'build' ? build() : examples[+b.dataset.copy].cmd;
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copiado'; say('Comando copiado'); } catch { b.textContent = 'No se pudo'; }
    setTimeout(() => { b.textContent = 'Copiar'; }, 1600);
  });
  paint();
}
