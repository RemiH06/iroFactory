// ══════════════════════════════════════════════════════
// JSON Lab · formateador y validador de JSON.
// La salida se rehace al escribir: con sangría de 2, 4 o tabulador, o
// minificada; opcionalmente con las llaves ordenadas. Si no es válido,
// dice el renglón y la columna del error con el fragmento señalado.
// Cuenta llaves, valores, profundidad y bytes antes y después.
//   mount({ el, sample })
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const bytes = s => new Blob([s]).size;
const kb = n => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const MODES = { 2: '2 espacios', 4: '4 espacios', tab: 'tabulador', min: 'mínimo' };

const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
function stats(v, d = 0, acc = { keys: 0, values: 0, depth: 0 }) {
  acc.depth = Math.max(acc.depth, d);
  if (Array.isArray(v)) v.forEach(x => stats(x, d + 1, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => { acc.keys++; stats(x, d + 1, acc); });
  else acc.values++;
  return acc;
}
const paint = s => esc(s).replace(/(&quot;(?:\\.|[^&\\]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
  (m, str, colon, lit, num) => str ? (colon ? `<span class="fn">${str}</span>${colon}` : `<span class="str">${str}</span>`) : lit ? `<span class="kw">${lit}</span>` : `<span class="num">${num}</span>`);
// Posición del primer error. Los mensajes de JSON.parse no siempre la dan
// (V8 a veces solo cita el texto), así que se recorre con un validador.
const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const WS = [32, 9, 10, 13].map(c => String.fromCharCode(c));
function errAt(s) {
  let i = 0;
  const ws = () => { while (WS.includes(s[i])) i++; };
  const fail = () => { throw i; };
  const lit = w => { if (!s.startsWith(w, i)) fail(); i += w.length; };
  const str = () => {
    i++;
    while (i < s.length && s[i] !== '"') {
      if (s[i] === '\\') { i++; if (s[i] === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(s.substr(i + 1, 4))) fail(); i += 4; } else if (!'"\\/bfnrt'.includes(s[i] ?? 'x')) fail(); }
      else if (s.charCodeAt(i) < 32) fail();
      i++;
    }
    if (s[i] !== '"') fail(); i++;
  };
  const val = () => {
    ws();
    const c = s[i];
    if (c === '{' || c === '[') {
      const end = c === '{' ? '}' : ']';
      i++; ws(); if (s[i] === end) { i++; return; }
      for (;;) {
        if (c === '{') { ws(); if (s[i] !== '"') fail(); str(); ws(); if (s[i] !== ':') fail(); i++; }
        val(); ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === end) { i++; return; }
        fail();
      }
    }
    if (c === '"') return str();
    if (c === 't') return lit('true');
    if (c === 'f') return lit('false');
    if (c === 'n') return lit('null');
    NUM.lastIndex = i; if (!NUM.exec(s)) fail(); i = NUM.lastIndex;
  };
  try { val(); ws(); return i; } catch (at) { return typeof at === 'number' ? at : s.length; }
}
function where(src) {
  const pos = Math.min(errAt(src), src.length);
  const before = src.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
  const what = pos >= src.length ? 'el texto se acaba antes de cerrar' : `no se esperaba «${src[pos]}» aquí`;
  return { line, col, what, text: src.split('\n')[line - 1] ?? '' };
}

export function mount({ el, sample = '' }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  root.innerHTML = `<div class="sh-tool-bar">
      <span class="sh-seg" role="radiogroup" aria-label="Formato de salida">${Object.entries(MODES).map(([k, l]) => `<button type="button" role="radio" data-mode="${k}">${l}</button>`).join('')}</span>
      <button type="button" class="sh-chip sh-js-sort" aria-pressed="false">ordenar llaves</button>
      <span class="sh-tool-status" role="status"></span>
    </div>
    <div class="sh-js-panes">
      <label class="sh-js-pane"><span class="sh-tool-cap">entrada</span><textarea class="sh-js-in" rows="12" spellcheck="false" aria-label="JSON de entrada"></textarea></label>
      <div class="sh-js-pane"><span class="sh-tool-cap">salida <button type="button" class="sh-chip sh-js-copy">copiar</button><button type="button" class="sh-chip sh-js-use">usar como entrada</button></span><pre class="sh-js-out" tabindex="0" aria-label="JSON formateado"></pre></div>
    </div>`;
  const $ = s => root.querySelector(s);
  const input = $('.sh-js-in'), out = $('.sh-js-out'), status = $('.sh-tool-status');
  let mode = '2', sorted = false, last = '';
  const say = (t, cls = '') => { status.innerHTML = t; status.className = 'sh-tool-status ' + cls; };

  const render = () => {
    root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    $('.sh-js-sort').setAttribute('aria-pressed', String(sorted));
    const src = input.value;
    if (!src.trim()) { out.innerHTML = ''; last = ''; say('Pega o escribe JSON.'); input.removeAttribute('aria-invalid'); return; }
    let v;
    try { v = JSON.parse(src); } catch {
      const w = where(src);
      input.setAttribute('aria-invalid', 'true');
      say(`JSON inválido en el renglón ${w.line}, columna ${w.col}`, 'is-err');
      out.innerHTML = `<span class="sh-js-err">${esc(w.what)}</span>\n\n<span class="sh-js-ln">${w.line} │ </span>${esc(w.text)}\n<span class="sh-js-ln">${' '.repeat(String(w.line).length)} │ </span>${' '.repeat(Math.max(0, w.col - 1))}<span class="sh-js-caret">^</span>`;
      last = ''; return;
    }
    input.removeAttribute('aria-invalid');
    if (sorted) v = sortKeys(v);
    last = JSON.stringify(v, null, mode === 'min' ? undefined : mode === 'tab' ? '\t' : +mode);
    out.innerHTML = paint(last);
    const s = stats(v), a = bytes(src), b = bytes(last);
    say(`válido · ${s.keys} llaves · ${s.values} valores · profundidad ${s.depth} · ${kb(a)} → ${kb(b)} <span class="sh-js-delta">(${b <= a ? '−' : '+'}${Math.abs(Math.round((b - a) / Math.max(a, 1) * 100))}%)</span>`, 'is-ok');
  };
  let t = 0;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 120); });
  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; render(); }));
  $('.sh-js-sort').addEventListener('click', () => { sorted = !sorted; render(); });
  $('.sh-js-copy').addEventListener('click', async e => { if (!last) return; try { await navigator.clipboard.writeText(last); e.target.textContent = 'copiado'; } catch { e.target.textContent = 'no se pudo'; } setTimeout(() => { e.target.textContent = 'copiar'; }, 1600); });
  $('.sh-js-use').addEventListener('click', () => { if (last) { input.value = last; render(); } });
  input.value = sample;
  render();
}
