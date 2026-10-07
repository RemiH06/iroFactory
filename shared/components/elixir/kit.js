// elixir · base del tema sobre el núcleo: modo (oscuro por defecto) y color
// de respaldo. Lo genérico vive en shared/core/core.js.
import { $, reduceMotion, cssVar, colorKit, onTheme, theme } from '../../core/core.js';

export { $, reduceMotion, cssVar, onTheme };
export const coarsePointer = window.matchMedia('(pointer: coarse)');
export const { hexRgb, rgb01, rgba } = colorKit([220, 224, 240]);
export let isDark = document.body.classList.contains('dark');
onTheme(() => { isDark = theme.alt; });
export function mount() {}
