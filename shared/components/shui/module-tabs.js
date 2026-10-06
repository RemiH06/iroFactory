// ══════════════════════════════════════════════════════
// Módulos: el grafo y las pestañas cambian el módulo que se ve. Antes de
// abrirlo corre una consulta estilo cqlsh (escribe, responde, abre).
// ══════════════════════════════════════════════════════
import { $, reduceMotion, updateHexes } from './kit.js';

export function mount() {
(() => {
  const main = $('#sh-main'), query = $('#sh-query'), pre = query.querySelector('pre');
  const tabs = [...document.querySelectorAll('.sh-tab')], panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const GROUP = { paleta: 'superficie', galeria: 'superficie', avisos: 'corrientes', badges: 'corrientes', botones: 'corrientes', metricas: 'profundidad', codigo: 'profundidad', tabla: 'profundidad', log: 'desembocadura', pipeline: 'desembocadura', cards: 'desembocadura' };
  const ROWS = { paleta: '.swatch', avisos: '.callout', badges: '.badge', botones: '.btn', metricas: '.metric-val', log: '.log-entry', pipeline: '.pipe', cards: '.card' };
  const rowsOf = id => { const el = document.getElementById(id); if (id === 'galeria') return 4; if (id === 'tabla') return el.querySelectorAll('tr').length - 1; if (id === 'codigo') return el.querySelector('pre').textContent.split('\n').length; return el.querySelectorAll(ROWS[id]).length; };
  const narrow = window.matchMedia('(max-width: 999px)');
  panels.forEach((p, i) => { p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', tabs[i].id); p.hidden = i !== 0; });
  let current = panels[0].id, timers = [];
  const mark = id => { tabs.forEach(t => { const on = t.getAttribute('aria-controls') === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && narrow.matches) { const bar = t.parentElement; bar.scrollTo({ left: t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' }); } }); if (window.shuiGraph) window.shuiGraph.setActive(id); };
  const show = id => { query.classList.remove('is-on'); panels.forEach(p => { p.hidden = p.id !== id; }); const h = document.getElementById(id).querySelector('.blur-text'); if (h && h._blurPlay) h._blurPlay(); };
  const bringIntoView = () => { const r = main.getBoundingClientRect(); if (narrow.matches || r.top < 0 || r.top > innerHeight * 0.5) main.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }); };
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function select(id) {
    if (!GROUP[id]) return;
    if (id === current && !query.classList.contains('is-on')) { bringIntoView(); return; }
    current = id; timers.forEach(clearTimeout); timers = []; mark(id); bringIntoView();
    if (reduceMotion.matches) { show(id); return; }
    const g = GROUP[id], rows = rowsOf(id), ms = 4 + Math.floor(Math.random() * 15);
    const cmd = `SELECT * FROM ${g} WHERE modulo = '${id}';`;
    const lit = `<span class="q-kw">SELECT</span> * <span class="q-kw">FROM</span> ${g} <span class="q-kw">WHERE</span> modulo = <span class="q-str">'${id}'</span>;`;
    const head = '<span class="q-prompt">cqlsh:shui&gt;</span> ', caret = '<span class="q-caret"></span>';
    panels.forEach(p => { p.hidden = true; }); query.classList.add('is-on');
    // Tecleo por reloj, no por cuadros: dura lo mismo aunque la página vaya cargada.
    const t0 = performance.now(), TYPE = 380;
    const type = () => { const i = Math.min(cmd.length, Math.ceil((performance.now() - t0) / TYPE * cmd.length)); pre.innerHTML = head + esc(cmd.slice(0, i)) + caret; if (i < cmd.length) timers.push(setTimeout(type, 16)); else after(); };
    const after = () => {
      pre.innerHTML = head + lit;
      timers.push(setTimeout(() => { pre.innerHTML += `\n<span class="q-dim"> ▸ corriente ${g} · índice por módulo</span>`; }, 120));
      timers.push(setTimeout(() => { pre.innerHTML += `\n<span class="q-dim"> ▸</span> ${rows} ${rows === 1 ? 'fila' : 'filas'} <span class="q-dim">· ${ms} ms</span>\n` + head + caret; }, 280));
      timers.push(setTimeout(() => show(id), 620));
    };
    type();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', e => { e.preventDefault(); select(t.getAttribute('aria-controls')); });
    t.addEventListener('keydown', e => {
      const k = e.key, n = tabs.length, j = k === 'ArrowRight' ? (i + 1) % n : k === 'ArrowLeft' ? (i + n - 1) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
      if (j >= 0) { e.preventDefault(); tabs[j].focus(); select(tabs[j].getAttribute('aria-controls')); }
    });
  });
  window.shuiApp = { select };
  mark(current);
})();
updateHexes();
}
