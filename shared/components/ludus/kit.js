// ludus · base del tema sobre el núcleo: modo (con la carpa) y las seis
// caras de la paleta, que son las del proun, las del cubo y las del prisma.
import { $, $$, cssVar, hexRgb, initTheme, onTheme, theme, makeLoop, reduceMotion, updateHexes } from '../../core/core.js';

export { $, $$, cssVar, hexRgb, onTheme, makeLoop, reduceMotion, updateHexes };
// Caras en el orden del cubo: R L U D F B
export const FACES = ['--r', '--l', '--u', '--d', '--f', '--b'];
export const faceColors = () => FACES.map(cssVar);
export let isLight = false;
onTheme(() => { isLight = theme.alt; });

// ── Cambio de modo con una transición (la carpa la registra: cierra, cambia
// detrás y vuelve a abrir). Sin transición registrada, cambio directo.
let ctl, busy = false, transition = (swap, end) => { swap(); end(); };
export const setThemeTransition = fn => { transition = fn; };
export const toggleTheme = () => {
  if (busy || !ctl) return; busy = true;
  transition(() => ctl.toggle(), () => { busy = false; });
};
export function mount() {
  ctl = initTheme({ altClass: 'light', label: alt => (alt ? '☾ noche' : '☀ día'), aria: alt => (alt ? 'Cambiar a modo noche' : 'Cambiar a modo día'), hexes: updateHexes });
  // el botón del modo pasa por la transición
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', e => { e.stopImmediatePropagation(); e.preventDefault(); toggleTheme(); }, { capture: true }));
}
