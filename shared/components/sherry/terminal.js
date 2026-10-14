// ══════════════════════════════════════════════════════
// Terminal · la navegación de sherry. Una línea de comandos fija abajo:
// el directorio de trabajo es el nivel que se está leyendo (sigue al
// scroll) y `cd` lleva a otro. `ls` lista los niveles como enlaces,
// Tab completa, ↑ ↓ recorren el historial (se recuerda), Esc la cierra,
// / o ` la abren desde cualquier parte. La paleta de comandos (Ctrl + K)
// ejecuta los mismos comandos: `entries()` es su catálogo.
// Cada comando enciende un anillo de triángulos desde la terminal.
//   mount({ el, user, tools: { regex: ['#tool-regex', 'Probador de regex'] },
//     pages: { 'sherry-tri': ['#man-sherry-tri', 'Referencia de sherry-tri'] },
//     files: { 'CHANGELOG.md': ['#cl', 'Registro de cambios'] } })
// Los niveles son las secciones `.sherry-level[id^="level-"]`: el
// directorio es lo que sigue a `level-` y su nombre, data-name o el h2.
// ══════════════════════════════════════════════════════
import { reduceMotion, toggleTheme, toggleCRT, toggleTri, cssVar } from './kit.js';
import { theme } from '../../core/core.js';
import { pulse } from './neon-bloom.js';
import { bump } from './stats.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NEON = { magenta: '--magenta', cyan: '--cyan', lime: '--lime', violet: '--violet', electric: '--electric', rose: '--rose', aqua: '--aqua', lavender: '--lavender', peach: '--peach', mint: '--mint' };
const HIST_KEY = 'sherry:hist';

let api = null;
export const run = (cmd, o) => api && api.run(cmd, o);
export const entries = () => (api ? api.entries() : []);
export const focus = () => api && api.focus();
// Comandos de otros módulos (mascota, sonido, protector…). `def` es como los
// de abajo: { help, args?, show?, hidden?, fn(args) → [renglones HTML] } y,
// si debe salir en la paleta, `entry: { group, label, keys }` (o una función
// que lo devuelva, para etiquetas que cambian).
const EXTRA = {};
export const addCommand = (name, def) => { EXTRA[name] = def; };
export const say = (html, cls) => api && api.print(html, cls);

