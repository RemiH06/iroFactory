// ══════════════════════════════════════════════════════
// mirai · spot: el animatic del spot de la campaña (16:9, 15 s a 24 cuadros).
// El scroll es el cabezal: mientras la sección cruza la pantalla, el cuadro
// se queda fijo y la película avanza. La lámpara de Mado está cerrada como
// un botón de flor; se abre pétalo por pétalo, se enciende, y al alejarse la
// cámara resulta ser una ventana entre muchas. El último plano es el titular.
// Una sola función dibuja cualquier instante (`scene`), así que el cuadro
// grande, las miniaturas del guion y el modo urushi salen del mismo dibujo:
// en urushi la escena se pinta chica en un lienzo aparte y cada celda
// encendida se vuelve un punto de la matriz.
// El guion técnico es una tabla en el HTML (sirve sin JS): de ahí se leen
// los planos (`data-t0`, `data-t1`) y sus textos.
//   mount({ el: '#mi-spot', state: () => campaña, offset: 56 }) → { update() }
// Teclado: el deslizador mueve el cabezal; «Reproducir» lo corre solo.
// Con reduced motion no hay cuadro fijo ni reproducción: queda el deslizador.
// En pantallas muy bajas (un teléfono acostado) tampoco se fija: no cabría.
// ══════════════════════════════════════════════════════
import { clamp, cssVar, makeLoop, onTheme, reduceMotion, theme } from '../../core/core.js';

const DUR = 15, FPS = 24, TAU = Math.PI * 2;
const ss = (a, b, x) => clamp((x - a) / (b - a), 0, 1);                 // rampa lineal 0..1
const eo = x => 1 - (1 - x) ** 3;                                       // salir rápido y frenar
const eio = x => (x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);  // ir y volver
const lerp = (a, b, t) => a + (b - a) * t;

