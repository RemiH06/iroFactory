// ══════════════════════════════════════════════════════
// CURSOR GRID (React Bits) · port directo del canvas 2D real:
// cada celda dentro del radio se enciende con caída "smooth",
// se sostiene 400ms y se desvanece en 800ms; el clic dispara un
// anillo que se expande a 600px/s. Adaptación: la retícula se
// alinea a la cuadrícula de 40px que ya dibuja el fondo (offset
// 0 en vez de centrada) para que las celdas encendidas coincidan
// con los cuadrados existentes. El loop solo corre mientras hay
// celdas visibles.
// ══════════════════════════════════════════════════════
import { onTheme, cssVar, hexToRgb, reduceMotion } from './kit.js';

export function initCursorGrid() {
  const cv = document.getElementById('metro-grid');
  const g = cv.getContext('2d');
  const P = { cellSize: 40, radius: 140, holdTime: 400, fadeDuration: 800, lineWidth: 1.2, maxOpacity: 1, pulseSpeed: 600 };
  const ease = t => t * t * (3 - 2 * t);
  let dpr = 1, w = 0, h = 0, cols = 0, rows = 0, alphas, touched, raf = 0, running = false, lastFrame = 0;
  const pulses = [];
  let rgb = [0, 229, 160];
  const readColor = () => { rgb = hexToRgb(cssVar('--accent')); };
  function rebuild() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / P.cellSize) + 1; rows = Math.ceil(h / P.cellSize) + 1;
    alphas = new Float32Array(cols * rows); touched = new Float64Array(cols * rows);
  }
  const center = i => [(i % cols) * P.cellSize + P.cellSize / 2, Math.floor(i / cols) * P.cellSize + P.cellSize / 2];
  function energize(x, y) {
    const r = P.radius, now = performance.now();
    const c0 = Math.max(0, Math.floor((x - r) / P.cellSize)), c1 = Math.min(cols - 1, Math.floor((x + r) / P.cellSize));
    const r0 = Math.max(0, Math.floor((y - r) / P.cellSize)), r1 = Math.min(rows - 1, Math.floor((y + r) / P.cellSize));
    for (let cr = r0; cr <= r1; cr++) for (let cc = c0; cc <= c1; cc++) {
      const i = cr * cols + cc, [cx, cy] = center(i), d = Math.hypot(cx - x, cy - y);
      if (d > r) continue;
      const level = ease(1 - d / r) * P.maxOpacity;
      if (level > alphas[i]) { alphas[i] = level; touched[i] = now; } else if (level > 0) touched[i] = now;
    }
  }
  function draw(now) {
    const dt = Math.min(now - lastFrame, 50); lastFrame = now;
    g.clearRect(0, 0, w, h);
    const [cr, cg, cb] = rgb;
    for (let pi = pulses.length - 1; pi >= 0; pi--) {
      const p = pulses[pi], ringR = ((now - p.t0) / 1000) * P.pulseSpeed;
      if (ringR > Math.hypot(w, h)) { pulses.splice(pi, 1); continue; }
      const band = P.cellSize;
      const c0 = Math.max(0, Math.floor((p.x - ringR - band) / P.cellSize)), c1 = Math.min(cols - 1, Math.floor((p.x + ringR + band) / P.cellSize));
      const r0 = Math.max(0, Math.floor((p.y - ringR - band) / P.cellSize)), r1 = Math.min(rows - 1, Math.floor((p.y + ringR + band) / P.cellSize));
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const i = rr * cols + cc, [cx, cy] = center(i), d = Math.hypot(cx - p.x, cy - p.y);
        if (Math.abs(d - ringR) < band / 2 && P.maxOpacity > alphas[i]) { alphas[i] = P.maxOpacity; touched[i] = now; }
      }
    }
    let any = pulses.length > 0;
    const fadeStep = dt / Math.max(P.fadeDuration, 16), half = P.cellSize / 2;
    for (let i = 0; i < alphas.length; i++) {
      let a = alphas[i];
      if (a <= 0) continue;
      if (now - touched[i] > P.holdTime) { a = Math.max(0, a - fadeStep); alphas[i] = a; if (a <= 0) continue; }
      any = true;
      const [cx, cy] = center(i);
      const grad = g.createRadialGradient(cx, cy, half * 0.1, cx, cy, P.cellSize);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.beginPath(); g.rect(cx - half + 0.5, cy - half + 0.5, P.cellSize - 1, P.cellSize - 1);
      g.strokeStyle = grad; g.lineWidth = P.lineWidth; g.stroke();
    }
    if (any) raf = requestAnimationFrame(draw); else { running = false; g.clearRect(0, 0, w, h); }
  }
  function wake() { if (running) return; running = true; lastFrame = performance.now(); raf = requestAnimationFrame(draw); }
  window.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; energize(e.clientX, e.clientY); wake(); }, { passive: true });
  // En el original el pulso vive dentro de su contenedor; aquí el
  // contenedor es todo el fondo, así que un clic en un control
  // (botón, pestaña, galería) no dispara el anillo.
  window.addEventListener('pointerdown', e => { if (reduceMotion.matches || e.target.closest('button, a, [role="tab"], .dg-root, input, pre, table')) return; pulses.push({ x: e.clientX, y: e.clientY, t0: performance.now() }); wake(); }, { passive: true });
  window.addEventListener('resize', rebuild);
  onTheme(readColor);
  readColor(); rebuild();
}
