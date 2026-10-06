// tarot · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.
import { buildDeco, drawDeco } from './art-deco-canvas.js';

// ── Toggle ─────────────────────────────────────────────
export let isDark = false;
export function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  document.getElementById('toggle-btn').textContent = isDark ? '✦ claro' : '✦ oscuro';
  updateHexes();
  buildDeco();
  drawDeco();
}
// ── Hexes ──────────────────────────────────────────────
export function cssVar(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
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
