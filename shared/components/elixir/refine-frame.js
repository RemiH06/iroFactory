// ── Imagen del hero: Refine Frame (React Bits) ─────────────────────
import { $, cssVar, hexRgb, isDark, onTheme, reduceMotion } from './kit.js';

export function mount() {
(() => {
  const root = $('#ex-refine'), img = root.querySelector('img'), canvas = root.querySelector('.refine-frame__mosaic');
  const chip = root.querySelector('.refine-frame__chip'), label = root.querySelector('.refine-frame__label'), mark = root.querySelector('.refine-frame__mark'), sr = root.querySelector('[role="status"]');
  const STAGES = { queued: { blur: 4, sat: 0.6, scale: 1.04, opacity: 0.55 }, generating: { blur: 1.5, sat: 0.8, scale: 1.02, opacity: 0.85 }, refining: { blur: 0.5, sat: 0.95, scale: 1.005, opacity: 1 }, complete: { blur: 0, sat: 1, scale: 1, opacity: 1 } };
  const TARGET = { queued: 0, generating: 0.5, refining: 0.875, complete: 1 };
  const LEVELS = [48, 32, 20, 12, 8, 5, 3, 2, 1], EDGE = 28, STRIPS = 14, STAGE_MS = 400;
  const LABELS = { queued: 'En cola', generating: 'Generando', refining: 'Refinando', complete: 'Listo' };
  const ACTIVE = new Set(['queued', 'generating', 'refining']);
  const ICON = {
    spin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg>',
    complete: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  };
  img.dataset.dark = img.getAttribute('src');
  const st = { p: 0, raf: 0, last: 0, key: '', w: 0, h: 0, levels: [], glint: null, status: 'complete', mosaic: false };
  let chipTimer = 0, timers = [];
  const build = () => {
    // A pantalla completa, 9 niveles a DPR 2 son cientos de MB: se topan a
    // 1600px de ancho (son bloques; al terminar se ve la <img> real).
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1, 1600 / Math.max(1, rect.width));
    const W = Math.max(1, Math.round(rect.width * dpr)), H = Math.max(1, Math.round(rect.height * dpr)), key = `${img.currentSrc || img.src}|${W}x${H}`;
    if (st.key === key) return dpr;
    st.key = key; st.w = W; st.h = H; canvas.width = W; canvas.height = H;
    const iw = img.naturalWidth, ih = img.naturalHeight, cover = Math.max(W / iw, H / ih), sw = W / cover, sh = H / cover, sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    const glint = canvas.getContext('2d').createLinearGradient(0, 0, W, 0), [r, g, b] = hexRgb(cssVar('--white'));
    for (const [at, a] of [[0, 0], [0.08, 0.1], [0.2, 0.7], [0.32, 1], [0.68, 1], [0.8, 0.7], [0.92, 0.1], [1, 0]]) glint.addColorStop(at, `rgba(${r}, ${g}, ${b}, ${a})`);
    st.glint = glint;
    st.levels = LEVELS.map(block => {
      const bb = block === 1 ? 1 : Math.max(2, Math.round(block * dpr)), full = document.createElement('canvas'); full.width = W; full.height = H;
      const fc = full.getContext('2d');
      if (bb === 1) { fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high'; fc.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); return full; }
      const small = document.createElement('canvas'); small.width = Math.max(1, Math.round(W / bb)); small.height = Math.max(1, Math.round(H / bb));
      const sc = small.getContext('2d'); sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'high'; sc.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
      fc.imageSmoothingEnabled = false; fc.drawImage(small, 0, 0, W, H); return full;
    });
    return dpr;
  };
  const tick = now => {
    if (!img.naturalWidth) { st.raf = 0; return; }
    const dt = Math.min(0.05, st.last ? (now - st.last) / 1000 : 0.016); st.last = now;
    const dpr = build(), n = st.levels.length - 1, target = TARGET[st.status] ?? st.p;
    const rate = reduceMotion.matches ? 1e9 : 1 / (n * (STAGE_MS / 1000)), step = rate * dt;
    if (target < st.p) st.p = target; else if (target - st.p <= step) st.p = target; else st.p += step;
    const ctx = canvas.getContext('2d'), L = st.p * n, i = Math.min(n, Math.floor(L + 1e-6)), frac = L - i;
    ctx.globalAlpha = 1; ctx.drawImage(st.levels[i], 0, 0);
    if (i < n && frac > 0) {
      const edge = EDGE * dpr, front = frac * (st.h + edge) - edge / 2, top = Math.max(0, Math.floor(front - edge / 2));
      if (top > 0) ctx.drawImage(st.levels[i + 1], 0, 0, st.w, top, 0, 0, st.w, top);
      const sh = edge / STRIPS;
      for (let k = 0; k < STRIPS; k++) {
        const y = front - edge / 2 + k * sh; if (y + sh <= 0 || y >= st.h) continue;
        const t = 1 - (k + 0.5) / STRIPS; ctx.globalAlpha = t * t * (3 - 2 * t);
        const y0 = Math.max(0, y), h0 = Math.min(st.h, y + sh) - y0;
        if (h0 > 0) ctx.drawImage(st.levels[i + 1], 0, y0, st.w, h0, 0, y0, st.w, h0);
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion.matches && st.glint && front > 0 && front < st.h) {
        ctx.fillStyle = st.glint; ctx.globalAlpha = 0.12; ctx.fillRect(0, front - 2 * dpr, st.w, 4 * dpr); ctx.globalAlpha = 0.3; ctx.fillRect(0, front - dpr, st.w, 2 * dpr); ctx.globalAlpha = 1;
      }
    }
    root.toggleAttribute('data-resolved', st.mosaic && st.p >= 1);
    const keep = (!reduceMotion.matches && ACTIVE.has(st.status)) || Math.abs(target - st.p) > 0.0005;
    st.raf = keep ? requestAnimationFrame(tick) : 0; if (!keep) st.last = 0;
  };
  const wake = () => { if (!st.raf) st.raf = requestAnimationFrame(tick); };
  const setStatus = status => {
    st.status = status; const g = STAGES[status], active = ACTIVE.has(status);
    root.dataset.status = status; root.toggleAttribute('data-active', active); root.toggleAttribute('data-sweep', active);
    root.style.setProperty('--rf-blur', `${st.mosaic ? 0 : g.blur}px`); root.style.setProperty('--rf-sat', g.sat);
    root.style.setProperty('--rf-scale', st.mosaic ? 1 : g.scale); root.style.setProperty('--rf-opacity', g.opacity);
    label.textContent = LABELS[status]; label.style.animation = 'none'; void label.offsetWidth; label.style.animation = '';
    mark.dataset.kind = active ? 'spin' : status; mark.innerHTML = active ? ICON.spin : ICON.complete;
    sr.textContent = LABELS[status]; root.setAttribute('aria-label', `Imagen del tema · ${LABELS[status]}`);
    clearTimeout(chipTimer); chip.hidden = false;
    if (status === 'complete') chipTimer = setTimeout(() => { chip.hidden = true; }, 1200);
    wake();
  };
  const play = steps => { timers.forEach(clearTimeout); timers = steps.map(([ms, s]) => setTimeout(() => setStatus(s), reduceMotion.matches ? 0 : ms)); };
  const startMosaic = () => { st.mosaic = true; root.setAttribute('data-mosaic', ''); st.key = ''; };
  const intro = () => {
    startMosaic(); st.p = 0;
    if (reduceMotion.matches) { setStatus('complete'); return; }
    setStatus('queued'); play([[500, 'generating'], [2200, 'refining'], [3400, 'complete']]);
  };
  if (img.complete && img.naturalWidth) intro(); else img.addEventListener('load', intro, { once: true });
  onTheme(() => {
    const next = isDark ? img.dataset.dark : img.dataset.light;
    if (img.getAttribute('src') === next) return;
    img.addEventListener('load', () => { st.key = ''; setStatus('refining'); play([[900, 'complete']]); }, { once: true });
    img.src = next;
  });
  new ResizeObserver(() => { st.key = ''; if (img.naturalWidth) { st.p = Math.min(st.p, 0.999); wake(); } }).observe(root);
})();
}
