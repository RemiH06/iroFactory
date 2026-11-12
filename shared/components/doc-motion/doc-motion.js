// ══════════════════════════════════════════════════════
// DOC MOTION · las curvas de movimiento de un sistema de diseño. Cada curva
// es un token CSS (cubic-bezier, linear(), ease…) y se documenta con su
// gráfica de tiempo contra avance, una muestra que se repite al tocarla y su
// valor listo para copiar.
// La gráfica no se calcula a mano: se le pregunta al navegador cuánto lleva
// una animación en pausa con esa curva en 40 instantes, así sirve para
// cualquier curva válida, incluidas las de resorte que se pasan de 1.
//   mount({ el, curves: [{ name, token: '--ease-out', use, duration: 600 }] })
// Con reduced motion la muestra no corre; la gráfica y el valor siguen ahí.
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// avance de la curva en n + 1 instantes, medido con una animación en pausa
function sample(easing, n = 40) {
  const probe = Object.assign(document.createElement('i'), { style: 'position:absolute;visibility:hidden;left:0' }); document.body.append(probe);
  let anim, out = [];
  try { anim = probe.animate({ left: ['0px', '1000px'] }, { duration: 1000, easing, fill: 'both' }); anim.pause(); for (let i = 0; i <= n; i++) { anim.currentTime = i / n * 1000; out.push(parseFloat(getComputedStyle(probe).left) / 1000); } }
  catch { out = null; } // curva no válida
  anim?.cancel(); probe.remove();
  return out;
}

export function mount({ el, curves = [] } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el; if (!root) return null;
  const value = t => getComputedStyle(document.body).getPropertyValue(t).trim();
  root.innerHTML = `<ul class="dm-list">${curves.map((c, i) => {
    const v = value(c.token), pts = sample(v) || [0, 1], n = pts.length - 1;
    const d = pts.map((y, k) => `${k ? 'L' : 'M'}${(k / n * 100).toFixed(1)} ${(100 - y * 100).toFixed(1)}`).join('');
    return `<li class="dm-card"><h4 class="dm-name">${esc(c.name)}</h4>
      <svg class="dm-plot" viewBox="-6 -22 112 144" role="img" aria-label="Curva ${esc(c.name)}: avance contra tiempo"><path class="dm-axis" d="M0 0V100H100M0 0H100"/><path class="dm-curve" d="${d}"/></svg>
      <button type="button" class="dm-run" data-i="${i}" aria-label="Repetir la muestra de ${esc(c.name)}"><span class="dm-dot" aria-hidden="true"></span></button>
      <p class="dm-use">${esc(c.use)} · ${c.duration} ms</p>
      <p class="dm-code"><code>${esc(c.token)}</code><button type="button" class="dm-copy" data-copy="${i}">Copiar</button></p><p class="dm-status" role="status"></p></li>`;
  }).join('')}</ul>`;
  const run = b => {
    if (calm.matches) return;
    const c = curves[b.dataset.i], dot = b.firstElementChild, w = (b.clientWidth - dot.offsetWidth) * .88; // el riel deja sitio para que un resorte se pase de su meta sin salirse
    dot.getAnimations().forEach(a => a.cancel());
    dot.animate({ translate: ['0px', w + 'px'] }, { duration: c.duration, easing: value(c.token), fill: 'forwards' });
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('.dm-run'); if (b) return run(b);
    const k = e.target.closest('[data-copy]'); if (!k) return;
    const c = curves[k.dataset.copy], status = k.closest('.dm-card').querySelector('.dm-status');
    (navigator.clipboard ? navigator.clipboard.writeText(`${c.token}: ${value(c.token)};`) : Promise.reject()).then(() => { status.textContent = 'Copiado.'; }, () => { status.textContent = 'No se pudo copiar.'; });
  });
  root.querySelectorAll('.dm-run').forEach(b => b.addEventListener('pointerenter', () => run(b)));
  // la primera vez que se ven, corren solas una vez
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .6 });
  root.querySelectorAll('.dm-run').forEach(b => io.observe(b));
  return { run: i => run(root.querySelector(`.dm-run[data-i="${i}"]`)) };
}
