// ══════════════════════════════════════════════════════
// DOC BRIEF · un brief de una página que se llena, se revisa solo y se
// exporta a Markdown. El tema declara los campos y las reglas de revisión;
// el componente arma el formulario, cuenta palabras donde hay límite (y
// tacha lo que sobra), guarda el borrador en el navegador y entrega el .md.
//   mount({
//     el, name, storage,                    // `storage`: clave de localStorage (opcional)
//     fields: [{ id, label, hint, type: 'text' | 'area' | 'date' | 'choice' | 'multi',
//                words, max, wide, options: [[valor, etiqueta, { style, lang }]] }],
//     value: { id: valor },                 // el ejemplo de arranque
//     checks: [valor → { ok, text }],       // la revisión
//     tables: valor → [{ title, head, rows }],   // tablas derivadas (calendario…)
//     onChange(valor) })
//   → { set(parche), value() }
// Sin JS se queda lo que ya traiga `el` (el brief de ejemplo, fijo).
// ══════════════════════════════════════════════════════
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);

export function mount({ el, name = 'Brief', storage, fields, value: initial, checks = [], tables = () => [], onChange = () => {} } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return null;
  const uid = 'bf-' + Math.random().toString(36).slice(2, 7), known = new Set(fields.map(f => f.id));
  let v = structuredClone(initial);
  // el borrador guardado solo pisa campos que existen y del mismo tipo
  try { const saved = storage && JSON.parse(localStorage.getItem(storage) || 'null'); if (saved && typeof saved === 'object') for (const k of Object.keys(saved)) if (known.has(k) && Array.isArray(saved[k]) === Array.isArray(v[k]) && typeof saved[k] === typeof v[k]) v[k] = saved[k]; } catch { /* sin almacenamiento: se trabaja en memoria */ }

  const label = f => (f.options || []).find(o => o[0] === v[f.id])?.[1] ?? v[f.id];
  const field = f => {
    const id = `${uid}-${f.id}`, hint = f.hint ? `<small id="${id}-h">${esc(f.hint)}</small>` : '', desc = f.hint ? ` aria-describedby="${id}-h"` : '';
    const wrap = (inner, tag = 'div') => `<${tag} class="bf-field${f.wide ? ' wide' : ''}" data-field="${f.id}">${inner}</${tag}>`;
    if (f.type === 'choice' || f.type === 'multi') {
      const t = f.type === 'choice' ? 'radio' : 'checkbox', on = val => (f.type === 'choice' ? v[f.id] === val : v[f.id].includes(val));
      return wrap(`<legend>${esc(f.label)}</legend>${hint}<div class="bf-opts">${f.options.map(([val, lab, o = {}]) => `<label${o.style ? ` style="${esc(o.style)}"` : ''}><input type="${t}" name="${id}" value="${esc(val)}"${on(val) ? ' checked' : ''}><span${o.lang ? ` lang="${o.lang}"` : ''}>${esc(lab)}</span></label>`).join('')}</div>`, 'fieldset');
    }
    const attrs = `id="${id}" name="${f.id}"${desc}${f.max ? ` maxlength="${f.max}"` : ''}`;
    const input = f.type === 'area' ? `<textarea ${attrs} rows="2">${esc(v[f.id])}</textarea>` : `<input type="${f.type === 'date' ? 'date' : 'text'}" ${attrs} value="${esc(v[f.id])}" autocomplete="off">`;
    return wrap(`<label for="${id}">${esc(f.label)}</label>${hint}${input}${f.words ? '<p class="bf-count" aria-live="polite"></p>' : ''}`);
  };
  root.innerHTML = `<form class="bf-form" aria-label="${esc(name)}">${fields.map(field).join('')}</form>`
    + `<aside class="bf-side"><h3 class="bf-h">Revisión <span class="bf-score"></span></h3><ul class="bf-checks"></ul><div class="bf-tables"></div>`
    + `<div class="bf-actions"><button type="button" class="bf-btn" data-act="copy">Copiar Markdown</button><button type="button" class="bf-btn" data-act="save">Descargar .md</button><button type="button" class="bf-btn" data-act="print">Imprimir</button><button type="button" class="bf-btn quiet" data-act="reset">Volver al ejemplo</button></div><p class="bf-status" role="status"></p></aside>`;
  const form = root.querySelector('form'), status = root.querySelector('.bf-status');

  const markdown = () => {
    const out = [`# ${name}`, ''];
    fields.forEach(f => { const val = v[f.id]; out.push(`## ${f.label}`, '', Array.isArray(val) ? val.map(x => `- ${(f.options.find(o => o[0] === x) || [x, x])[1]}`).join('\n') || 'Sin elegir.' : String(label(f) || 'Sin llenar.'), ''); });
    out.push('## Revisión', '', ...checks.map(c => c(v)).map(c => `- [${c.ok ? 'x' : ' '}] ${c.text}`), '');
    tables(v).forEach(t => out.push(`## ${t.title}`, '', `| ${t.head.join(' | ')} |`, `|${t.head.map(() => '---').join('|')}|`, ...t.rows.map(r => `| ${r.join(' | ')} |`), ''));
    return out.join('\n');
  };
  function paint() {
    fields.filter(f => f.words).forEach(f => {
      const w = words(v[f.id]), over = w.length > f.words, box = form.querySelector(`[data-field="${f.id}"] .bf-count`);
      box.innerHTML = `<span class="${over ? 'bf-over' : ''}">${w.length} de ${f.words} palabras</span>` + (over ? ` <span class="bf-cut">${esc(w.slice(0, f.words).join(' '))} <s>${esc(w.slice(f.words).join(' '))}</s></span> <button type="button" class="bf-btn small" data-cut="${f.id}">Tachar lo que sobra</button>` : '');
    });
    const res = checks.map(c => c(v));
    root.querySelector('.bf-score').textContent = `${res.filter(c => c.ok).length} de ${res.length}`;
    root.querySelector('.bf-checks').innerHTML = res.map(c => `<li class="${c.ok ? 'ok' : 'miss'}"><b>${c.ok ? 'pasa' : 'falta'}</b> ${esc(c.text)}</li>`).join('');
    root.querySelector('.bf-tables').innerHTML = tables(v).map(t => `<h3 class="bf-h">${esc(t.title)}</h3><div class="table-wrap"><table><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.head.length}">Nada que programar todavía.</td></tr>`}</tbody></table></div>`).join('');
  }
  const commit = () => { try { if (storage) localStorage.setItem(storage, JSON.stringify(v)); } catch { /* lleno o bloqueado: no se guarda */ } paint(); onChange(v); };
  const sync = () => fields.forEach(f => {
    if (f.type === 'choice' || f.type === 'multi') form.querySelectorAll(`[data-field="${f.id}"] input`).forEach(i => { i.checked = f.type === 'choice' ? v[f.id] === i.value : v[f.id].includes(i.value); });
    else { const i = form.elements[f.id]; if (i !== document.activeElement) i.value = v[f.id]; }
  });

  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', e => {
    const box = e.target.closest('[data-field]'); if (!box) return;
    const f = fields.find(x => x.id === box.dataset.field);
    v[f.id] = f.type === 'multi' ? [...box.querySelectorAll('input:checked')].map(i => i.value) : e.target.value;
    commit();
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cut) { const f = fields.find(x => x.id === b.dataset.cut); v[f.id] = words(v[f.id]).slice(0, f.words).join(' '); form.elements[f.id].value = v[f.id]; form.elements[f.id].focus(); return commit(); }
    const act = b.dataset.act, md = act === 'copy' || act === 'save' ? markdown() : '';
    if (act === 'copy') (navigator.clipboard ? navigator.clipboard.writeText(md) : Promise.reject()).then(() => { status.textContent = 'Brief copiado como Markdown.'; }, () => { status.textContent = 'No se pudo copiar: el navegador no dio permiso.'; });
    if (act === 'save') { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), download: 'brief.md' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); status.textContent = 'Se descargó brief.md.'; }
    if (act === 'print') { document.body.classList.add('print-brief'); addEventListener('afterprint', () => document.body.classList.remove('print-brief'), { once: true }); print(); }
    if (act === 'reset') { v = structuredClone(initial); sync(); commit(); status.textContent = 'Regresó el brief de ejemplo.'; }
  });
  paint(); onChange(v);
  return { value: () => v, markdown, set(patch) { Object.assign(v, patch); sync(); try { if (storage) localStorage.setItem(storage, JSON.stringify(v)); } catch { /* igual que arriba */ } paint(); } };
}
