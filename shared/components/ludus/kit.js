// ludus · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.
import { buildTetris } from './tetris-board.js';

// ── Toggle ─────────────────────────────────────────────
export let isLight = false;
export function toggleTheme() {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
  document.getElementById('toggle-btn').textContent = isLight ? '🌙 dark' : '☀ light';
  updateHexes();
  buildTetris();
}
// ── Hexes ──────────────────────────────────────────────
export function cssVar(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
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
