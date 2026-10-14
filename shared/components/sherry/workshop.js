// ══════════════════════════════════════════════════════
// Workshop · el taller: una protoboard donde se arman las piezas reales
// del tema (las fotos de los componentes). Se arrastra cada pieza a su
// lugar (o se toca la pieza y luego el lugar, que también va con
// teclado). Al soldar una, su pista se enciende, su LED de la barra se
// prende, su paso queda hecho y la bitácora lo anota; si va en otro
// lugar, la pieza tiembla y la bitácora avisa. Con todas, la corriente
// corre por las pistas, los LEDs hacen una persecución, la mascota se
// da un banquete. Lo armado se recuerda; «Desoldar todo» empieza de nuevo.
// Reúsa las piezas de muestrario del tema: step-row para los pasos y
// timeline-item para la bitácora.
//   mount({ el, parts: [{ id, name, img, color, slot: [x, y, w, h], step }] })
// `slot` en % de la placa; la primera pieza es el centro al que llegan las pistas.
// ══════════════════════════════════════════════════════
import { reduceMotion, cssVar } from './kit.js';
import { bump } from './stats.js';
import { pulse } from './neon-bloom.js';
import { addCommand } from './terminal.js';

const KEY = 'sherry:workshop';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hhmm = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function mount({ el, parts = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root || !parts.length) return;
  const hub = parts[0];
  const center = p => [p.slot[0] + p.slot[2] / 2, p.slot[1] + p.slot[3] / 2];
  // pista en escuadra desde cada pieza hasta el borde del centro
  const trace = p => {
    const [x, y] = center(p), [hx, hy] = center(hub), [l, t, w, h] = hub.slot;
    const ex = x < l ? l : x > l + w ? l + w : x, ey = y < t ? t : y > t + h ? t + h : y;
    return Math.abs(x - hx) > Math.abs(y - hy) ? `M${x} ${y} V${hy + (y - hy) * 0.3} H${ex}` : `M${x} ${y} H${hx + (x - hx) * 0.3} V${ey}`;
  };
  root.classList.add('sh-ws');
  root.innerHTML = `
    <div class="sh-ws-leds" aria-hidden="true">${parts.map(p => `<span class="sh-ws-led" data-id="${p.id}" style="--c:var(${p.color})"></span>`).join('')}</div>
    <div class="sh-ws-main">
      <ul class="sh-ws-tray" aria-label="Piezas">${parts.map(p => `<li><button type="button" class="sh-ws-part" data-id="${p.id}" aria-pressed="false" style="--c:var(${p.color})"><img src="${p.img}" alt="" draggable="false"><span>${esc(p.name)}</span></button></li>`).join('')}</ul>
      <div class="sh-ws-board">
        <svg class="sh-ws-traces" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${parts.slice(1).map(p => `<path data-id="${p.id}" d="${trace(p)}" style="--c:var(${p.color})"/>`).join('')}</svg>
        ${parts.map(p => `<button type="button" class="sh-ws-slot" data-id="${p.id}" style="left:${p.slot[0]}%;top:${p.slot[1]}%;width:${p.slot[2]}%;height:${p.slot[3]}%;--c:var(${p.color})" aria-label="Lugar de ${esc(p.name)}"><span>${esc(p.name)}</span></button>`).join('')}
      </div>
    </div>
    <div class="sh-ws-side">
      <div class="sh-ws-steps">${parts.map((p, i) => `<div class="step-row" data-id="${p.id}" style="border-left-color:var(${p.color})"><div class="step-num" style="color:var(${p.color})">${String(i + 1).padStart(2, '0')}</div><div><h4>${esc(p.name)}</h4><p class="muted">${esc(p.step)}</p></div></div>`).join('')}</div>
      <div class="sh-ws-logwrap"><p class="sh-ws-cap">bitácora <button type="button" class="sh-chip sh-ws-reset">desoldar todo</button></p><div class="timeline sh-ws-log" role="log" aria-live="polite"></div></div>
    </div>
    <p class="sh-ws-help muted">Arrastra cada pieza a su lugar en la placa, o tócala y luego toca el lugar.</p>`;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const log = $('.sh-ws-log');
  let placed = new Set();
  try { placed = new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch { placed = new Set(); }
  let selected = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...placed])); } catch { /* sin almacenamiento */ } };

  const note = (dot, title, text) => {
    const it = document.createElement('div');
    it.className = 'timeline-item';
    it.innerHTML = `<div class="timeline-dot ${dot}">${{ done: '✓', warn: '!', info: '▶', danger: '✕', pending: '·' }[dot]}</div><div><h4>${esc(title)}</h4><p class="muted">${esc(text)} · ${hhmm()}</p></div>`;
    log.prepend(it);
    while (log.children.length > 8) log.lastChild.remove();
  };
  const paint = () => {
    parts.forEach(p => {
      const on = placed.has(p.id);
      root.querySelector(`.sh-ws-part[data-id="${p.id}"]`).disabled = on;
      root.querySelector(`.sh-ws-part[data-id="${p.id}"]`).setAttribute('aria-pressed', String(selected === p.id));
      const slot = root.querySelector(`.sh-ws-slot[data-id="${p.id}"]`);
      slot.classList.toggle('is-on', on);
      slot.setAttribute('aria-label', on ? `${p.name}, soldado` : `Lugar de ${p.name}`);
      if (on && !slot.querySelector('img')) slot.insertAdjacentHTML('afterbegin', `<img src="${p.img}" alt="">`);
      if (!on) slot.querySelector('img')?.remove();
      root.querySelector(`.sh-ws-led[data-id="${p.id}"]`).classList.toggle('is-on', on);
      root.querySelector(`.step-row[data-id="${p.id}"]`).classList.toggle('is-done', on);
      const tr = root.querySelector(`path[data-id="${p.id}"]`);
      if (tr) tr.classList.toggle('is-on', on && placed.has(hub.id));
    });
    root.classList.toggle('is-done', placed.size === parts.length);
    root.classList.toggle('is-picking', !!selected);
  };
  const sparkAt = (node, color) => { const r = node.getBoundingClientRect(); pulse(r.left + r.width / 2, r.top + r.height / 2, color); };
  const shakeEl = node => { if (reduceMotion.matches) return; node.classList.remove('is-wrong'); void node.offsetWidth; node.classList.add('is-wrong'); };

  function place(id, slotId) {
    const p = parts.find(q => q.id === id), slot = root.querySelector(`.sh-ws-slot[data-id="${slotId}"]`);
    if (!p || placed.has(id)) return;
    if (id !== slotId) {
      shakeEl(root.querySelector(`.sh-ws-part[data-id="${id}"]`)); shakeEl(slot);
      note('warn', `${p.name} no va ahí`, `ese lugar es para ${parts.find(q => q.id === slotId).name}`);
      dispatchEvent(new CustomEvent('sh:mood', { detail: 'scared' }));
      return;
    }
    placed.add(id); selected = null; save(); paint();
    note('done', `Soldado: ${p.name}`, p.step);
    sparkAt(slot, cssVar(p.color));
    bump('solder');
    if (placed.size === parts.length) finish();
    else if (id === hub.id && placed.size > 1) note('info', 'Pistas con corriente', 'el cerebro ya alimenta lo que estaba puesto');
  }
  function finish() {
    note('done', 'Artefacto ensamblado', 'núcleo operativo, todos los módulos responden');
    dispatchEvent(new CustomEvent('sh:feast'));
    if (reduceMotion.matches) return;
    parts.forEach((p, i) => setTimeout(() => sparkAt(root.querySelector(`.sh-ws-slot[data-id="${p.id}"]`), cssVar(p.color)), 120 * i));
  }

  // ── Tocar: pieza y luego lugar (también con teclado) ──
  $$('.sh-ws-part').forEach(b => b.addEventListener('click', () => { if (dragMoved) return; selected = selected === b.dataset.id ? null : b.dataset.id; paint(); }));
  $$('.sh-ws-slot').forEach(s => s.addEventListener('click', () => {
    if (selected) place(selected, s.dataset.id);
    else if (!placed.has(s.dataset.id)) note('pending', `Falta: ${parts.find(q => q.id === s.dataset.id).name}`, 'elige primero una pieza de la charola');
  }));
  $('.sh-ws-reset').addEventListener('click', () => { placed.clear(); selected = null; save(); paint(); note('danger', 'Desoldado', 'la placa quedó vacía'); });

  // ── Arrastrar ──
  let ghost = null, dragId = null, dragMoved = false, start = null;
  root.addEventListener('pointerdown', e => {
    const b = e.target.closest('.sh-ws-part');
    if (!b || b.disabled || e.button > 0) return;
    dragId = b.dataset.id; dragMoved = false; start = [e.clientX, e.clientY];
    b.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if (!dragId) return;
    if (!dragMoved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) return;
    if (!dragMoved) {
      dragMoved = true;
      ghost = document.createElement('img');
      ghost.className = 'sh-ws-ghost';
      ghost.src = parts.find(p => p.id === dragId).img; ghost.alt = '';
      document.body.appendChild(ghost);
    }
    ghost.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 44}px)`;
    $$('.sh-ws-slot').forEach(s => s.classList.remove('is-hover'));
    document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList?.contains('sh-ws-slot'))?.classList.add('is-hover');
  });
  const end = e => {
    if (!dragId) return;
    const id = dragId; dragId = null;
    $$('.sh-ws-slot').forEach(s => s.classList.remove('is-hover'));
    if (ghost) { ghost.remove(); ghost = null; }
    if (dragMoved) {
      const slot = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList?.contains('sh-ws-slot'));
      if (slot) place(id, slot.dataset.id);
      setTimeout(() => { dragMoved = false; }, 0); // el click que sigue al soltar no selecciona
    }
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  addCommand('solder', { help: 'abre el taller', entry: { group: 'Ir a', label: 'Taller (protoboard)', keys: 'soldar armar circuito protoboard' }, fn: () => { root.closest('.sherry-level')?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); return [`Piezas soldadas: ${placed.size} de ${parts.length}.`]; } });

  paint();
  note('info', placed.size ? `Placa con ${placed.size} de ${parts.length} piezas` : 'Placa vacía', placed.size === parts.length ? 'el artefacto sigue armado' : 'la charola tiene lo que falta');
}
