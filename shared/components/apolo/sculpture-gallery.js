// ══════════════════════════════════════════════════════
// Gliptoteca · la sala de esculturas. Arriba, la vitrina abierta: la pieza
// en 3D (sculpture-vitrine.js) y su ficha (autor, fecha, original,
// vaciado, altura, qué mirar, escaneo y licencia), con flechas para pasar
// a la siguiente. Abajo, la línea de tiempo: el eje con sus periodos
// (arcaico, clásico, helenístico, Roma y después) y un punto por pieza a
// su fecha real, y bajo el eje las piezas en orden; elegir una la pone en
// la vitrina.
//   mount({ el, pieces, base })
// ══════════════════════════════════════════════════════
import { SCULPTURES } from './sculptures.js';

const ERAS = [[-700, -480, 'Arcaico'], [-480, -323, 'Clásico'], [-323, -31, 'Helenístico'], [-31, 400, 'Roma']];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount({ el = document.getElementById('ap-glypt'), pieces = SCULPTURES, base = '../assets/models/apolo/' } = {}) {
  if (!el) return;
  const list = pieces;
  if (!list.length) { el.hidden = true; return; }
  el.innerHTML = `<div class="ap-glypt-case">
      <div class="ap-glypt-stage"><button class="ap-glypt-nav prev" type="button" aria-label="Pieza anterior">‹</button><button class="ap-glypt-nav next" type="button" aria-label="Pieza siguiente">›</button></div>
      <div class="ap-glypt-card" aria-live="polite"></div>
    </div>
    <div class="ap-glypt-time"><div class="ap-glypt-axis" aria-hidden="true"><ol class="ap-glypt-eras"></ol><ol class="ap-glypt-dots"></ol></div><ol class="ap-glypt-pieces"></ol></div>`;
  const stage = el.querySelector('.ap-glypt-stage'), card = el.querySelector('.ap-glypt-card'), track = el.querySelector('.ap-glypt-pieces');
  // línea de tiempo: la Antigüedad a escala (de -700 a 400) y lo moderno o sin fecha, después de un corte
  const ancient = y => y != null && y < 400, pos = y => (y + 700) / 1100 * 82;
  el.querySelector('.ap-glypt-eras').innerHTML = ERAS.map(([a, b, n]) => `<li style="left:${pos(a)}%;width:${pos(b) - pos(a)}%">${n}</li>`).join('') + '<li class="later" style="left:86%;width:14%">Después</li>';
  // eje: un punto por pieza a su fecha real; debajo, las piezas espaciadas parejo
  let later = 0;
  const dots = list.map(p => { const li = document.createElement('li'); li.style.left = (ancient(p.year) ? pos(p.year) : 89 + (later++) * 6) + '%'; el.querySelector('.ap-glypt-dots').appendChild(li); return li; });
  const btns = list.map((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="ap-glypt-pin" aria-pressed="false"><span class="ap-glypt-pname">${esc(p.name)}</span><span class="ap-glypt-pyear">${esc(p.year == null ? 's. f.' : p.year < 0 ? `${-p.year} a. C.` : p.year)}</span></button>`;
    const b = li.firstChild;
    b.addEventListener('click', () => show(i));
    b.addEventListener('pointerenter', () => dots[i].classList.add('hot')); b.addEventListener('pointerleave', () => dots[i].classList.remove('hot'));
    track.appendChild(li); return b;
  });

  let vitrine = null, idx = list.findIndex(p => p.file === 'belvedere'); if (idx < 0) idx = 0;
  const show = i => {
    idx = (i + list.length) % list.length; const p = list[idx];
    btns.forEach((b, j) => { b.setAttribute('aria-pressed', String(j === idx)); dots[j].classList.toggle('on', j === idx); });
    card.innerHTML = `<p class="ap-glypt-kicker">${idx + 1} de ${list.length} · Gliptoteca</p>
      <h3 class="ap-glypt-name">${esc(p.name)}</h3><p class="ap-glypt-date">${esc(p.date)}</p>
      <dl class="ap-glypt-facts"><dt>Autor</dt><dd>${esc(p.author)}</dd><dt>Original</dt><dd>${esc(p.original)}</dd>${p.cast ? `<dt>Vaciado</dt><dd>${esc(p.cast)} · Real Colección de Vaciados, SMK</dd>` : ''}${p.h ? `<dt>Altura</dt><dd>${String(p.h).replace('.', ',')} cm</dd>` : ''}<dt>Escaneo</dt><dd><a href="${esc(p.url)}">${esc(p.by)}</a> · ${esc(p.license)}</dd></dl>
      <p class="ap-glypt-look"><b>Qué mirar.</b> ${esc(p.look)}</p>`;
    vitrine && vitrine.show(p);
  };
  el.querySelector('.prev').addEventListener('click', () => show(idx - 1));
  el.querySelector('.next').addEventListener('click', () => show(idx + 1));
  el.querySelectorAll('.ap-glypt-nav').forEach(n => { n.hidden = list.length < 2; });
  show(idx);
  import('./sculpture-vitrine.js').then(m => { vitrine = m.mount({ host: stage, base }); if (vitrine) vitrine.show(list[idx]); else stage.classList.add('no-gl'); });
}
