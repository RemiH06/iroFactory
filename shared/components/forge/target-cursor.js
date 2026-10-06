// ══════════════════════════════════════════════════════
// Target Cursor (React Bits) · GSAP → un solo bucle. La mira gira una
// vuelta cada 2 s; sobre un objetivo deja de girar y sus esquinas (12 px,
// borde 3) se pegan a las del elemento y lo siguen si se mueve.
// ══════════════════════════════════════════════════════
import { finePointer, reduceMotion, updateHexes } from './kit.js';

export function mount() {
(() => {
  if (!finePointer.matches || reduceMotion.matches) return;
  const SEL = '.btn, .card, .breaker, .fg-switch, .callout, .badge, .fw-step, .reg-entry, .np, .swatch, .fg-pill, .fg-brand';
  const wrap = document.createElement('div'); wrap.className = 'target-cursor-wrapper'; wrap.setAttribute('aria-hidden', 'true');
  const corners = ['tl', 'tr', 'br', 'bl'].map(k => { const c = document.createElement('div'); c.className = 'target-cursor-corner corner-' + k; wrap.appendChild(c); return c; });
  const dot = document.createElement('div'); dot.className = 'target-cursor-dot'; wrap.appendChild(dot);
  document.body.appendChild(wrap); document.documentElement.classList.add('tc-on');
  const CS = 12, BW = 3, REST = [[-CS * 1.5, -CS * 1.5], [CS * 0.5, -CS * 1.5], [CS * 0.5, CS * 0.5], [-CS * 1.5, CS * 0.5]];
  const pos = REST.map(p => [...p]);
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, ang = 0, target = null, last = 0, scale = 1, seen = false;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (!seen) { seen = true; cx = mx; cy = my; } }, { passive: true });
  addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest(SEL); target = t || null; });
  addEventListener('scroll', () => { if (!target) return; const el = document.elementFromPoint(mx, my); if (!el || el.closest(SEL) !== target) target = null; }, { passive: true });
  document.addEventListener('mouseleave', () => { seen = false; wrap.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { wrap.style.opacity = ''; });
  addEventListener('mousedown', () => { scale = 0.9; }); addEventListener('mouseup', () => { scale = 1; });
  const frame = t => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
    const k = 1 - Math.exp(-dt / 0.035); cx += (mx - cx) * k; cy += (my - cy) * k;
    let goal = REST;
    if (target && target.isConnected) {
      ang = 0; const r = target.getBoundingClientRect();
      goal = [[r.left - BW - cx, r.top - BW - cy], [r.right + BW - CS - cx, r.top - BW - cy], [r.right + BW - CS - cx, r.bottom + BW - CS - cy], [r.left - BW - cx, r.bottom + BW - CS - cy]];
    } else { target = null; ang = (ang + dt * 180) % 360; }
    const kc = 1 - Math.exp(-dt / (target ? 0.06 : 0.09));
    pos.forEach((p, i) => { p[0] += (goal[i][0] - p[0]) * kc; p[1] += (goal[i][1] - p[1]) * kc; corners[i].style.transform = `translate(${p[0]}px, ${p[1]}px)`; });
    wrap.style.transform = `translate(${cx}px, ${cy}px) rotate(${ang}deg) scale(${scale})`;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
updateHexes();
}
