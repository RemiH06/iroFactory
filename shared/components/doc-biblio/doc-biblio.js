// ══════════════════════════════════════════════════════
// Doc Biblio · plantilla de bibliografía. Las referencias se guardan como
// datos y se escriben en el estilo elegido (APA 7, MLA 9 o Chicago
// autor-fecha, con las convenciones en español: «y», «Trad.», «ed.»).
// Se filtran por tipo (fuente, edición, traducción, estudio), se ordenan
// por autor o por año, y cada una (o la lista entera) se copia como texto.
// Vive dentro de `.doc` y se viste con las variables de doc-prose.
//   mount({ el, items: [{ type, authors: [[apellido, nombre]], role?,
//     year, title, edition?, series?, translator?, place, publisher }] })
//   role: 'ed' (editores) o 'trad' (traductores); translator: nombre.
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TYPES = { fuente: 'Fuentes', edicion: 'Ediciones', traduccion: 'Traducciones', estudio: 'Estudios' };
const TAG = { fuente: 'Fuente', edicion: 'Edición', traduccion: 'Traducción', estudio: 'Estudio' };
const initials = n => n.split(/\s+/).map(w => w[0] + '.').join(' ');
const short = full => { const p = full.split(' '); return `${initials(p.slice(0, -1).join(' '))} ${p[p.length - 1]}`; }; // John Raffan → J. Raffan
const joinY = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const dot = t => (t.endsWith('.') ? t : t + '.') + ' '; // cierra una parte sin duplicar el punto
const it = t => `<i>${esc(t)}</i>`;
const plural = (r, one, many) => r.authors.length > 1 ? many : one;

// cada estilo devuelve HTML (el texto plano sale de quitar las etiquetas)
const STYLES = {
  apa: { label: 'APA', fmt: r => {
    const who = joinY(r.authors.map(([l, f]) => `${esc(l)}, ${initials(f)}`));
    const role = r.role === 'ed' ? ` (${plural(r, 'Ed.', 'Eds.')})` : r.role === 'trad' ? ' (Trad.)' : '';
    const extra = [r.edition, r.translator && `${esc(short(r.translator))}, Trad.`].filter(Boolean).join('; ');
    return `${who}${role}${(who + role).endsWith('.') ? '' : '.'} (${r.year}). ${it(r.title)}${extra ? ` (${extra})` : ''}. ${esc(r.publisher)}.`;
  } },
  mla: { label: 'MLA', fmt: r => {
    const [first, ...rest] = r.authors, lead = `${esc(first[0])}, ${esc(first[1])}`;
    const who = r.authors.length > 2 ? `${lead}, et al.` : rest.length ? `${lead}, y ${esc(rest[0][1])} ${esc(rest[0][0])}` : lead;
    const role = r.role === 'ed' ? `, ${plural(r, 'editor', 'editores')}` : r.role === 'trad' ? ', traductor' : '';
    return `${who}${role}. ${it(r.title)}. ${r.translator ? `Traducido por ${esc(r.translator)}, ` : ''}${r.edition ? esc(r.edition) + ', ' : ''}${esc(r.publisher)}, ${r.year}.`;
  } },
  chicago: { label: 'Chicago', fmt: r => {
    const [first, ...rest] = r.authors;
    const who = joinY([`${esc(first[0])}, ${esc(first[1])}`, ...rest.map(([l, f]) => `${esc(f)} ${esc(l)}`)]);
    const role = r.role === 'ed' ? `, ${plural(r, 'ed', 'eds')}` : r.role === 'trad' ? ', trad' : '';
    return `${who}${role}. ${r.year}. ${it(r.title)}. ${r.translator ? `Traducido por ${esc(r.translator)}. ` : ''}${r.edition ? dot(esc(r.edition)) : ''}${r.series ? dot(esc(r.series)) : ''}${esc(r.place)}: ${esc(r.publisher)}.`;
  } }
};
const plain = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

export function mount({ el, items = [], style = 'apa' }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const types = [...new Set(items.map(r => r.type))];
  const state = { style, sort: 'author', off: new Set() };
  root.classList.add('doc-bib');
  root.innerHTML = `<div class="doc-bib-bar">
      <div class="doc-bib-styles" role="radiogroup" aria-label="Estilo de cita">${Object.entries(STYLES).map(([k, s]) => `<button type="button" role="radio" data-style="${k}">${s.label}</button>`).join('')}</div>
      <div class="doc-bib-types" aria-label="Tipos">${types.map(t => `<button type="button" class="doc-bib-chip" data-type="${t}" aria-pressed="true">${TYPES[t] || t}</button>`).join('')}</div>
      <label class="doc-bib-sort">Ordenar <select><option value="author">por autor</option><option value="year">por año</option></select></label>
      <button type="button" class="doc-bib-all">Copiar la lista</button>
      <span class="doc-bib-status" role="status"></span>
    </div>
    <ol class="doc-bib-list"></ol>`;
  const list = root.querySelector('.doc-bib-list'), status = root.querySelector('.doc-bib-status');
  let timer = 0;
  const say = t => { status.textContent = t; clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; }, 2400); };
  const copy = async text => { try { await navigator.clipboard.writeText(text); say('Copiado'); } catch { say('No se pudo copiar'); } };
  const shown = () => items.filter(r => !state.off.has(r.type)).sort((a, b) => state.sort === 'year' ? a.year - b.year : a.authors[0][0].localeCompare(b.authors[0][0], 'es'));
  const render = () => {
    root.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.style === state.style)));
    const f = STYLES[state.style].fmt;
    list.innerHTML = shown().map(r => `<li class="doc-bib-item"><span class="doc-bib-tag">${TAG[r.type] || r.type}</span><span class="doc-bib-ref">${f(r)}</span><button type="button" class="doc-bib-copy" aria-label="Copiar la referencia">Copiar</button></li>`).join('') || '<li class="doc-bib-empty">Ningún tipo elegido.</li>';
    list.querySelectorAll('.doc-bib-copy').forEach(b => b.addEventListener('click', () => copy(plain(b.previousElementSibling.innerHTML))));
  };
  root.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => { state.style = b.dataset.style; render(); }));
  root.querySelectorAll('.doc-bib-chip').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); state.off[on ? 'delete' : 'add'](b.dataset.type); render(); }));
  root.querySelector('select').addEventListener('change', e => { state.sort = e.target.value; render(); });
  root.querySelector('.doc-bib-all').addEventListener('click', () => copy(shown().map(r => plain(STYLES[state.style].fmt(r))).join('\n')));
  render();
}
