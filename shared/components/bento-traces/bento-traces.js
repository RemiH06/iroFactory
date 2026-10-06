// ══════════════════════════════════════════════════════
// Circuitos entre módulos (riff de @dd_uiux): trazos en ángulo recto de
// una tarjeta a la siguiente, con nodos en las uniones y un pulso que
// recorre cada trazo. Se recalculan al cambiar el tamaño.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function drawTraces() {
  document.querySelectorAll('.bento[data-traces]').forEach(b => {
    let svg = b.querySelector('.bento-traces');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'bento-traces'); svg.setAttribute('aria-hidden', 'true'); b.prepend(svg); }
    const br = b.getBoundingClientRect(), cards = [...b.querySelectorAll(':scope > .card-b')].map(c => { const r = c.getBoundingClientRect(); return { l: r.left - br.left, t: r.top - br.top, r: r.right - br.left, b: r.bottom - br.top }; });
    let paths = '', nodes = '';
    for (let i = 0; i < cards.length - 1; i++) {
      const A = cards[i], B = cards[i + 1]; let d;
      if (B.l >= A.r - 2) { const y1 = A.t + Math.min(60, (A.b - A.t) / 2), y2 = B.t + Math.min(60, (B.b - B.t) / 2), mx = (A.r + B.l) / 2; d = `M${A.r} ${y1} H${mx} V${y2} H${B.l}`; nodes += `<circle cx="${A.r}" cy="${y1}" r="4"/><circle cx="${B.l}" cy="${y2}" r="4"/>`; }
      else { const x1 = A.l + (A.r - A.l) * .7, x2 = B.l + (B.r - B.l) * .3, my = (A.b + B.t) / 2; d = `M${x1} ${A.b} V${my} H${x2} V${B.t}`; nodes += `<circle cx="${x1}" cy="${A.b}" r="4"/><circle cx="${x2}" cy="${B.t}" r="4"/>`; }
      paths += `<path d="${d}"/><path class="pulse" pathLength="100" d="${d}" style="animation-delay:${-i * .9}s"/>`;
    }
    svg.innerHTML = paths + nodes;
  });
}
export function mount() {
drawTraces();
new ResizeObserver(() => drawTraces()).observe(document.body);
if (document.fonts) document.fonts.ready.then(drawTraces);
}
