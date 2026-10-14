// ══════════════════════════════════════════════════════
// ALGORITMOS PASO A PASO · cuatro ordenamientos (burbuja, inserción,
// mezcla y rápido) sobre barras de tiza. Cada algoritmo es un generador
// que anota cada comparación y escritura con su línea de pseudocódigo;
// se calculan todos los cuadros de antemano, así que se puede ir hacia
// atrás. Contadores de comparaciones y escrituras contra la cota teórica,
// y entradas que muestran el peor caso (el rápido con pivote al final se
// arrastra sobre una lista casi ordenada).
// Teclado (con el foco en el visualizador): ← → un paso, Espacio corre.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

const ALGOS = {
  burbuja: { name: 'Burbuja', big: 'O(n²)', bound: n => n * (n - 1) / 2, boundTxt: 'n(n − 1)/2', code: [
    'para i ← 0 hasta n − 2:', '  para j ← 0 hasta n − 2 − i:', '    si A[j] > A[j + 1]:', '      intercambiar A[j] y A[j + 1]', '  si no hubo intercambios: terminar'],
    *run(a) {
      const n = a.length;
      for (let i = 0; i < n - 1; i++) {
        let swapped = false;
        for (let j = 0; j < n - 1 - i; j++) {
          yield { cmp: [j, j + 1], line: 2, note: `¿${a[j]} > ${a[j + 1]}? ${a[j] > a[j + 1] ? 'sí' : 'no'}` };
          if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; yield { swap: [j, j + 1], line: 3, writes: 2, note: `se intercambian: ${a[j]} queda antes que ${a[j + 1]}` }; }
        }
        yield { done: n - 1 - i, line: 1, note: `${a[n - 1 - i]} ya está en su lugar` };
        if (!swapped) { yield { line: 4, allDone: true, note: 'una pasada sin intercambios: la lista está ordenada' }; return; }
      }
    } },
  insercion: { name: 'Inserción', big: 'O(n²)', bound: n => n * (n - 1) / 2, boundTxt: 'n(n − 1)/2', code: [
    'para i ← 1 hasta n − 1:', '  x ← A[i];  j ← i − 1', '  mientras j ≥ 0 y A[j] > x:', '    A[j + 1] ← A[j];  j ← j − 1', '  A[j + 1] ← x'],
    *run(a) {
      for (let i = 1; i < a.length; i++) {
        const x = a[i]; let j = i - 1;
        yield { pick: i, line: 1, note: `se toma ${x} para insertarlo entre los ${i} de la izquierda` };
        while (j >= 0) {
          yield { cmp: [j, j + 1], line: 2, note: `¿${a[j]} > ${x}? ${a[j] > x ? 'sí: se recorre' : 'no: aquí va'}` };
          if (!(a[j] > x)) break;
          a[j + 1] = a[j]; a[j] = x; yield { swap: [j, j + 1], line: 3, writes: 1, note: `${a[j + 1]} se recorre a la derecha` }; j--;
        }
        yield { set: j + 1, line: 4, writes: 1, note: `${x} queda en la posición ${j + 1}` };
      }
    } },
  mezcla: { name: 'Mezcla', big: 'O(n log n)', bound: n => Math.ceil(n * Math.log2(n)), boundTxt: 'n log₂ n', code: [
    'ordenar(A, lo, hi):', '  si hi − lo < 1: regresar', '  m ← ⌊(lo + hi) / 2⌋', '  ordenar(lo, m);  ordenar(m + 1, hi)', '  mezclar: el menor de los dos frentes', '    A[k] ← ese menor'],
    *run(a) {
      function* sort(lo, hi) {
        if (hi - lo < 1) return;
        const m = (lo + hi) >> 1;
        yield { range: [lo, hi], line: 3, note: `se parte [${lo}…${hi}] en [${lo}…${m}] y [${m + 1}…${hi}]` };
        yield* sort(lo, m); yield* sort(m + 1, hi);
        const L = a.slice(lo, m + 1), R = a.slice(m + 1, hi + 1); let i = 0, j = 0, k = lo;
        while (i < L.length && j < R.length) {
          yield { range: [lo, hi], cmp: [lo + i, m + 1 + j], line: 4, note: `${L[i]} contra ${R[j]}: va ${Math.min(L[i], R[j])}` };
          a[k] = L[i] <= R[j] ? L[i++] : R[j++]; yield { range: [lo, hi], set: k, line: 5, writes: 1, note: `A[${k}] ← ${a[k]}` }; k++;
        }
        while (i < L.length) { a[k] = L[i++]; yield { range: [lo, hi], set: k, line: 5, writes: 1, note: `A[${k}] ← ${a[k]} (lo que quedó)` }; k++; }
        while (j < R.length) { a[k] = R[j++]; yield { range: [lo, hi], set: k, line: 5, writes: 1, note: `A[${k}] ← ${a[k]} (lo que quedó)` }; k++; }
      }
      yield* sort(0, a.length - 1);
    } },
  rapido: { name: 'Rápido', big: 'O(n log n) en promedio, O(n²) en el peor caso', bound: n => Math.ceil(n * Math.log2(n)), boundTxt: 'n log₂ n', code: [
    'ordenar(A, lo, hi):', '  si lo ≥ hi: regresar', '  pivote ← A[hi];  i ← lo', '  para j ← lo hasta hi − 1:', '    si A[j] < pivote:', '      intercambiar A[i], A[j];  i ← i + 1', '  intercambiar A[i], A[hi]', '  ordenar(lo, i − 1);  ordenar(i + 1, hi)'],
    *run(a) {
      function* sort(lo, hi) {
        if (lo >= hi) { if (lo === hi) yield { done: lo, line: 1, note: `${a[lo]} solo: ya está en su lugar` }; return; }
        const p = a[hi]; let i = lo;
        yield { range: [lo, hi], pivot: hi, line: 2, note: `pivote ${p}, el último de [${lo}…${hi}]` };
        for (let j = lo; j < hi; j++) {
          yield { range: [lo, hi], pivot: hi, cmp: [j, hi], line: 4, note: `¿${a[j]} < ${p}? ${a[j] < p ? 'sí' : 'no'}` };
          if (a[j] < p) { if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; yield { range: [lo, hi], pivot: hi, swap: [i, j], line: 5, writes: 2, note: `${a[i]} pasa al lado de los menores` }; } i++; }
        }
        if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; yield { range: [lo, hi], swap: [i, hi], line: 6, writes: 2, note: `el pivote ${p} va a su lugar, la posición ${i}` }; }
        yield { done: i, line: 7, note: `${p} ya está en su lugar` };
        yield* sort(lo, i - 1); yield* sort(i + 1, hi);
      }
      yield* sort(0, a.length - 1);
    } }
};
const INPUTS = { aleatorio: 'aleatoria', casi: 'casi ordenada', invertido: 'invertida', pocos: 'pocos valores' };
const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
function makeInput(kind, n, seed) {
  const r = rng(seed), a = Array.from({ length: n }, (_, i) => i + 1);
  if (kind === 'aleatorio') for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (kind === 'casi') for (let k = 0; k < Math.max(1, n / 10); k++) { const i = Math.floor(r() * (n - 1)); [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
  if (kind === 'invertido') a.reverse();
  if (kind === 'pocos') return a.map(() => 1 + Math.floor(r() * 4) * Math.ceil(n / 4));
  return a;
}

export function mount({ el = document.getElementById('lm-algo') } = {}) {
  if (!el) return;
  let algo = 'burbuja', kind = 'aleatorio', n = 16, seed = 7, frames = [], at = 0, timer = 0, speed = 6;
  el.innerHTML = `<div class="av-top">
      <div class="av-algos" role="group" aria-label="Algoritmo">${Object.entries(ALGOS).map(([k, a]) => `<button type="button" class="btn" data-algo="${k}">${a.name}</button>`).join('')}</div>
      <div class="av-opts"><label>Entrada <select class="av-kind">${Object.entries(INPUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label>n = <output class="av-n-out"></output><input type="range" class="av-n" min="6" max="48" step="1"></label>
        <button type="button" class="btn av-shuffle">barajar</button></div>
    </div>
    <div class="av-main">
      <div class="av-stage"><div class="av-bars" role="img"></div><p class="av-note" aria-live="polite"></p></div>
      <div class="av-side"><ol class="av-code"></ol><dl class="av-count"></dl></div>
    </div>
    <div class="av-ctrl"><button type="button" class="btn av-first" aria-label="Al principio">⏮</button><button type="button" class="btn av-back" aria-label="Paso anterior">◀</button><button type="button" class="btn primary av-play">▶ correr</button><button type="button" class="btn av-fwd" aria-label="Paso siguiente">▶︎ paso</button><button type="button" class="btn av-last" aria-label="Al final">⏭</button>
      <label class="av-speed">velocidad <input type="range" min="1" max="10" step="1"></label><span class="av-pos"></span></div>`;
  el.tabIndex = 0;
  const $ = s => el.querySelector(s), bars = $('.av-bars');

  function build() {
    stop();
    const a = makeInput(kind, n, seed), base = a.slice(), A = ALGOS[algo];
    frames = [{ a: base.slice(), line: -1, note: `lista ${INPUTS[kind]} de ${n} elementos: ${A.name.toLowerCase()} empieza` }];
    let cmp = 0, w = 0; const done = new Set();
    for (const f of A.run(a)) {
      if (f.cmp) cmp++; w += f.writes || 0; if (f.done != null) done.add(f.done);
      frames.push({ ...f, a: a.slice(), cmpN: cmp, w, doneSet: [...done] });
    }
    frames.push({ a: a.slice(), line: -1, allDone: true, cmpN: cmp, w, doneSet: a.map((_, i) => i), note: `ordenada: ${cmp} comparaciones y ${w} escrituras` });
    frames[0].cmpN = 0; frames[0].w = 0; frames[0].doneSet = [];
    bars.innerHTML = base.map(() => '<span class="av-bar"><i></i></span>').join('');
    $('.av-code').innerHTML = A.code.map(l => `<li>${l.replace(/ /g, '&nbsp;')}</li>`).join('');
    el.querySelectorAll('[data-algo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.algo === algo)));
    $('.av-n-out').textContent = n; $('.av-n').value = n; $('.av-kind').value = kind;
    at = 0; paint();
  }
  function paint() {
    const f = frames[at], max = Math.max(...f.a), A = ALGOS[algo], showVals = n <= 20;
    const done = new Set(f.doneSet || []);
    [...bars.children].forEach((b, i) => {
      b.style.setProperty('--h', (f.a[i] / max * 100).toFixed(1) + '%');
      b.className = 'av-bar' + (done.has(i) || f.allDone ? ' is-done' : '') + (f.range && (i < f.range[0] || i > f.range[1]) ? ' is-out' : '')
        + (f.cmp && f.cmp.includes(i) ? ' is-cmp' : '') + (f.swap && f.swap.includes(i) ? ' is-swap' : '') + (f.set === i ? ' is-swap' : '') + (f.pivot === i ? ' is-pivot' : '') + (f.pick === i ? ' is-pick' : '');
      b.querySelector('i').textContent = showVals ? f.a[i] : '';
    });
    bars.setAttribute('aria-label', `Barras: ${f.a.join(', ')}`);
    [...$('.av-code').children].forEach((li, k) => li.classList.toggle('is-on', k === f.line));
    $('.av-note').textContent = f.note || '';
    const bound = A.bound(n), last = frames[frames.length - 1];
    $('.av-count').innerHTML = `<dt>comparaciones</dt><dd><b>${f.cmpN}</b>${at === frames.length - 1 ? ` · cota ${A.boundTxt} = ${bound}${last.cmpN > bound * 1.05 ? ' <span class="av-over">la pasa: peor caso</span>' : ''}` : ''}</dd><dt>escrituras</dt><dd><b>${f.w}</b></dd><dt>orden</dt><dd>${A.big}</dd>`;
    $('.av-pos').textContent = `paso ${at} de ${frames.length - 1}`;
    $('.av-back').disabled = $('.av-first').disabled = at === 0; $('.av-fwd').disabled = $('.av-last').disabled = at === frames.length - 1;
  }
  const go = k => { at = Math.max(0, Math.min(frames.length - 1, k)); paint(); };
  const delay = () => Math.round(900 / Math.pow(1.6, speed - 1));
  function stop() { clearTimeout(timer); timer = 0; $('.av-play').textContent = '▶ correr'; $('.av-note').setAttribute('aria-live', 'polite'); }
  function play() {
    if (timer) { stop(); return; }
    if (at >= frames.length - 1) go(0);
    $('.av-play').textContent = '⏸ pausa'; $('.av-note').setAttribute('aria-live', 'off');
    const tick = () => { go(at + 1); if (at < frames.length - 1) timer = setTimeout(tick, delay()); else stop(); };
    timer = setTimeout(tick, delay());
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-algo]'); if (b) { algo = b.dataset.algo; build(); return; }
    if (e.target.closest('.av-play')) play();
    if (e.target.closest('.av-fwd')) { stop(); go(at + 1); }
    if (e.target.closest('.av-back')) { stop(); go(at - 1); }
    if (e.target.closest('.av-first')) { stop(); go(0); }
    if (e.target.closest('.av-last')) { stop(); go(frames.length - 1); }
    if (e.target.closest('.av-shuffle')) { seed = (seed * 31 + 17) >>> 0; build(); }
  });
  $('.av-kind').addEventListener('change', e => { kind = e.target.value; build(); });
  $('.av-n').addEventListener('input', e => { n = +e.target.value; build(); });
  const sp = $('.av-speed input'); sp.value = speed; sp.addEventListener('input', () => { speed = +sp.value; });
  el.addEventListener('keydown', e => {
    if (e.target.closest('select,input') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(at + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(at - 1); }
    if (e.key === ' ' && e.target === el) { e.preventDefault(); play(); }
  });
  if (reduceMotion.matches) el.classList.add('is-still');
  build();
}
