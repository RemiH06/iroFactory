// ══════════════════════════════════════════════════════
// Tablero · cada breaker es una sección (anime.js 4.5, MIT).
//  · Las palancas suben y bajan con resorte y rebotan al encajar. Se
//    pueden arrastrar: pasada la mitad del recorrido encajan y llevan a la
//    sección; si no, regresan.
//  · Al activarse una sección, sus cuatro cables se dibujan desde las
//    orillas hacia el título, la chispa de carga los recorre (riff de
//    Figma de @hardikgondhiya) y las letras del título, en BPdots, se
//    encienden una por una desde el centro, parpadeando como tubo que
//    arranca. Al dejar la sección se apagan.
// Con reduced motion: estados finales, sin recorridos.
// ══════════════════════════════════════════════════════
import { animate, createDraggable, createTimeline, irregular, spring, splitText, stagger, svg, utils } from 'animejs';
import { reduceMotion } from './kit.js';

export function mount() {
  const breakers = [...document.querySelectorAll('.breaker')], ids = breakers.map(b => b.getAttribute('href').slice(1));
  let current = null;

  // ── Títulos: cables vivos encima de los de reposo y letras partidas (el h2 conserva su texto accesible)
  const heads = new Map();
  for (const id of ids) {
    const head = document.getElementById(id)?.querySelector('.fg-head'); if (!head) continue;
    const pill = head.querySelector('.fg-pill'), cables = head.querySelector('.fg-cables');
    const base = [...cables.querySelectorAll('path:not(.charge)')];
    const live = base.map(p => { const l = p.cloneNode(); l.setAttribute('class', 'live'); cables.insertBefore(l, cables.querySelector('.charge')); return l; });
    const label = pill.lastChild.textContent.trim();
    pill.setAttribute('aria-label', (pill.querySelector('small')?.textContent || '') + ' ' + label);
    const word = document.createElement('span'); word.className = 'fg-pill-word'; word.textContent = label; pill.lastChild.replaceWith(word);
    const chars = splitText(word, { chars: { class: 'fg-dot' }, words: false, accessible: false }).chars;
    heads.set(id, { head, pill, live: svg.createDrawable(live), charges: [...cables.querySelectorAll('.charge')], chars, tl: null });
  }
  const lightOn = h => {
    if (h.tl) h.tl.cancel();
    if (reduceMotion.matches) { utils.set(h.live, { draw: '0 1' }); utils.set(h.chars, { opacity: 1 }); h.pill.classList.add('is-lit'); return; }
    h.pill.classList.remove('is-lit');
    utils.set(h.live, { draw: '0 0' }); utils.set(h.chars, { opacity: 0.28 });
    h.tl = createTimeline()
      .add(h.live, { draw: ['0 0', '0 1'], duration: 820, ease: 'inOut(2)' }, stagger(70))
      .add(h.charges, { strokeDashoffset: [70, -1000], opacity: [{ to: 1, duration: 60 }, { to: 1, duration: 900 }, { to: 0, duration: 140 }], duration: 1100, ease: 'in(2)' }, stagger(70, { start: 80 }))
      // al llegar la carga: cada letra prende desde el centro con un parpadeo irregular, como tubo que arranca
      .add(h.chars, { opacity: [0.28, 1, 0.4, 1, 0.75, 1], duration: 520, ease: irregular(6, 0.8) }, stagger(55, { from: 'center', start: 980 }))
      .call(() => h.pill.classList.add('is-lit'), 1150);
  };
  const lightOff = h => {
    if (h.tl) h.tl.cancel(); h.pill.classList.remove('is-lit');
    if (reduceMotion.matches) { utils.set(h.chars, { opacity: 0.28 }); utils.set(h.live, { draw: '1 1' }); return; }
    h.tl = createTimeline()
      .add(h.chars, { opacity: 0.28, duration: 260, ease: 'out(2)' }, stagger(25, { from: 'edges' }))
      .add(h.live, { draw: '1 1', duration: 500, ease: 'in(2)' }, 0);
  };

  // ── Palancas con resorte
  const levers = breakers.map(b => b.querySelector('.breaker-lever'));
  const travel = l => Math.max(8, l.parentElement.clientHeight - l.offsetHeight - 8);
  const springUp = spring({ bounce: 0.45, duration: 520 }), springDown = spring({ bounce: 0.3, duration: 420 });
  const drags = [];
  // se anima el draggable (no la palanca suelta) para que su posición interna no se desfase
  const setLever = (b, on) => {
    const i = breakers.indexOf(b), l = levers[i], d = drags[i], y = on ? -travel(l) : 0;
    if (!d) return;
    if (reduceMotion.matches) d.setY(y); else animate(d, { y, ease: on ? springUp : springDown });
  };
  const setActive = id => {
    if (id === current) return;
    if (current && heads.has(current)) lightOff(heads.get(current));
    current = id;
    breakers.forEach(b => { const on = b.getAttribute('href') === '#' + id; b.setAttribute('aria-current', String(on)); setLever(b, on); });
    if (heads.has(id)) lightOn(heads.get(id));
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
  ids.forEach(id => { const s = document.getElementById(id); s && io.observe(s); });

  // arrastrar la palanca: pasada la mitad, encaja y navega; si no, regresa con resorte
  let dragged = false;
  breakers.forEach((b, i) => {
    const l = levers[i];
    // el breaker es un enlace: sin esto el navegador arrastra el enlace en vez de la palanca
    b.setAttribute('draggable', 'false'); b.addEventListener('dragstart', e => e.preventDefault());
    drags[i] = createDraggable(l, {
      x: false, y: { modifier: v => utils.clamp(v, -travel(l), 0) },
      releaseEase: springDown, cursor: { onHover: 'grab', onGrab: 'grabbing' },
      onGrab: () => { dragged = false; },
      onDrag: () => { dragged = true; },
      onRelease: d => {
        if (!dragged) return;
        if (d.y < -travel(l) / 2) { current = null; setActive(ids[i]); document.getElementById(ids[i]).scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); }
        else setLever(b, b.getAttribute('aria-current') === 'true');
      }
    });
    // un arrastre no es un clic: que no navegue dos veces
    b.addEventListener('click', e => { if (dragged) { e.preventDefault(); dragged = false; } });
  });
  addEventListener('resize', () => breakers.forEach((b, i) => drags[i].setY(b.getAttribute('aria-current') === 'true' ? -travel(levers[i]) : 0)));
  setActive('portada');
}
