// ══════════════════════════════════════════════════════
// HERO ↔ ESCRITORIO · el escritorio entra en un círculo que crece
// desde el botón "ir" (y regresa al mismo punto con "inicio").
// ══════════════════════════════════════════════════════
import { $, WALL, __set_isDark, cssVar, hexRgb, isDark, reduceMotion } from './kit.js';
import { Masked } from './masked-heading.js';
import { Desktop, ghKick } from './desktop.js';
import { Greenhouse } from './greenhouse.js';

export const hero = $('#bw-hero'), desk = $('#bw-desktop'), goBtn = $('#bw-go');
export function switchTo(desktop) {
  const r = goBtn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  document.body.classList.add('is-switching');
  const done = () => {
    document.body.classList.remove('is-switching');
    document.body.classList.toggle('mode-desktop', desktop);
    hero.inert = desktop; desk.inert = !desktop;
    desk.style.clipPath = '';
    if (desktop) { Masked.stop(); const first = document.querySelector('.bw-icons .gi'); first && first.focus({ preventScroll: true }); }
    else { Masked.start(); goBtn.focus({ preventScroll: true }); }
    ghKick();
  };
  if (reduceMotion.matches) { done(); return; }
  const from = `circle(0px at ${cx}px ${cy}px)`, to = `circle(${R}px at ${cx}px ${cy}px)`;
  desk.style.clipPath = desktop ? from : to;
  desk.animate([{ clipPath: desktop ? from : to }, { clipPath: desktop ? to : from }], { duration: 700, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' }).onfinish = function () { this.cancel(); done(); };
  ghKick();
}
// ── Tema ──────────────────────────────────────────────
export function toggleTheme() {
  __set_isDark(!isDark);
  document.body.classList.toggle('dark', isDark);
  document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.textContent = isDark ? '☀ día' : '☽ noche'; b.setAttribute('aria-label', isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'); });
  const src = isDark ? WALL.dark : WALL.light;
  $('#bw-wall').src = src; Masked.setImage(src);
  updateHexes();
  Greenhouse.rebuild(); Desktop.paintAll(); ghKick();
}
// ── Etiquetas hex de la paleta ─────────────────────────
// Tinta del modo vigente (--text o --bg) con mayor contraste WCAG real
// contra cada muestra; si ninguna llega a 4.5:1, pastilla --bg.
export function inkSwatchLabels() {
  const rgbOf = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const inks = ['--text', '--bg'].map(t => ({ t, c: hexRgb(cssVar(t)) }));
  document.querySelectorAll('.swatch-hex').forEach(el => {
    const sw = rgbOf(getComputedStyle(el.parentElement).backgroundColor); if (!sw) return;
    const best = inks.map(i => ({ t: i.t, r: ratio(i.c, sw) })).sort((a, b) => b.r - a.r)[0];
    const chip = best.r < 4.5; el.classList.toggle('is-chip', chip); el.style.color = chip ? 'var(--text)' : `var(${best.t})`;
  });
}
export function updateHexes() {
  document.querySelectorAll('.swatch-hex').forEach(el => { el.textContent = cssVar('--' + el.id.replace('hex-', '')).toUpperCase(); });
  inkSwatchLabels();
}
export function mount() {
goBtn.addEventListener('click', e => { e.preventDefault(); switchTo(true); });
$('#bw-home').addEventListener('click', () => switchTo(false));
document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', toggleTheme));
// ── Init ───────────────────────────────────────────────
$('#bw-wall').src = WALL.light;
Greenhouse.rebuild();
updateHexes();
Masked.init();
Masked.start();
desk.inert = true;
window.addEventListener('resize', () => { Greenhouse.rebuild(); Desktop.paintAll(); ghKick(); });
reduceMotion.addEventListener('change', () => { Greenhouse.rebuild(); ghKick(); });
ghKick();
}
