// ══════════════════════════════════════════════════════
// §3 · Osciloscopio con persistencia de fósforo: cada cuadro oscurece el
// anterior en vez de borrarlo, así la traza deja estela.
// Perillas TIME/DIV y VOLTS/DIV (anime.js 4.5, MIT): se giran arrastrando
// (vertical u horizontal) con inercia y al soltar caen con resorte en la
// marca más cercana de la serie 1-2-5, como un osciloscopio real. Con
// teclado: flechas, Inicio y Fin. La traza responde en vivo.
// ══════════════════════════════════════════════════════
import { animate, spring, utils } from 'animejs';
import { $, cssVar, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

const KNOBS = {
  time: { steps: [0.5, 1, 2, 5, 10, 20], init: 3, fmt: v => (v < 1 ? `${Math.round(v * 1000)} µs` : `${+v.toFixed(v < 2 ? 1 : 0)} ms`), say: v => (v < 1 ? `${Math.round(v * 1000)} microsegundos` : `${+v.toFixed(1)} milisegundos`) + ' por división' },
  volts: { steps: [0.2, 0.5, 1, 2, 5], init: 2, fmt: v => `${+v.toFixed(v < 1 ? 2 : 1)} V`, say: v => `${+v.toFixed(2)} volts por división` }
};
const SWEEP = 270, PX_PER_STEP = 46;
// valor continuo entre marcas (interpolación logarítmica: la serie 1-2-5 es geométrica)
const valueAt = (steps, pos) => { const i = Math.max(0, Math.min(steps.length - 2, Math.floor(pos))), f = pos - i; return steps[i] * (steps[i + 1] / steps[i]) ** f; };

export function mount() {
  const canvas = $('#fg-scope'); if (!canvas) return;
  const ctx = canvas.getContext('2d'), cap = $('.fg-scope-cap');
  let W = 1, H = 1, dpr = 1, cols = [], bg = '', grid = '';
  const knobVal = { time: 5, volts: 1 };
  const size = () => { const r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; };
  const colors = () => { cols = (isLight ? ['--signal', '--core', '--interrupt'] : ['--slag', '--lava', '--interrupt']).map(cssVar); bg = cssVar('--black'); grid = cssVar('--border'); };
  const CH = [{ f: 6, a: 0.13, o: 0 }, { f: 9.5, a: 0.1, o: 1.8 }, { f: 4, a: 0.15, o: 3.5 }];
  const draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = reduceMotion.matches ? 1 : 0.35; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 10; i++) { const x = W * i / 10; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let i = 1; i < 8; i++) { const y = H * i / 8; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const s = (reduceMotion.matches ? 2000 : t) * 0.0016, tk = knobVal.time / 5, vk = 1 / knobVal.volts;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    CH.forEach((c, k) => {
      const cy = H * (0.22 + k * 0.28);
      ctx.strokeStyle = cols[k]; ctx.lineWidth = 1.6; ctx.shadowColor = cols[k]; ctx.shadowBlur = 8; ctx.beginPath();
      for (let x = 0; x <= W; x += 2) { const ph = x / W * Math.PI * c.f * tk + s + c.o, y = cy + (Math.sin(ph) + Math.sin(ph * 2.1 + c.o) * 0.25) * c.a * H * vk; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.restore();
  };
  size(); colors();
  const loop = makeLoop(canvas, draw, 30);
  new ResizeObserver(() => { size(); loop.still(); }).observe(canvas);
  onTheme(() => { colors(); loop.still(); });

  // ── Perillas
  const caption = () => { if (cap) cap.textContent = `CH1 señal · CH2 núcleo · CH3 interrupción · ${KNOBS.time.fmt(knobVal.time)}/div · ${KNOBS.volts.fmt(knobVal.volts)}/div`; };
  document.querySelectorAll('.fg-knob').forEach(el => {
    const K = KNOBS[el.dataset.k], n = K.steps.length, dial = el.querySelector('.fg-knob-dial'), capEl = el.querySelector('.fg-knob-cap'), out = el.querySelector('.fg-knob-val');
    // marcas de la escala alrededor de la perilla
    K.steps.forEach((_, i) => { const m = document.createElement('span'); m.className = 'fg-knob-tick'; m.style.transform = `rotate(${-SWEEP / 2 + SWEEP * i / (n - 1)}deg)`; dial.appendChild(m); });
    const st = { pos: K.init };
    let anim = null;
    const apply = () => {
      const v = valueAt(K.steps, st.pos); knobVal[el.dataset.k] = v;
      utils.set(capEl, { rotate: -SWEEP / 2 + SWEEP * st.pos / (n - 1) });
      out.textContent = K.fmt(v);
      el.setAttribute('aria-valuenow', String(Math.round(st.pos))); el.setAttribute('aria-valuetext', K.say(K.steps[Math.round(st.pos)]));
      caption(); loop.still();
    };
    const settle = (to, vel = 0) => {
      to = utils.clamp(Math.round(to), 0, n - 1);
      if (anim) anim.cancel();
      if (reduceMotion.matches) { st.pos = to; apply(); return; }
      anim = animate(st, { pos: to, ease: spring({ bounce: 0.42, duration: 480, velocity: vel }), onUpdate: apply });
    };
    el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', String(n - 1));
    let drag = null;
    el.addEventListener('pointerdown', e => {
      if (anim) anim.cancel();
      drag = { x: e.clientX, y: e.clientY, p: st.pos, vt: performance.now(), vp: st.pos, vel: 0 };
      el.setPointerCapture(e.pointerId); el.classList.add('is-grabbed'); e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      // arriba o a la derecha sube el valor
      st.pos = utils.clamp(drag.p + ((e.clientX - drag.x) - (e.clientY - drag.y)) / PX_PER_STEP, 0, n - 1);
      const now = performance.now(), dt = Math.max(8, now - drag.vt);
      drag.vel = drag.vel * 0.6 + ((st.pos - drag.vp) / dt * 1000) * 0.4; drag.vt = now; drag.vp = st.pos;
      apply();
    });
    const release = () => {
      if (!drag) return;
      el.classList.remove('is-grabbed');
      // inercia: la perilla sigue un poco en la dirección del giro antes de caer en su marca
      settle(st.pos + utils.clamp(drag.vel * 0.18, -2, 2), drag.vel * 0.4); drag = null;
    };
    el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
    el.addEventListener('keydown', e => {
      const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); settle(Math.round(st.pos) + k); }
      else if (e.key === 'Home') { e.preventDefault(); settle(0); }
      else if (e.key === 'End') { e.preventDefault(); settle(n - 1); }
    });
    apply();
  });
  loop.still();
}
