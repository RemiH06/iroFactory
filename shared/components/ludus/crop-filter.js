// ══════════════════════════════════════════════════════
// Filtro de recorte (riff de Figma de @vdwjulien) sobre el proun:
//  · la imagen entera va en gris con trama de puntos (medio tono),
//  · un recuadro con marcas de corte conserva el color; sigue al cursor
//    (en táctil, al dedo) y si nadie lo toca, deriva solo,
//  · debajo, otra lectura del proun en duotono con grano,
//  · las dos parpadean, cada una con su propio ritmo,
//  · rótulos chicos en mono, como en el riff,
//  · y en las dos imágenes, una marca que parpadea: el logo de iroFactory
//    en un recuadro con marcas de corte y los créditos alrededor, como si
//    fueran los parámetros del recuadro (autor, licencia, componentes…).
//    La marca es monocromática (el color del texto de la imagen) y, en la
//    imagen chica, es solo el sello. El logo es provisional (el abanico de
//    doce varillas con el sello 色) hasta que exista el SVG definitivo.
// La trama y el duotono se hornean una vez por modo (canvas 2D).
// ══════════════════════════════════════════════════════
import { faceColors, hexRgb, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

// ── La marca, en un solo color: abanico (Sensu) de doce varillas y el sello 色
const seal = (x, cx, cy, s, ink, paper) => {
  x.fillStyle = ink; x.fillRect(cx - s / 2, cy - s / 2, s, s);
  x.fillStyle = paper; x.font = `${s * 0.78}px "Shippori Mincho", "Yu Mincho", "MS Mincho", serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('色', cx, cy + s * 0.04);
};
function sensu(x, cx, cy, R, ink, paper) {
  const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92, step = (a1 - a0) / 12;
  x.fillStyle = ink;
  for (let i = 0; i < 12; i++) {
    x.globalAlpha = i % 2 ? 0.62 : 1; // varillas alternas, para leer el pliegue sin otro color
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0 + i * step, a0 + (i + 1) * step - step * 0.08); x.closePath(); x.fill();
  }
  x.globalAlpha = 1;
  x.beginPath(); x.arc(cx, cy, R * 0.34, a0, a1); x.lineTo(cx, cy); x.closePath(); x.fillStyle = paper; x.fill();
  const s = R * 0.42; seal(x, cx, cy - s * 0.12, s, ink, paper);
}
// recuadro con marcas de corte; los créditos van alrededor como parámetros
const CREDITS = [['MARCA', 'IROFACTORY · LUDUS_THEME'], ['AUTOR', 'REMIH06 · MIT'], ['COMPONENTES', 'REACT BITS (DAVID HAZ): SHUFFLE, BUBBLE MENU, CUBES'], ['RIFF', '@VDWJULIEN · RECORTE Y DUOTONO'], ['3D', 'THREE.JS'], ['ANIMACIÓN', 'ANIME.JS']];
function mark(x, X, Y, w, dpr, { ink, paper, line, compact = false, t = 0 }) {
  const h = w * 0.78, m = 9 * dpr, g = 4 * dpr;
  x.save();
  x.fillStyle = paper; x.globalAlpha = 0.86; x.fillRect(X, Y, w, h); x.globalAlpha = 1;
  if (compact) seal(x, X + w / 2, Y + h / 2, h * 0.62, ink, paper); // en chico, solo el sello
  else {
    sensu(x, X + w / 2, Y + h * 0.78, w * 0.4, ink, paper);
    x.fillStyle = ink; x.font = `${10 * dpr}px "Silkscreen", monospace`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('iroFactory', X + w / 2, Y + h - 6 * dpr);
  }
  x.strokeStyle = line; x.lineWidth = 1.2 * dpr; x.beginPath();
  for (const [px, py, sx, sy] of [[X, Y, -1, -1], [X + w, Y, 1, -1], [X, Y + h, -1, 1], [X + w, Y + h, 1, 1]]) {
    x.moveTo(px + sx * g, py); x.lineTo(px + sx * (g + m), py); x.moveTo(px, py + sy * g); x.lineTo(px, py + sy * (g + m));
  }
  x.stroke();
  // parámetros a la izquierda, alineados a la derecha, con su guía hasta el recuadro
  const rows = compact ? CREDITS.filter(([k]) => k === 'MARCA' || k === 'AUTOR' || k === 'COMPONENTES') : CREDITS, lh = (compact ? 11 : 14) * dpr;
  x.font = `${(compact ? 7 : 9) * dpr}px "Silkscreen", monospace`; x.textAlign = 'right'; x.textBaseline = 'middle';
  const y0 = Y + h / 2 - (rows.length - 1) * lh / 2;
  // placa oscura detrás de los parámetros, para que se lean sobre la trama
  const tw = Math.max(...rows.map(([k, v]) => x.measureText(`${k} · ${compact && k === 'COMPONENTES' ? 'REACT BITS' : v}`).width));
  x.fillStyle = ink; x.globalAlpha = 0.82; x.fillRect(X - 22 * dpr - tw, y0 - lh * 0.8, tw + 16 * dpr, rows.length * lh + lh * 0.6); x.globalAlpha = 1;
  rows.forEach(([k, v], i) => {
    const y = y0 + i * lh, tx = X - 16 * dpr, txt = compact && k === 'COMPONENTES' ? 'REACT BITS' : v;
    x.fillStyle = line; x.fillText(`${k} · ${txt}`, tx, y);
    x.globalAlpha = 0.5; x.beginPath(); x.moveTo(tx + 4 * dpr, y); x.lineTo(X - 3 * dpr, y); x.stroke(); x.globalAlpha = 1;
  });
  x.textAlign = 'left'; x.fillStyle = line; x.font = `${(compact ? 7 : 9) * dpr}px "Silkscreen", monospace`;
  if (!compact) x.fillText(`W ${Math.round(w / dpr)} · H ${Math.round(h / dpr)} · ${String(Math.floor(t * 24) % 1000).padStart(3, '0')}`, X, Y + h + 14 * dpr);
  x.restore();
}
// intermitente: se ve un rato, se apaga, y a veces titila al volver
const blink = (t, k = 1) => { const p = (t * k) % 3.2; return p < 2.1 && !(p > 0.05 && p < 0.12) && !(p > 0.2 && p < 0.26); };

export function mount({ canvas = document.getElementById('lx-crop'), duo = document.getElementById('lx-duo'), light, dark }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), face = canvas.closest('.lx-face');
  let img = null, gray = null, duoBase = null, W = 1, H = 1, dpr = 1, box = { x: 0.55, y: 0.35 }, aim = null, t0 = performance.now();
  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
  // gris con trama: luminancia en celdas de 7 px dibujada como puntos
  const bake = () => {
    if (!img) return;
    const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d');
    const s = document.createElement('canvas'), cell = 7 * dpr, cw = Math.ceil(c.width / cell), ch = Math.ceil(c.height / cell); s.width = cw; s.height = ch;
    const sx = s.getContext('2d', { willReadFrequently: true }); sx.drawImage(img, 0, 0, cw, ch); const d = sx.getImageData(0, 0, cw, ch).data;
    const paper = isLight ? '#F3EFE8' : '#16141A', ink = isLight ? '#2A2630' : '#D8D2C8';
    x.fillStyle = paper; x.fillRect(0, 0, c.width, c.height); x.fillStyle = ink;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const k = (j * cw + i) * 4, L = (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255, v = isLight ? 1 - L : L;
      const r = Math.sqrt(v) * cell * 0.62; if (r < 0.3) continue;
      x.beginPath(); x.arc((i + 0.5) * cell, (j + 0.5) * cell, r, 0, Math.PI * 2); x.fill();
    }
    gray = c;
    if (duo) { // duotono con grano
      const dc = duo.getContext('2d', { willReadFrequently: true }), w = duo.width = duo.clientWidth * dpr, h = duo.height = duo.clientHeight * dpr;
      dc.drawImage(img, 0, 0, w, h); const id = dc.getImageData(0, 0, w, h), p = id.data, [a, b] = [hexRgb(faceColors()[5]), hexRgb(faceColors()[2])];
      for (let k = 0; k < p.length; k += 4) { const L = (0.2126 * p[k] + 0.7152 * p[k + 1] + 0.0722 * p[k + 2]) / 255 + (Math.random() - 0.5) * 0.12; for (let q = 0; q < 3; q++) p[k + q] = a[q] + (b[q] - a[q]) * Math.max(0, Math.min(1, L)); }
      dc.putImageData(id, 0, 0);
      duoBase = document.createElement('canvas'); duoBase.width = w; duoBase.height = h; duoBase.getContext('2d').drawImage(duo, 0, 0);
    }
  };
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; /* tamaño de diseño: la cara puede estar girada */ canvas.width = W * dpr; canvas.height = H * dpr; bake(); };
  const draw = now => {
    if (face && !face.matches('.is-current, .is-arriving')) return;
    if (!gray) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // parpadeo propio de la imagen en trama
    ctx.globalAlpha = reduceMotion.matches ? 1 : 0.88 + 0.12 * (Math.sin(t * 7.3) > 0.92 ? 0.2 : 1);
    ctx.drawImage(gray, 0, 0); ctx.globalAlpha = 1;
    // el recuadro deriva o sigue al cursor
    if (!aim && !reduceMotion.matches) { box.x = 0.5 + Math.sin(t * 0.23) * 0.28; box.y = 0.45 + Math.sin(t * 0.31 + 1) * 0.2; }
    else if (aim) { box.x += (aim.x - box.x) * 0.15; box.y += (aim.y - box.y) * 0.15; }
    const bw = Math.min(W * 0.34, 380) * dpr, bh = bw * 0.62, cx = box.x * W * dpr, cy = box.y * H * dpr, x0 = cx - bw / 2, y0 = cy - bh / 2;
    // el color del proun dentro del recuadro (misma escala que la trama)
    const iw = img.naturalWidth / (W * dpr), ih = img.naturalHeight / (H * dpr);
    ctx.drawImage(img, x0 * iw, y0 * ih, bw * iw, bh * ih, x0, y0, bw, bh);
    // marcas de corte
    const m = 14 * dpr, g = 6 * dpr; ctx.strokeStyle = isLight ? '#1E1A22' : '#F2EEE6'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
    for (const [px, py, sx, sy] of [[x0, y0, -1, -1], [x0 + bw, y0, 1, -1], [x0, y0 + bh, -1, 1], [x0 + bw, y0 + bh, 1, 1]]) {
      ctx.moveTo(px + sx * g, py); ctx.lineTo(px + sx * (g + m), py); ctx.moveTo(px, py + sy * g); ctx.lineTo(px, py + sy * (g + m));
    }
    ctx.stroke();
    ctx.font = `${10 * dpr}px "Silkscreen", monospace`; ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText('LIGHT · FOCUS · SHINE', x0, y0 - 10 * dpr); ctx.fillText(`${Math.round(box.x * 100)}.${Math.round(box.y * 100)}`, x0 + bw - 40 * dpr, y0 + bh + 18 * dpr);
    // la marca con los créditos, abajo a la derecha
    const ink = isLight ? '#1E1A22' : '#F2EEE6', paper = isLight ? '#F3EFE8' : '#16141A', still = reduceMotion.matches;
    if (still || blink(t)) { const mw = Math.max(80, Math.min(150, W * 0.2)) * dpr; mark(ctx, W * dpr - mw - 22 * dpr, H * dpr - mw * 0.78 - 34 * dpr, mw, dpr, { ink: paper, paper: ink, line: ink, t, compact: W < 600 }); }
    if (duo && duoBase) {
      const dx = duo.getContext('2d'), dw = duo.width, dh = duo.height; dx.drawImage(duoBase, 0, 0);
      if (still || blink(t + 1.3, 1.1)) { const mw = Math.min(90, dw / dpr * 0.3) * dpr; mark(dx, dw - mw - 12 * dpr, dh - mw * 0.78 - 12 * dpr, mw, dpr, { ink: paper, paper: ink, line: '#F2EEE6', compact: true }); }
      if (!still) duo.style.opacity = Math.sin(t * 2.1) > 0.97 ? 0.55 : 1; // su propio parpadeo
    }
  };
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); aim = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; });
  canvas.addEventListener('pointerleave', () => { aim = null; });
  const loop = makeLoop(canvas, draw, 40);
  const reload = async () => { img = await load(isLight ? light : dark); size(); loop.still(); };
  new ResizeObserver(() => { size(); loop.still(); }).observe(canvas);
  onTheme(reload); reload();
}
