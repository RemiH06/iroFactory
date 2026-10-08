// ══════════════════════════════════════════════════════
// Tren Ligero de la ZMG · tablero, mapa y ciudad (anime.js 4.5, MIT).
// La simulación (zmg-trains.js) mueve los trenes de L1, L2 y L3 sobre
// sus trazos reales de OpenStreetMap; el tablero, el mapa y la ciudad
// 3D (city-3d.js, Three.js, se carga cuando el contenedor se acerca)
// leen los mismos trenes.
//  · Salidas: cada fila es un tren (línea, siguiente estación, minutos y
//    estado con la semántica del tema: verde a tiempo, amarillo demora,
//    rojo detenido). Se teclea al entrar en pantalla; un cambio de estado
//    reescribe su celda. El filtro reacomoda las filas con createLayout
//    y deja los semáforos de la ciudad en el color elegido.
//  · Mapa: vista desde arriba con avenidas, líneas, estaciones, el
//    recuadro de la zona 3D y los trenes como bolitas.
//  · La ciudad se expande con un clic (o el botón) para explorarla con
//    zoom y desplazamiento; Esc o «Cerrar» la regresan.
// Sin JS queda la tabla fija del marcado.
// ══════════════════════════════════════════════════════
import { animate, createLayout, createTimeline, stagger } from 'animejs';
import { reduceMotion } from './kit.js';
import { makeLoop } from '../../core/core.js';
import { createLattice } from './lattice-loader.js';
import { createSim, pointAt } from './zmg-trains.js';

const LABEL = { ok: 'A tiempo', warn: 'Demora', danger: 'Detenido' };
const SVG = 'http://www.w3.org/2000/svg';
// Estaciones con nombre en el mapa: los transbordos y las de la zona 3D.
// [dx, dy en px, anclaje]: los del centro se reparten para no encimarse.
const MAP_LABELS = { 'Juárez': [-6, -5, 'end'], 'Plaza Universidad': [0, 15, 'middle'], 'Guadalajara Centro': [6, -6, 'start'], 'Ávila Camacho': [-6, -4, 'end'], 'La Normal': [6, 4, 'start'], 'Refugio': [-6, 4, 'end'], 'Mezquitán': [-6, 4, 'end'] };

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
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const pathD = p => 'M' + p.reduce((a, v, i) => a + (i && i % 2 === 0 ? 'L' : i ? ',' : '') + Math.round(v), '');

