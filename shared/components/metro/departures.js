// ══════════════════════════════════════════════════════
// Tablero de salidas · anime.js 4.5 (shared/vendor/anime, MIT).
// Cada fila es un tren de la ciudad 3D (city-3d.js): línea, siguiente
// estación, minutos y estado con la semántica del tema (verde a tiempo,
// amarillo demora, rojo detenido). Al entrar en pantalla las líneas se
// trazan y el tablero se teclea; al cambiar de estado, la celda se
// reescribe. El filtro reacomoda las filas con createLayout y deja los
// semáforos de la ciudad en el color elegido.
// La ciudad (Three.js, pesada) se carga cuando el contenedor se acerca.
// Sin JS queda la tabla fija del marcado.
// ══════════════════════════════════════════════════════
import { animate, createLayout, createTimeline, stagger } from 'animejs';
import { reduceMotion } from './kit.js';
import { createLattice } from './lattice-loader.js';

const LABEL = { ok: 'A tiempo', warn: 'Demora', danger: 'Detenido' };

// Máquina de escribir: vacía las celdas y las teclea una tras otra.
function typeCells(cells, { speed = 28 } = {}) {
  const tl = createTimeline({ autoplay: false });
  let at = 0;
  for (const el of cells) {
    const text = el.dataset.text ?? el.textContent; el.dataset.text = text; el.textContent = '';
    for (let i = 1; i <= text.length; i++) { tl.call(() => { if (el.dataset.text === text) el.textContent = text.slice(0, i); }, at); at += speed + (text[i - 1] === ' ' ? 30 : 0); }
    at += 60;
  }
  return tl.play();
}
export function mount() {
  const root = document.getElementById('metro-city');
  if (!root) return;
  const view = root.querySelector('.metro-city-view'), list = root.querySelector('.metro-board-list');
  root.classList.add('is-live');
  const rows = [...list.querySelectorAll('.metro-board-row')];
  const buttons = [...root.querySelectorAll('.metro-board-filter button')];
  let city = null, filter = 'all', shown = false, visible = false;
  // Antes de mostrarse el tablero, solo cambia el texto (show() lo teclea todo).
  const setCell = (el, text, type) => {
    if (el.dataset.text === text) return;
    el.dataset.text = text;
    if (type && shown && !reduceMotion.matches) typeCells([el], { speed: 34 }); else el.textContent = text;
  };

  // ── Filtro: las filas se reacomodan y los semáforos obedecen
  const layout = createLayout(list, { duration: reduceMotion.matches ? 0 : 420, ease: 'inOut(3)', enterFrom: { opacity: 0, transform: 'translateY(-6px)' }, leaveTo: { opacity: 0 } });
  const applyFilter = () => layout.update(() => rows.forEach(r => r.classList.toggle('is-out', filter !== 'all' && r.dataset.status !== filter)), { delay: stagger(30) });
  buttons.forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f;
    buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    applyFilter();
    city && city.setSignals(filter);
  }));

  // ── Filas al día con los trenes (cada segundo)
  const sync = () => {
    if (!city) return;
    let moved = false;
    city.trains.forEach((t, i) => {
      const r = rows[i]; if (!r) return;
      const [, dest, eta, st] = r.querySelectorAll('.metro-board-cell');
      setCell(dest, t.next.name, true);
      setCell(eta, t.status === 'danger' ? 'retenido' : t.eta < 1 ? 'en andén' : `${Math.ceil(t.eta / 4)} min`);
      if (r.dataset.status !== t.status) { r.dataset.status = t.status; setCell(st, LABEL[t.status], true); moved = true; }
    });
    if (moved && filter !== 'all') applyFilter();
  };

  // ── Primera vista: trazo de líneas y tablero tecleado
  const show = () => {
    if (shown) return; shown = true;
    const cells = rows.flatMap(r => [...r.querySelectorAll('.metro-board-cell')]);
    if (reduceMotion.matches) { city && city.lines.forEach((_, i) => city.setDrawn(i, 1)); return; }
    typeCells(cells, { speed: 22 });
    if (city) city.lines.forEach((_, i) => { const s = { v: 0 }; animate(s, { v: 1, duration: 2600, delay: i * 450, ease: 'inOut(2)', onUpdate: () => city.setDrawn(i, s.v) }); });
  };

  // ── Carga diferida de la ciudad
  let loading = false;
  const load = async () => {
    if (loading) return; loading = true;
    const lat = createLattice({ label: 'Generando ciudad', doneLabel: 'Ciudad lista en', errorLabel: 'Sin WebGL 2 tras', pattern: 'sweep' });
    lat.el.classList.add('metro-city-loader'); view.appendChild(lat.el);
    try {
      const m = await import('./city-3d.js');
      city = await m.mount({ view });
    } catch (e) { console.warn(e); city = null; }
    lat.setStatus(city ? 'done' : 'error');
    setTimeout(() => lat.el.remove(), city ? 900 : 2400);
    if (!city) { setTimeout(() => root.classList.replace('is-live', 'is-flat'), 2400); return; }
    sync(); setInterval(sync, 1000);
    if (visible) show();
  };
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); load(); } }, { rootMargin: '600px 0px' }).observe(root);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && city) show(); }, { threshold: 0.35 }).observe(root);
}
