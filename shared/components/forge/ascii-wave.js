// ══════════════════════════════════════════════════════
// §4 · ASCII con onda (riff de Figma de @quanhoangindex): la imagen se lee
// por celdas, cada luminancia escoge un carácter, y una onda que sube los
// agranda a su paso. Con el cursor se suelta otra onda, circular.
// ══════════════════════════════════════════════════════
import { $, clamp, cssVar, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const host = $('#fg-ascii'); if (!host) return;
  const sec = host.parentElement, canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
  const base = document.createElement('canvas'), bctx = base.getContext('2d');
  const RAMP = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';
  const img = new Image(); img.src = getComputedStyle(host).getPropertyValue('--ascii-img').trim().replace(/^url\((.*)\)$/, '$1');
  let W = 1, H = 1, dpr = 1, cols = 0, rows = 0, cw = 7, ch = 12, lum = null, ink = '', hi = '', bg = '', ring = null;
  const FONT = px => `500 ${px}px 'Azeret Mono', monospace`;
  const charAt = (v, b) => RAMP[clamp(Math.floor((1 - v) * (RAMP.length - 1) - b * 12), 0, RAMP.length - 1)];
  const sample = () => {
    if (!img.complete || !img.naturalWidth || !cols) return;
    const off = document.createElement('canvas'); off.width = cols; off.height = rows; const o = off.getContext('2d');
    const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight), dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    o.drawImage(img, (W - dw) / 2 * cols / W, (H - dh) / 2 * rows / H, dw * cols / W, dh * rows / H);
    const d = o.getImageData(0, 0, cols, rows).data; lum = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) lum[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
    paintBase();
  };
  const paintBase = () => {
    base.width = canvas.width; base.height = canvas.height;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.clearRect(0, 0, W, H);
    if (!lum) return;
    bctx.font = FONT(ch); bctx.textAlign = 'center'; bctx.textBaseline = 'middle'; bctx.fillStyle = ink;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const v = lum[y * cols + x], c = charAt(v, 0); if (c === ' ') continue; bctx.globalAlpha = 0.08 + v * 0.34; bctx.fillText(c, (x + 0.5) * cw, (y + 0.5) * ch); }
    bctx.globalAlpha = 1;
  };
  const size = () => { const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ch = clamp(W / 90, 9, 14); cw = ch * 0.62; cols = Math.floor(W / cw); rows = Math.floor(H / ch); sample(); };
  const colors = () => { ink = cssVar(isLight ? '--signal' : '--slag'); hi = cssVar('--white'); bg = cssVar('--black'); paintBase(); };
  const draw = t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(base, 0, 0);
    if (!lum || reduceMotion.matches) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const period = 7000, front = H + 80 - ((t % period) / period) * (H + 200);
    const rr = ring ? (t - ring.t) * 0.4 : -1; if (ring && rr > Math.hypot(W, H)) ring = null;
    const y0 = Math.max(0, Math.floor((front - 80) / ch)), y1 = Math.min(rows - 1, Math.ceil((front + 80) / ch));
    const cells = [];
    for (let y = y0; y <= y1; y++) for (let x = 0; x < cols; x++) cells.push(x, y);
    if (ring) { const ry0 = Math.max(0, Math.floor((ring.y - rr - 60) / ch)), ry1 = Math.min(rows - 1, Math.ceil((ring.y + rr + 60) / ch)); for (let y = ry0; y <= ry1; y++) { if (y >= y0 && y <= y1) continue; for (let x = 0; x < cols; x++) { const d = Math.hypot((x + 0.5) * cw - ring.x, (y + 0.5) * ch - ring.y) - rr; if (Math.abs(d) < 60) cells.push(x, y); } } }
    for (let k = 0; k < cells.length; k += 2) {
      const x = cells[k], y = cells[k + 1], v = lum[y * cols + x], px = (x + 0.5) * cw, py = (y + 0.5) * ch;
      let b = Math.exp(-Math.pow((py - front) / 30, 2));
      if (ring) b = Math.max(b, Math.exp(-Math.pow((Math.hypot(px - ring.x, py - ring.y) - rr) / 24, 2)));
      if (b < 0.06) continue;
      ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(px - cw / 2, py - ch / 2, cw, ch);
      const c = charAt(v, b); if (c === ' ') continue;
      ctx.font = FONT(ch * (1 + b * 0.55)); ctx.fillStyle = b > 0.7 ? hi : ink; ctx.globalAlpha = 0.2 + v * 0.45 + b * 0.25;
      ctx.fillText(c, px, py);
    }
    ctx.globalAlpha = 1;
  };
  const drop = e => { const r = host.getBoundingClientRect(); ring = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
  let lastDrop = 0;
  sec.addEventListener('pointermove', e => { const n = performance.now(); if (e.pointerType === 'mouse' && n - lastDrop > 1600) { lastDrop = n; drop(e); } }, { passive: true });
  sec.addEventListener('pointerdown', drop);
  img.onload = () => { sample(); loop.still(); };
  colors(); size();
  const loop = makeLoop(host, draw, 24);
  new ResizeObserver(() => { size(); loop.still(); }).observe(host);
  onTheme(() => { colors(); loop.still(); });
  if (document.fonts) document.fonts.ready.then(() => { paintBase(); loop.still(); });
})();
}
