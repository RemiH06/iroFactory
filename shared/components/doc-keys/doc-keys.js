// ══════════════════════════════════════════════════════
// Doc Keys · tabla de atajos de teclado por grupos. Se ve como PC o Mac
// (se adivina, y se cambia), se filtra escribiendo y, mientras está a la
// vista, se presiona un atajo y su renglón se enciende: así se comprueba
// qué hace cada combinación sin leer la tabla entera.
//   mount({ el, groups: [{ name, keys: [{ k: ['Ctrl', 'K'], mac?: ['⌘', 'K'], does }] }] })
// Teclas con nombre: Ctrl, Alt, Shift, Mayús, Enter, Esc, Tab, ↑ ↓ ← →, Espacio.
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const TO_MAC = { Ctrl: '⌘', Alt: '⌥', Shift: '⇧', Mayús: '⇧' };
const NAME = { ' ': 'Espacio', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' };
const norm = k => ({ '⌘': 'Ctrl', '⌥': 'Alt', '⇧': 'Shift', 'Mayús': 'Shift', 'Cmd': 'Ctrl' }[k] || (k.length === 1 ? k.toUpperCase() : k));
const comboOf = keys => keys.map(norm).sort().join('+');

export function mount({ el, groups = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  let mac = MAC, visible = false;
  root.classList.add('doc-keys');
  root.innerHTML = `<div class="doc-keys-bar">
      <div class="doc-keys-os" role="radiogroup" aria-label="Teclado"><button type="button" role="radio" data-os="pc">PC</button><button type="button" role="radio" data-os="mac">Mac</button></div>
      <label class="doc-keys-find">Buscar <input type="search" placeholder="guardar, Ctrl…" spellcheck="false"></label>
      <p class="doc-keys-live" aria-live="polite"><span>Presiona un atajo</span></p>
    </div>
    <div class="doc-keys-groups"></div>`;
  const list = root.querySelector('.doc-keys-groups'), live = root.querySelector('.doc-keys-live');
  const keysOf = x => (mac ? (x.mac || x.k.map(k => TO_MAC[k] || k)) : x.k);
  const render = () => {
    root.querySelectorAll('[data-os]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.os === 'mac') === mac)));
    const q = root.querySelector('input').value.trim().toLowerCase();
    list.innerHTML = groups.map(g => {
      const rows = g.keys.filter(x => !q || (x.does + ' ' + keysOf(x).join(' ')).toLowerCase().includes(q));
      if (!rows.length) return '';
      return `<section class="doc-keys-group"><h4>${esc(g.name)}</h4><dl>${rows.map(x => `<div class="doc-keys-row" data-combo="${esc(comboOf(x.k))}"><dt>${keysOf(x).map(k => `<kbd>${esc(k)}</kbd>`).join('<span>+</span>')}</dt><dd>${esc(x.does)}</dd></div>`).join('')}</dl></section>`;
    }).join('') || '<p class="doc-keys-none">Ningún atajo coincide.</p>';
  };
  root.querySelectorAll('[data-os]').forEach(b => b.addEventListener('click', () => { mac = b.dataset.os === 'mac'; render(); }));
  root.querySelector('input').addEventListener('input', render);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);
  // No se roba ningún atajo: solo se escucha y se marca el renglón.
  document.addEventListener('keydown', e => {
    if (!visible || ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    if (e.target.closest?.('input, textarea, select') && !(e.ctrlKey || e.metaKey || e.altKey)) return; // escribir no cuenta
    const key = NAME[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    const keys = [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey && key.length > 1 ? 'Shift' : '', key].filter(Boolean);
    const combo = comboOf(keys);
    const hits = [...root.querySelectorAll('.doc-keys-row')].filter(r => r.dataset.combo === combo);
    live.innerHTML = keys.map(k => `<kbd>${esc(mac ? TO_MAC[k] || k : k)}</kbd>`).join('<span>+</span>') + ` <span>${hits.length ? '→ ' + esc(hits[0].querySelector('dd').textContent) : 'sin atajo'}</span>`;
    root.querySelectorAll('.is-hit').forEach(r => r.classList.remove('is-hit'));
    hits.forEach(r => { void r.offsetWidth; r.classList.add('is-hit'); });
  }, true);
  render();
}
