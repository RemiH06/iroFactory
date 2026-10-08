// ══════════════════════════════════════════════════════
// Target Cursor (React Bits) · GSAP → anime.js 4.5 (MIT).
// La mira sigue al puntero con createAnimatable (suave, sin un animate()
// por evento) y gira una vuelta cada 2 s. Sobre un objetivo deja de girar
// y sus esquinas (12 px, borde 3) se pegan con resorte a las del elemento
// y lo siguen si se mueve; al hacer clic se contraen y rebotan.
// Solo con puntero fino y sin reduced motion.
// ══════════════════════════════════════════════════════
import { animate, createAnimatable, createTimer, spring, utils } from 'animejs';
import { finePointer, reduceMotion, updateHexes } from './kit.js';

export function mount() {
  updateHexes();
  if (!finePointer.matches || reduceMotion.matches) return;
  const SEL = '.btn, .card, .breaker, .fg-switch, .callout, .badge, .fw-step, .reg-entry, .np, .swatch, .fg-pill, .fg-brand, .fg-knob';
  const wrap = document.createElement('div'); wrap.className = 'target-cursor-wrapper'; wrap.setAttribute('aria-hidden', 'true');
  const corners = ['tl', 'tr', 'br', 'bl'].map(k => { const c = document.createElement('div'); c.className = 'target-cursor-corner corner-' + k; wrap.appendChild(c); return c; });
  const dot = document.createElement('div'); dot.className = 'target-cursor-dot'; wrap.appendChild(dot);
  document.body.appendChild(wrap); document.documentElement.classList.add('tc-on');
  const CS = 12, BW = 3, REST = [[-CS * 1.5, -CS * 1.5], [CS * 0.5, -CS * 1.5], [CS * 0.5, CS * 0.5], [-CS * 1.5, CS * 0.5]];

  // posición: la mira persigue al puntero; las esquinas, a su meta (reposo o el borde del objetivo)
  const aim = createAnimatable(wrap, { x: 90, y: 90, ease: 'out(3)' });
  const cs = corners.map((c, i) => { const a = createAnimatable(c, { x: 140, y: 140, ease: 'out(4)' }); a.x(REST[i][0], 0).y(REST[i][1], 0); return a; });
  // giro con un timer (no una animación en bucle: enderezar la mira la reemplazaría y no volvería)
  let ang = 0;
  createTimer({ onUpdate: t => { if (!target) { ang = (ang + t.deltaTime * 0.18) % 360; utils.set(wrap, { rotate: ang }); } } });
  let mx = 0, my = 0, target = null, raf = 0, seen = false;

  const toRest = () => { cs.forEach((a, i) => a.x(REST[i][0]).y(REST[i][1])); };
  // meta de cada esquina relativa a la mira (en coordenadas de la mira, que ya no gira sobre un objetivo)
  const follow = () => {
    raf = 0; if (!target) return;
    if (!target.isConnected) { setTarget(null); return; }
    const r = target.getBoundingClientRect(), x = aim.x(), y = aim.y();
    const goal = [[r.left - BW - x, r.top - BW - y], [r.right + BW - CS - x, r.top - BW - y], [r.right + BW - CS - x, r.bottom + BW - CS - y], [r.left - BW - x, r.bottom + BW - CS - y]];
    cs.forEach((a, i) => a.x(goal[i][0]).y(goal[i][1]));
    raf = requestAnimationFrame(follow); // el objetivo puede moverse (scroll, hover) y la mira también
  };
  const setTarget = t => {
    if (t === target) return;
    target = t;
    if (t) {
      // la mira se endereza (a la vuelta completa más cercana) con un resorte corto antes de pegarse
      animate(wrap, { rotate: ang > 180 ? 360 : 0, ease: spring({ bounce: 0.3, duration: 320 }) }); ang = 0;
      if (!raf) raf = requestAnimationFrame(follow);
    } else { cancelAnimationFrame(raf); raf = 0; toRest(); }
  };

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!seen) { seen = true; aim.x(mx, 0).y(my, 0); wrap.style.opacity = ''; } else aim.x(mx).y(my);
  }, { passive: true });
  addEventListener('mouseover', e => setTarget(e.target.closest && e.target.closest(SEL) || null));
  addEventListener('scroll', () => { if (!target) return; const el = document.elementFromPoint(mx, my); if (!el || el.closest(SEL) !== target) setTarget(null); }, { passive: true });
  document.addEventListener('mouseleave', () => { seen = false; wrap.style.opacity = '0'; });
  // clic: las esquinas se contraen hacia el centro y rebotan
  addEventListener('mousedown', () => animate(wrap, { scale: 0.86, duration: 90, ease: 'out(2)' }));
  addEventListener('mouseup', () => animate(wrap, { scale: 1, ease: spring({ bounce: 0.55, duration: 380 }) }));
  wrap.style.opacity = '0';
}
