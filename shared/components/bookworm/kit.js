// bookworm · base del tema sobre el núcleo: modo, fondo de escritorio y
// utilidades propias. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, clamp, cssVar, hexRgb, toRgba, onTheme, theme } from '../../core/core.js';

export { $, reduceMotion, clamp, cssVar, hexRgb, toRgba };
export const mobileQ = window.matchMedia('(max-width: 700px)');
export const WALL = { light: '../assets/img/bookworm/d0e36bc7c0.webp', dark: '../assets/img/bookworm/6b1b830c0b.webp' };
export let isDark = false;
onTheme(() => { isDark = theme.alt; });
export function mount() {}
