// ══════════════════════════════════════════════════════
// Regex Lab · probador de expresiones regulares (JavaScript).
// Patrón, banderas (g i m s u y), texto de prueba con las coincidencias
// marcadas detrás del propio campo, lista de coincidencias con grupos
// (numerados y con nombre) y vista previa del reemplazo ($1, $<nombre>).
// La búsqueda corre en un Worker con 300 ms de límite: si un patrón se
// atora en retroceso catastrófico, se termina y se avisa, sin congelar.
//   mount({ el, presets: [{ name, src, flags, text, repl? }] })
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const show = s => esc(s).replace(/\n/g, '<span class="sh-rx-nl">↵</span>') || '<span class="sh-rx-empty">vacía</span>';
const FLAGS = { g: 'todas las coincidencias', i: 'sin distinguir mayúsculas', m: '^ y $ por renglón', s: 'el punto también toma saltos', u: 'Unicode', y: 'pegada a lastIndex' };
const LIMIT = 300;

export function mount({ el, presets = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const first = presets[0] || { src: '', flags: 'g', text: '' };
  root.innerHTML = `<div class="sh-tool-bar">
      <label class="sh-tool-field">ejemplo <select class="sh-rx-preset">${presets.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('')}</select></label>
      <span class="sh-tool-status" role="status"></span>
    </div>
    <div class="sh-rx-pat"><span aria-hidden="true">/</span><input class="sh-rx-src" type="text" spellcheck="false" autocomplete="off" aria-label="Expresión regular"><span aria-hidden="true">/</span>
      <span class="sh-rx-flags" role="group" aria-label="Banderas">${Object.entries(FLAGS).map(([f, d]) => `<button type="button" class="sh-rx-flag" data-flag="${f}" aria-pressed="false" title="${d}" aria-label="${f}: ${d}">${f}</button>`).join('')}</span></div>
    <div class="sh-rx-test">
      <div class="sh-rx-back" aria-hidden="true"></div>
      <textarea class="sh-rx-text" rows="6" spellcheck="false" aria-label="Texto de prueba"></textarea>
    </div>
    <label class="sh-tool-field sh-rx-repl-l">reemplazar con <input class="sh-rx-repl" type="text" spellcheck="false" autocomplete="off" placeholder="$1, $<nombre>, $&amp;…"></label>
    <pre class="sh-rx-out" hidden aria-label="Resultado del reemplazo"></pre>
    <ol class="sh-rx-list" aria-label="Coincidencias"></ol>`;
  const $ = s => root.querySelector(s);
  const src = $('.sh-rx-src'), text = $('.sh-rx-text'), back = $('.sh-rx-back'), repl = $('.sh-rx-repl'), outPre = $('.sh-rx-out'), list = $('.sh-rx-list'), status = $('.sh-tool-status');
  let flags = new Set(first.flags), worker = null, job = 0, timer = 0, debounce = 0;

  const newWorker = () => { worker?.terminate(); worker = new Worker(new URL('./regex-worker.js', import.meta.url)); worker.onmessage = onResult; };
  const say = (t, cls = '') => { status.textContent = t; status.className = 'sh-tool-status ' + cls; };
  const paintFlags = () => root.querySelectorAll('.sh-rx-flag').forEach(b => b.setAttribute('aria-pressed', String(flags.has(b.dataset.flag))));
  const paintBack = (matches = []) => {
    const t = text.value; let html = '', at = 0;
    matches.forEach((m, k) => { if (m.i < at) return; html += esc(t.slice(at, m.i)) + `<mark class="${k % 2 ? 'b' : 'a'}${m.s ? '' : ' z'}">${esc(m.s)}</mark>`; at = m.i + m.s.length; });
    back.innerHTML = html + esc(t.slice(at)) + '\n';
    back.scrollTop = text.scrollTop;
  };
  let t0 = 0;
  function onResult({ data }) {
    if (data.id !== job) return;
    clearTimeout(timer);
    src.setAttribute('aria-invalid', String(!!data.error));
    if (data.error) { say(data.error.replace(/^Invalid regular expression: /, 'Expresión inválida: '), 'is-err'); paintBack(); list.innerHTML = ''; outPre.hidden = true; return; }
    const n = data.matches.length;
    say(`${n === 0 ? 'Sin coincidencias' : n === 1 ? '1 coincidencia' : n + ' coincidencias'} · ${(performance.now() - t0).toFixed(1)} ms`, n ? 'is-ok' : '');
    paintBack(data.matches);
    list.innerHTML = data.matches.slice(0, 200).map((m, k) => {
      const groups = m.groups.map((g, i) => `<span class="sh-rx-g"><b>$${i + 1}</b> ${g === undefined ? '<span class="sh-rx-empty">sin captura</span>' : show(g)}</span>`).join('');
      const named = m.named ? Object.entries(m.named).map(([k2, v]) => `<span class="sh-rx-g is-named"><b>${esc(k2)}</b> ${v === undefined ? '<span class="sh-rx-empty">sin captura</span>' : show(v)}</span>`).join('') : '';
      return `<li><span class="sh-rx-n">#${k + 1}</span><span class="sh-rx-at">@${m.i}</span><code>${show(m.s)}</code>${groups}${named}</li>`;
    }).join('') + (n > 200 ? `<li class="sh-rx-more">y ${n - 200} más</li>` : '');
    outPre.hidden = data.replaced === null;
    if (data.replaced !== null) outPre.textContent = data.replaced;
  }
  const test = () => {
    job++; t0 = performance.now();
    if (!worker) newWorker();
    worker.postMessage({ id: job, src: src.value, flags: [...flags].join(''), text: text.value, repl: repl.value ? repl.value : null });
    clearTimeout(timer);
    timer = setTimeout(() => { newWorker(); say(`Se tardó más de ${LIMIT} ms: posible retroceso catastrófico (prueba con grupos sin anidar o cuantificadores perezosos).`, 'is-err'); paintBack(); list.innerHTML = ''; }, LIMIT);
  };
  const later = () => { clearTimeout(debounce); debounce = setTimeout(test, 90); };
  const load = p => { src.value = p.src; text.value = p.text; repl.value = p.repl || ''; flags = new Set(p.flags); paintFlags(); test(); };

  src.addEventListener('input', later); text.addEventListener('input', () => { paintBack(); later(); }); repl.addEventListener('input', later);
  text.addEventListener('scroll', () => { back.scrollTop = text.scrollTop; });
  root.querySelectorAll('.sh-rx-flag').forEach(b => b.addEventListener('click', () => { const f = b.dataset.flag; flags.has(f) ? flags.delete(f) : flags.add(f); paintFlags(); test(); }));
  $('.sh-rx-preset').addEventListener('change', e => load(presets[+e.target.value]));
  // El Worker se crea al acercarse la herramienta, no al cargar la página.
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); load(first); } }, { rootMargin: '300px 0px' }).observe(root);
  text.value = first.text; src.value = first.src; paintFlags(); paintBack();
}
