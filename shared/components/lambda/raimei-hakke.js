// ══════════════════════════════════════════════════════
// Raimei Hakke · Magnet Lines (React Bits) con hexagramas. Mismo cálculo
// del original: cada pieza gira al ángulo que la une con el puntero.
// Además, las cercanas se encienden (el trueno de 雷鳴).
// ══════════════════════════════════════════════════════
import { $ } from './kit.js';

export function mount() {
(() => {
  const grid = $('#hakke'); if (!grid) return;
  const items = [...grid.querySelectorAll('svg')];
  let px = 0, py = 0, raf = 0;
  const apply = () => {
    raf = 0;
    items.forEach(it => {
      const r = it.parentElement === grid ? it.getBoundingClientRect() : it.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2, b = px - cx, a = py - cy, c = Math.sqrt(a * a + b * b) || 1;
      const deg = Math.acos(b / c) * 180 / Math.PI * (py > cy ? 1 : -1);
      it.style.setProperty('--rotate', `${deg}deg`);
      it.style.setProperty('--hk-o', (0.42 + 0.58 * Math.max(0, 1 - c / 220)).toFixed(3));
    });
  };
  const onMove = e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
  addEventListener('pointermove', onMove, { passive: true });
  const mid = items[Math.floor(items.length / 2)].getBoundingClientRect();
  px = mid.x; py = mid.y; apply();
})();
}
