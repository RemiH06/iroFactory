// ══════════════════════════════════════════════════════
// Command Palette · Ctrl + K (⌘ K en Mac) o el botón de la terminal.
// Busca entre niveles, herramientas, plantillas y acciones con
// coincidencia difusa (las letras en orden, premia inicios de palabra y
// tramos seguidos) y marca las letras que coincidieron. Cada opción
// muestra el comando de terminal equivalente: Enter lo ejecuta en la
// terminal, que queda en su historial. Es un <dialog> modal: Esc cierra
// y el foco no se escapa.
// ══════════════════════════════════════════════════════
import { run, entries } from './terminal.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Puntaje de subsecuencia: null si no están todas las letras en orden.
function fuzzy(q, text) {
  const t = fold(text);
  let score = 0, ti = 0, streak = 0;
  const hits = [];
  for (const ch of q) {
    const i = t.indexOf(ch, ti);
    if (i < 0) return null;
    streak = i === ti ? streak + 1 : 0;
    score += 1 + streak * 2 + (i === 0 || /[\s/·-]/.test(t[i - 1]) ? 3 : 0) - Math.min(i - ti, 4) * 0.25;
    hits.push(i); ti = i + 1;
  }
  return { score, hits };
}
const mark = (text, hits) => [...text].map((c, i) => (hits.includes(i) ? `<mark>${esc(c)}</mark>` : esc(c))).join('');

export function mount() {
  const dlg = document.createElement('dialog');
  dlg.className = 'sh-pal';
  dlg.setAttribute('aria-label', 'Paleta de comandos');
  dlg.innerHTML = `<div class="sh-pal-box">
      <div class="sh-pal-head"><span class="sh-pal-ps" aria-hidden="true">&gt;</span>
        <input class="sh-pal-in" type="text" role="combobox" aria-expanded="true" aria-controls="sh-pal-list" aria-autocomplete="list" placeholder="Ir a, abrir, cambiar…" spellcheck="false" autocomplete="off">
        <kbd>Esc</kbd></div>
      <ul class="sh-pal-list" id="sh-pal-list" role="listbox" aria-label="Comandos"></ul>
      <p class="sh-pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> elegir</span><span><kbd>Enter</kbd> ejecutar</span><span>lo mismo se escribe en la terminal</span></p>
    </div>`;
  document.body.appendChild(dlg);
  const input = dlg.querySelector('input'), list = dlg.querySelector('ul');
  let items = [], sel = 0;

  const render = () => {
    const q = fold(input.value.trim()).replace(/\s+/g, '');
    const all = entries();
    items = q ? all.map(e => {
      const a = fuzzy(q, e.label), b = fuzzy(q, e.cmd), c = fuzzy(q, e.keys || '');
      const best = [a && { s: a.score + 2, h: a.hits }, b && { s: b.score, h: [] }, c && { s: c.score - 1, h: [] }].filter(Boolean).sort((x, y) => y.s - x.s)[0];
      return best ? { ...e, s: best.s, h: best.h } : null;
    }).filter(Boolean).sort((x, y) => y.s - x.s) : all.map(e => ({ ...e, h: [] }));
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let group = '';
    list.innerHTML = items.map((e, i) => {
      const head = !q && e.group !== group ? `<li class="sh-pal-group" role="presentation">${esc(group = e.group)}</li>` : '';
      return `${head}<li class="sh-pal-opt" role="option" id="sh-pal-${i}" data-i="${i}" aria-selected="${i === sel}"><span class="sh-pal-label">${mark(e.label, e.h)}</span>${q ? `<span class="sh-pal-g">${esc(e.group)}</span>` : ''}<code class="sh-pal-cmd">${esc(e.cmd)}</code></li>`;
    }).join('') || '<li class="sh-pal-none" role="presentation">Nada coincide. En la terminal, help lista todo.</li>';
    input.setAttribute('aria-activedescendant', items.length ? `sh-pal-${sel}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };
  const pick = i => { const e = items[i]; if (!e) return; dlg.close(); run(e.cmd); };
  const open = () => { if (dlg.open) { dlg.close(); return; } input.value = ''; sel = 0; render(); dlg.showModal(); input.focus(); };

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
  });
  list.addEventListener('click', e => { const o = e.target.closest('[data-i]'); if (o) pick(+o.dataset.i); });
  list.addEventListener('pointermove', e => { const o = e.target.closest('[data-i]'); if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; list.querySelectorAll('[aria-selected]').forEach(x => x.setAttribute('aria-selected', String(x === o))); input.setAttribute('aria-activedescendant', o.id); } });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  addEventListener('sh:palette', open);
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); } });
}
