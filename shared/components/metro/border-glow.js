// ══════════════════════════════════════════════════════
// BORDER GLOW (React Bits) · el JS del original solo calcula dos
// valores por tarjeta: cercanía al borde (0-100, relación entre la
// distancia del cursor al centro y la mitad del lado) y ángulo del
// cursor alrededor del centro. Todo lo demás es CSS (.mg). Un solo
// listener delegado en vez de uno por tarjeta.
// ══════════════════════════════════════════════════════

export function initBorderGlow() {
  const SEL = '.callout, .card, .metric, .step-row, .timeline-item';
  document.querySelectorAll(SEL).forEach(el => {
    el.classList.add('mg');
    const edge = document.createElement('span');
    edge.className = 'mg-edge';
    edge.setAttribute('aria-hidden', 'true');
    el.prepend(edge);
  });
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.mg');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const cx = r.width / 2, cy = r.height / 2, dx = x - cx, dy = y - cy;
    const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity, ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    const edgeP = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let deg = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    card.style.setProperty('--edge-proximity', (edgeP * 100).toFixed(3));
    card.style.setProperty('--cursor-angle', deg.toFixed(3) + 'deg');
  }, { passive: true });
}
