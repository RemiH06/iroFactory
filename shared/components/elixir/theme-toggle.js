// ── Tema ──────────────────────────────────────────────
import { initTheme, updateHexes } from '../../core/core.js';

export { updateHexes };
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
export function mount() {
  ctl = initTheme({ altClass: 'dark', label: alt => (alt ? '◑ claro' : '◐ oscuro'), aria: alt => (alt ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') });
}