export function mount({ el = '#sh-term', user = 'remi', tools = {}, pages = {}, files = {} } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const levels = [...document.querySelectorAll('.sherry-level[id^="level-"]')].map(s => ({ dir: s.id.slice(6), el: s, name: (s.dataset.name || s.querySelector('h2')?.textContent || s.id.slice(6)).trim() }));
  let cwd = '~', prev = '~';
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch { hist = []; }
  let hi = hist.length;

  root.classList.add('sh-term');
  root.innerHTML = `<div class="sh-term-out" role="log" aria-live="polite" aria-label="Salida de la terminal"></div>
    <form class="sh-term-line" autocomplete="off">
      <label class="sh-term-ps1" for="sh-term-in"></label>
      <input id="sh-term-in" class="sh-term-in" type="text" spellcheck="false" autocapitalize="off" enterkeyhint="go" aria-describedby="sh-term-help">
      <button type="button" class="sh-term-k" aria-label="Abrir la paleta de comandos"><kbd>Ctrl</kbd><kbd>K</kbd></button>
    </form>
    <p id="sh-term-help" class="sh-sr">Terminal de navegación. Escribe help para ver los comandos, ls para ver los niveles y cd seguido de un nivel para ir ahí.</p>`;
  const out = root.querySelector('.sh-term-out'), input = root.querySelector('input'), ps1 = root.querySelector('.sh-term-ps1');
  const prompt = () => `${user}@sherry:${cwd === '~' ? '~' : '~/' + cwd}$`;
  const paintPs1 = () => { ps1.textContent = prompt(); };

  const print = (html, cls = '') => { const p = document.createElement('div'); p.className = 'sh-term-row ' + cls; p.innerHTML = html; out.appendChild(p); while (out.children.length > 120) out.firstChild.remove(); out.scrollTop = out.scrollHeight; };
  const link = (cmd, text = cmd) => `<button type="button" class="sh-term-a" data-run="${esc(cmd)}">${esc(text)}</button>`;
  const setOpen = v => { root.dataset.open = String(v); };

  const goTo = (target, after) => {
    const t = typeof target === 'string' ? document.querySelector(target) : target;
    if (!t) return false;
    t.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    if (after) setTimeout(after, reduceMotion.matches ? 0 : 550);
    return true;
  };
  const dirOf = arg => { const a = fold(arg.replace(/^~?\/?/, '').replace(/\/$/, '')); return levels.find(l => l.dir === a) || levels.find(l => fold(l.name) === a) || null; };
  const neonColor = arg => { if (!arg) return cssVar('--accent'); const a = fold(arg); if (NEON[a]) return cssVar(NEON[a]); return /^#?[0-9a-f]{6}$/i.test(arg) ? '#' + arg.replace('#', '') : null; };
  const spark = color => { const r = input.getBoundingClientRect(); pulse(r.left + 40, r.top, color); };
  const onOff = (arg, now) => (arg === 'on' ? true : arg === 'off' ? false : !now);

  // ── Comandos ──
  const CMDS = {
    help: { args: () => Object.keys(all()), help: 'lista los comandos o explica uno', show: true, fn: ([c]) => {
      if (c && all()[c]) return [`<b>${esc(c)}</b> · ${esc(all()[c].help)}`];
      return ['Comandos (Tab completa, ↑ ↓ historial, Esc cierra):', ...Object.entries(all()).filter(([, d]) => !d.hidden).map(([k, d]) => `${link(k === 'help' ? 'help' : 'help ' + k, k.padEnd(9, ' '))} ${esc(d.help)}`)];
    } },
    ls: { help: 'lista los niveles de la página', show: true, fn: () => levels.map(l => `${l.dir === cwd ? '<span class="sh-term-here">▸</span>' : ' '} ${link('cd ' + l.dir, l.dir + '/')} <span class="sh-term-dim">${esc(l.name)}</span>`) },
    cd: { args: () => [...levels.map(l => l.dir), '..', '~', '-'], help: 'va a un nivel (cd .. o cd ~ sube a la portada; cd - regresa)', fn: ([a = '~']) => {
      if (a === '~' || a === '..' || a === '/') { prev = cwd; window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' }); return []; }
      if (a === '-') return CMDS.cd.fn([prev]);
      const l = dirOf(a);
      if (!l) return [`<span class="sh-term-err">cd: no existe el nivel: ${esc(a)}</span> · prueba ${link('ls')}`];
      prev = cwd; goTo(l.el); dispatchEvent(new CustomEvent('sh:cd', { detail: { el: l.el } })); return [];
    } },
    pwd: { help: 'dice en qué nivel estás', fn: () => [`/home/${esc(user)}/sherry${cwd === '~' ? '' : '/' + cwd}`] },
    open: { args: () => Object.keys(tools), help: 'abre una herramienta: ' + Object.keys(tools).join(', '), fn: ([t]) => {
      if (!tools[t]) return [`<span class="sh-term-err">open: no hay herramienta ${esc(t || '')}</span> · hay ${Object.keys(tools).map(k => link('open ' + k, k)).join(' ')}`];
      goTo(tools[t][0], () => document.querySelector(tools[t][0])?.querySelector('input, textarea')?.focus({ preventScroll: true }));
      return [];
    } },
    man: { args: () => Object.keys(pages), help: 'abre una página del manual: ' + Object.keys(pages).join(', '), fn: ([p]) => {
      if (!pages[p]) return [`¿Qué página quieres? ${Object.keys(pages).map(k => link('man ' + k, k)).join(' ')}`];
      goTo(pages[p][0]); return [];
    } },
    cat: { args: () => Object.keys(files), help: 'abre un archivo de la documentación: ' + Object.keys(files).join(', '), fn: ([f]) => {
      const k = Object.keys(files).find(x => x.toLowerCase() === (f || '').toLowerCase());
      if (!k) return [`${f ? `<span class="sh-term-err">cat: ${esc(f)}: no existe</span> · ` : ''}hay ${Object.keys(files).map(x => link('cat ' + x, x)).join(' ')}`];
      goTo(files[k][0]); return [];
    } },
    theme: { args: () => ['light', 'dark'], help: 'cambia el modo (light o dark; sin nada, alterna)', fn: ([m]) => {
      const want = m === 'light' ? true : m === 'dark' ? false : !theme.alt;
      if (want !== theme.alt) toggleTheme();
      return [`modo ${want ? 'claro' : 'oscuro'}`];
    } },
    crt: { args: () => ['on', 'off'], help: 'enciende o apaga las líneas del CRT', fn: ([a]) => { const v = onOff(a, document.body.classList.contains('crt-on')); if (v !== document.body.classList.contains('crt-on')) toggleCRT(); return [`crt ${v ? 'on' : 'off'}`]; } },
    tri: { args: () => ['on', 'off'], help: 'enciende o apaga el fondo de triángulos', fn: ([a]) => { const v = onOff(a, document.body.classList.contains('tri-on')); if (v !== document.body.classList.contains('tri-on')) toggleTri(); return [`tri ${v ? 'on' : 'off'}`]; } },
    neon: { args: () => Object.keys(NEON), help: 'enciende los triángulos en un color (nombre o #hex)', fn: ([c]) => {
      const col = neonColor(c);
      if (!col) return [`<span class="sh-term-err">neon: no conozco el color ${esc(c)}</span>`];
      spark(col); return [`<span style="color:${esc(col)}">■</span> ${esc(col.toUpperCase())}`];
    } },
    history: { help: 'los últimos comandos', show: true, fn: () => hist.slice(-12).map((h, i, a) => `${String(hist.length - a.length + i + 1).padStart(4, ' ')}  ${link(h)}`) },
    clear: { help: 'limpia la pantalla', fn: () => { out.innerHTML = ''; return []; } },
    echo: { help: 'repite lo que escribas', fn: a => [esc(a.join(' '))] },
    date: { help: 'fecha y hora', fn: () => [new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })] },
    whoami: { help: 'quién eres aquí', fn: () => [`${esc(user)} · construye desde basura`] },
    palette: { help: 'abre la paleta de comandos (Ctrl + K)', fn: () => { dispatchEvent(new CustomEvent('sh:palette')); return []; } },
    exit: { help: 'cierra la terminal', fn: () => { input.blur(); setOpen(false); return []; } },
    sudo: { hidden: true, help: '', fn: () => ['<span class="sh-term-err">permiso denegado</span>: sherry construye desde basura, no desde root'] },
  };

  const all = () => ({ ...CMDS, ...EXTRA });

  const exec = (line, { echo = true } = {}) => {
    const src = line.trim();
    if (!src) return;
    if (echo) print(`<span class="sh-term-dim">${esc(prompt())}</span> ${esc(src)}`, 'is-cmd');
    if (hist[hist.length - 1] !== src) { hist.push(src); hist = hist.slice(-50); try { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch { /* sin almacenamiento */ } }
    hi = hist.length;
    const [name, ...args] = src.split(/\s+/);
    const c = all()[name.toLowerCase()];
    if (!c) { print(`<span class="sh-term-err">${esc(name)}: no se encontró la orden</span> · ${link('help')}`); return; }
    bump('cmd');
    if (name !== 'neon') spark(cssVar('--accent'));
    c.fn(args).forEach(r => print(r));
    if (c.show && root.dataset.open !== 'true') setOpen(true);
  };

  const complete = () => {
    const v = input.value, parts = v.split(/\s+/);
    const cmds = all(), opts = parts.length < 2 ? Object.keys(cmds).filter(k => !cmds[k].hidden) : (cmds[parts[0]]?.args?.() || []);
    const cur = parts[parts.length - 1], hits = opts.filter(o => o.startsWith(cur));
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
    else if (hits.length > 1) {
      const pre = hits.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
      if (pre.length > cur.length) { parts[parts.length - 1] = pre; input.value = parts.join(' '); }
      else print(hits.map(h => esc(h)).join('   '), 'sh-term-dim');
    }
  };

  root.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
  input.addEventListener('focus', () => setOpen(true));
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab' && input.value.trim()) { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
    else if (e.key === 'Escape') { input.blur(); setOpen(false); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  out.addEventListener('click', e => { const b = e.target.closest('[data-run]'); if (b) { exec(b.dataset.run); input.focus({ preventScroll: true }); } });
  root.querySelector('.sh-term-k').addEventListener('click', () => dispatchEvent(new CustomEvent('sh:palette')));
  document.addEventListener('pointerdown', e => { if (!root.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '/' || e.key === '`')) { e.preventDefault(); input.focus({ preventScroll: true }); }
  });

  // El directorio de trabajo es el nivel que cruza la mitad de la pantalla.
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { cwd = e.target.id.slice(6); paintPs1(); } });
  }, { rootMargin: '-50% 0px -50% 0px' });
  levels.forEach(l => io.observe(l.el));
  const hero = document.querySelector('.sherry-hero-pin');
  if (hero) new IntersectionObserver(([e]) => { if (e.isIntersecting) { cwd = '~'; paintPs1(); } }, { rootMargin: '-50% 0px -50% 0px' }).observe(hero);

  paintPs1();
  setOpen(false);
  print(`sherry · terminal de navegación. Escribe ${link('help')} o ${link('ls')}; Tab completa.`, 'sh-term-dim');

  api = {
    run: (cmd, o) => exec(cmd, o),
    print,
    focus: () => input.focus({ preventScroll: true }),
    // catálogo para la paleta de comandos: [{ group, label, cmd, keys }]
    entries: () => [
      ...levels.map(l => ({ group: 'Ir a', label: l.name, cmd: 'cd ' + l.dir, keys: l.dir })),
      { group: 'Ir a', label: 'Portada', cmd: 'cd ~', keys: 'inicio arriba hero' },
      ...Object.entries(tools).map(([t, [, label]]) => ({ group: 'Herramientas', label, cmd: 'open ' + t, keys: t })),
      ...Object.entries(pages).map(([p, [, label]]) => ({ group: 'Plantillas', label, cmd: 'man ' + p, keys: 'manual referencia opciones' })),
      ...Object.entries(files).map(([f, [, label]]) => ({ group: 'Plantillas', label, cmd: 'cat ' + f, keys: f })),
      { group: 'Acciones', label: theme.alt ? 'Modo oscuro' : 'Modo claro', cmd: 'theme', keys: 'tema light dark claro oscuro' },
      { group: 'Acciones', label: (document.body.classList.contains('crt-on') ? 'Apagar' : 'Encender') + ' el CRT', cmd: 'crt', keys: 'scanlines lineas' },
      { group: 'Acciones', label: (document.body.classList.contains('tri-on') ? 'Apagar' : 'Encender') + ' los triángulos', cmd: 'tri', keys: 'fondo bloom' },
      { group: 'Acciones', label: 'Encender un neón', cmd: 'neon', keys: 'pulso color triangulos' },
      { group: 'Terminal', label: 'Ver los comandos', cmd: 'help', keys: 'ayuda' },
      { group: 'Terminal', label: 'Historial', cmd: 'history', keys: 'comandos anteriores' },
      ...Object.entries(EXTRA).map(([name, d]) => { const e = typeof d.entry === 'function' ? d.entry() : d.entry; return e && { cmd: name, ...e }; }).filter(Boolean),
    ],
  };
  return api;
}
