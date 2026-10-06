// ── Título: Tech Text (React Bits, canvas 2D) ─────────────────────
// Port casi literal: letras como sprites (relleno y contorno punteado),
// lente que barre el título sola y sigue al cursor, marco de selección
// con motas, letras arrastrables con resorte. Colores del tema.
import { $, cssVar, onTheme, reduceMotion, rgba } from './kit.js';

export function mount() {
(() => {
  const container = $('#ex-title'), canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d'), scratch = document.createElement('canvas'), scratchCtx = scratch.getContext('2d');
  if (!ctx || !scratchCtx) return;
  const LABEL_FONT = "11px 'Iosevka', monospace", FALLOFF_STEPS = 8, SPRING = 320, DAMPING = 22;
  const approach = (c, t, dt, s) => c + (t - c) * (1 - Math.exp(-dt / s));
  const noise = (...values) => { let h = 2166136261; for (const v of values) { h = Math.imul(h ^ (v | 0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; } return (h >>> 0) / 4294967296; };
  const signed = v => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
  const s = { text: 'elixir', fontFamily: "'Iosevka', monospace", fontWeight: 700, fontSize: 260, letterSpacing: -0.05, color: '', accentColor: '', reach: 200, softness: 0.7, dashLength: 4, dashGap: 2, strokeWidth: 1.5, lineStyle: 'dashed', reveal: 'letter', specks: 15, selection: true, labels: true, draggable: true, sweep: true, speed: 1 };
  const readColors = () => { s.color = cssVar('--text'); s.accentColor = cssVar('--accent'); };
  readColors();
  let width = 1, height = 1, dpr = 1, raf = 0, last = performance.now(), visible = true, layoutKey = '', requestedFont = '', word = null, glyphs = [], presence = 0, clock = 0, pulse = 0, placed = false, dragging = -1;
  const pointer = { x: 0, y: 0, inside: false }, grab = { x: 0, y: 0 }, lens = { x: 0, y: 0 }, frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };
  const fontFor = size => `${s.fontWeight} ${size}px ${s.fontFamily}`;
  const setFont = (t, size) => { t.font = fontFor(size); if ('letterSpacing' in t) t.letterSpacing = `${s.letterSpacing * size}px`; t.textAlign = 'left'; t.textBaseline = 'alphabetic'; };
  const sprite = (view, glyph, stroke) => {
    const pad = Math.ceil(s.strokeWidth * 2 + 4), left = glyph.box.x1 - pad, top = glyph.box.y1 - pad;
    const w = glyph.box.x2 - glyph.box.x1 + pad * 2, h = glyph.box.y2 - glyph.box.y1 + pad * 2;
    const image = document.createElement('canvas'); image.width = Math.max(1, Math.ceil(w * dpr)); image.height = Math.max(1, Math.ceil(h * dpr));
    const c = image.getContext('2d'); if (!c) return { image, left, top };
    c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr); setFont(c, view.size);
    if (stroke) {
      c.lineJoin = 'round'; c.lineWidth = s.strokeWidth * 2; c.lineCap = 'butt'; c.strokeStyle = s.color;
      if (s.lineStyle !== 'solid') c.setLineDash([Math.max(1, s.dashLength), Math.max(1, s.dashGap)]);
      c.strokeText(glyph.char, glyph.x, view.baseline); c.setLineDash([]);
      // Borra el relleno: solo cuenta el alfa, el color da igual.
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = s.color; c.fillText(glyph.char, glyph.x, view.baseline); c.globalCompositeOperation = 'source-over';
    } else { c.fillStyle = s.color; c.fillText(glyph.char, glyph.x, view.baseline); }
    return { image, left, top };
  };
  const ensureLayout = () => {
    const key = [s.text, s.fontFamily, s.fontWeight, s.fontSize, s.letterSpacing, s.color, s.dashLength, s.dashGap, s.strokeWidth, s.lineStyle, width, height, dpr].join('|');
    if (key === layoutKey && word) return word;
    layoutKey = key;
    const wanted = fontFor(64);
    if (document.fonts && wanted !== requestedFont) { requestedFont = wanted; document.fonts.load(wanted, s.text).then(refreshFonts, refreshFonts); }
    const probe = scratchCtx; setFont(probe, s.fontSize);
    let m = probe.measureText(s.text);
    const fit = Math.min(1, (width * 0.96) / Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1), (height * 0.78) / Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, 1));
    const size = s.fontSize * fit; setFont(probe, size); m = probe.measureText(s.text);
    const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    // Alineado a la izquierda (el original centra): el hero es de dos columnas.
    const x = 2 + m.actualBoundingBoxLeft, baseline = (height - inkHeight) / 2 + m.actualBoundingBoxAscent;
    const next = { size, baseline, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight, top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent };
    word = next;
    const previous = glyphs; glyphs = []; let prefix = '';
    Array.from(s.text).forEach((char, i) => {
      prefix += char; const own = probe.measureText(char), gx = x + probe.measureText(prefix).width - own.width;
      if (!char.trim()) return;
      const base = { char, x: gx, box: { x1: gx - own.actualBoundingBoxLeft, y1: baseline - own.actualBoundingBoxAscent, x2: gx + own.actualBoundingBoxRight, y2: baseline + own.actualBoundingBoxDescent } };
      const kept = previous[glyphs.length];
      glyphs.push({ ...base, offset: kept?.char === char ? kept.offset : { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, outline: 0, index: i, fill: sprite(next, base, false), dashes: sprite(next, base, true) });
    });
    dragging = -1; frame.index = -1;
    return next;
  };
  const glyphAt = (x, y) => {
    if (!word || y < word.top - 24 || y > word.bottom + 24) return -1;
    let best = -1, bestD = Infinity;
    glyphs.forEach((g, i) => { const x1 = g.box.x1 + g.offset.x, x2 = g.box.x2 + g.offset.x, d = x < x1 ? x1 - x : x > x2 ? x - x2 : 0; if (d < bestD) { bestD = d; best = i; } });
    return bestD < 28 ? best : -1;
  };
  const falloff = (t, cx, cy, radius, strength, softness) => {
    const inner = Math.min(1, Math.max(0, 1 - softness)), g = t.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(8, 12, 20, ${strength})`);
    for (let i = 0; i <= FALLOFF_STEPS; i++) { const tt = i / FALLOFF_STEPS, e = tt * tt * (3 - 2 * tt); g.addColorStop(inner + (1 - inner) * tt, `rgba(8, 12, 20, ${strength * (1 - e)})`); }
    return g;
  };
  const blit = (t, art, dx, dy, ox, oy) => t.drawImage(art.image, Math.round((art.left + dx) * dpr - ox), Math.round((art.top + dy) * dpr - oy));
  const drawReveal = () => {
    const radius = s.reach * dpr, cx = lens.x * dpr, cy = lens.y * dpr;
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = falloff(ctx, cx, cy, radius, presence, s.softness); ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2); ctx.globalCompositeOperation = 'source-over';
    const x0 = Math.max(0, Math.floor(cx - radius)), y0 = Math.max(0, Math.floor(cy - radius)), x1 = Math.min(canvas.width, Math.ceil(cx + radius)), y1 = Math.min(canvas.height, Math.ceil(cy + radius));
    if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0;
    if (scratch.width < w || scratch.height < h) { scratch.width = Math.max(scratch.width, w); scratch.height = Math.max(scratch.height, h); }
    scratchCtx.setTransform(1, 0, 0, 1, 0, 0); scratchCtx.globalCompositeOperation = 'source-over'; scratchCtx.clearRect(0, 0, w, h);
    for (const g of glyphs) blit(scratchCtx, g.dashes, g.offset.x, g.offset.y, x0, y0);
    scratchCtx.globalCompositeOperation = 'destination-in'; scratchCtx.fillStyle = falloff(scratchCtx, cx - x0, cy - y0, radius, 1, s.softness); scratchCtx.fillRect(0, 0, w, h); scratchCtx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = presence; ctx.drawImage(scratch, 0, 0, w, h, x0, y0, w, h); ctx.globalAlpha = 1;
  };
  const crisp = v => (Math.round(v * dpr) + 0.5) / dpr;
  const perimeterPoint = (distance, w, h) => {
    let d = ((distance % (2 * (w + h))) + 2 * (w + h)) % (2 * (w + h));
    if (d < w) return [frame.x1 + d, frame.y1, 0, -1]; d -= w;
    if (d < h) return [frame.x2, frame.y1 + d, 1, 0]; d -= h;
    if (d < w) return [frame.x2 - d, frame.y2, 0, 1]; d -= w;
    return [frame.x1, frame.y2 - d, -1, 0];
  };
  const drawSpecks = a => {
    const w = frame.x2 - frame.x1, h = frame.y2 - frame.y1; if (w < 2 || h < 2) return;
    const perimeter = 2 * (w + h), seed = frame.index + 1, grid = 3;
    for (let k = 0; k < s.specks; k++) {
      const period = 0.5 + noise(seed, k, 11) * 1.2, t = pulse / period + noise(seed, k, 17), cycle = Math.floor(t), life = t - cycle;
      if (life > 0.7) continue;
      const [px, py, nx, ny] = perimeterPoint(noise(seed, k, cycle) * perimeter, w, h), pick = noise(seed, k, cycle, 2);
      const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11, large = size >= 8;
      const out = (large ? 9 : 4) + Math.floor(noise(seed, k, cycle, 1) * 5) * grid;
      const x = frame.x1 + Math.round((px + nx * out - frame.x1) / grid) * grid, y = frame.y1 + Math.round((py + ny * out - frame.y1) / grid) * grid;
      const tone = noise(seed, k, cycle, 3), blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
      const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink, left = Math.round(x - size / 2), top = Math.round(y - size / 2);
      if (tone < 0.26 || (large && tone < 0.78)) {
        ctx.strokeStyle = rgba(s.accentColor, alpha); ctx.strokeRect(left + 0.5, top + 0.5, size, size);
        if (large && tone > 0.5) { ctx.fillStyle = rgba(s.accentColor, alpha); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
      } else { ctx.fillStyle = rgba(s.accentColor, alpha); ctx.fillRect(left, top, size, size); }
    }
    for (let j = 0; j < 2; j++) {
      const head = (pulse * 0.42 * s.speed + j * 0.5) * perimeter;
      for (let i = 0; i < 4; i++) { const [x, y] = perimeterPoint(head - i * 6, w, h), size = i === 0 ? 3 : 2; ctx.fillStyle = rgba(s.accentColor, a * [0.95, 0.55, 0.32, 0.16][i]); ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size); }
    }
  };
  const drawFrame = () => {
    const g = glyphs[frame.index]; if (!g || frame.alpha < 0.01) return;
    const a = frame.alpha, x1 = crisp(frame.x1), y1 = crisp(frame.y1), x2 = crisp(frame.x2), y2 = crisp(frame.y2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const moved = Math.hypot(g.offset.x, g.offset.y);
    if (moved > 1) {
      const hx = (g.box.x1 + g.box.x2) / 2, hy = (g.box.y1 + g.box.y2) / 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + g.offset.x, hy + g.offset.y); ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(s.accentColor, 0.45 * a); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4); ctx.fillStyle = rgba(s.accentColor, 0.7 * a); ctx.fill();
    }
    ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.lineWidth = 1; ctx.strokeStyle = rgba(s.accentColor, 0.5 * a); ctx.stroke();
    ctx.beginPath(); for (const [cx, cy] of [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
    ctx.fillStyle = rgba(s.accentColor, 0.95 * a); ctx.fill();
    if (s.specks > 0) { ctx.lineWidth = 1; drawSpecks(a); }
    if (!s.labels) return;
    ctx.font = LABEL_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = rgba(s.accentColor, 0.72 * a);
    const label = moved > 1 ? `${signed(Math.round(g.offset.x))}, ${signed(Math.round(-g.offset.y))}` : `${g.char}  ${Math.round(g.box.x2 - g.box.x1)} × ${Math.round(g.box.y2 - g.box.y1)}`;
    ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 7);
  };
  const tick = now => {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const view = ensureLayout();
    const sweeping = s.sweep && !reduceMotion.matches && !pointer.inside && dragging < 0;
    if (sweeping) clock += dt * s.speed;
    pulse += dt;
    let tx = pointer.x, ty = pointer.y;
    if (sweeping) { tx = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45)); ty = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8)); }
    const active = pointer.inside || sweeping || dragging >= 0;
    if (active && !placed) { lens.x = tx; lens.y = ty; }
    if (active) { const lag = pointer.inside ? 0.05 : 0.22; lens.x = approach(lens.x, tx, dt, lag); lens.y = approach(lens.y, ty, dt, lag); }
    placed = active;
    presence = approach(presence, s.reveal === 'area' && active && dragging < 0 ? 1 : 0, dt, 0.16);
    let moving = false;
    glyphs.forEach((g, i) => {
      if (i === dragging) { g.offset.x = approach(g.offset.x, pointer.x - grab.x, dt, 0.03); g.offset.y = approach(g.offset.y, pointer.y - grab.y, dt, 0.03); g.velocity.x = 0; g.velocity.y = 0; moving = true; return; }
      const { offset, velocity } = g;
      if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) { offset.x = offset.y = velocity.x = velocity.y = 0; return; }
      velocity.x += (-SPRING * offset.x - DAMPING * velocity.x) * dt; velocity.y += (-SPRING * offset.y - DAMPING * velocity.y) * dt;
      offset.x += velocity.x * dt; offset.y += velocity.y * dt; moving = true;
    });
    const focus = dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
    if (focus >= 0 && s.selection) {
      const g = glyphs[focus], bx1 = g.box.x1 + g.offset.x - 6, by1 = g.box.y1 + g.offset.y - 6, bx2 = g.box.x2 + g.offset.x + 6, by2 = g.box.y2 + g.offset.y + 6;
      if (frame.index < 0 || frame.alpha < 0.02) { frame.x1 = bx1; frame.y1 = by1; frame.x2 = bx2; frame.y2 = by2; }
      const glide = focus === dragging ? 0.02 : 0.08;
      frame.x1 = approach(frame.x1, bx1, dt, glide); frame.y1 = approach(frame.y1, by1, dt, glide); frame.x2 = approach(frame.x2, bx2, dt, glide); frame.y2 = approach(frame.y2, by2, dt, glide);
      frame.index = focus;
    }
    frame.alpha = approach(frame.alpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);
    glyphs.forEach((g, i) => { const target = s.reveal === 'letter' && i === focus && i !== dragging ? 1 : 0; g.outline = approach(g.outline, target, dt, 0.09); if (Math.abs(g.outline - target) > 0.002) moving = true; else g.outline = target; });
    if (s.draggable) container.style.cursor = dragging >= 0 ? 'grabbing' : focus >= 0 && pointer.inside ? 'grab' : '';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const g of glyphs) { const moved = Math.hypot(g.offset.x, g.offset.y); if (moved > 1) { ctx.globalAlpha = Math.min(1, moved / 24) * 0.55; blit(ctx, g.dashes, 0, 0, 0, 0); ctx.globalAlpha = 1; } }
    for (const g of glyphs) {
      if (g.outline < 0.999) { ctx.globalAlpha = 1 - g.outline; blit(ctx, g.fill, g.offset.x, g.offset.y, 0, 0); }
      if (g.outline > 0.001) { ctx.globalAlpha = g.outline; blit(ctx, g.dashes, g.offset.x, g.offset.y, 0, 0); }
      ctx.globalAlpha = 1;
    }
    if (presence > 0.001) drawReveal();
    drawFrame();
    const settling = moving || Math.abs(presence - (s.reveal === 'area' && active && dragging < 0 ? 1 : 0)) > 0.002 || (frame.alpha > 0.01 && frame.alpha < 0.99);
    if ((active || settling) && visible) raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (raf || !visible) return; last = performance.now(); raf = requestAnimationFrame(tick); };
  const refreshFonts = () => { layoutKey = ''; wake(); };
  const resize = () => { width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight); dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); layoutKey = ''; wake(); };
  const locate = e => { const r = container.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; };
  container.addEventListener('pointermove', e => { locate(e); pointer.inside = true; wake(); }, { passive: true });
  container.addEventListener('pointerenter', e => { locate(e); pointer.inside = true; wake(); }, { passive: true });
  container.addEventListener('pointerleave', () => { if (dragging >= 0) return; pointer.inside = false; wake(); }, { passive: true });
  container.addEventListener('pointerdown', e => {
    locate(e); pointer.inside = true;
    if (s.draggable && (e.pointerType !== 'mouse' || e.button === 0)) { const i = glyphAt(pointer.x, pointer.y); if (i >= 0) { dragging = i; grab.x = pointer.x - glyphs[i].offset.x; grab.y = pointer.y - glyphs[i].offset.y; container.setPointerCapture?.(e.pointerId); } }
    wake();
  }, { passive: true });
  const up = e => {
    if (dragging >= 0) { dragging = -1; container.releasePointerCapture?.(e.pointerId); const r = container.getBoundingClientRect(); pointer.inside = e.pointerType === 'mouse' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
    else if (e.pointerType !== 'mouse') pointer.inside = false;
    wake();
  };
  container.addEventListener('pointerup', up, { passive: true });
  container.addEventListener('pointercancel', up, { passive: true });
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(container);
  if (document.fonts) document.fonts.ready.then(refreshFonts, refreshFonts);
  onTheme(() => { readColors(); layoutKey = ''; wake(); });
  resize();
})();
}
