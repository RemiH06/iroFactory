// lambda · base del tema sobre el núcleo: pizarrón (oscuro, default) y
// pintarrón (claro), color de respaldo y las tizas. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, cssVar, colorKit, clamp, onTheme, theme, initTheme, updateHexes, inkSwatchLabels, makeLoop, glProgram, stickyHeader, EASE } from '../../core/core.js';
import { buildHexBg } from './chalkboard.js';

export { $, reduceMotion, cssVar, clamp, onTheme, updateHexes, inkSwatchLabels, makeLoop, glProgram, EASE };
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export const { hexRgb, rgb01, rgba } = colorKit([168, 200, 232]);
export const CHALK = ['--chalk-blue', '--chalk-yellow', '--chalk-green', '--chalk-pink', '--chalk-violet', '--chalk-orange', '--chalk-red', '--chalk-cyan'];
export let isLight = false;
onTheme(() => { isLight = theme.alt; buildHexBg(); });
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  ctl = initTheme({ altClass: 'light', label: alt => (alt ? '● pizarrón' : '◎ pintarrón'), aria: alt => (alt ? 'Cambiar a pizarrón (modo oscuro)' : 'Cambiar a pintarrón (modo claro)') });
  { const img = $('.lm-hero-img'); if (img) { const dark = img.getAttribute('src'); onTheme(() => { img.src = isLight ? img.dataset.light : dark; }); } }
  stickyHeader('.lm-top');
}
