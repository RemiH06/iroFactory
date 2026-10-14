// ══════════════════════════════════════════════════════
// Neon Sign · fabricante de letreros de neón. Una o dos líneas, la letra
// (Tilt Neon, que es de tubo de verdad, Doto o JetBrains Mono), un color
// por línea, placa de acrílico con tornillos y cables, y un tubo fundido
// que parpadea si se quiere. «Encender» prende las letras una por una
// con su chisporroteo; «Descargar» guarda el PNG. El letrero siempre es
// de noche (un neón no se ve de día), así que usa los neones de modo
// oscuro de sherry aunque la página esté en claro.
//   mount({ el, text: 'sherry\nbuild anything' })
// ══════════════════════════════════════════════════════
import { reduceMotion } from './kit.js';
import { bump } from './stats.js';
import { pulse } from './neon-bloom.js';

// Neones de body (modo oscuro) de sherry.css
const NEON = { magenta: '#FF1466', cyan: '#00F5FF', lime: '#39FF14', violet: '#AC4DFF', electric: '#FFE600', rose: '#FFB3DE', aqua: '#A8EFFF' };
const FONTS = { tilt: ["'Tilt Neon', sans-serif", 'Tilt Neon'], doto: ["'Doto', monospace", 'Doto'], mono: ["'JetBrains Mono', monospace", 'Mono'] };
const W = 960, H = 440;
// vidrio del tubo apagado: el color muy oscurecido hacia la pared
const glass = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(26 + (v - 26) * 0.2)).join(',')})`; };
const mix = (hex, t) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (250 - v) * t)); return `rgb(${c.join(',')})`; };
const chips = (name, sel) => Object.entries(NEON).map(([k, v]) => `<button type="button" class="sh-ns-sw" data-${name}="${k}" aria-pressed="${k === sel}" aria-label="${k}" style="--sw:${v}"></button>`).join('');

export function mount({ el, text = 'sherry\nbuild anything' }) {
  const root = typeof el === 'string' ? document.querySelector(el) : el;
  if (!root) return;
  const st = { text, font: 'tilt', c1: 'magenta', c2: 'cyan', board: true, broken: true };
  root.innerHTML = `<div class="sh-ns">
      <canvas class="sh-ns-cv" width="${W}" height="${H}" role="img" aria-label="Vista previa del letrero"></canvas>
      <div class="sh-ns-ctl">
        <label class="sh-tool-field sh-ns-txt">texto <textarea rows="2" maxlength="48" spellcheck="false" aria-label="Texto del letrero, una o dos líneas"></textarea></label>
        <div class="sh-tool-bar"><span class="sh-seg" role="radiogroup" aria-label="Letra">${Object.entries(FONTS).map(([k, [, l]]) => `<button type="button" role="radio" data-font="${k}">${l}</button>`).join('')}</span>
          <button type="button" class="sh-chip" data-tog="board" aria-pressed="true">placa</button><button type="button" class="sh-chip" data-tog="broken" aria-pressed="true">tubo fundido</button></div>
        <div class="sh-ns-row"><span class="sh-tool-cap">línea 1</span>${chips('c1', st.c1)}</div>
        <div class="sh-ns-row"><span class="sh-tool-cap">línea 2</span>${chips('c2', st.c2)}</div>
        <div class="sh-tool-bar"><button type="button" class="sh-chip sh-ns-on">encender</button><button type="button" class="sh-chip sh-ns-off">apagar</button><button type="button" class="sh-chip sh-ns-png">descargar PNG</button><span class="sh-tool-status" role="status"></span></div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s), cv = $('canvas'), ctx = cv.getContext('2d'), ta = $('textarea'), status = $('.sh-tool-status');
  ta.value = st.text;

  // brillo por letra (0 apagada, 1 encendida); el tubo fundido es una letra al azar
  let lit = [], broken = -1, raf = 0, visible = false, igniteT0 = 0, on = true;
  const lines = () => st.text.split('\n').slice(0, 2).map(s => s.trim()).filter(Boolean);
  const letters = () => lines().join('').replace(/\s/g, '').length;
  const reset = (v = 1) => { lit = Array(letters()).fill(v); broken = st.broken && lit.length ? Math.floor(Math.random() * lit.length) : -1; };

  function draw(t = performance.now()) {
    ctx.clearRect(0, 0, W, H);
    // pared
    ctx.fillStyle = '#0B0B0E'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(250,250,250,.025)';
    for (let y = 0, r = 0; y < H; y += 28, r++) for (let x = (r % 2) * -40; x < W; x += 80) ctx.fillRect(x + 1, y + 1, 78, 26);
    const ls = lines();
    if (!ls.length) return;
    const fam = FONTS[st.font][0];
    // tamaño: que quepa a lo ancho
    const sizes = ls.map((s, i) => { let fs = i === 0 ? 150 : 74; ctx.font = `700 ${fs}px ${fam}`; const w = ctx.measureText(s).width; return Math.min(fs, fs * (W - 140) / Math.max(w, 1)); });
    const gap = 18, totalH = sizes.reduce((a, b) => a + b, 0) + gap * (ls.length - 1);
    let y = (H - totalH) / 2;
    const boxes = ls.map((s, i) => { ctx.font = `700 ${sizes[i]}px ${fam}`; const w = ctx.measureText(s).width; const b = { s, x: (W - w) / 2, y: y + sizes[i] * 0.82, w, fs: sizes[i] }; y += sizes[i] + gap; return b; });
    if (st.board) {
      const bx = Math.min(...boxes.map(b => b.x)) - 36, bw = Math.max(...boxes.map(b => b.w)) + 72, by = (H - totalH) / 2 - 28, bh = totalH + 56;
      ctx.strokeStyle = 'rgba(250,250,250,.35)'; ctx.lineWidth = 1.5;
      [[bx + 40, 0], [bx + bw - 40, 0]].forEach(([x]) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x, by * 0.6, x + 6, by * 0.8, x, by + 8); ctx.stroke(); });
      ctx.fillStyle = 'rgba(250,250,250,.05)'; ctx.strokeStyle = 'rgba(250,250,250,.16)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(250,250,250,.4)';
      [[bx + 14, by + 14], [bx + bw - 14, by + 14], [bx + 14, by + bh - 14], [bx + bw - 14, by + bh - 14]].forEach(([x, yy]) => { ctx.beginPath(); ctx.arc(x, yy, 4, 0, 7); ctx.fill(); });
    }
    let k = 0;
    boxes.forEach((b, i) => {
      const hex = NEON[i === 0 ? st.c1 : st.c2];
      ctx.font = `700 ${b.fs}px ${fam}`;
      ctx.textBaseline = 'alphabetic';
      let x = b.x;
      for (const ch of b.s) {
        const adv = ctx.measureText(ch).width;
        if (ch.trim()) {
          let a = lit[k] ?? 1;
          if (k === broken && on && !reduceMotion.matches) a *= (Math.sin(t / 37) + Math.sin(t / 91) > 0.9 || Math.random() < 0.08) ? 0.15 : 1;
          else if (k === broken && on) a *= 0.35;
          // tubo apagado (vidrio) debajo de todo
          ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.fillStyle = glass(hex);
          ctx.fillText(ch, x, b.y);
          if (a > 0.02) {
            ctx.globalAlpha = a;
            ctx.shadowColor = hex;
            ctx.shadowBlur = 42; ctx.fillStyle = hex; ctx.fillText(ch, x, b.y);
            ctx.shadowBlur = 16; ctx.fillText(ch, x, b.y);
            ctx.shadowBlur = 4; ctx.fillStyle = mix(hex, 0.6); ctx.fillText(ch, x, b.y);
          }
          k++;
        }
        x += adv;
      }
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  // Encender: cada letra arranca con su chisporroteo, en orden
  const loop = t => {
    raf = 0;
    if (igniteT0) {
      const e = (t - igniteT0) / 1000; let done = true;
      lit = lit.map((_, i) => { const s = i * 0.07; if (e < s) { done = false; return 0; } if (e < s + 0.25) { done = false; return Math.random() < 0.55 ? 1 : 0.1; } return 1; });
      if (done) igniteT0 = 0;
    }
    draw(t);
    if (visible && (igniteT0 || (st.broken && on && !reduceMotion.matches))) raf = setTimeout(() => requestAnimationFrame(loop), 45);
  };
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(loop); else if (!visible) draw(); };
  const ignite = () => {
    on = true; reset(0); bump('sign');
    const r = cv.getBoundingClientRect(); pulse(r.left + r.width / 2, r.top + r.height / 2, NEON[st.c1]);
    if (reduceMotion.matches) { lit.fill(1); draw(); return; }
    igniteT0 = performance.now(); kick();
  };
  const paintCtl = () => {
    root.querySelectorAll('[data-font]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.font === st.font)));
    root.querySelectorAll('[data-c1]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c1 === st.c1)));
    root.querySelectorAll('[data-c2]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c2 === st.c2)));
    root.querySelectorAll('[data-tog]').forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.tog])));
    cv.setAttribute('aria-label', `Letrero de neón: ${lines().join(' / ') || 'vacío'}`);
  };
  const change = () => { paintCtl(); if (lit.length !== letters()) reset(on ? 1 : 0); draw(); kick(); };

  ta.addEventListener('input', () => { st.text = ta.value; change(); });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.font) { st.font = b.dataset.font; document.fonts.load(`700 40px ${FONTS[st.font][0]}`).then(draw); }
    else if (b.dataset.c1) st.c1 = b.dataset.c1;
    else if (b.dataset.c2) st.c2 = b.dataset.c2;
    else if (b.dataset.tog) { st[b.dataset.tog] = !st[b.dataset.tog]; if (b.dataset.tog === 'broken') reset(on ? 1 : 0); }
    else if (b.classList.contains('sh-ns-on')) { ignite(); return; }
    else if (b.classList.contains('sh-ns-off')) { on = false; igniteT0 = 0; lit.fill(0); draw(); return; }
    else if (b.classList.contains('sh-ns-png')) {
      draw();
      cv.toBlob(blob => { if (!blob) { status.textContent = 'No se pudo'; return; } const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'letrero-sherry.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); status.textContent = 'Descargado'; bump('sign'); setTimeout(() => { status.textContent = ''; }, 2000); });
      return;
    } else return;
    change();
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(cv);
  reset(1); paintCtl();
  document.fonts.load(`700 40px ${FONTS.tilt[0]}`).finally(() => draw());
  draw();
}