export async function mount() {
  const root = document.getElementById('metro-city');
  if (!root) return;
  const view = root.querySelector('.metro-city-view'), list = root.querySelector('.metro-board-list');
  root.classList.add('is-live');
  const rows = [...list.querySelectorAll('.metro-board-row')];
  const buttons = [...root.querySelectorAll('.metro-board-filter button')];
  let city = null, filter = 'all', shown = false, visible = false;
  const setCell = (cell, text, type) => {
    if (cell.dataset.text === text) return;
    cell.dataset.text = text;
    if (type && shown && !reduceMotion.matches) typeCells([cell], { speed: 34 }); else cell.textContent = text;
  };

  // ── Pestañas del tablero (Salidas · Mapa), con flechas como en el dock
  const tabs = [...root.querySelectorAll('.metro-board-tabs [role="tab"]')];
  const selectTab = (t, focus) => {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
    if (focus) t.focus();
    drawMap();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); } });
  });

  // ── Datos y simulación
  const data = await fetch('../assets/data/metro/zmg-map.json').then(r => r.json()), sim = createSim(data);
  // filas: por línea, un tren en cada sentido
  const boardTrains = sim.lines.flatMap((_, li) => [0, 1].map(k => sim.trains.find(t => t.li === li && t.k === k)));

  // ── Mapa: avenidas, líneas, estaciones, recuadro de la zona 3D y trenes
  const svg = root.querySelector('.metro-map'), [mx0, mz0, mx1, mz1] = sim.mapBox, U = (mx1 - mx0) / 340; // metros por píxel aprox.
  svg.setAttribute('viewBox', `${mx0} ${mz0} ${mx1 - mx0} ${mz1 - mz0}`);
  const gRoads = el('g', { class: 'mm-roads' }, svg);
  for (const r of data.roads) el('path', { d: pathD(r.p), class: 'mm-road' + (r.c === 'primary' || r.c === 'trunk' || r.c === 'motorway' ? ' is-major' : '') }, gRoads);
  const [cx0, cz0, cx1, cz1] = sim.cityBox;
  const box = el('rect', { x: cx0, y: cz0, width: cx1 - cx0, height: cz1 - cz0, class: 'mm-box', tabindex: 0, role: 'button', 'aria-label': 'Zona de la ciudad 3D: explorar' }, svg);
  el('text', { x: cx0 + 40, y: cz0 - 70, class: 'mm-box-label', 'font-size': 11 * U }, svg).textContent = 'ciudad 3D';
  const gLines = el('g', {}, svg), gSt = el('g', {}, svg), gTr = el('g', {}, svg);
  for (const l of sim.lines) {
    el('path', { d: pathD(l.pts.flatMap(p => [p[0], p[1]])), class: 'mm-line', style: `--line:var(${l.token})` }, gLines);
    for (const st of l.stations) {
      el('circle', { cx: st.x, cy: st.z, r: 2.6 * U, class: 'mm-station', style: `--line:var(${l.token})` }, gSt);
      const lab = MAP_LABELS[st.name];
      if (lab && !gSt.querySelector(`[data-n="${st.name}"]`)) {
        const t = el('text', { x: st.x + lab[0] * U, y: st.z + lab[1] * U, 'text-anchor': lab[2], class: 'mm-label', 'font-size': 9.5 * U, 'data-n': st.name }, gSt); t.textContent = st.name;
      }
    }
  }
  const dots = sim.trains.map(t => el('circle', { r: 3.4 * U, class: 'mm-train', style: `--line:var(${t.line.token})` }, gTr));
  const pt = {};
  const drawMap = () => {
    if (svg.closest('[hidden]')) return;
    sim.trains.forEach((t, i) => { pointAt(t.line, t.s, t.dir, pt); dots[i].setAttribute('cx', pt.x.toFixed(0)); dots[i].setAttribute('cy', pt.z.toFixed(0)); dots[i].dataset.status = t.status; });
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

  // ── Filas al día con los trenes
  const sync = () => {
    let moved = false;
    boardTrains.forEach((t, i) => {
      const r = rows[i]; if (!r || !t) return;
      const [line, dest, eta, st] = r.querySelectorAll('.metro-board-cell');
      line.title = `${t.line.id} hacia ${t.toward}`;
      setCell(dest, t.next ? t.next.name : t.toward, true);
      setCell(eta, t.status === 'danger' ? 'retenido' : t.dwell > 0 ? 'en andén' : t.wait > 0 ? 'en terminal' : `${Math.max(1, Math.ceil(t.eta / 450))} min`);
      if (r.dataset.status !== t.status) { r.dataset.status = t.status; setCell(st, LABEL[t.status], true); moved = true; }
    });
    if (moved && filter !== 'all') applyFilter();
  };
  let acc = 0;
  const simLoop = makeLoop(root, now => {
    const dt = simLoop.last ? Math.min(0.1, Math.max(0, now - simLoop.last) / 1000) : 0; simLoop.last = Math.max(simLoop.last || 0, now);
    if (!reduceMotion.matches) sim.step(dt);
    drawMap();
    acc += dt; if (acc > 1 || !dt) { acc = 0; sync(); }
  }, 30);
  sync(); drawMap();

  // ── Primera vista: trazo de líneas y tablero tecleado
  const show = () => {
    if (shown) return; shown = true;
    const cells = rows.flatMap(r => [...r.querySelectorAll('.metro-board-cell')]);
    if (reduceMotion.matches) { city && city.lines.forEach((_, i) => city.setDrawn(i, 1)); return; }
    typeCells(cells, { speed: 22 });
    if (city) city.lines.forEach((_, i) => { const s = { v: 0 }; animate(s, { v: 1, duration: 2600, delay: i * 450, ease: 'inOut(2)', onUpdate: () => city.setDrawn(i, s.v) }); });
  };

  // ── Explorar: la ciudad ocupa la pantalla con zoom y desplazamiento
  const openBtn = view.querySelector('.metro-city-expand'), closeBtn = view.querySelector('.metro-city-close');
  const tools = view.querySelector('.metro-city-tools'), hint = view.querySelector('.metro-city-hint');
  hint.textContent = matchMedia('(pointer: coarse)').matches
    ? 'Un dedo mueve el mapa · dos dedos acercan y giran · doble toque se acerca a un punto'
    : 'Arrastra para moverte · rueda para acercar · clic derecho para girar · doble clic se acerca a un punto';
  tools.addEventListener('click', e => { const z = e.target.closest('button')?.dataset.z; if (!z || !city) return; z === 'home' ? city.home() : city.zoomBy(z === 'in' ? 0.55 : 1.8); });
  let expanded = false;
  const setExpanded = on => {
    if (!city || on === expanded) return;
    expanded = on;
    view.classList.toggle('is-expanded', on); document.documentElement.classList.toggle('metro-city-open', on);
    openBtn.setAttribute('aria-expanded', on); closeBtn.hidden = tools.hidden = hint.hidden = !on;
    city.setExpanded(on);
    if (on && innerWidth < innerHeight) requestAnimationFrame(() => city.home()); // en teléfono vertical, encuadrar la zona completa al abrir
    (on ? closeBtn : openBtn).focus({ preventScroll: true });
  };
  openBtn.addEventListener('click', () => setExpanded(true));
  closeBtn.addEventListener('click', () => setExpanded(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && expanded) setExpanded(false); });
  // un clic (sin arrastrar) sobre la ciudad también la expande
  let down = null;
  view.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  view.addEventListener('pointerup', e => { if (down && !expanded && e.target.tagName === 'CANVAS' && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5 && performance.now() - down.t < 350) setExpanded(true); down = null; });
  const fromMap = () => { if (!city) return; root.scrollIntoView({ block: 'center' }); setExpanded(true); };
  box.addEventListener('click', fromMap); box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fromMap(); } });

  // ── Carga diferida de la ciudad
  let loading = false;
  const load = async () => {
    if (loading) return; loading = true;
    const lat = createLattice({ label: 'Generando ciudad', doneLabel: 'Ciudad lista en', errorLabel: 'Sin WebGL 2 tras', pattern: 'sweep' });
    lat.el.classList.add('metro-city-loader'); view.appendChild(lat.el);
    try {
      const m = await import('./city-3d.js');
      city = await m.mount({ view, sim });
    } catch (e) { console.warn(e); city = null; }
    lat.setStatus(city ? 'done' : 'error');
    setTimeout(() => lat.el.remove(), city ? 900 : 2400);
    if (!city) { setTimeout(() => root.classList.replace('is-live', 'is-flat'), 2400); return; }
    openBtn.hidden = false; city.setSignals(filter);
    if (visible) show();
  };
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); load(); } }, { rootMargin: '600px 0px' }).observe(root);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && city) show(); }, { threshold: 0.35 }).observe(root);
}
