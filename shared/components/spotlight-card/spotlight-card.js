// ══════════════════════════════════════════════════════
// Spotlight Card (React Bits): el reflector sigue al puntero dentro de
// cada tarjeta. Botón «+»: muestra cómo se usa el componente.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
$$(opts.selector ?? '.card-b').forEach(card => {
  card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); card.style.setProperty('--mouse-x', `${e.clientX - r.left}px`); card.style.setProperty('--mouse-y', `${e.clientY - r.top}px`); }, { passive: true });
  const plus = card.querySelector('.b-plus'), more = card.querySelector('.b-more');
  if (plus && more) plus.addEventListener('click', () => { const on = plus.getAttribute('aria-expanded') !== 'true'; plus.setAttribute('aria-expanded', String(on)); more.hidden = !on; opts.onToggle?.(); });
});

// ══════════════════════════════════════════════════════
// Circuitos entre módulos (riff de @dd_uiux): trazos en ángulo recto de
// una tarjeta a la siguiente, con nodos en las uniones y un pulso que
// recorre cada trazo. Se recalculan al cambiar el tamaño.
}
