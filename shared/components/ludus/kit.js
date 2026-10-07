// ludus · base del tema sobre el núcleo: modo y sus etiquetas de paleta propias
// (aún con el estilo viejo; se rehacen junto con el tema).
import { buildTetris } from './tetris-board.js';
import { cssVar, initTheme, onTheme, theme } from '../../core/core.js';

export { cssVar };

// ── Modo ───────────────────────────────────────────────
export let isLight = false;
onTheme(() => { isLight = theme.alt; buildTetris(); });
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
// ── Hexes ──────────────────────────────────────────────
export function updateHexes() {
  const map = {
    'hex-i':'--piece-i','hex-o':'--piece-o','hex-t':'--piece-t',
    'hex-s':'--piece-s','hex-z':'--piece-z','hex-j':'--piece-j','hex-l':'--piece-l',
    'hex-play':'--play','hex-pause':'--pause','hex-go':'--gameover','hex-accent':'--accent',
    'hex-black':'--black','hex-gray':'--gray','hex-white':'--white',
    'hex-ok':'--ok','hex-warn':'--warn','hex-danger':'--danger',
  };
  Object.entries(map).forEach(([id,tok]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cssVar(tok);
  });
}
// El núcleo pinta el botón y llama a las etiquetas propias en cada cambio.
ctl = initTheme({ altClass: 'light', toggle: '#toggle-btn', label: alt => (alt ? '🌙 dark' : '☀ light'), aria: alt => (alt ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'), hexes: updateHexes });
