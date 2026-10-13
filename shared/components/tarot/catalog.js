// ══════════════════════════════════════════════════════
// Catálogo · las diez vitrinas. Arriba, la vitrina abierta: el cráneo en
// 3D (skull-vitrine.js) y su ficha (nombre, especie, sigla del museo,
// licencia), con flechas si el bioma tiene más de un cráneo a esa hora.
// Abajo, una lámina por bioma: una miniatura de su tapiz y su nombre;
// elegirla cambia el bioma de toda la página (tapiz, colores, cartas).
// Las miniaturas se dibujan con el mismo generador del tapiz, cuando el
// navegador está libre.
//   mount({ el })
// ══════════════════════════════════════════════════════
import { BIOMES, baseOf, biome, setBiome, skullsFor } from './biomes.js';
import { paint } from './deco-pattern.js';
import { composeAccents, night, onTheme } from './kit.js';

export function mount({ el = document.getElementById('tr-catalog') } = {}) {
  if (!el) return;
  el.innerHTML = `<div class="tr-case">
      <div class="tr-case-stage" id="tr-case-stage"><button class="tr-case-nav prev" type="button" aria-label="Cráneo anterior">‹</button><button class="tr-case-nav next" type="button" aria-label="Cráneo siguiente">›</button></div>
      <div class="tr-card-info">
        <p class="tr-label" id="tr-case-biome"></p>
        <h3 class="tr-case-name" id="tr-case-name"></h3>
        <p class="tr-case-sci" id="tr-case-sci"></p>
        <dl class="tr-facts">
          <dt>Sigla</dt><dd id="tr-case-id"></dd>
          <dt data-compose>Colección</dt><dd>Dpto. de Zoología, Facultad de Ciencias Biológicas · Museo de Historia Natural de la Universitat de València (MUVHN)</dd>
          <dt>Escaneo</dt><dd><a id="tr-case-link" href="#">Sketchfab</a> · CC BY 4.0</dd>
          <dt>Palo</dt><dd id="tr-case-suit"></dd>
          <dt>Memento</dt><dd id="tr-case-memento"></dd>
        </dl>
        <p class="tr-case-count" id="tr-case-count" aria-live="polite"></p>
      </div>
    </div>
    <ul class="tr-biomes" role="list"></ul>`;
  composeAccents(el);
  const list = el.querySelector('.tr-biomes'), stage = el.querySelector('#tr-case-stage');
  const MEMENTO = { orchid: 'orquídea marchita', candle: 'vela consumida', hourglass: 'reloj de arena', shell: 'concha vacía', feather: 'pluma caída', wheel: 'rueda', moth: 'polilla', scythe: 'guadaña', skull: 'cráneo', urn: 'urna funeraria' };
  const tiles = BIOMES.map(b => {
    const li = document.createElement('li');
    li.innerHTML = `<button class="tr-biome" type="button" data-id="${b.id}" aria-pressed="false"><canvas width="384" height="216" aria-hidden="true"></canvas><span class="tr-biome-name">${b.name}</span><span class="tr-biome-meta">${b.skulls.map(s => s.name).join(' · ')}</span></button>`;
    list.appendChild(li); li.firstChild.addEventListener('click', () => setBiome(b.id)); return li.firstChild;
  });
  // miniaturas del tapiz, una por una cuando el navegador está libre
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 60));
  const thumbs = () => { let i = 0; const next = () => { if (i >= BIOMES.length) return; const b = BIOMES[i], t = tiles[i++], n = night(); const { color } = paint({ w: 384, h: 216, colors: b[n ? 'night' : 'day'], base: baseOf(b, n), gold: n ? ['#B8913E', '#F2D894'] : ['#8C6A22', '#C9A04A'], motif: b.motif, memento: b.memento }); t.querySelector('canvas').getContext('2d').drawImage(color, 0, 0); idle(next); }; idle(next); };
  thumbs(); onTheme(thumbs);

  let vitrine = null, idx = 0;
  const $ = id => el.querySelector('#' + id);
  const render = () => {
    const b = biome(), list = skullsFor(b, night()), s = list[idx % list.length];
    tiles.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.id === b.id)));
    $('tr-case-biome').textContent = b.name; $('tr-case-name').textContent = s.name; $('tr-case-sci').textContent = s.sci;
    $('tr-case-id').textContent = s.id; $('tr-case-link').href = s.url; $('tr-case-suit').textContent = b.suit; $('tr-case-memento').textContent = MEMENTO[b.memento];
    // de día y de noche: los biomas con cráneo nocturno lo cambian según el modo
    const other = b.skulls.filter(x => x.night !== night() && (night() ? !x.night : x.night)), hour = night() ? 'de día' : 'de noche';
    $('tr-case-count').textContent = (list.length > 1 ? `${idx % list.length + 1} de ${list.length} cráneos en esta vitrina. ` : '') + (b.skulls.some(x => x.night) ? `${hour[0].toUpperCase() + hour.slice(1)}, ${other.map(x => x.name.toLowerCase()).join(' y ')}.` : '');
    el.querySelectorAll('.tr-case-nav').forEach(n => { n.hidden = list.length < 2; });
    vitrine && vitrine.show(s);
  };
  el.querySelector('.prev').addEventListener('click', () => { idx = (idx + skullsFor(biome(), night()).length - 1); render(); });
  el.querySelector('.next').addEventListener('click', () => { idx++; render(); });
  document.addEventListener('tarot:biome', () => { idx = 0; render(); });
  onTheme(() => { idx = 0; render(); });
  import('./skull-vitrine.js').then(m => { vitrine = m.mount({ host: stage }); render(); });
  render();
}
