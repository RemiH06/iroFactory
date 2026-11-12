// ══════════════════════════════════════════════════════
// mirai · tiradas: la pastilla de la barra (pasa a la tirada siguiente) y
// las muestras de la guía de marca, una por tirada, cada una impresa con
// sus propios colores (la muestra lleva su data-palette, así que el CSS la
// pinta sola) y con una lámina del compositor de formas en su tinta clave.
// Cambiar de tirada es una transición de vista: la hoja nueva entra de
// izquierda a derecha, como por la prensa.
//   mount({ pill: '#mi-tirada', list: '#mi-tiradas' })
// ══════════════════════════════════════════════════════
import { $, onTheme, refresh, swap, theme } from './kit.js';
import { PALETTES, nextPalette, palette, setPalette } from './palettes.js';
import { artHTML } from './plate.js';

const ART = { shu: ['circulo', 7], gunjo: ['capsula', 3], ukon: ['cuarto', 5], tsutsuji: ['circulo', 12] };
const name = p => `tirada en ${p.id}`;

export function choose(id) {
  if (id === palette().id) return;
  swap(() => { setPalette(id); refresh(); }, { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] }, { duration: 950, easing: 'cubic-bezier(.65, 0, .35, 1)' });
}

export function mount({ pill = '#mi-tirada', list = '#mi-tiradas' } = {}) {
  const pillEl = $(pill), listEl = $(list);
  if (listEl) {
    listEl.innerHTML = `<ul class="mt-list">${PALETTES.map(p => {
      const [forma, seed] = ART[p.id];
      return `<li class="mt-card" data-palette="${p.id}">
        <div class="mt-sheet" aria-hidden="true"><div class="pc" data-ink="${p.id}">${artHTML(5, 3, { forma, seed })}</div></div>
        <p class="mt-name"><ruby lang="ja">${p.ja}<rt>${p.kana}</rt></ruby><span>${name(p)}</span></p>
        <ul class="mt-chips" aria-hidden="true"><li style="--c:var(--bg)"></li><li style="--c:var(--text)"></li><li style="--c:var(--key)"></li><li style="--c:var(--r1)"></li><li style="--c:var(--r2)"></li><li style="--c:var(--r3)"></li></ul>
        <p class="mt-meta"></p>
        <button type="button" class="mt-pick" data-id="${p.id}" aria-pressed="false"></button>
      </li>`;
    }).join('')}</ul>`;
    listEl.addEventListener('click', e => { const b = e.target.closest('.mt-pick'); if (b) choose(b.dataset.id); });
  }
  if (pillEl) { pillEl.hidden = false; pillEl.addEventListener('click', () => choose(nextPalette().id)); }

  const paint = () => {
    const p = palette(), n = nextPalette();
    if (pillEl) {
      pillEl.innerHTML = `<span class="mi-pill-dot" aria-hidden="true"></span><span lang="ja">${p.ja.replace('刷り', '')}<span class="mi-pill-suf">刷り</span></span>`;
      pillEl.setAttribute('aria-label', `Tirada en ${p.id}. Cambiar a la tirada en ${n.id}`);
    }
    // las muestras base de la guía nombran el papel, la tinta y la laca de la tirada puesta
    document.querySelectorAll('[data-pname]').forEach(r => { const [ja, kana] = p[r.dataset.pname]; r.innerHTML = `${ja}<rt>${kana}</rt>`; });
    listEl?.querySelectorAll('.mt-card').forEach(card => {
      const q = PALETTES.find(x => x.id === card.dataset.palette), on = q === p;
      const [paper, sumi, night] = [q.paper, q.sumi, q.night].map(([ja, kana]) => `<span lang="ja">${ja}</span> ${kana}`);
      card.querySelector('.mt-meta').innerHTML = theme.dark ? `laca ${night}` : `papel ${paper} · tinta ${sumi}`;
      card.classList.toggle('is-current', on);
      const b = card.querySelector('.mt-pick');
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${name(q)}: ${theme.dark ? `laca ${q.night[0]}` : `papel ${q.paper[0]}, tinta ${q.sumi[0]}`}${on ? ', la que está puesta' : ''}`);
    });
  };
  // refresh() vuelve a correr los avisos de modo: ahí se repinta todo, también esto
  onTheme(paint); paint();
}
