// forge · base del tema sobre el núcleo: oficio (modo), color de respaldo y
// los ajustes propios de sus bucles. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, finePointer, cssVar, colorKit, clamp, onTheme, theme, initTheme, updateHexes, inkSwatchLabels, makeLoop as loop, glProgram, stickyHeader, EASE as BASE_EASE } from '../../core/core.js';

export { $, reduceMotion, finePointer, cssVar, clamp, onTheme, updateHexes, inkSwatchLabels, glProgram };
export const { hexRgb, rgb01, rgba } = colorKit([232, 96, 16]);
export const EASE = { ...BASE_EASE, power2In: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)' };
// Oficio: forja (default) y taller (clase light).
export let isLight = false;
onTheme(() => { isLight = theme.alt; });
// Bucles con 80 px de precarga (los demás temas usan 120).
export const makeLoop = (host, draw, fps) => loop(host, draw, fps, { margin: 80 });
// Canvas WebGL que se ajusta a su caja con una densidad dada.
export const fitGL = (canvas, gl, u, dens) => { const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, dens); canvas.width = Math.max(1, Math.round(r.width * d)); canvas.height = Math.max(1, Math.round(r.height * d)); gl.viewport(0, 0, canvas.width, canvas.height); return [canvas.width, canvas.height]; };
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  ctl = initTheme({ altClass: 'light', render: (alt, b) => {
    b.setAttribute('aria-checked', String(alt));
    b.querySelectorAll('[data-l]').forEach(s => s.classList.toggle('on', (s.dataset.l === 'taller') === alt));
  } });
  stickyHeader('.fg-top');
}
