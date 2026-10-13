// ══════════════════════════════════════════════════════
// Doc Edition · plantilla de edición comentada para documentación de
// humanidades: un texto por versos (o párrafos) con
//  · números de línea: cada `every` a la vista, todos al pasar; tocar uno
//    copia la cita («h. Hom. 3, v. 5»),
//  · traducción en paralelo, línea con línea: original, ambos o solo la
//    traducción (al pasar por un verso se marca su pareja),
//  · escolios al margen, alineados con su verso: el lema va marcado en el
//    texto y en la traducción, y al pasar por uno se ilumina el otro. En
//    pantallas angostas el margen baja bajo su verso.
// Vive dentro de `.doc` y se viste con las mismas variables de doc-prose.
//   mount({ el, cite, src: { lang, label }, tr: { lang, label },
//     lines: [[original, traducción]…], notes: [{ n, lemma, gloss, text }],
//     every })
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const lemma = (text, word, id) => word ? text.replace(esc(word), `<mark class="doc-ed-lemma" data-note="${id}">${esc(word)}</mark>`) : text;

export function mount({ el, cite = '', src = { lang: 'grc', label: 'Original' }, tr = { lang: 'es', label: 'Traducción' }, lines = [], notes = [], every = 5 }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const uid = root.id || 'doc-ed', byLine = new Map();
  notes.forEach((nt, i) => { const id = `${uid}-n${i + 1}`; (byLine.get(nt.n) || byLine.set(nt.n, []).get(nt.n)).push({ ...nt, id }); });
  const views = [['src', src.label], ['both', 'Ambos'], ['tr', tr.label]];
  root.classList.add('doc-ed'); root.dataset.view = 'both'; root.dataset.notes = 'on';
  root.innerHTML = `<div class="doc-ed-bar">
      <div class="doc-ed-views" role="radiogroup" aria-label="Texto visible">${views.map(([v, l]) => `<button type="button" role="radio" data-view="${v}" aria-checked="${v === 'both'}">${esc(l)}</button>`).join('')}</div>
      <label class="doc-ed-toggle"><input type="checkbox" checked> Escolios</label>
      <span class="doc-ed-status" role="status"></span>
    </div>
    <div class="doc-ed-head" aria-hidden="true"><span></span><span class="doc-ed-src">${esc(src.label)}</span><span class="doc-ed-tr">${esc(tr.label)}</span><span class="doc-ed-note">Escolios</span></div>
    <ol class="doc-ed-text">${lines.map(([o, t], i) => {
      const n = i + 1, ns = byLine.get(n) || [];
      return `<li class="doc-ed-row${n % every ? '' : ' is-mark'}" data-n="${n}">
        <button type="button" class="doc-ed-n" aria-label="Copiar la cita del verso ${n}">${n}</button>
        <span class="doc-ed-src" lang="${esc(src.lang)}">${ns.reduce((acc, x) => lemma(acc, x.lemma, x.id), esc(o))}</span>
        <span class="doc-ed-tr" lang="${esc(tr.lang)}">${ns.reduce((acc, x) => lemma(acc, x.gloss, x.id), esc(t))}</span>
        <span class="doc-ed-note">${ns.map(x => `<span class="doc-ed-scholion" id="${x.id}" data-note="${x.id}"><b>${n}</b> <span lang="${esc(src.lang)}">${esc(x.lemma)}</span>] ${esc(x.text)}</span>`).join('')}</span>
      </li>`; }).join('')}</ol>`;

  // vista: original, ambos o traducción
  const radios = [...root.querySelectorAll('.doc-ed-views button')];
  const setView = v => { root.dataset.view = v; radios.forEach(r => r.setAttribute('aria-checked', String(r.dataset.view === v))); };
  radios.forEach((r, i) => {
    r.addEventListener('click', () => setView(r.dataset.view));
    r.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; const nx = radios[(i + d + radios.length) % radios.length]; nx.focus(); setView(nx.dataset.view); });
  });
  root.querySelector('.doc-ed-toggle input').addEventListener('change', e => { root.dataset.notes = e.target.checked ? 'on' : 'off'; });

  // lema y escolio se iluminan juntos
  const hot = (id, on) => root.querySelectorAll(`[data-note="${id}"]`).forEach(x => x.classList.toggle('is-hot', on));
  root.querySelectorAll('[data-note]').forEach(x => { const id = x.dataset.note; x.addEventListener('pointerenter', () => hot(id, true)); x.addEventListener('pointerleave', () => hot(id, false)); });

  // citar un verso
  const status = root.querySelector('.doc-ed-status'); let timer = 0;
  root.querySelectorAll('.doc-ed-n').forEach(b => b.addEventListener('click', async () => {
    const ref = `${cite ? cite + ', ' : ''}v. ${b.textContent}`;
    try { await navigator.clipboard.writeText(ref); status.textContent = `Copiado: ${ref}`; } catch { status.textContent = ref; }
    clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; }, 2400);
  }));
}
