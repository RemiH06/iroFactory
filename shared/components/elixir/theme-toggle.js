// ── Tema ──────────────────────────────────────────────
import { __set_isDark, cssVar, isDark, themeListeners } from './kit.js';
import { inkSwatchLabels } from './palette-labels.js';

export function toggleTheme() {
  __set_isDark(!isDark);
  document.body.classList.toggle('dark', isDark);
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    b.textContent = isDark ? '◑ claro' : '◐ oscuro';
    b.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  });
  updateHexes();
  themeListeners.forEach(fn => fn());
}
export function updateHexes() {
  document.querySelectorAll('.swatch-hex[id^="hex-"]').forEach(el => { el.textContent = cssVar('--' + el.id.slice(4)).toUpperCase(); });
  inkSwatchLabels();
}
export function mount() {
document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', toggleTheme));
}
