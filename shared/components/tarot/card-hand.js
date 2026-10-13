// ══════════════════════════════════════════════════════
// La mano · las secciones son cartas en abanico al pie de la pantalla.
// Al pasar el cursor, la carta se levanta y las vecinas se abren; al
// tocarla, se voltea (anime.js) y lleva a su sección. La de la sección
// visible queda levantada a medias. El arte de cada carta es el de
// card-art.js (número romano, el motivo del bioma vigente, el título en
// Grenadier) y se repinta al cambiar de bioma o de modo.
// Son enlaces de verdad (Tab y Enter funcionan); en táctil, un toque basta.
//   mount({ el, sections: [{ id, title }] })
// ══════════════════════════════════════════════════════
import { animate } from 'animejs';
import { card } from './card-art.js';
import { biome } from './biomes.js';
import { night, onTheme, reduceMotion } from './kit.js';

export function mount({ el = document.getElementById('tr-hand'), sections }) {
  if (!el) return;
  const N = sections.length, cards = sections.map(({ id, title }, i) => {
    const a = document.createElement('a'); a.className = 'tr-card'; a.href = '#' + id; a.style.setProperty('--i', i - (N - 1) / 2);
    a.setAttribute('aria-label', `${title} (sección ${i + 1} de ${N})`);
    a.innerHTML = '<span class="tr-card-in"><canvas class="front" aria-hidden="true"></canvas><canvas class="back" aria-hidden="true"></canvas></span>';
    el.appendChild(a); return a;
  });
  const paint = () => cards.forEach((a, i) => {
    const draw = (cv, o) => { const { color } = card({ ...o, biome: biome(), night: night(), w: 240, h: 420 }); cv.width = 240; cv.height = 420; cv.getContext('2d').drawImage(color, 0, 0); };
    draw(a.querySelector('.front'), { kind: 'section', n: i + 1, title: sections[i].title });
    draw(a.querySelector('.back'), { kind: 'back' });
  });
  const ready = document.fonts ? Promise.all(['16px "Grenadier NF"', '16px "Busorama"'].map(f => document.fonts.load(f))) : Promise.resolve();
  ready.then(paint);
  onTheme(() => ready.then(paint)); document.addEventListener('tarot:biome', () => ready.then(paint));

  // voltear al tocar (la navegación la hace el enlace)
  cards.forEach(a => a.addEventListener('click', () => {
    if (reduceMotion.matches) return;
    animate(a.firstChild, { rotateY: [0, 360], duration: 700, ease: 'inOut(3)' });
  }));
  // la carta de la sección visible queda levantada
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) cards.forEach(a => a.classList.toggle('is-current', a.hash === '#' + e.target.id)); }), { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach(({ id }) => { const s = document.getElementById(id); if (s) io.observe(s); });
}
