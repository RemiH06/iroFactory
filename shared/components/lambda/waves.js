// ══════════════════════════════════════════════════════
// Waves (React Bits) · canvas 2D. Perlin 2D del original, mismos
// parámetros (amplitud 32/16, fricción .925, tensión .005); el cursor
// empuja las líneas. Una instancia por capítulo, a 30 fps.
// ══════════════════════════════════════════════════════
import { clamp, cssVar, isLight, makeLoop, onTheme, reduceMotion, rgba } from './kit.js';

export class Grad { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } dot2(x, y) { return this.x * x + this.y * y; } }
export class Noise {
  constructor(seed = 0) {
    this.grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0), new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1), new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)];
    this.p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    this.perm = new Array(512); this.gradP = new Array(512); this.seed(seed);
  }
  seed(seed) { if (seed > 0 && seed < 1) seed *= 65536; seed = Math.floor(seed); if (seed < 256) seed |= seed << 8; for (let i = 0; i < 256; i++) { const v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255); this.perm[i] = this.perm[i + 256] = v; this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12]; } }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return (1 - t) * a + t * b; }
  perlin2(x, y) { let X = Math.floor(x), Y = Math.floor(y); x -= X; y -= Y; X &= 255; Y &= 255; const n00 = this.gradP[X + this.perm[Y]].dot2(x, y), n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1), n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y), n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1), u = this.fade(x); return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y)); }
}
export function mount() {
document.querySelectorAll('.lm-waves').forEach(canvas => {
  const host = canvas.parentElement, ctx = canvas.getContext('2d'), noise = new Noise(Math.random());
  const C = { waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16, xGap: 16, yGap: 40, friction: 0.925, tension: 0.005, maxCursorMove: 100 };
  const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
  let W = 1, H = 1, dpr = 1, lines = [], color = '';
  const setSize = () => { const r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); };
  const setLines = () => {
    lines = []; const oW = W + 200, oH = H + 30, tl = Math.ceil(oW / C.xGap), tp = Math.ceil(oH / C.yGap), xs = (W - C.xGap * tl) / 2, ys = (H - C.yGap * tp) / 2;
    for (let i = 0; i <= tl; i++) { const pts = []; for (let j = 0; j <= tp; j++) pts.push({ x: xs + C.xGap * i, y: ys + C.yGap * j, wave: { x: 0, y: 0 }, cursor: { x: 0, y: 0, vx: 0, vy: 0 } }); lines.push(pts); }
  };
  const colors = () => { color = rgba(cssVar('--text2'), isLight ? 0.3 : 0.26); };
  const movePoints = time => {
    lines.forEach(pts => pts.forEach(p => {
      const move = noise.perlin2((p.x + time * C.waveSpeedX) * 0.002, (p.y + time * C.waveSpeedY) * 0.0015) * 12;
      p.wave.x = Math.cos(move) * C.waveAmpX; p.wave.y = Math.sin(move) * C.waveAmpY;
      const dx = p.x - mouse.sx, dy = p.y - mouse.sy, dist = Math.hypot(dx, dy), l = Math.max(175, mouse.vs);
      if (dist < l) { const s = 1 - dist / l, f = Math.cos(dist * 0.001) * s; p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065; p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065; }
      p.cursor.vx += (0 - p.cursor.x) * C.tension; p.cursor.vy += (0 - p.cursor.y) * C.tension;
      p.cursor.vx *= C.friction; p.cursor.vy *= C.friction; p.cursor.x += p.cursor.vx * 2; p.cursor.y += p.cursor.vy * 2;
      p.cursor.x = clamp(p.cursor.x, -C.maxCursorMove, C.maxCursorMove); p.cursor.y = clamp(p.cursor.y, -C.maxCursorMove, C.maxCursorMove);
    }));
  };
  const moved = (p, wc = true) => ({ x: Math.round((p.x + p.wave.x + (wc ? p.cursor.x : 0)) * 10) / 10, y: Math.round((p.y + p.wave.y + (wc ? p.cursor.y : 0)) * 10) / 10 });
  const drawLines = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1;
    lines.forEach(points => { let p1 = moved(points[0], false); ctx.moveTo(p1.x, p1.y); points.forEach((p, idx) => { const isLast = idx === points.length - 1; p1 = moved(p, !isLast); const p2 = moved(points[idx + 1] || points[points.length - 1], !isLast); ctx.lineTo(p1.x, p1.y); if (isLast) ctx.moveTo(p2.x, p2.y); }); });
    ctx.stroke();
  };
  const tick = t => {
    mouse.sx += (mouse.x - mouse.sx) * 0.1; mouse.sy += (mouse.y - mouse.sy) * 0.1;
    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly, d = Math.hypot(dx, dy);
    mouse.v = d; mouse.vs += (d - mouse.vs) * 0.1; mouse.vs = Math.min(100, mouse.vs); mouse.lx = mouse.x; mouse.ly = mouse.y; mouse.a = Math.atan2(dy, dx);
    movePoints(reduceMotion.matches ? 4000 : t); drawLines();
  };
  const updateMouse = (x, y) => { const b = host.getBoundingClientRect(); mouse.x = x - b.left; mouse.y = y - b.top; if (!mouse.set) { mouse.sx = mouse.lx = mouse.x; mouse.sy = mouse.ly = mouse.y; mouse.set = true; } };
  addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) updateMouse(t.clientX, t.clientY); }, { passive: true });
  setSize(); setLines(); colors();
  const loop = makeLoop(host, tick, 24);
  new ResizeObserver(() => { setSize(); setLines(); loop.still(); }).observe(host);
  onTheme(() => { colors(); loop.still(); });
  loop.still();
});
}
