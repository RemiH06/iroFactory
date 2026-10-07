// shui · base del tema sobre el núcleo: zona pelágica (día) y abisal (noche),
// color de respaldo y su tween. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, cssVar, colorKit, clamp, onTheme, theme, initTheme, updateHexes, inkSwatchLabels, makeLoop, glProgram } from '../../core/core.js';

export { $, reduceMotion, cssVar, clamp, onTheme, updateHexes, inkSwatchLabels, makeLoop, glProgram };
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export const { hexRgb, rgb01, rgba } = colorKit([120, 200, 210]);
export let isDark = false;
onTheme(() => { isDark = theme.alt; });
export const tween = (dur, ease, onUpdate, onDone) => {
  const t0 = performance.now(); let raf = 0;
  const step = t => { const k = clamp((t - t0) / dur, 0, 1); onUpdate(ease(k)); if (k < 1) raf = requestAnimationFrame(step); else onDone && onDone(); };
  raf = requestAnimationFrame(step);
  return { kill: () => cancelAnimationFrame(raf) };
};
export const power2InOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), power2Out = t => 1 - (1 - t) * (1 - t);
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  ctl = initTheme({ altClass: 'dark', label: alt => (alt ? '☀ día' : '☾ noche'), aria: alt => (alt ? 'Cambiar a modo pelágico' : 'Cambiar a modo abisal') });
}
