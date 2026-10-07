// tarot · base del tema sobre el núcleo: modo y sus etiquetas de paleta propias
// (aún con el estilo viejo; se rehacen junto con el tema).
import { buildDeco, drawDeco } from './art-deco-canvas.js';
import { cssVar, initTheme, onTheme, theme } from '../../core/core.js';

export { cssVar };

// ── Modo ───────────────────────────────────────────────
export let isDark = false;
onTheme(() => { isDark = theme.alt; buildDeco(); drawDeco(); });
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
// ── Hexes ──────────────────────────────────────────────
export function updateHexes() {
  const map = {
    'hex-gold':'--gold','hex-gold-lt':'--gold-lt','hex-gold-dk':'--gold-dk',
    'hex-silver':'--silver','hex-silver-lt':'--silver-lt',
    'hex-crimson':'--crimson','hex-scarlet':'--scarlet','hex-wine':'--wine',
    'hex-hearts':'--hearts','hex-diamonds':'--diamonds',
    'hex-spades':'--spades','hex-clubs':'--clubs','hex-arcana':'--arcana',
    'hex-ebony':'--ebony','hex-gray':'--gray','hex-ivory':'--ivory',
    'hex-ok':'--ok','hex-warn':'--warn','hex-danger':'--danger',
  };
  Object.entries(map).forEach(([id,tok]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cssVar(tok);
  });
}
// El núcleo pinta el botón y llama a las etiquetas propias en cada cambio.
ctl = initTheme({ altClass: 'dark', toggle: '#toggle-btn', label: alt => (alt ? '✦ claro' : '✦ oscuro'), aria: alt => (alt ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'), hexes: updateHexes });
