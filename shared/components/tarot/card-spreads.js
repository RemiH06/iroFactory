// ══════════════════════════════════════════════════════
// Tiradas · tres repartos que son plantillas de documentación.
//  · Tres cartas (retrospectiva): pasado, presente y futuro.
//  · La cruz (decisión): situación, obstáculo cruzado encima, meta,
//    raíz, la alternativa descartada y la elegida.
//  · Solitario (registro de decisiones): columnas por estado, con las
//    cartas del palo del bioma en cascada; cada carta es una decisión
//    numerada y las figuras son las de arquitectura.
// Cada tirada se reparte al entrar a la vista (las cartas se voltean una
// por una, anime.js) y con su botón «Repartir otra vez». El arte es el de
// card-art.js, pintado en canvas planos (dorado sin relieve).
//   mount({ el })
// ══════════════════════════════════════════════════════
import { animate, stagger } from 'animejs';
import { card } from './card-art.js';
import { BIOMES, biome } from './biomes.js';
import { night, onTheme, reduceMotion } from './kit.js';

const THREE_CARDS = [['Pasado', 'Lo que pasó: qué se planeó, qué se entregó y qué se quedó en el camino.'], ['Presente', 'Lo que hay: el estado real hoy, qué funciona y qué se sostiene con cinta.'], ['Futuro', 'Lo que sigue: una o dos acciones con responsable y fecha. Nada de deseos.']];
const CROSS = [['meta', 'Meta', 'Cómo se ve el éxito, medido.'], ['descartada', 'Descartada', 'La alternativa que no se eligió y por qué.'], ['situacion', 'Situación y obstáculo', 'El contexto y por qué hay que decidir ahora; cruzada encima, la restricción que manda: tiempo, dinero o deuda técnica.'], ['obstaculo', 'Obstáculo', ''], ['elegida', 'Elegida', 'La decisión, sus consecuencias y cuándo revisarla.'], ['raiz', 'Raíz', 'La causa de fondo, no el síntoma.']];
const LOG = [['Propuesta', [[3, 'Cachear las vitrinas'], [12, 'Mover los modelos a un CDN']]], ['Aceptada', [[1, 'Un tapiz por bioma'], [2, 'El oro en relieve'], [11, 'Worker para el tapiz'], [5, 'Meshopt en los cráneos']]], ['Reemplazada', [[4, 'Tapiz en canvas 2D'], [13, 'Cartas en el DOM']]], ['Rechazada', [[6, 'Gaussian splatting']]]];

const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const slot = (cls, label, text) => `<figure class="tr-slot ${cls}" tabindex="${cls === 'pile' ? 0 : -1}"><div class="tr-flip"><canvas class="front" aria-hidden="true"></canvas><canvas class="back" aria-hidden="true"></canvas></div><figcaption><b class="tr-label">${esc(label)}</b>${text ? `<span>${esc(text)}</span>` : ''}</figcaption></figure>`;

export function mount({ el = document.getElementById('tr-spreads') } = {}) {
  if (!el) return;
  el.innerHTML = `
    <article class="tr-spread" data-kind="tres"><header><h3>Tres cartas <small>retrospectiva</small></h3><button class="tr-btn ghost" type="button">Repartir otra vez</button></header>
      <div class="tr-row">${THREE_CARDS.map(([l, t]) => slot('', l, t)).join('')}</div></article>
    <article class="tr-spread" data-kind="cruz"><header><h3>La cruz <small>decisión</small></h3><button class="tr-btn ghost" type="button">Repartir otra vez</button></header>
      <div class="tr-cross">${CROSS.map(([c, l, t]) => slot('at-' + c, l, t)).join('')}</div></article>
    <article class="tr-spread" data-kind="solitario"><header><h3>Solitario <small>registro de decisiones</small></h3><button class="tr-btn ghost" type="button">Repartir otra vez</button></header>
      <div class="tr-log">${LOG.map(([state, list]) => `<section class="tr-pile"><h4 class="tr-label">${state}</h4>${list.map(([n, t]) => slot('pile', `ADR ${String(n).padStart(3, '0')}`, t)).join('')}</section>`).join('')}</div></article>`;

  const W = 256, H = 448;
  const paintCanvas = (cv, o) => { const { color } = card({ ...o, w: W, h: H }); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(color, 0, 0); };
  const draw = n => { const b = biome(), own = [...b.arcana].sort(() => Math.random() - 0.5), rest = Array.from({ length: 22 }, (_, i) => i).filter(i => !own.includes(i)).sort(() => Math.random() - 0.5); return [...own, ...rest].slice(0, n); };
  const deal = spread => {
    const slots = [...spread.querySelectorAll('.tr-slot')], kind = spread.dataset.kind, nt = night(), b = biome();
    const pickN = draw(slots.length);
    slots.forEach((s, i) => {
      const front = s.querySelector('.front'), back = s.querySelector('.back');
      paintCanvas(back, { kind: 'back', biome: b, night: nt });
      if (kind === 'solitario') { const n = +s.querySelector('b').textContent.slice(4) % 100; paintCanvas(front, n > 10 ? { kind: 'face', n, biome: b, night: nt } : { kind: 'pip', n, biome: b, night: nt }); }
      else { const n = pickN[i]; paintCanvas(front, { kind: 'arcana', n, biome: BIOMES.find(x => x.arcana.includes(n)) || b, night: nt }); s.querySelector('.tr-flip').title = ''; }
    });
    const flips = slots.map(s => s.querySelector('.tr-flip'));
    if (reduceMotion.matches) { flips.forEach(f => { f.style.transform = 'rotateY(0deg)'; }); return; }
    animate(flips, { rotateY: [180, 0], translateY: [{ to: -18, duration: 260 }, { to: 0, duration: 340 }], duration: 600, delay: stagger(kind === 'solitario' ? 70 : 180), ease: 'inOut(3)' });
  };
  const ready = document.fonts ? Promise.all(['16px "Grenadier NF"', '16px "Busorama"'].map(f => document.fonts.load(f))) : Promise.resolve();
  const spreads = [...el.querySelectorAll('.tr-spread')];
  const dealt = new WeakSet();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !dealt.has(e.target)) { dealt.add(e.target); ready.then(() => deal(e.target)); } }), { threshold: 0.3 });
  spreads.forEach(s => { io.observe(s); s.querySelector('button').addEventListener('click', () => ready.then(() => deal(s))); });
  const repaint = () => spreads.forEach(s => { if (dealt.has(s)) ready.then(() => deal(s)); });
  onTheme(repaint); document.addEventListener('tarot:biome', repaint);
}
