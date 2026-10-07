// odysseus · base del tema sobre el núcleo: día y noche (carta estelar),
// color de respaldo y los ajustes de su WebGL. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, cssVar, colorKit, clamp, lerp, smooth, onTheme, theme, initTheme, updateHexes, inkSwatchLabels, makeLoop, glProgram as program } from '../../core/core.js';

export { $, reduceMotion, cssVar, clamp, lerp, smooth, onTheme, updateHexes, inkSwatchLabels, makeLoop };
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export const { hexRgb, rgb01, rgba } = colorKit([200, 180, 140]);
// Sus capas se componen sobre la hoja: alfa premultiplicado y el búfer se conserva.
export const glProgram = (canvas, fs, opts = {}) => program(canvas, fs, { premultipliedAlpha: true, preserveDrawingBuffer: true, ...opts });
export let isDark = false;
export const heroImg = $('.od-hero-img');
onTheme(() => { isDark = theme.alt; heroImg.src = isDark ? heroImg.dataset.dark : heroImg.dataset.light; });
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  heroImg.dataset.light = heroImg.getAttribute('src');
  ctl = initTheme({ altClass: 'dark', label: alt => (alt ? '☀ día' : '☽ noche'), aria: alt => (alt ? 'Cambiar a modo día' : 'Cambiar a modo noche') });
}
