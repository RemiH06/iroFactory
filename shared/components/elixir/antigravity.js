// ── 04 · Antigravity (React Bits, r3f → canvas 2D) ──────────────────
// El original son cápsulas instanciadas con meshBasicMaterial: color
// plano, sin luz. Una cápsula sin sombreado, en perspectiva, es un
// estadio 2D orientado hacia el centro del anillo, así que se dibuja en
// canvas 2D con la misma física (anillo alrededor del cursor, ondas,
// pulso, auto-animación tras 2 s quieto) y la misma cámara (z 50, fov 35).
import { $, coarsePointer, cssVar, isDark, onTheme, reduceMotion } from './kit.js';
import { makeLoop } from './palette-labels.js';

export function mount() {
(() => {
  const canvas = $('#ex-anti'), host = $('#componentes'), ctx = canvas.getContext('2d');
  const O = { count: coarsePointer.matches ? 160 : 300, magnetRadius: 10, ringRadius: 10, waveSpeed: 0.4, waveAmplitude: 1, particleSize: 1.6, lerpSpeed: 0.1, particleVariance: 1, rotationSpeed: 0, depthFactor: 1, pulseSpeed: 3, fieldStrength: 10 };
  const VIEW_H = 2 * 50 * Math.tan(17.5 * Math.PI / 180);
  let W = 1, H = 1, dpr = 1, viewW = VIEW_H, color = '', particles = [], lastMove = 0, start = performance.now();
  const m = { x: 0, y: 0 }, lastM = { x: 0, y: 0 }, virt = { x: 0, y: 0 };
  const init = () => {
    particles = Array.from({ length: O.count }, () => {
      const x = (Math.random() - 0.5) * viewW, y = (Math.random() - 0.5) * VIEW_H, z = (Math.random() - 0.5) * 20;
      return { t: Math.random() * 100, speed: 0.01 + Math.random() / 200, mx: x, my: y, mz: z, cx: x, cy: y, cz: z, ro: (Math.random() - 0.5) * 2 };
    });
  };
  const resize = () => { const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); viewW = VIEW_H * W / H; init(); };
  const draw = t => {
    const time = (t - start) / 1000;
    if (Math.hypot(m.x - lastM.x, m.y - lastM.y) > 0.001) { lastMove = t; lastM.x = m.x; lastM.y = m.y; }
    let dx = m.x * viewW / 2, dy = m.y * VIEW_H / 2;
    if (t - lastMove > 2000) { dx = Math.sin(time * 0.5) * (viewW / 4); dy = Math.cos(time * 0.5 * 2) * (VIEW_H / 4); }
    virt.x += (dx - virt.x) * 0.05; virt.y += (dy - virt.y) * 0.05;
    const rotG = time * O.rotationSpeed, ppu = H / VIEW_H;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (const p of particles) {
      p.t += p.speed / 2; const tt = p.t;
      const proj = 1 - p.cz / 50, ptx = virt.x * proj, pty = virt.y * proj;
      const ddx = p.mx - ptx, ddy = p.my - pty, dist = Math.hypot(ddx, ddy);
      let tx = p.mx, ty = p.my, tz = p.mz * O.depthFactor;
      if (dist < O.magnetRadius) {
        const ang = Math.atan2(ddy, ddx) + rotG, wave = Math.sin(tt * O.waveSpeed + ang) * (0.5 * O.waveAmplitude), dev = p.ro * (5 / (O.fieldStrength + 0.1));
        const rr = O.ringRadius + wave + dev;
        tx = ptx + rr * Math.cos(ang); ty = pty + rr * Math.sin(ang); tz = p.mz * O.depthFactor + Math.sin(tt) * (O.waveAmplitude * O.depthFactor);
      }
      p.cx += (tx - p.cx) * O.lerpSpeed; p.cy += (ty - p.cy) * O.lerpSpeed; p.cz += (tz - p.cz) * O.lerpSpeed;
      const toMouse = Math.hypot(p.cx - ptx, p.cy - pty), sf = Math.max(0, Math.min(1, 1 - Math.abs(toMouse - O.ringRadius) / 10));
      const fin = sf * (0.8 + Math.sin(tt * O.pulseSpeed) * 0.2 * O.particleVariance) * O.particleSize;
      if (fin < 0.02) continue;
      const persp = 50 / (50 - p.cz), sx = (W / 2 + p.cx * persp * ppu) * dpr, sy = (H / 2 - p.cy * persp * ppu) * dpr;
      const len = 0.6 * fin * persp * ppu * dpr, wid = 0.2 * fin * persp * ppu * dpr, a = -Math.atan2(pty - p.cy, ptx - p.cx);
      const hx = Math.cos(a) * (len - wid) / 2, hy = Math.sin(a) * (len - wid) / 2;
      ctx.lineWidth = wid; ctx.beginPath(); ctx.moveTo(sx - hx, sy - hy); ctx.lineTo(sx + hx, sy + hy); ctx.stroke();
    }
  };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); m.x = ((e.clientX - r.left) / r.width) * 2 - 1; m.y = -(((e.clientY - r.top) / r.height) * 2 - 1); }, { passive: true });
  const readColor = () => { color = cssVar(isDark ? '--train' : '--input'); };
  readColor(); resize();
  const loop = makeLoop(host, draw);
  new ResizeObserver(() => { resize(); loop.still(); }).observe(host);
  onTheme(() => { readColor(); loop.still(); });
  // Quieto: sin cursor ni tiempo el anillo no se forma; con reduced-motion
  // se deja el lienzo vacío en vez de un anillo congelado a medias.
  if (!reduceMotion.matches) loop.still();
})();
}
