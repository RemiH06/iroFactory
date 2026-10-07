// ══════════════════════════════════════════════════════
// HERO ↔ ESCRITORIO · el escritorio entra en un círculo que crece
// desde el botón "ir" (y regresa al mismo punto con "inicio").
// ══════════════════════════════════════════════════════
import { $, WALL, isDark, reduceMotion } from './kit.js';
import { initTheme, onTheme, updateHexes, inkSwatchLabels } from '../../core/core.js';

export { updateHexes, inkSwatchLabels };
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
let ctl;
export const toggleTheme = () => ctl && ctl.toggle();
onTheme(() => {
  const src = isDark ? WALL.dark : WALL.light;
  $('#bw-wall').src = src; Masked.setImage(src);
  Greenhouse.rebuild(); Desktop.paintAll(); ghKick();
});
export function mount() {
goBtn.addEventListener('click', e => { e.preventDefault(); switchTo(true); });
$('#bw-home').addEventListener('click', () => switchTo(false));
// ── Init ───────────────────────────────────────────────
$('#bw-wall').src = WALL.light;
Greenhouse.rebuild();
ctl = initTheme({ altClass: 'dark', label: alt => (alt ? '☀ día' : '☽ noche'), aria: alt => (alt ? 'Cambiar a modo día' : 'Cambiar a modo noche') });
Masked.init();
Masked.start();
desk.inert = true;
window.addEventListener('resize', () => { Greenhouse.rebuild(); Desktop.paintAll(); ghKick(); });
reduceMotion.addEventListener('change', () => { Greenhouse.rebuild(); ghKick(); });
ghKick();
}
