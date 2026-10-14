// ══════════════════════════════════════════════════════
// LIBRERO · la otra forma de abrir las ventanas: un mueble de madera con
// un lomo por ventana (mismo orden y color que los Glass Icons), una
// maceta encima porque esto es un invernadero. El lomo se asoma al pasar
// y se queda fuera mientras su ventana está abierta. Un selector en la
// barra alterna entre escritorio (íconos) y librero; se recuerda.
//   mount({ icons, bar })
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';

const KEY = 'bw-view';
const PLANT = `<svg class="bw-plant" viewBox="0 0 64 60" aria-hidden="true"><path d="M32 40c-1-10-9-17-20-19 3 9 9 16 20 19zM32 40c1-12 8-21 19-24-2 11-8 20-19 24zM32 40c-4-8-4-18 0-28 4 10 4 20 0 28z" class="leaf"/><path d="M18 40h28l-3 18H21z" class="pot"/><path d="M16 38h32v5H16z" class="rim"/></svg>`;

export function mount({ icons = document.querySelector('.bw-icons'), bar = document.querySelector('.bw-menu-actions') } = {}) {
  if (!icons || !bar) return;
  const items = [...icons.querySelectorAll('.gi[data-win]')];
  const shelf = document.createElement('nav'); shelf.className = 'bw-shelf'; shelf.setAttribute('aria-label', 'Librero: ventanas del tema');
  // Alturas y grosores fijos por lomo (no al azar: que el librero sea siempre el mismo).
  const H = [132, 118, 140, 124, 136, 116, 128, 142], Wd = [40, 34, 44, 36, 42, 38, 46, 36];
  const book = (g, i) => `<button type="button" class="bw-book" data-win="${g.dataset.win}" aria-label="${g.querySelector('.gi-label').textContent}" style="--bk:${g.style.getPropertyValue('--gi-a')};--bh:${H[i % H.length]}px;--bw:${Wd[i % Wd.length]}px"><span class="bw-spine-t">${g.dataset.spine || g.querySelector('.gi-label').textContent}</span></button>`;
  const half = Math.ceil(items.length / 2);
  shelf.innerHTML = `<div class="bw-case"><div class="bw-case-top">${PLANT}</div>
    <div class="bw-row">${items.slice(0, half).map(book).join('')}</div>
    <div class="bw-row">${items.slice(half).map((g, i) => book(g, i + half)).join('')}<span class="bw-bookend" aria-hidden="true"></span></div></div>`;
  icons.after(shelf);

  const seg = document.createElement('div'); seg.className = 'bw-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Vista');
  seg.innerHTML = '<button type="button" class="bw-segbtn" data-view="desk">escritorio</button><button type="button" class="bw-segbtn" data-view="shelf">librero</button>';
  bar.prepend(seg);

  const set = (v, user) => {
    const shelfOn = v === 'shelf';
    document.body.classList.toggle('view-shelf', shelfOn);
    icons.hidden = shelfOn; shelf.hidden = !shelfOn;
    seg.querySelectorAll('.bw-segbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    // El estado de abierto pasa al lomo que corresponde.
    items.forEach(g => shelf.querySelector(`[data-win="${g.dataset.win}"]`).classList.toggle('is-open', g.classList.contains('is-open')));
    if (!user) return;
    try { localStorage.setItem(KEY, v); } catch {}
    if (!reduceMotion.matches) {
      const list = shelfOn ? shelf.querySelectorAll('.bw-book, .bw-plant') : icons.querySelectorAll('.gi');
      list.forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 35, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' }));
    }
  };
  seg.addEventListener('click', e => { const b = e.target.closest('.bw-segbtn'); if (b && b.getAttribute('aria-pressed') !== 'true') set(b.dataset.view, true); });
  let saved = 'desk'; try { saved = localStorage.getItem(KEY) || 'desk'; } catch {}
  set(saved === 'shelf' ? 'shelf' : 'desk', false);
}
