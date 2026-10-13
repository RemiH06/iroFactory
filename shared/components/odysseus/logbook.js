// ══════════════════════════════════════════════════════
// Bitácora de navegación: plantilla para documentar lugares que calcula
// de verdad. Se eligen puertos en orden y sale el itinerario: tramos con
// distancia por círculo máximo (km y millas náuticas), rumbo de salida,
// horas de vuelo y llegada en la hora local del destino; totales; línea
// de tiempo con vuelos y estancias; y la ficha de cada puerto (DMS, huso
// con su horario de verano, hora local viva, sol de hoy, distancia y
// rumbo desde casa, antípoda). La ruta se traza en el mapa (evento
// od:plan) y se recuerda en este navegador.
// ══════════════════════════════════════════════════════
import { $ } from './kit.js';
import { HOME, PORTS } from './geography.js';
import { EARTH_KM, KM_NM, antipode, bearing, clock, dayClock, fmtDMS, fmtOffset, haversine, rose, shortDay, sunTimes, tzOffset, zonedToUTC } from './nav-math.js';

const ALL = [HOME, ...PORTS], byId = Object.fromEntries(ALL.map(p => [p.id, p]));
const CRUISE = 850, TAXI = 0.5; // km/h de crucero y media hora de despegue y aterrizaje
const KEY = 'od-plan', CARTA = ALL.map(p => p.id), WORLD = [...CARTA, HOME.id];
const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const hm = h => { const t = Math.round(h * 60), H = Math.floor(t / 60), M = t % 60; return H ? `${H} h${M ? ` ${M} min` : ''}` : `${M} min`; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount() {
  const root = $('#bitacora'); if (!root) return;
  const q = s => root.querySelector(s);
  const portsBox = q('.od-log-ports'), stopsBox = q('.od-log-stops'), legsBody = q('.od-log-legs tbody'), totals = q('.od-log-totals');
  const lineBox = q('.od-log-line'), ficha = q('.od-log-ficha'), dateIn = q('#od-log-date'), timeIn = q('#od-log-time'), nightsOut = q('.od-log-nights output'), live = q('.od-log-live');
  root.classList.add('is-live');

  // ── Estado (se recuerda en este navegador; si no se puede, empieza con la ruta de la carta)
  const today = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let st = { stops: CARTA.slice(), date: iso(new Date(today.getTime() + 7 * 864e5)), time: '09:00', nights: 2, sel: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.stops)) st = { ...st, ...s, stops: s.stops.filter(id => byId[id]) }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  dateIn.value = st.date; timeIn.value = st.time;

  // ── Botones para añadir puertos
  ALL.forEach(p => {
    const b = el('button', 'od-log-port'); b.type = 'button'; b.dataset.id = p.id;
    b.innerHTML = `<span class="od-log-iata">${p.iata}</span><span>${esc(p.name)}</span>`;
    b.setAttribute('aria-label', `Añadir ${p.name} al itinerario`);
    b.addEventListener('click', () => {
      if (st.stops[st.stops.length - 1] === p.id) { say(`${p.name} ya es la última escala`); return; }
      st.stops.push(p.id); st.sel = st.stops.length - 1; render(); say(`${p.name} añadido, escala ${st.stops.length}`);
    });
    portsBox.appendChild(b);
  });
  const say = msg => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); };

  // ── Cálculo del itinerario
  const plan = () => {
    const stops = st.stops.map(id => byId[id]), [y, mo, d] = st.date.split('-').map(Number), [h, mi] = st.time.split(':').map(Number);
    let t = stops.length ? zonedToUTC(stops[0].tz, y, mo, d, h || 0, mi || 0) : new Date();
    const legs = [], t0 = t;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1], km = haversine(a, b), hrs = km / CRUISE + TAXI, dep = t, arr = new Date(t.getTime() + hrs * 36e5);
      const zones = Math.abs(tzOffset(b.tz, arr) - tzOffset(a.tz, dep)) / 60;
      legs.push({ a, b, km, brg: bearing(a, b), hrs, dep, arr, zones });
      t = new Date(arr.getTime() + (i < stops.length - 2 ? st.nights * 864e5 : 0));
    }
    const km = legs.reduce((s, l) => s + l.km, 0), hrs = legs.reduce((s, l) => s + l.hrs, 0), zones = legs.reduce((s, l) => s + l.zones, 0);
    return { stops, legs, km, hrs, zones, t0, t1: t };
  };

  // ── Pintar
  function render() {
    st.sel = Math.min(st.sel, st.stops.length - 1);
    const P = plan();
    save();
    stopsBox.replaceChildren(...P.stops.map((p, i) => {
      const li = el('li', 'od-log-stop' + (i === st.sel ? ' is-sel' : ''));
      const pick = el('button', 'od-log-pick', `<span class="od-log-n">${i + 1}</span><span class="od-log-iata">${p.iata}</span><span class="od-log-name">${esc(p.name)}</span><span class="od-log-tz">${fmtOffset(tzOffset(p.tz))}</span>`);
      pick.type = 'button'; pick.setAttribute('aria-pressed', i === st.sel); pick.setAttribute('aria-label', `Escala ${i + 1}: ${p.name}. Ver ficha`);
      pick.addEventListener('click', () => { st.sel = i; render(); });
      const tools = el('span', 'od-log-tools');
      [['↑', 'Subir', -1], ['↓', 'Bajar', 1]].forEach(([g, n, dir]) => {
        const b = el('button', 'od-log-mini', g); b.type = 'button'; b.setAttribute('aria-label', `${n} ${p.name}`); b.disabled = i + dir < 0 || i + dir >= P.stops.length;
        b.addEventListener('click', () => { const j = i + dir; [st.stops[i], st.stops[j]] = [st.stops[j], st.stops[i]]; st.sel = j; render(); say(`${p.name} pasa a la escala ${j + 1}`); stopsBox.children[j]?.querySelectorAll('.od-log-mini')[dir < 0 ? 0 : 1]?.focus(); });
        tools.appendChild(b);
      });
      const x = el('button', 'od-log-mini od-log-x', '×'); x.type = 'button'; x.setAttribute('aria-label', `Quitar ${p.name}`);
      x.addEventListener('click', () => { st.stops.splice(i, 1); if (st.sel >= i) st.sel = Math.max(0, st.sel - 1); render(); say(`${p.name} fuera del itinerario`); });
      tools.appendChild(x); li.append(pick, tools); return li;
    }));
    if (!P.stops.length) stopsBox.appendChild(el('li', 'od-log-empty', 'Sin escalas. Elige un puerto de arriba.'));

    // Tramos
    legsBody.replaceChildren(...P.legs.map((l, i) => {
      const tr = el('tr');
      tr.innerHTML = `<td class="od-log-num od-log-i">${i + 1}</td><td class="od-log-leg"><b>${l.a.iata}</b> → <b>${l.b.iata}</b><small>${esc(l.a.name)} a ${esc(l.b.name)}</small></td>`
        + `<td class="od-log-num" data-k="Distancia">${nf.format(l.km)} km<small>${nf.format(l.km / KM_NM)} nmi</small></td>`
        + `<td class="od-log-num" data-k="Rumbo"><span class="od-log-arrow" style="--b:${l.brg.toFixed(1)}deg" aria-hidden="true">↑</span> ${l.brg.toFixed(0)}°<small>${rose(l.brg)}</small></td>`
        + `<td class="od-log-num" data-k="Vuelo">${hm(l.hrs)}<small>${l.zones ? `${nf2.format(l.zones)} h de huso` : 'mismo huso'}</small></td>`
        + `<td data-k="Llegada">${dayClock(l.b.tz, l.arr)}<small>hora de ${esc(l.b.name)}</small></td>`;
      return tr;
    }));
    if (!P.legs.length) { const tr = el('tr'); tr.innerHTML = '<td colspan="6" class="od-log-empty">Con dos escalas o más aparecen los tramos.</td>'; legsBody.appendChild(tr); }

    // Totales
    const days = (P.t1 - P.t0) / 864e5;
    totals.innerHTML = [
      [nf.format(P.km), 'km por círculo máximo'], [nf.format(P.km / KM_NM), 'millas náuticas'], [hm(P.hrs), `en el aire a ${CRUISE} km/h`],
      [P.legs.length ? nf2.format(Math.max(days, 0)) : '0', 'días de viaje'], [nf2.format(P.km / EARTH_KM), 'vueltas al mundo'], [nf2.format(P.zones), 'horas de huso cruzadas'],
    ].map(([v, l], i) => `<div class="metric"><div class="metric-val${['', ' compass', ' wonder', ' visited', ' fey', ' compass'][i]}">${v}</div><div class="metric-lbl">${l}</div></div>`).join('');

    // Línea de tiempo: vuelos y estancias a escala, con la fecha local de cada llegada
    lineBox.replaceChildren();
    if (P.legs.length) {
      const span = Math.max(1, P.t1 - P.t0), pct = t => ((t - P.t0) / span) * 100, bar = el('div', 'od-log-bar');
      P.legs.forEach((l, i) => {
        const f = el('span', 'od-log-fly'); f.style.left = pct(l.dep) + '%'; f.style.width = Math.max(0.6, pct(l.arr) - pct(l.dep)) + '%'; f.title = `${l.a.iata} → ${l.b.iata} · ${hm(l.hrs)}`; bar.appendChild(f);
        const next = P.legs[i + 1];
        if (next) { const s = el('span', 'od-log-stay'); s.style.left = pct(l.arr) + '%'; s.style.width = (pct(next.dep) - pct(l.arr)) + '%'; s.title = `${l.b.name} · ${st.nights} noches`; bar.appendChild(s); }
      });
      for (let d = 1; d < span / 864e5; d++) { const k = el('i', 'od-log-tick'); k.style.left = pct(P.t0.getTime() + d * 864e5) + '%'; bar.appendChild(k); }
      const marks = el('div', 'od-log-marks');
      // Tres renglones de rótulos: cada uno va al primero donde no se encima con el anterior.
      const rows = [-1e9, -1e9, -1e9], gap = 100 * 64 / Math.max(240, lineBox.clientWidth || 600);
      [[P.legs[0].a, P.t0], ...P.legs.map(l => [l.b, l.arr])].forEach(([p, t]) => {
        const m = el('span', 'od-log-mark', `<b>${p.iata}</b><small>${shortDay(p.tz, t)}</small>`), x = pct(t);
        let r = rows.findIndex(last => x - last >= gap); if (r < 0) r = rows.indexOf(Math.min(...rows)); rows[r] = x;
        m.style.left = x + '%'; m.style.setProperty('--row', r); m.classList.toggle('is-end', x > 90); m.classList.toggle('is-start', x < 4); marks.appendChild(m);
      });
      lineBox.append(bar, marks);
    }

    renderFicha();
    document.dispatchEvent(new CustomEvent('od:plan', { detail: { stops: P.stops, sel: st.sel } }));
  }

  // Ficha del puerto elegido; la hora corre sola mientras la sección está a la vista.
  function renderFicha() {
    const p = byId[st.stops[st.sel]];
    if (!p) { ficha.innerHTML = '<p class="muted">Elige una escala para ver su ficha.</p>'; return; }
    const now = new Date(), off = tzOffset(p.tz, now), sun = sunTimes(p, now), home = p.id === HOME.id ? null : { km: haversine(HOME, p), brg: bearing(HOME, p) }, an = antipode(p);
    const sunTxt = sun.polar ? `sol de ${sun.polar} todo el día` : `${clock(p.tz, sun.rise)} a ${clock(p.tz, sun.set)} · ${hm(sun.hours)} de luz`;
    ficha.innerHTML = `<div class="od-log-ficha-head"><span class="od-log-iata">${p.iata}</span><div><h3>${esc(p.wonder || p.name)}</h3><p class="muted">${esc(p.place)}</p></div><span class="od-log-clock" aria-label="Hora local">${clock(p.tz, now)}</span></div>`
      + `<dl><dt>Coordenadas</dt><dd>${fmtDMS(p)}</dd><dt>Huso</dt><dd>${fmtOffset(off)} · <code>${p.tz}</code></dd><dt>Sol de hoy</dt><dd>${sunTxt}</dd>`
      + (home ? `<dt>Desde ${esc(HOME.name)}</dt><dd>${nf.format(home.km)} km rumbo ${home.brg.toFixed(0)}° (${rose(home.brg)})</dd>` : '<dt>Puerto de casa</dt><dd>Aquí empieza y termina la ruta.</dd>')
      + `<dt>Antípoda</dt><dd>${fmtDMS(an)}</dd></dl>`;
  }
  let tick = 0;
  new IntersectionObserver(([e]) => { clearInterval(tick); if (e.isIntersecting) { renderFicha(); tick = setInterval(renderFicha, 30000); } }).observe(ficha);

  // ── Controles
  q('.od-log-presets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'carta') st.stops = CARTA.slice(); else if (a === 'mundo') st.stops = WORLD.slice(); else if (a === 'limpiar') st.stops = [];
    else if (a === 'mapa') { $('#viaje').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); document.dispatchEvent(new CustomEvent('od:world')); return; }
    st.sel = 0; render(); say(a === 'limpiar' ? 'Itinerario vacío' : `Itinerario de ${st.stops.length} escalas`);
  });
  dateIn.addEventListener('change', () => { if (dateIn.value) { st.date = dateIn.value; render(); } });
  timeIn.addEventListener('change', () => { if (timeIn.value) { st.time = timeIn.value; render(); } });
  q('.od-log-nights').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.nights = Math.max(0, Math.min(14, st.nights + +b.dataset.d)); nightsOut.textContent = st.nights; render(); });
  nightsOut.textContent = st.nights;
  // Un alfiler del mapa elegido también enfoca su ficha si está en el itinerario.
  document.addEventListener('od:port', e => { const i = st.stops.indexOf(e.detail.id); if (i >= 0 && i !== st.sel) { st.sel = i; render(); } });
  render();
}
