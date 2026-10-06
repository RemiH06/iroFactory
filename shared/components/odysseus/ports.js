// ══════════════════════════════════════════════════════
// Puertos: carrusel 3D de tarjetas (riff de Figma), deslizable.
// ══════════════════════════════════════════════════════
import { $, clamp } from './kit.js';

export const ports = (() => {
  const track = $('#od-track'), cards = [...track.children];
  let idx = 0, current = -1, drag = null, moved = false;
  const place = () => {
    // Ninguna tarjeta sale del escenario: en móvil, el navegador ensanchaba el
    // viewport de layout con las tarjetas 3D de las orillas (overflow no las
    // recorta) y el dedo podía mover la página de lado. El espaciado se ajusta
    // al ancho y las de más de dos lugares se apilan detrás de las visibles.
    const cw = cards[0].offsetWidth || 148, room = track.clientWidth / 2 - cw / 2 - 8, gap = clamp(room / 2.15, 24, cw * 0.62);
    cards.forEach((c, i) => {
      const o = i - idx, a = Math.abs(o), ax = Math.min(a, 2.15);
      c.style.transform = `translateX(${Math.sign(o) * ax * gap}px) translateZ(${-Math.min(a, 3) * 70}px) rotateY(${-Math.sign(o) * Math.min(a, 2) * 30}deg) scale(${1 - Math.min(a, 3) * 0.06})`;
      c.style.opacity = a > 2 ? '0' : String(1 - a * 0.22); c.style.zIndex = String(100 - a); c.style.pointerEvents = a > 2 ? 'none' : '';
      c.tabIndex = i === idx ? 0 : -1; c.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
  };
  let timer = 0;
  const setIdx = (i, travel) => { idx = clamp(i, 0, cards.length - 1); place(); clearTimeout(timer); if (travel) timer = setTimeout(() => api.onPick && api.onPick(idx), 380); };
  cards.forEach((c, i) => c.addEventListener('click', () => { if (moved) return; if (i !== idx) setIdx(i, true); else if (i !== current && api.onPick) api.onPick(i); }));
  $('.od-ports-nav.prev').addEventListener('click', () => setIdx(idx - 1, true));
  $('.od-ports-nav.next').addEventListener('click', () => setIdx(idx + 1, true));
  track.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setIdx(idx + (e.key === 'ArrowRight' ? 1 : -1), true); cards[idx].focus(); } });
  track.parentElement.addEventListener('pointerdown', e => { if (e.target.closest('.od-ports-nav')) return; drag = { x: e.clientX, i: idx }; moved = false; });
  window.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 8) moved = true; if (moved) setIdx(drag.i - Math.round(dx / 90), false); });
  window.addEventListener('pointerup', () => { if (!drag) return; const was = moved; drag = null; if (was) { setIdx(idx, true); setTimeout(() => { moved = false; }, 0); } });
  window.addEventListener('pointercancel', () => { drag = null; });
  new ResizeObserver(place).observe(track);
  const api = { onPick: null, show(i) { current = i; setIdx(i < 0 ? idx : i, false); } };
  track.classList.add('is-init'); place();
  requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('is-init')));
  return api;
})();