// ── la escena en el instante t (segundos). `c` trae los colores y `lw` el trazo mínimo ──
function scene(ctx, W, H, t, c, lw = 0) {
  const u = H / 9, line = w => Math.max(w, lw);
  const cap = (len, wid) => { ctx.beginPath(); ctx.roundRect(0, -wid / 2, len, wid, wid / 2); };
  ctx.clearRect(0, 0, W, H);
  if (c.paper) { ctx.fillStyle = c.paper; ctx.fillRect(0, 0, W, H); }
  const paper = c.paper || c.hole;

  // la cámara se aleja entre 10 s y 12.4 s: la flor se encoge hasta ser la ventana de un módulo
  const z = eio(ss(10, 12.4, t)), m = 1.7 * u, gap = .35 * u, cols = 7, rows = 3;
  const gx0 = (W - (cols * m + (cols - 1) * gap)) / 2, gy0 = (H - (rows * m + (rows - 1) * gap)) / 2;
  const tc = 4, tr = 1, tx = gx0 + tc * (m + gap) + m / 2, ty = gy0 + tr * (m + gap) + m / 2;
  const open = ss(3, 7.3, t), rise = eo(open), R = 2.35 * u;
  const cx = lerp(W / 2, tx, z), cy = lerp(lerp(5.3 * u, 4.35 * u, rise), ty, z), sc = lerp(1, (m * .5) / R, z);
  const ground = 1 - ss(10, 10.9, t);

  // suelo y tallo
  if (ground > 0) {
    ctx.globalAlpha = ground; ctx.strokeStyle = c.mass; ctx.lineWidth = line(.05 * u); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1.2 * u, 7.25 * u); ctx.lineTo(W - 1.2 * u, 7.25 * u); ctx.moveTo(W / 2, 7.25 * u); ctx.lineTo(W / 2, cy + .2 * R); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // los demás módulos: ventanas apagadas que llegan desde la más cercana
  const dim = lerp(1, .32, eo(ss(13, 14, t)));
  if (t > 10.6) for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    if (q === tc && r === tr) continue;
    const d = Math.hypot(q - tc, r - tr), a = eo(ss(10.8 + d * .13, 11.9 + d * .13, t)); if (a <= 0) continue;
    const x = gx0 + q * (m + gap) + m / 2, y = gy0 + r * (m + gap) + m / 2, s = m * lerp(.55, 1, a);
    ctx.globalAlpha = a * dim; ctx.fillStyle = c.mass; ctx.beginPath(); ctx.roundRect(x - s / 2, y - s / 2, s, s, s * .25); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(x, y, s * .281, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // la flor: doce cápsulas afuera y seis adentro, todas plegadas hacia arriba mientras es botón
  const fold = 1 - ss(10.3, 12.1, t), turn = (12 * Math.PI / 180) * ss(3, 10, t);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  // el cuerpo del módulo crece alrededor mientras los pétalos se recogen
  const body = eo(ss(10.6, 12.4, t));
  if (body > 0) { const s = (m / sc) * lerp(.4, 1, body); ctx.fillStyle = c.mass; ctx.globalAlpha = body; ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * .25); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.rotate(turn);
  const ring = (n, len0, wid, off, late) => {
    for (let i = 0; i < n; i++) {
      const delta = ((i * 360 / n + off + 180) % 360) - 180, k = Math.abs(delta) / 180;      // qué tan lejos queda de la punta
      const e = eo(clamp((open - late - k * .38) / (.62 - late), 0, 1)), len = R * len0 * lerp(.6, 1, e) * fold;
      if (len < wid * .6) continue;
      ctx.save(); ctx.rotate((-90 + delta * e) * Math.PI / 180);
      ctx.translate(R * .13 * e, 0); cap(len, wid); ctx.fillStyle = c.mass; ctx.fill();
      if (e > .02) { ctx.strokeStyle = paper; ctx.lineWidth = line(R * .035); ctx.stroke(); }                 // separa un pétalo del otro
      if (e > .4 && fold > .5) { ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(len - wid / 2, 0, wid * .26 * ss(.4, .9, e), 0, TAU); ctx.fill(); } // el ojo de la cápsula
      ctx.restore();
    }
  };
  ring(12, 1, R * .3, 0, 0); ring(6, .56, R * .3, 30, .12);
  ctx.rotate(-turn);
  // el centro: papel mientras duerme, tinta cuando enciende
  const lit = eo(ss(7.5, 8.5, t)), r0 = R * lerp(.2, .3, lit) * lerp(1, (m * .281) / (R * .3 * sc), z);
  ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(0, 0, r0 * 1.12, 0, TAU); ctx.fill();
  ctx.fillStyle = c.mass; ctx.beginPath(); ctx.arc(0, 0, r0 * (1 - lit) * .55, 0, TAU); ctx.fill();
  if (lit > 0) { ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(0, 0, r0 * lit, 0, TAU); ctx.fill(); }
  // dos latidos: anillos de tinta que se abren y se apagan
  for (let k = 0; k < 2; k++) { const p = ss(7.9 + k * .75, 9.5 + k * .75, t); if (p > 0 && p < 1) { ctx.globalAlpha = (1 - p) * fold; ctx.strokeStyle = c.ink; ctx.lineWidth = line(R * .03); ctx.beginPath(); ctx.arc(0, 0, R * lerp(.34, 1.55, eo(p)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
  ctx.restore();
}

export function mount({ el = '#mi-spot', state = () => ({ tinta: 'shu', titular: '' }), offset = 56 } = {}) {
  const root = typeof el === 'string' ? document.querySelector(el) : el; if (!root) return null;
  const track = root.querySelector('.sp-track'), stage = root.querySelector('.sp-stage'), canvas = root.querySelector('.sp-canvas'), frameEl = root.querySelector('.sp-frame');
  const rows = [...root.querySelectorAll('[data-t0]')], shots = rows.map(r => ({ t0: +r.dataset.t0, t1: +r.dataset.t1, row: r, accion: r.querySelector('[data-accion]')?.textContent.trim() || '' }));
  const lines = [...root.querySelectorAll('.sp-line')], tcEl = root.querySelector('.sp-tc'), shotEl = root.querySelector('.sp-shot'), range = root.querySelector('.sp-range'), play = root.querySelector('.sp-play'), boards = [...root.querySelectorAll('.sp-board canvas')];
  const ctx = canvas.getContext('2d'), off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, p = 0, drawn = -1, dirty = true, last = 0, playing = false, dragging = false, shotNow = -1, saidTc = '';
  const calm = () => reduceMotion.matches, short = matchMedia('(max-height: 520px)'), pinned = () => root.classList.contains('is-pinned');

  stage.hidden = false; root.classList.add('is-live');
  const live = () => root.classList.toggle('is-pinned', !calm() && !short.matches);
  live(); [reduceMotion, short].forEach(m => m.addEventListener('change', () => { live(); dirty = true; loop.still(); }));
  if (calm()) p = .64; // sin movimiento: el cuadro de la flor encendida, y el deslizador para recorrer

  // en urushi las formas van en la luz tenue del texto secundario: sobre la matriz apagada, la masa de las piezas no se vería
  const colors = () => ({ mass: cssVar(theme.dark ? '--text2' : '--mass'), ink: cssVar('--' + state().tinta) || cssVar('--shu'), paper: cssVar('--bg') });
  // urushi: la escena se dibuja chica con tres colores planos y cada celda se vuelve un punto
  const MATRIX = { mass: '#00ff00', ink: '#ff0000', hole: '#0000ff', paper: null };
  function paint(target, cx, w, h, t, cols) {
    const c = colors();
    if (!theme.dark) return scene(cx, w, h, t, c);
    const rws = Math.round(cols * 9 / 16), pitch = w / cols;
    if (off.width !== cols || off.height !== rws) { off.width = cols; off.height = rws; }
    scene(octx, cols, rws, t, MATRIX, 1.15);
    const d = octx.getImageData(0, 0, cols, rws).data, paths = [new Path2D(), new Path2D(), new Path2D()];
    for (let y = 0; y < rws; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4, k = d[i] > 105 ? 0 : d[i + 1] > 120 ? 1 : d[i + 1] > 34 ? 2 : -1; if (k < 0) continue;
      const px = (x + .5) * pitch, py = (y + .5) * pitch, r = pitch * (k === 2 ? .2 : .34);
      paths[k].moveTo(px + r, py); paths[k].arc(px, py, r, 0, TAU);
    }
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = c.mass; cx.fill(paths[1]); cx.fill(paths[2]); cx.fillStyle = c.ink; cx.fill(paths[0]);
    target.style.setProperty('--pitch', pitch + 'px');
  }
  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; if (!W) return;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true;
    boards.forEach(b => { const w = b.clientWidth, h = b.clientHeight; if (!w) return; b.width = w * dpr; b.height = h * dpr; const bx = b.getContext('2d'); bx.setTransform(dpr, 0, 0, dpr, 0, 0); paint(b.parentElement, bx, w, h, +b.dataset.t, 64); });
  }
  const total = () => Math.max(1, track.offsetHeight - stage.offsetHeight);
  const target = () => clamp((offset - track.getBoundingClientRect().top) / total(), 0, 1);
  const seek = q => scrollTo({ top: track.getBoundingClientRect().top + scrollY - offset + total() * clamp(q, 0, 1), behavior: 'instant' });

  function hud(t) {
    const s = Math.min(DUR - 1 / FPS, t), sec = Math.floor(s), tc = `00:${String(sec).padStart(2, '0')}:${String(Math.floor((s - sec) * FPS)).padStart(2, '0')}`;
    if (tc !== saidTc) tcEl.textContent = saidTc = tc;
    let n = shots.findIndex(sh => t < sh.t1); if (n < 0) n = shots.length - 1;
    if (n !== shotNow) {
      shotNow = n; shotEl.textContent = `plano ${n + 1}/${shots.length}`;
      shots.forEach((sh, k) => { if (k === n) sh.row.setAttribute('aria-current', 'true'); else sh.row.removeAttribute('aria-current'); });
      lines.forEach((l, k) => l.classList.toggle('on', k === n));
      canvas.setAttribute('aria-label', `Spot de la campaña, plano ${n + 1} de ${shots.length}: ${shots[n].accion}`);
    }
    if (!dragging) range.value = Math.round(p * 1000);
  }
  const frame = now => {
    const dt = Math.min(64, now - (last || now)) || 16; last = now;
    if (playing) { const q = Math.min(1, p + dt / (DUR * 1000)); if (q >= 1) stop(); if (pinned()) { seek(q); p = target(); } else p = q; }
    else if (pinned()) { const g = target(); p += (g - p) * (1 - Math.exp(-dt / 105)); if (Math.abs(g - p) < .0004) p = g; } // el cuadro sigue al scroll con inercia
    if (dirty || Math.abs(p - drawn) > .00015) { paint(frameEl, ctx, W, H, p * DUR, W < 520 ? 96 : 144); drawn = p; dirty = false; hud(p * DUR); }
  };
  const loop = makeLoop(stage, frame);
  function stop() { playing = false; play.textContent = 'Reproducir'; play.setAttribute('aria-pressed', 'false'); }
  play.addEventListener('click', () => {
    if (playing) return stop();
    if (p > .985) { if (pinned()) seek(0); p = 0; }
    playing = true; play.textContent = 'Pausa'; play.setAttribute('aria-pressed', 'true'); loop.start();
  });
  // cualquier gesto de scroll le quita el cabezal a la reproducción
  ['wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (playing) stop(); }, { passive: true }));
  addEventListener('keydown', e => { if (playing && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && e.target !== play) stop(); });
  range.addEventListener('pointerdown', () => { dragging = true; }); addEventListener('pointerup', () => { dragging = false; });
  const go = (q, smooth) => { if (playing) stop(); if (!pinned()) { p = q; dirty = true; loop.still(); } else scrollTo({ top: track.getBoundingClientRect().top + scrollY - offset + total() * q, behavior: smooth ? 'smooth' : 'instant' }); };
  range.addEventListener('input', () => go(range.value / 1000));
  rows.forEach((r, k) => r.querySelector('button')?.addEventListener('click', () => go((shots[k].t0 + (shots[k].t1 - shots[k].t0) * .55) / DUR, true)));

  const update = () => { const s = state(), l = lines.at(-1); if (l) l.querySelector('[data-titular]').textContent = s.titular; dirty = true; layout(); loop.still(); };
  onTheme(() => { dirty = true; layout(); loop.still(); });
  new ResizeObserver(() => { layout(); loop.still(); }).observe(canvas);
  update();
  return { update };
}
