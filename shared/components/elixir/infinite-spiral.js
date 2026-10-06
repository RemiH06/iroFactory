// ── 03 · Infinite Spiral (React Bits) con las radiografías ─────────
// Las 4 especies × 3 = 12 tarjetas. Avanza sola, con el scroll de la
// página y arrastrando con el mouse (con el dedo no se captura el
// arrastre: la espiral está en medio de la página y robaría el scroll).
import { $, isDark, onTheme, reduceMotion, rgb01 } from './kit.js';
import { makeLoop } from './palette-labels.js';

export function mount() {
(() => {
  const root = $('#ex-spiral'), stage = root.querySelector('.infinite-spiral__stage');
  const originals = [...stage.children];
  originals.forEach(el => { const img = el.querySelector('img'); img.dataset.dark = img.getAttribute('src'); });
  for (let r = 0; r < 2; r++) originals.forEach(el => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.querySelector('img').alt = ''; stage.appendChild(c); });
  const cards = [...stage.children], nameEl = $('#ex-fish-name');
  const P = { speed: 0.55, radius: 170, cardWidth: 150, cardHeight: 112, verticalSpacing: 60, perspective: 1000, cardsPerTurn: 7, cardTilt: 0, centerScale: 1.2, edgeFade: 0.3, edgeBlur: 6 };
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b), modulo = (v, d) => ((v % d) + d) % d;
  const smoothstep = (a, b, v) => { const x = clamp((v - a) / (b - a || 1), 0, 1); return x * x * (3 - 2 * x); };
  let progress = 0, target = 0, autoSpeed = 0, hovered = false, dragging = false, lastY = 0, lastScroll = window.scrollY, lastT = 0, bounds = root.getBoundingClientRect(), focusIdx = -1;
  const swapImages = () => cards.forEach(c => { const img = c.querySelector('img'); img.src = isDark ? img.dataset.dark : img.dataset.light; });
  const duotone = () => {
    // Oscuro: radiografía normal, negro → --bg y blanco → --train.
    // Claro: radiografía invertida, oscuro → --input y blanco → --bg.
    const bg = rgb01('--bg'), ink = rgb01(isDark ? '--train' : '--input'), [lo, hi] = isDark ? [bg, ink] : [ink, bg];
    ['r', 'g', 'b'].forEach((ch, i) => document.getElementById('ex-duo-' + ch).setAttribute('tableValues', `${lo[i].toFixed(3)} ${hi[i].toFixed(3)}`));
  };
  const draw = time => {
    const delta = lastT ? Math.min((time - lastT) / 1000, 0.05) : 0; lastT = time;
    const desired = !reduceMotion.matches && !dragging && !hovered ? P.speed : 0;
    autoSpeed += (desired - autoSpeed) * (1 - Math.exp(-delta * 7));
    target += autoSpeed * delta;
    progress += (target - progress) * (1 - Math.exp(-delta * (dragging ? 22 : 11)));
    const count = cards.length, half = count / 2, width = Math.max(bounds.width, 1), height = Math.max(bounds.height, 1);
    const fit = Math.min(1, width / (P.cardWidth * 2.8), height / (P.cardHeight * 2.35));
    const rr = Math.min(P.radius, Math.max(72, width * 0.36)) * fit, fadeStart = clamp(1 - P.edgeFade, 0, 0.98), turn = Math.max(P.cardsPerTurn, 1);
    let best = Infinity, bestI = 0;
    cards.forEach((card, index) => {
      let offset = modulo(index - progress + half, count) - half;
      if (Math.abs(offset) < best) { best = Math.abs(offset); bestI = index; }
      const edge = Math.min(Math.abs(offset) / Math.max(half, 1), 1), opacity = 1 - smoothstep(fadeStart, 1, edge);
      const focus = 1 - Math.min(Math.abs(offset) / Math.max(turn * 0.65, 1), 1), scale = (1 + (P.centerScale - 1) * focus) * fit;
      const ang = (offset * (360 / turn)) * Math.PI / 180, x = Math.sin(ang) * rr, z = Math.cos(ang) * rr;
      const depthScale = clamp(P.perspective / Math.max(P.perspective - z, 1), 0.72, 1.45), depth = (z / Math.max(rr, 1) + 1) / 2, blur = P.edgeBlur * smoothstep(0.35, 1, edge);
      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${offset * P.verticalSpacing * fit}px, 0) rotateZ(${P.cardTilt}deg) scale(${scale * depthScale})`;
      card.style.opacity = opacity.toFixed(3); card.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : 'none';
      card.style.zIndex = String(Math.round(depth * 100000) + index);
    });
    const fi = bestI % originals.length;
    if (fi !== focusIdx) { focusIdx = fi; const c = originals[fi]; nameEl.innerHTML = `<i>${c.dataset.name}</i> · ${c.dataset.common}`; }
  };
  const loop = makeLoop(root, draw);
  root.addEventListener('mouseenter', () => { hovered = true; });
  root.addEventListener('mouseleave', () => { hovered = false; });
  root.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; dragging = true; lastY = e.clientY; target = progress; root.setPointerCapture(e.pointerId); root.style.cursor = 'grabbing'; });
  root.addEventListener('pointermove', e => { if (!dragging) return; const d = e.clientY - lastY; lastY = e.clientY; target -= d / P.verticalSpacing; });
  const stop = e => { if (!dragging) return; dragging = false; if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId); root.style.cursor = 'grab'; };
  root.addEventListener('pointerup', stop); root.addEventListener('pointercancel', stop);
  root.style.cursor = 'grab';
  window.addEventListener('scroll', () => {
    const y = window.scrollY, d = y - lastScroll; lastScroll = y;
    if (reduceMotion.matches || !loop.running || !d) return;
    target += clamp(d / (P.verticalSpacing * 2), -1.5, 1.5);
  }, { passive: true });
  new ResizeObserver(() => { bounds = root.getBoundingClientRect(); loop.still(); }).observe(root);
  onTheme(() => { swapImages(); duotone(); });
  duotone(); loop.still();
})();
}
