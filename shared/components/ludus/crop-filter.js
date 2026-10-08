// ══════════════════════════════════════════════════════
// Filtro de recorte (riff de Figma de @vdwjulien) sobre el proun:
//  · la imagen entera va en gris con trama de puntos (medio tono),
//  · un recuadro con marcas de corte conserva el color; sigue al cursor
//    (en táctil, al dedo) y si nadie lo toca, deriva solo,
//  · debajo, otra lectura del proun en duotono con grano,
//  · las dos parpadean, cada una con su propio ritmo,
//  · rótulos chicos en mono, como en el riff.
// La trama y el duotono se hornean una vez por modo (canvas 2D).
// ══════════════════════════════════════════════════════
import { faceColors, hexRgb, isLight, makeLoop, onTheme, reduceMotion } from './kit.js';

export function mount({ canvas = document.getElementById('lx-crop'), duo = document.getElementById('lx-duo'), light, dark }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), face = canvas.closest('.lx-face');
  let img = null, gray = null, W = 1, H = 1, dpr = 1, box = { x: 0.55, y: 0.35 }, aim = null, t0 = performance.now();
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
    if (duo && !reduceMotion.matches) duo.style.opacity = Math.sin(t * 2.1) > 0.97 ? 0.55 : 1; // su propio parpadeo
  };
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); aim = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; });
  canvas.addEventListener('pointerleave', () => { aim = null; });
  const loop = makeLoop(canvas, draw, 40);
  const reload = async () => { img = await load(isLight ? light : dark); size(); loop.still(); };
  new ResizeObserver(() => { size(); loop.still(); }).observe(canvas);
  onTheme(reload); reload();
}
