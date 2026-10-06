// ══════════════════════════════════════════════════════
// ESCRITORIO · ventanas: se mueven solo desde la barra superior, se
// redimensionan desde las esquinas, varias abiertas a la vez, y se
// descartan arrastrándolas a la papelera, con su botón × o con Escape.
// ══════════════════════════════════════════════════════
import { $, clamp, mobileQ, reduceMotion, toRgba } from './kit.js';
import { Greenhouse } from './greenhouse.js';
import { Paper } from './paper-crumple.js';

export const Desktop = (() => {
  const layer = $('#bw-windows'), trash = $('#bw-trash'), trashCount = $('#bw-trash-count'), library = $('#bw-library');
  const BAR = 38, MENU = 40;
  const open = new Map();
  let z = 10, cascade = 0, discarded = 0;
  const icons = [...document.querySelectorAll('.bw-icons .gi')];
  const front = () => [...open.values()].sort((a, b) => b.z - a.z)[0];

  function place(w) {
    w.el.style.transform = `translate(${Math.round(w.x)}px, ${Math.round(w.y)}px)`;
    w.el.style.width = Math.round(w.w) + 'px'; w.el.style.height = Math.round(w.h) + 'px';
    const bw = Math.max(1, Math.round(w.w)), bh = Math.max(1, Math.round(w.h - BAR));
    if (w.glass.width !== bw || w.glass.height !== bh) { w.glass.width = bw; w.glass.height = bh; }
    paint(w);
  }
  function paint(w) { Greenhouse.blit(w.ctx, w.x, w.y + BAR, w.glass.width, w.glass.height); }
  function paintAll() { open.forEach(paint); }
  function raise(w) {
    w.z = ++z; w.el.style.zIndex = w.z;
    open.forEach(o => o.el.classList.toggle('is-front', o === w));
  }
  function bounds(w) {
    const [W, H] = Greenhouse.size;
    w.x = clamp(w.x, -w.w + 120, W - 120); w.y = clamp(w.y, MENU, H - BAR);
  }
  // En teléfono la ventana termina arriba de la papelera.
  function mobileFit(w) { const [W, H] = Greenhouse.size; w.x = 8; w.y = MENU + 8; w.w = W - 16; w.h = H - MENU - 140; }

  function openWin(id, iconEl) {
    if (open.has(id)) { const w = open.get(id); raise(w); w.el.focus({ preventScroll: true }); return; }
    const doc = document.getElementById('doc-' + id); if (!doc) return;
    const [W, H] = Greenhouse.size;
    const el = document.createElement('section');
    el.className = 'bw-win'; el.tabIndex = -1; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'wt-' + id);
    el.innerHTML = `<div class="bw-win-bar"><span class="bw-win-title" id="wt-${id}">${doc.dataset.title}</span><button class="bw-win-close" aria-label="Enviar ${doc.dataset.title} a la papelera">×</button></div><div class="bw-win-body"><canvas class="bw-win-glass" aria-hidden="true"></canvas><div class="bw-win-tint"></div><div class="bw-win-content"></div></div><span class="bw-rz nw" data-rz="nw"></span><span class="bw-rz ne" data-rz="ne"></span><span class="bw-rz sw" data-rz="sw"></span><span class="bw-rz se" data-rz="se"></span>`;
    el.querySelector('.bw-win-content').appendChild(doc);
    const glass = el.querySelector('.bw-win-glass');
    const w = { id, el, doc, glass, ctx: glass.getContext('2d'), icon: iconEl, z: 0,
      w: Math.min(+doc.dataset.w || 680, W - 140), h: Math.min(+doc.dataset.h || 520, H - MENU - 60), x: 0, y: 0 };
    w.x = clamp(240 + cascade * 34, 230, Math.max(230, W - w.w - 20)); w.y = MENU + 24 + cascade * 30; cascade = (cascade + 1) % 6;
    if (mobileQ.matches) mobileFit(w); else bounds(w);
    layer.appendChild(el); open.set(id, w);
    place(w); raise(w); wire(w);
    iconEl && iconEl.classList.add('is-open');
    Paper.prewarm(w.h / w.w);
    ghKick();
    // Entrada desde el ícono (origen consciente del disparador).
    if (!reduceMotion.matches && iconEl) {
      const ir = iconEl.getBoundingClientRect();
      el.style.transformOrigin = `${ir.left + ir.width / 2 - w.x}px ${ir.top + ir.height / 2 - w.y}px`;
      el.animate([{ opacity: 0, scale: .94 }, { opacity: 1, scale: 1 }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    el.focus({ preventScroll: true });
  }

  function overTrash(x, y) { const r = trash.getBoundingClientRect(); return x >= r.left - 18 && x <= r.right + 18 && y >= r.top - 18 && y <= r.bottom + 30; }
  function wire(w) {
    const { el } = w, bar = el.querySelector('.bw-win-bar');
    el.addEventListener('pointerdown', () => raise(w));
    el.querySelector('.bw-win-close').addEventListener('click', () => discard(w));
    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.bw-win-close') || mobileQ.matches) return;
      e.preventDefault(); bar.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ox = w.x, oy = w.y;
      el.classList.add('is-dragging');
      const move = ev => { w.x = ox + ev.clientX - sx; w.y = oy + ev.clientY - sy; bounds(w); place(w); trash.classList.toggle('is-armed', overTrash(ev.clientX, ev.clientY)); };
      const up = ev => {
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
        el.classList.remove('is-dragging'); trash.classList.remove('is-armed');
        if (ev.type === 'pointerup' && overTrash(ev.clientX, ev.clientY)) discard(w);
      };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    el.querySelectorAll('.bw-rz').forEach(h => h.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId); raise(w);
      const k = h.dataset.rz, sx = e.clientX, sy = e.clientY, o = { x: w.x, y: w.y, w: w.w, h: w.h }, MW = 320, MH = 220;
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (k.includes('e')) w.w = Math.max(MW, o.w + dx);
        if (k.includes('s')) w.h = Math.max(MH, o.h + dy);
        if (k.includes('w')) { w.w = Math.max(MW, o.w - dx); w.x = o.x + o.w - w.w; }
        if (k.includes('n')) { w.h = Math.max(MH, o.h - dy); w.y = Math.max(MENU, o.y + o.h - w.h); if (w.y === MENU) w.h = o.y + o.h - MENU; }
        place(w);
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); Paper.prewarm(w.h / w.w); };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    }));
  }

  // Dibujo aproximado de la ventana para la textura del papel.
  function snapshot(w) {
    const r = w.el.getBoundingClientRect(), c = document.createElement('canvas');
    c.width = Math.round(r.width); c.height = Math.round(r.height);
    const x = c.getContext('2d');
    x.save(); x.beginPath(); x.roundRect(0, 0, c.width, c.height, 10); x.clip();
    // Barra: vidrio sobre el fondo de pantalla desenfocado.
    const wall = $('#bw-wall');
    if (wall.complete && wall.naturalWidth) {
      const [W, H] = Greenhouse.size, s = Math.max(W / wall.naturalWidth, H / wall.naturalHeight), ox = (W - wall.naturalWidth * s) / 2, oy = (H - wall.naturalHeight * s) / 2;
      x.filter = 'blur(14px)'; x.drawImage(wall, (r.left - ox) / s, (r.top - oy) / s, r.width / s, BAR / s, 0, 0, r.width, BAR); x.filter = 'none';
    }
    const bar = w.el.querySelector('.bw-win-bar'), bcs = getComputedStyle(bar);
    x.fillStyle = toRgba(bcs.backgroundColor); x.fillRect(0, 0, c.width, BAR);
    const title = w.el.querySelector('.bw-win-title'), tcs = getComputedStyle(title);
    x.fillStyle = toRgba(tcs.color); x.font = `${tcs.fontStyle} ${tcs.fontWeight} ${tcs.fontSize} ${tcs.fontFamily}`; x.textBaseline = 'middle';
    x.fillText(title.textContent, 16, BAR / 2);
    // Cuerpo: su propio pedazo de invernadero + tinte.
    x.drawImage(w.glass, 0, BAR);
    x.fillStyle = toRgba(getComputedStyle(w.el.querySelector('.bw-win-tint')).backgroundColor); x.fillRect(0, BAR, c.width, c.height - BAR);
    const content = w.el.querySelector('.bw-win-content'), cr = content.getBoundingClientRect();
    x.save(); x.beginPath(); x.rect(0, BAR, c.width, c.height - BAR); x.clip();
    const visible = rr => rr.bottom > cr.top && rr.top < cr.bottom && rr.width > 0;
    content.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el), rr = el.getBoundingClientRect();
      if (!visible(rr)) return;
      const bg = toRgba(cs.backgroundColor);
      if (!/,0\)$/.test(bg)) { x.fillStyle = bg; x.fillRect(rr.left - r.left, rr.top - r.top, rr.width, rr.height); }
      [['Top', 0, 0, rr.width, 'w'], ['Bottom', 0, rr.height, rr.width, 'w'], ['Left', 0, 0, rr.height, 'h'], ['Right', rr.width, 0, rr.height, 'h']].forEach(([side, ox, oy, len, dir]) => {
        const bwid = parseFloat(cs['border' + side + 'Width']); if (!bwid) return;
        x.fillStyle = toRgba(cs['border' + side + 'Color']);
        const px = rr.left - r.left + ox - (side === 'Right' ? bwid : 0), py = rr.top - r.top + oy - (side === 'Bottom' ? bwid : 0);
        dir === 'w' ? x.fillRect(px, py, len, bwid) : x.fillRect(px, py, bwid, len);
      });
    });
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT), range = document.createRange();
    let n;
    while ((n = walker.nextNode())) {
      const txt = n.textContent; if (!txt.trim()) continue;
      const cs = getComputedStyle(n.parentElement);
      x.fillStyle = toRgba(cs.color); x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; x.textBaseline = 'middle';
      const re = /\S+/g; let m;
      while ((m = re.exec(txt))) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const rr = range.getBoundingClientRect(); if (!visible(rr)) continue;
        x.fillText(m[0], rr.left - r.left, rr.top - r.top + rr.height / 2);
      }
    }
    x.restore();
    x.restore();
    return c;
  }

  function finish(w) {
    w.el.remove(); library.appendChild(w.doc); open.delete(w.id);
    w.icon && w.icon.classList.remove('is-open');
    discarded++; trashCount.textContent = discarded; trashCount.hidden = false;
    trash.classList.remove('is-bump'); void trash.offsetWidth; trash.classList.add('is-bump');
    const f = front(); if (f) { raise(f); } else if (w.icon) w.icon.focus({ preventScroll: true });
    if (!open.size) ghKick();
  }
  function discard(w) {
    if (w.leaving) return; w.leaving = true;
    const tr = trash.getBoundingClientRect(), target = { x: tr.left + tr.width / 2, y: tr.top + 32 };
    const rect = w.el.getBoundingClientRect();
    if (reduceMotion.matches) {
      w.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).onfinish = () => finish(w);
      return;
    }
    Paper.whenReady(rect.height / rect.width, () => {
    let ok = false;
    try { const snap = snapshot(w); ok = Paper.play({ snapshot: snap, rect, target, onDone: () => {} }); if (ok) { w.el.style.visibility = 'hidden'; setTimeout(() => finish(w), 900); } } catch (err) { ok = false; }
    if (!ok) {
      // Sin WebGL: la ventana se encoge hacia la papelera.
      const dx = target.x - (rect.left + rect.width / 2), dy = target.y - (rect.top + rect.height / 2);
      w.el.style.transformOrigin = 'center';
      w.el.animate([{ translate: '0 0', scale: 1, opacity: 1 }, { translate: `${dx}px ${dy}px`, scale: .06, opacity: .2 }], { duration: 420, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' }).onfinish = () => finish(w);
    }
    });
  }

  icons.forEach(ic => ic.addEventListener('click', () => openWin(ic.dataset.win, ic)));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !document.body.classList.contains('mode-desktop')) return;
    const winEl = document.activeElement && document.activeElement.closest('.bw-win');
    const w = winEl ? [...open.values()].find(o => o.el === winEl) : null;
    if (w) { e.preventDefault(); discard(w); }
  });
  window.addEventListener('resize', () => open.forEach(w => { if (mobileQ.matches) mobileFit(w); else bounds(w); place(w); }));
  return { paintAll, get count() { return open.size; } };
})();
// ── Un solo loop para invernadero + ventanas, vivo solo si algo lo muestra.
export let ghRaf = 0;
export const heroVisible = () => !document.body.classList.contains('mode-desktop') || document.body.classList.contains('is-switching');
export function ghTick(t) {
  ghRaf = 0;
  Greenhouse.frame(t);
  Desktop.paintAll();
  if (!reduceMotion.matches && (heroVisible() || Desktop.count)) ghRaf = requestAnimationFrame(ghTick);
}
export function ghKick() { if (!ghRaf) ghRaf = requestAnimationFrame(ghTick); }
