// ══════════════════════════════════════════════════════
// Neon Picker · selector de color neón con la regla de la paleta de
// sherry: de noche el neón tal cual sobre el fondo casi negro; de día el
// mismo matiz con la luminosidad bajada hasta pasar AA (4.5:1) sobre el
// fondo claro. Muestra los dos, su contraste WCAG, el token más cercano
// del modo vigente y el CSS listo para copiar (tokens en body y
// body.light, como pide la colección). «Encender» manda el color al fondo
// de triángulos. El plano de color es un atajo de ratón; los tres
// deslizadores son la vía de teclado.
//   mount({ el, darkBg, lightBg, tokens: ['--magenta', …] })
// ══════════════════════════════════════════════════════
import { contrast, hexRgb, cssVar, theme, onTheme } from '../../core/core.js';
import { pulse } from './neon-bloom.js';
import { bump } from './stats.js';

const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
}
// Sin negro ni blanco puros: el color se queda entre 2 % y 98 % de luz.
const L_MIN = 2, L_MAX = 98;

export function mount({ el, darkBg = '#080808', lightBg = '#F5F2EC', tokens = [] }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const st = { h: 341, s: 100, l: 54 }; // el magenta de sherry
  root.innerHTML = `<div class="sh-np">
      <div class="sh-np-pick">
        <canvas class="sh-np-pad" aria-hidden="true"></canvas>
        <div class="sh-np-sliders">
          <label>matiz <input type="range" min="0" max="359" data-k="h" aria-label="Matiz"><output></output></label>
          <label>saturación <input type="range" min="40" max="100" data-k="s" aria-label="Saturación"><output></output></label>
          <label>luz <input type="range" min="35" max="80" data-k="l" aria-label="Luz"><output></output></label>
        </div>
      </div>
      <div class="sh-np-tubes">
        <div class="sh-np-tube is-dark"><span class="sh-np-word">neón</span><small>noche · <b class="sh-np-cd"></b></small></div>
        <div class="sh-np-tube is-light"><span class="sh-np-word">tinta</span><small>día · <b class="sh-np-cl"></b></small></div>
      </div>
      <dl class="sh-np-read">
        <dt>noche</dt><dd class="sh-np-hex"></dd>
        <dt>día</dt><dd class="sh-np-ink"></dd>
        <dt>cercano</dt><dd class="sh-np-near"></dd>
      </dl>
      <div class="sh-np-css"><span class="sh-tool-cap">css <button type="button" class="sh-chip sh-np-copy">copiar</button><button type="button" class="sh-chip sh-np-fire">encender</button></span><pre class="sh-np-code" tabindex="0" aria-label="CSS del color"></pre></div>
    </div>`;
  const $ = s => root.querySelector(s);
  const pad = $('.sh-np-pad'), ctx = pad.getContext('2d');
  const sliders = [...root.querySelectorAll('input[type=range]')];
  let cur = { dark: '#000', light: '#000' };

  const drawPad = () => {
    const w = pad.clientWidth, h = pad.clientHeight;
    if (!w || !h) return;
    pad.width = w; pad.height = h;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const l = 80 - (y / (h - 1)) * 45;
      for (let x = 0; x < w; x++) {
        const c = hslRgb((x / w) * 360, st.s, l), i = (y * w + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const mx = (st.h / 360) * w, my = ((80 - st.l) / 45) * (h - 1);
    ctx.strokeStyle = '#050505'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, 7, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#FAFAFA'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, my, 7, 0, 7); ctx.stroke();
  };
  // Tinta de día: mismo matiz y saturación, bajando la luz hasta 4.5:1.
  const ink = () => {
    const bg = hexRgb(lightBg);
    for (let l = Math.min(st.l, 60); l >= L_MIN; l -= 0.5) { const c = hslRgb(st.h, st.s, l); if (contrast(c, bg) >= 4.5) return c; }
    return hslRgb(st.h, st.s, L_MIN);
  };
  const grade = r => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'no pasa');
  const update = () => {
    st.l = Math.max(L_MIN, Math.min(L_MAX, st.l));
    const d = hslRgb(st.h, st.s, st.l), li = ink();
    cur = { dark: hex(d), light: hex(li) };
    sliders.forEach(s => { s.value = st[s.dataset.k]; s.nextElementSibling.textContent = st[s.dataset.k] + (s.dataset.k === 'h' ? '°' : '%'); });
    root.style.setProperty('--np', cur.dark); root.style.setProperty('--np-ink', cur.light);
    const cd = contrast(d, hexRgb(darkBg)), cl = contrast(li, hexRgb(lightBg));
    $('.sh-np-cd').textContent = `${cd.toFixed(1)}:1 ${grade(cd)}`;
    $('.sh-np-cl').textContent = `${cl.toFixed(1)}:1 ${grade(cl)}`;
    $('.sh-np-hex').textContent = `${cur.dark} · hsl(${st.h} ${st.s}% ${st.l}%)`;
    $('.sh-np-ink').textContent = `${cur.light}`;
    // token más cercano en el modo vigente (distancia RGB con peso perceptual)
    const mine = theme.alt ? li : d;
    const near = tokens.map(t => { const c = hexRgb(cssVar(t)); const dr = c[0] - mine[0], dg = c[1] - mine[1], db = c[2] - mine[2]; return { t, c, dist: Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) }; }).sort((a, b) => a.dist - b.dist)[0];
    $('.sh-np-near').innerHTML = near ? `<span class="sh-np-dot" style="background:${hex(near.c)}"></span>${near.t} <small>(${near.dist < 40 ? 'casi igual' : near.dist < 120 ? 'parecido' : 'lejos'})</small>` : '';
    const [r, g, b] = d.map(Math.round);
    $('.sh-np-code').textContent = `body {\n  --neon: ${cur.dark};\n  --glow-neon: 0 0 8px rgba(${r},${g},${b},.55);\n}\nbody.light {\n  --neon: ${cur.light};\n  --glow-neon: none;\n}`;
    drawPad();
  };

  sliders.forEach(s => s.addEventListener('input', () => { st[s.dataset.k] = +s.value; update(); }));
  const fromPad = e => {
    const r = pad.getBoundingClientRect();
    st.h = Math.round(Math.max(0, Math.min(359, ((e.clientX - r.left) / r.width) * 360)));
    st.l = Math.round(Math.max(35, Math.min(80, 80 - ((e.clientY - r.top) / r.height) * 45)));
    update();
  };
  pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); fromPad(e); });
  pad.addEventListener('pointermove', e => { if (pad.hasPointerCapture(e.pointerId)) fromPad(e); });
  $('.sh-np-copy').addEventListener('click', async e => { try { await navigator.clipboard.writeText($('.sh-np-code').textContent); e.target.textContent = 'copiado'; } catch { e.target.textContent = 'no se pudo'; } setTimeout(() => { e.target.textContent = 'copiar'; }, 1600); });
  $('.sh-np-fire').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); pulse(r.left + r.width / 2, r.top + r.height / 2, theme.alt ? cur.light : cur.dark); bump('neon'); });
  new ResizeObserver(drawPad).observe(pad);
  onTheme(update);
  update();
}
