// ══════════════════════════════════════════════════════
// Doc Specimen · las familias tipográficas del tema y el contraste de
// sus pares de colores (razón WCAG calculada en vivo con los tokens del
// modo actual; AA pide 4.5 en texto normal y 3 en grande; AAA, 7).
//   mount({
//     type: { el, fonts: [{ name, family: 'var(--display)', use, size, weight, style }] },
//     contrast: { el, pairs: [['--text', '--bg', 'Texto'], …] }
//   })
// ══════════════════════════════════════════════════════
import { contrast, cssVar, hexRgb, onTheme } from '../../core/core.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount({ type, contrast: pairs } = {}) {
  if (type) {
    const el = typeof type.el === 'string' ? document.querySelector(type.el) : type.el;
    if (el) el.innerHTML = type.fonts.map(f => `<div class="spec-type"><p class="spec-sample" style="font-family:${f.family};font-size:${f.size || 24}px${f.weight ? `;font-weight:${f.weight}` : ''}${f.style ? `;font-style:${f.style}` : ''}">${esc(f.name)}</p><p class="spec-meta">${esc(f.use)}</p></div>`).join('');
  }
  if (pairs) {
    const el = typeof pairs.el === 'string' ? document.querySelector(pairs.el) : pairs.el;
    if (!el) return;
    const paint = () => {
      el.innerHTML = pairs.pairs.map(([f, b, name]) => {
        const r = contrast(hexRgb(cssVar(f)), hexRgb(cssVar(b))), lvl = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'no pasa';
        return `<li><span class="spec-chip" style="color:var(${f});background:var(${b})" aria-hidden="true">Aa</span><span class="spec-name">${esc(name)}</span><span class="spec-ratio">${r.toFixed(1)}:1</span><span class="spec-pill ${r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'danger'}">${lvl}</span></li>`;
      }).join('');
    };
    paint(); onTheme(paint);
  }
}
