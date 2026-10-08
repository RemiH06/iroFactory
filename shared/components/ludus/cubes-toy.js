// ══════════════════════════════════════════════════════
// Cubes (React Bits) con los cubos en el hiperespacio de ludus.
// Una rejilla de cubos CSS 3D que se inclinan hacia el cursor (ángulo
// máximo 45°, radio 3 celdas, como el original). Un clic manda una onda
// que recorre la rejilla y, desde ese punto, salen disparados cubos al
// hiperespacio: los cubos flotantes de antes, que giran, se alejan y
// estallan en partículas al final. Antes salían solos cada 200 ms para
// siempre; ahora salen cuando se juega.
// ══════════════════════════════════════════════════════
import { animate } from 'animejs';
import { faceColors, reduceMotion } from './kit.js';

export function mount({ host = document.getElementById('lx-cubes'), grid = 8, maxAngle = 45, radius = 3 } = {}) {
  if (!host) return;
  const scene = document.createElement('div'); scene.className = 'lx-cubes-grid'; scene.style.setProperty('--n', grid);
  const cubes = [];
  for (let r = 0; r < grid; r++) for (let c = 0; c < grid; c++) {
    const el = document.createElement('div'); el.className = 'lx-cube-cell';
    el.innerHTML = '<div class="lx-c"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="f"></i><i class="k"></i></div>';
    scene.appendChild(el); cubes.push({ el, c: el.firstChild, r, col: c });
  }
  host.appendChild(scene);
  const burstLayer = document.createElement('div'); burstLayer.className = 'lx-hyper'; burstLayer.setAttribute('aria-hidden', 'true'); document.body.appendChild(burstLayer);

  // inclinación hacia el cursor
  let raf = 0, pr = -9, pc = -9;
  const tilt = () => {
    raf = 0;
    for (const q of cubes) {
      const d = Math.hypot(q.r - pr, q.col - pc);
      if (d > radius) { q.c.style.transform = ''; continue; }
      const k = 1 - d / radius, ax = (pr - q.r) / (d || 1), ay = (q.col - pc) / (d || 1);
      q.c.style.transform = `rotateX(${(ax * maxAngle * k).toFixed(1)}deg) rotateY(${(ay * maxAngle * k).toFixed(1)}deg)`;
    }
  };
  const cell = e => { const b = scene.getBoundingClientRect(); return [(e.clientY - b.top) / b.height * grid - 0.5, (e.clientX - b.left) / b.width * grid - 0.5]; };
  scene.addEventListener('pointermove', e => { if (reduceMotion.matches) return; [pr, pc] = cell(e); if (!raf) raf = requestAnimationFrame(tilt); });
  scene.addEventListener('pointerleave', () => { pr = pc = -9; if (!raf) raf = requestAnimationFrame(tilt); });

  // clic: onda por la rejilla y cubos al hiperespacio
  const hyper = (x, y) => {
    const pal = faceColors();
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('div'), col = pal[(Math.random() * 6) | 0], inner = pal[(Math.random() * 6) | 0];
      c.className = 'lx-hyper-cube'; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.setProperty('--c', col); c.style.setProperty('--ci', inner);
      c.innerHTML = '<div class="o">' + '<i></i>'.repeat(6) + '<div class="in">' + '<i></i>'.repeat(6) + '</div></div>';
      burstLayer.appendChild(c);
      const a = Math.random() * Math.PI * 2, d = 160 + Math.random() * 260;
      animate(c, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: [0.3, 1.3], rotate: (Math.random() - 0.5) * 720, duration: 900 + Math.random() * 500, ease: 'out(3)', onComplete: () => {
        // estalla en partículas
        const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; c.remove();
        for (let k = 0; k < 12; k++) {
          const p = document.createElement('span'); p.className = 'lx-hyper-bit'; p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.background = col; burstLayer.appendChild(p);
          animate(p, { x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120, scale: [1, 0.1], opacity: [1, 0], duration: 500, ease: 'out(2)', onComplete: () => p.remove() });
        }
      } });
    }
  };
  scene.addEventListener('click', e => {
    const [r0, c0] = cell(e), pal = faceColors(), col = pal[(Math.random() * 6) | 0];
    if (reduceMotion.matches) return;
    const faces = cubes.map(q => q.el), dist = cubes.map(q => Math.hypot(q.r - r0, q.col - c0));
    animate(faces, { '--flash': [0, 1, 0], duration: 600, delay: (_, i) => dist[i] * 70, ease: 'inOut(2)', onBegin: () => scene.style.setProperty('--wave', col) });
    hyper(e.clientX, e.clientY);
  });
  // con teclado: Enter o Espacio en la rejilla lanza desde el centro
  scene.tabIndex = 0; scene.setAttribute('role', 'button'); scene.setAttribute('aria-label', 'Cubos: clic para lanzar una onda y cubos al hiperespacio');
  scene.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const b = scene.getBoundingClientRect(); scene.dispatchEvent(new MouseEvent('click', { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 })); } });
}
