// ══════════════════════════════════════════════════════
// Menú de pausa con Bubble Menu (React Bits): la vista se detiene, se
// oscurece y del botón salen burbujas (píldoras redondas) con las seis
// caras, el modo y la intro; cada burbuja entra con escala y un giro leve
// en escalera, con resorte. Se abre con el botón o con Esc, y Esc lo cierra.
// ══════════════════════════════════════════════════════
import { animate, spring, stagger } from 'animejs';
import { reduceMotion } from './kit.js';

export function mount({ onIntro = () => {} } = {}) {
  const btn = document.getElementById('lx-pause'), menu = document.getElementById('lx-pausemenu');
  if (!btn || !menu) return;
  const bubbles = [...menu.querySelectorAll('.lx-bubble')];
  let open = false;
  const set = on => {
    if (on === open) return; open = on;
    btn.setAttribute('aria-expanded', String(on)); btn.classList.toggle('is-open', on);
    document.body.classList.toggle('is-paused', on);
    if (on) {
      menu.hidden = false;
      if (!reduceMotion.matches) {
        animate(menu, { opacity: [0, 1], duration: 180, ease: 'out(2)' });
        animate(bubbles, { scale: [0, 1], rotate: (_, i) => [(i % 2 ? 1 : -1) * 18, (i % 2 ? 1 : -1) * 2], ease: spring({ bounce: 0.45, duration: 520 }), delay: stagger(45) });
      }
      bubbles[0]?.focus();
    } else {
      const done = () => { menu.hidden = true; btn.focus(); };
      if (reduceMotion.matches) done();
      else { animate(bubbles, { scale: 0, duration: 160, ease: 'in(2)', delay: stagger(20, { from: 'last' }) }); animate(menu, { opacity: 0, duration: 220, delay: 120, ease: 'in(2)', onComplete: done }); }
    }
  };
  btn.addEventListener('click', () => set(!open));
  addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); set(!open); } });
  menu.addEventListener('click', e => {
    if (e.target === menu) { set(false); return; }
    const b = e.target.closest('.lx-bubble'); if (!b) return;
    if (b.dataset.action === 'resume') set(false);
    else if (b.dataset.action === 'intro') { set(false); onIntro(); }
    else if (b.matches('a')) set(false); // el prisma gira a esa cara (lo resuelve su propio manejador de enlaces)
  });
  // Tab se queda dentro del menú mientras está abierto
  menu.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const i = bubbles.indexOf(document.activeElement), n = bubbles.length;
    e.preventDefault(); bubbles[(i + (e.shiftKey ? -1 : 1) + n) % n].focus();
  });
}
