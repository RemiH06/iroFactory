// ══════════════════════════════════════════════════════
// Split Flap Text (React Bits) · el tablero de la pista. Mismos tiempos
// del original: volteo de 0.12 s, 0.06 s entre fichas, 8 volteos al azar
// antes de la letra final y 2.4 s entre frases. Cada ficha voltea sus dos
// mitades con CSS; el JS solo cambia las letras. Se detiene fuera de
// pantalla y con reduced motion se queda en «DISCO». Con `once`, voltea una
// sola vez hasta la primera palabra y se queda quieto.
// ══════════════════════════════════════════════════════
import { $, $$, theme, cssVar, hexRgb, rgb01, rgba, onTheme, reduceMotion, makeLoop, glProgram, EASE } from '../../core/core.js';

export function mount(opts = {}) {
  const host = $(opts.el ?? '[data-split-flap]'); if (!host) return; const PALETTE = opts.palette ?? ['--accent'];
  const WORDS = opts.words, WIDTH = Math.max(...WORDS.map(w => w.length));
  const CHARSET = opts.charset ?? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789', FLIP = 120, STAGGER = 60, FLIPS = 8, CYCLE = 2400;
  const pad = w => w.padEnd(WIDTH, ' ').slice(0, WIDTH);
  const ch = c => (c === ' ' ? ' ' : c);
  host.style.setProperty('--sft-dur', FLIP / 1000 + 's');
  const tiles = Array.from({ length: WIDTH }, (_, i) => {
    const t = document.createElement('span'); t.className = 'sft-tile'; t.style.setProperty('--sft-c', `var(${PALETTE[i % PALETTE.length]})`);
    t.innerHTML = '<span class="sft-half sft-top"><span class="sft-char"></span></span><span class="sft-half sft-bottom"><span class="sft-char"></span></span>';
    host.appendChild(t); return t;
  });
  const set = (i, cur, next, flipping) => {
    const t = tiles[i]; t.querySelector('.sft-top .sft-char').textContent = ch(cur); t.querySelector('.sft-bottom .sft-char').textContent = ch(flipping ? next : cur);
    t.querySelectorAll('.sft-flap').forEach(f => f.remove());
    if (flipping) t.insertAdjacentHTML('beforeend', `<span class="sft-flap sft-front"><span class="sft-char">${ch(cur)}</span></span><span class="sft-flap sft-back"><span class="sft-char">${ch(next)}</span></span>`);
  };
  let current = pad(''), raf = 0, timer = 0, idx = 0, visible = true, running = false;
  const show = word => { current = pad(word); [...current].forEach((c, i) => set(i, c, c, false)); };
  const animateTo = word => {
    const target = pad(word), from = current;
    const plans = [...target].map((c, i) => (from[i] === c ? null : { i, from: from[i], seq: [...Array.from({ length: FLIPS }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]), c], start: i * STAGGER, step: -1, done: false })).filter(Boolean);
    if (!plans.length) { current = target; return 0; }
    const t0 = performance.now(); running = true;
    const tick = now => {
      let more = false;
      plans.forEach(p => {
        const local = now - t0 - p.start; if (local < 0) { more = true; return; }
        const s = Math.floor(local / FLIP);
        if (s < p.seq.length) { more = true; if (s !== p.step) { p.step = s; set(p.i, s === 0 ? p.from : p.seq[s - 1], p.seq[s], true); } }
        else if (!p.done) { p.done = true; set(p.i, p.seq[p.seq.length - 1], p.seq[p.seq.length - 1], false); }
      });
      if (more) raf = requestAnimationFrame(tick); else { raf = 0; running = false; current = target; }
    };
    raf = requestAnimationFrame(tick);
    return plans.reduce((m, p) => Math.max(m, p.start + p.seq.length * FLIP), 0);
  };
  const schedule = delay => { if (opts.once) return; clearTimeout(timer); timer = setTimeout(() => { if (!visible || document.hidden) return; idx = (idx + 1) % WORDS.length; schedule(CYCLE + animateTo(WORDS[idx])); }, delay); };
  if (reduceMotion.matches) { show(WORDS[0]); return; }
  show('');
  if (opts.once) { setTimeout(() => animateTo(WORDS[0]), 300); return; }
  schedule(CYCLE + animateTo(WORDS[0]) - CYCLE + 300);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !running) schedule(CYCLE); else if (!visible) clearTimeout(timer); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !running) schedule(CYCLE); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { clearTimeout(timer); cancelAnimationFrame(raf); running = false; show(WORDS[0]); } });
}
