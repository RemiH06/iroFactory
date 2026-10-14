// ══════════════════════════════════════════════════════
// PÁGINA DE ESTADO · plantilla para documentar un sistema en operación,
// con el Tren Ligero como ejemplo (incidentes inventados, se dice en la
// página). Aviso general, componentes con barras de disponibilidad de 30
// o 90 días (una barra por día, color del semáforo y siempre la palabra),
// mantenimiento programado y cronología de incidentes con sus
// actualizaciones. Juguete: declarar un incidente y llevarlo por sus
// etapas; el aviso, el componente y la barra de hoy cambian en vivo.
//   mount({ el })
// ══════════════════════════════════════════════════════
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DAY = 864e5;
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const at = (daysAgo, h, m) => { const d = day0(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.getTime(); };
const fmtDay = t => new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
const fmtLong = t => new Date(t).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = t => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
const dur = ms => { const m = Math.round(ms / 6e4); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };

export const COMPONENTS = [
  { id: 'l1', name: 'Línea 1 · Periférico Sur a Auditorio', line: '--orange' },
  { id: 'l2', name: 'Línea 2 · Juárez a Tetlán', line: '--blue' },
  { id: 'l3', name: 'Línea 3 · Arcos de Zapopan a Central de Autobuses', line: '--pink' },
  { id: 'board', name: 'Tablero de salidas' },
  { id: 'api', name: 'API de horarios' },
  { id: 'pay', name: 'Recarga en línea', since: 64 }
];
// Severidad: minor = servicio degradado (amarillo), major = interrupción (rojo).
const STAGES = [['investigando', 'Investigando'], ['identificado', 'Identificado'], ['monitoreando', 'Monitoreando'], ['resuelto', 'Resuelto']];
const sample = () => [
  { id: 'i1', title: 'Respuestas lentas en la API de horarios', comp: ['api', 'board'], sev: 'minor', updates: [
    ['investigando', at(5, 8, 12), 'Las consultas tardan más de 4 s. El tablero de salidas muestra tiempos con retraso.'],
    ['identificado', at(5, 8, 25), 'Un índice de la base de datos se reconstruía en horario pico.'],
    ['monitoreando', at(5, 8, 31), 'Se detuvo la reconstrucción; las respuestas volvieron a menos de 300 ms.'],
    ['resuelto', at(5, 8, 37), 'La reconstrucción se movió a la madrugada.']] },
  { id: 'i2', title: 'Retraso por falla eléctrica cerca de Unidad Deportiva', comp: ['l1'], sev: 'minor', updates: [
    ['investigando', at(12, 18, 4), 'Trenes con marcha lenta entre Santa Filomena y Periférico Sur.'],
    ['identificado', at(12, 18, 20), 'Falla en un tramo de catenaria; se alimenta desde la subestación vecina.'],
    ['resuelto', at(12, 18, 46), 'Servicio regular. Intervalo de vuelta a 4 minutos.']] },
  { id: 'i3', title: 'Revisión de vías en San Juan de Dios', comp: ['l2'], sev: 'minor', updates: [
    ['investigando', at(21, 7, 40), 'Reporte de ruido anómalo en la vía sentido Tetlán.'],
    ['monitoreando', at(21, 8, 2), 'Revisión terminada sin hallazgos; los trenes recuperan velocidad.'],
    ['resuelto', at(21, 8, 15), 'Servicio regular.']] },
  { id: 'i4', title: 'Servicio suspendido entre Zapopan Centro y Plaza Patria', comp: ['l3'], sev: 'major', updates: [
    ['investigando', at(33, 13, 10), 'Tren detenido en el viaducto; se suspende el tramo. Hay transbordo en autobús.'],
    ['identificado', at(33, 13, 45), 'Falla en el sistema de frenado de una unidad; se remolca al taller.'],
    ['monitoreando', at(33, 15, 2), 'El tramo reabre con marcha controlada.'],
    ['resuelto', at(33, 15, 20), 'Servicio regular en toda la línea.']] },
  { id: 'i5', title: 'Tiempos de llegada desactualizados', comp: ['board'], sev: 'minor', updates: [
    ['investigando', at(48, 21, 5), 'Las pantallas repiten el último dato recibido.'],
    ['resuelto', at(48, 21, 52), 'Se reinició el servicio de mensajes; los tiempos vuelven a actualizarse.']] },
  { id: 'i6', title: 'Recarga en línea no disponible', comp: ['pay'], sev: 'major', updates: [
    ['investigando', at(52, 10, 0), 'Los pagos se rechazan con error del procesador.'],
    ['identificado', at(52, 11, 30), 'El certificado del procesador de pagos venció.'],
    ['resuelto', at(52, 13, 10), 'Certificado renovado; se agregó una alerta 30 días antes.']] }
];
const MAINT = [{ comp: ['l3'], title: 'Mantenimiento de vía entre Plaza Universidad y Guadalajara Centro', start: at(-3, 23, 30), end: at(-4, 5, 0), note: 'Los trenes de L3 terminan en Plaza Universidad; habrá autobuses de apoyo.' }];

export function mount({ el = document.getElementById('mt-status') } = {}) {
  if (!el) return;
  let incidents = sample(), range = innerWidth < 700 ? 30 : 90, filter = null, sevF = null, seq = 0;
  el.innerHTML = `<div class="st-banner" aria-live="polite"></div>
    <div class="st-head"><h3>Componentes</h3><div class="st-range" role="group" aria-label="Días a mostrar"><button type="button" class="btn" data-r="30">30 días</button><button type="button" class="btn" data-r="90">90 días</button></div></div>
    <ul class="st-comps"></ul>
    <p class="st-legend"><span><i class="ok"></i>sin incidentes</span><span><i class="warn"></i>degradado</span><span><i class="danger"></i>interrupción</span><span><i class="none"></i>sin datos</span></p>
    <div class="st-tip" role="status" hidden></div>
    <h3>Mantenimiento programado</h3><div class="st-maint"></div>
    <details class="st-sim"><summary>Simular un incidente</summary>
      <form class="st-new"><label>Componente<select name="comp">${COMPONENTS.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
        <label>Severidad<select name="sev"><option value="minor">degradado</option><option value="major">interrupción</option></select></label>
        <label class="wide">Título<input name="title" maxlength="90" required value="Trenes con demora por revisión técnica"></label>
        <label class="wide">Primera actualización<input name="msg" maxlength="160" value="Estamos revisando el reporte. Siguiente actualización en 30 minutos."></label>
        <button class="btn primary" type="submit">declarar incidente</button></form>
      <p class="muted">Como en la Guía de guardia: se declara, se actualiza cada vez que se sabe algo y se cierra con un resumen. Solo vive en esta página.</p></details>
    <div class="st-head"><h3>Cronología de incidentes</h3><div class="st-filters"></div></div>
    <ol class="st-history"></ol>`;
  const $ = s => el.querySelector(s), tip = $('.st-tip');

  const end = i => { const u = i.updates; return u[u.length - 1][0] === 'resuelto' ? u[u.length - 1][1] : Date.now(); };
  const start = i => i.updates[0][1];
  const open = i => i.updates[i.updates.length - 1][0] !== 'resuelto';
  // Disponibilidad de un día: la interrupción cuenta completa, lo degradado al 30 % (como Statuspage).
  function dayInfo(comp, dAgo) {
    const t0 = day0().getTime() - dAgo * DAY, t1 = t0 + DAY, c = COMPONENTS.find(x => x.id === comp);
    if (c.since && dAgo > c.since) return { none: true, t0 };
    let lost = 0, worst = null; const list = [];
    incidents.filter(i => i.comp.includes(comp)).forEach(i => {
      const a = Math.max(start(i), t0), b = Math.min(end(i), t1, Date.now()); if (b <= a) return;
      lost += (b - a) * (i.sev === 'major' ? 1 : 0.3); list.push(i); if (i.sev === 'major' || !worst) worst = i.sev === 'major' ? 'major' : worst || 'minor';
    });
    const span = dAgo === 0 ? Math.max(1, Date.now() - t0) : DAY;
    return { t0, up: 1 - lost / span, worst, list };
  }
  const state = comp => { const o = incidents.filter(i => open(i) && i.comp.includes(comp)); return o.some(i => i.sev === 'major') ? 'major' : o.length ? 'minor' : 'ok'; };
  const WORD = { ok: 'Opera con normalidad', minor: 'Servicio degradado', major: 'Interrupción' }, CLS = { ok: 'ok', minor: 'warn', major: 'danger' }, ICON = { ok: '✓', minor: '!', major: '✕' };

  function banner() {
    const st = COMPONENTS.map(c => [c, state(c.id)]), bad = st.filter(([, s]) => s !== 'ok'), worst = bad.some(([, s]) => s === 'major') ? 'major' : bad.length ? 'minor' : 'ok';
    $('.st-banner').className = `st-banner ${CLS[worst]}`;
    $('.st-banner').innerHTML = `<span class="st-ico" aria-hidden="true">${ICON[worst]}</span><div><b>${worst === 'ok' ? 'Todos los sistemas operan con normalidad' : `${WORD[worst]} en ${bad.map(([c]) => esc(c.name.split(' · ')[0])).join(', ')}`}</b><span>Actualizado a las ${fmtTime(Date.now())} · página de estado de ejemplo, los incidentes son inventados</span></div>`;
  }
  function comps() {
    $('.st-comps').innerHTML = COMPONENTS.map(c => {
      const days = Array.from({ length: range }, (_, k) => dayInfo(c.id, range - 1 - k)), real = days.filter(d => !d.none);
      const avg = real.reduce((a, d) => a + d.up, 0) / Math.max(1, real.length), s = state(c.id);
      const bars = days.map((d, k) => `<button type="button" tabindex="${k === range - 1 ? 0 : -1}" class="st-day ${d.none ? 'none' : d.worst === 'major' ? 'danger' : d.worst ? 'warn' : 'ok'}" data-c="${c.id}" data-d="${range - 1 - k}" aria-label="${fmtDay(d.t0)}: ${d.none ? 'sin datos' : `${(d.up * 100).toFixed(2)} % disponible${d.list && d.list.length ? `, ${d.list.length} incidente${d.list.length > 1 ? 's' : ''}` : ''}`}"></button>`).join('');
      return `<li class="st-comp${filter === c.id ? ' is-on' : ''}"><div class="st-comp-head"><button type="button" class="st-name" data-filter="${c.id}" aria-pressed="${filter === c.id}">${c.line ? `<i style="background:var(${c.line})"></i>` : ''}${esc(c.name)}</button><span class="st-state ${CLS[s]}"><span aria-hidden="true">${ICON[s]}</span> ${WORD[s]}</span></div>
        <div class="st-bars" role="group" aria-label="Disponibilidad diaria de ${esc(c.name)}">${bars}</div>
        <div class="st-foot"><span>hace ${range} días</span><span><b>${(avg * 100).toFixed(2)} %</b> disponible</span><span>hoy</span></div></li>`;
    }).join('');
    el.querySelectorAll('.st-range .btn').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.r === range)));
  }
  function maint() {
    $('.st-maint').innerHTML = MAINT.map(m => `<div class="st-mcard"><span class="badge gray">programado</span><b>${esc(m.title)}</b><span>${fmtLong(m.start)}, de ${fmtTime(m.start)} a ${fmtTime(m.end)} (${dur(m.end - m.start)})</span><p class="muted">${esc(m.note)}</p></div>`).join('');
  }
  function history() {
    const list = incidents.filter(i => (!filter || i.comp.includes(filter)) && (!sevF || i.sev === sevF)).sort((a, b) => start(b) - start(a));
    $('.st-filters').innerHTML = `${filter ? `<button type="button" class="btn" data-filter="">${esc(COMPONENTS.find(c => c.id === filter).name.split(' · ')[0])} ✕</button>` : ''}<button type="button" class="btn" data-sev="" aria-pressed="${!sevF}">todos</button><button type="button" class="btn" data-sev="major" aria-pressed="${sevF === 'major'}">interrupciones</button><button type="button" class="btn" data-sev="minor" aria-pressed="${sevF === 'minor'}">degradados</button>`;
    $('.st-history').innerHTML = list.map(i => {
      const o = open(i), last = i.updates[i.updates.length - 1][0], next = STAGES[STAGES.findIndex(s => s[0] === last) + 1];
      return `<li class="st-inc ${i.sev === 'major' ? 'danger' : 'warn'}${o ? ' is-open' : ''}" id="st-${i.id}">
        <div class="st-inc-head"><span class="st-sev">${i.sev === 'major' ? '✕ interrupción' : '! degradado'}</span><h4>${esc(i.title)}</h4>
          <span class="st-when">${fmtLong(start(i))} · ${o ? `abierto hace ${dur(Date.now() - start(i))}` : `duró ${dur(end(i) - start(i))}`}</span>
          <span class="st-affects">${i.comp.map(c => `<span class="badge">${esc(COMPONENTS.find(x => x.id === c).name.split(' · ')[0])}</span>`).join(' ')}</span></div>
        <ol class="st-updates">${i.updates.slice().reverse().map(([stage, t, msg]) => `<li><b>${STAGES.find(s => s[0] === stage)[1]}</b> <time>${fmtTime(t)}</time><p>${esc(msg)}</p></li>`).join('')}</ol>
        ${o && i.sim ? `<form class="st-step" data-id="${i.id}"><input name="msg" maxlength="160" aria-label="Mensaje de la actualización" placeholder="Qué se sabe ahora" required><button class="btn primary" type="submit">${next ? `pasar a ${next[1].toLowerCase()}` : 'actualizar'}</button></form>` : ''}</li>`;
    }).join('') || '<li class="muted">Ningún incidente con ese filtro.</li>';
  }
  const draw = () => { banner(); comps(); history(); };

  el.addEventListener('click', e => {
    const r = e.target.closest('[data-r]'); if (r) { range = +r.dataset.r; comps(); return; }
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter && filter !== f.dataset.filter ? f.dataset.filter : null; comps(); history(); return; }
    const s = e.target.closest('[data-sev]'); if (s) { sevF = s.dataset.sev || null; history(); return; }
    const d = e.target.closest('.st-day'); if (d) { const info = dayInfo(d.dataset.c, +d.dataset.d); if (info.list && info.list[0]) { filter = null; sevF = null; history(); const t = document.getElementById('st-' + info.list[0].id); t && t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); t && t.classList.add('is-flash'); setTimeout(() => t && t.classList.remove('is-flash'), 1300); } }
  });
  const showTip = d => {
    const info = dayInfo(d.dataset.c, +d.dataset.d);
    tip.innerHTML = `<b>${esc(fmtLong(info.t0))}</b>${info.none ? '<span>sin datos: el componente se monitorea desde después</span>' : `<span>${(info.up * 100).toFixed(2)} % disponible</span>${info.list.length ? info.list.map(i => `<span class="${i.sev === 'major' ? 'danger' : 'warn'}">${i.sev === 'major' ? '✕' : '!'} ${esc(i.title)}</span>`).join('') : '<span>sin incidentes</span>'}`}`;
    tip.hidden = false; const er = el.getBoundingClientRect(), r = d.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(er.width - w, r.left - er.left + r.width / 2 - w / 2)) + 'px'; tip.style.top = (r.bottom - er.top + 8) + 'px';
  };
  el.addEventListener('pointerover', e => { const d = e.target.closest('.st-day'); if (d) showTip(d); else if (!e.target.closest('.st-tip')) tip.hidden = true; });
  el.addEventListener('focusin', e => { const d = e.target.closest('.st-day'); if (d) showTip(d); else tip.hidden = true; });
  el.addEventListener('pointerleave', () => { tip.hidden = true; });
  // Las barras de un componente son un solo alto del tabulador: las flechas recorren los días.
  el.addEventListener('keydown', e => {
    const d = e.target.closest('.st-day'); if (!d || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault();
    const all = [...d.parentElement.children], i = all.indexOf(d), n = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    all.forEach((b, k) => { b.tabIndex = k === n ? 0 : -1; }); all[n].focus();
  });
  $('.st-new').addEventListener('submit', e => {
    e.preventDefault(); const f = e.currentTarget.elements;
    const i = { id: 'sim' + (++seq), sim: true, title: f.title.value.trim() || 'Incidente', comp: [f.comp.value], sev: f.sev.value, updates: [['investigando', Date.now(), f.msg.value.trim() || 'Estamos revisando el reporte.']] };
    incidents.push(i); filter = null; sevF = null; draw();
    document.getElementById('st-' + i.id)?.querySelector('input')?.focus({ preventScroll: false });
  });
  el.addEventListener('submit', e => {
    const f = e.target.closest('.st-step'); if (!f) return; e.preventDefault();
    const i = incidents.find(x => x.id === f.dataset.id), last = i.updates[i.updates.length - 1][0], k = STAGES.findIndex(s => s[0] === last);
    i.updates.push([STAGES[Math.min(k + 1, 3)][0], Math.max(Date.now(), i.updates[i.updates.length - 1][1] + 1000), f.elements.msg.value.trim()]);
    draw(); document.getElementById('st-' + i.id)?.querySelector('input')?.focus({ preventScroll: true });
  });
  maint(); draw();
  // La barra de hoy y lo «abierto hace…» avanzan solos.
  setInterval(() => { if (incidents.some(open)) draw(); else banner(); }, 60000);
}
