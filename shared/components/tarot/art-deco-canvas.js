// ══════════════════════════════════════════════════════
// LIENZO ART DECO — canvas animado con brillo dorado
// ══════════════════════════════════════════════════════
import { isDark } from './kit.js';

export const decoCanvas = document.getElementById('tarot-deco');
export const dCtx = decoCanvas.getContext('2d');
export let decoW, decoH, decoRaf;
export let shimmerAngle = 0;
export function buildDeco() {
  decoW = decoCanvas.width  = window.innerWidth;
  decoH = decoCanvas.height = window.innerHeight;
}
export function getDecoColors() {
  return {
    bg:      isDark ? '#0E0608' : '#F8F2E8',
    gold:    isDark ? '#E8A820' : '#C8921A',
    goldLt:  isDark ? '#F8D040' : '#E8B830',
    goldDk:  isDark ? '#A87010' : '#8A6010',
    crimson: isDark ? '#D02030' : '#A81820',
    silver:  isDark ? '#9090C0' : '#8090A8',
    arcana:  isDark ? '#9040C0' : '#7030A0',
  };
}
export function decoArcs(ctx, cx, cy, r, count, startAngle, endAngle, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a;
  for (let i = 1; i <= count; i++) {
    ctx.lineWidth = i === 1 ? 1.2 : 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r * i / count, startAngle, endAngle);
    ctx.stroke();
  }
}
export function decoFan(ctx, cx, cy, r, lines, startA, endA, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 0.7;
  for (let i = 0; i <= lines; i++) {
    const angle = startA + (endA - startA) * i / lines;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
  decoArcs(ctx, cx, cy, r, 3, startA, endA, col, a * 0.8);
}
export function decoChevrons(ctx, cx, cy, w, count, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 0.9;
  for (let i = 0; i < count; i++) {
    const oy = i * 9 - (count * 9) / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy + oy + 5);
    ctx.lineTo(cx,     cy + oy);
    ctx.lineTo(cx + w, cy + oy + 5);
    ctx.stroke();
  }
}
export function decoZigzag(ctx, x1, y, x2, amp, freq, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 0.7;
  ctx.beginPath();
  const steps = Math.round((x2 - x1) / freq);
  for (let i = 0; i <= steps; i++) {
    const px = x1 + i * freq;
    const py = y + (i % 2 === 0 ? -amp : amp);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}
export function decoSunburst(ctx, cx, cy, r1, r2, rays, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 0.8;
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();
}
export function decoArchPortal(ctx, cx, cy, w, h, col, a) {
  ctx.strokeStyle = col; ctx.globalAlpha = a;
  // Arco principal
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, cy + h);
  ctx.lineTo(cx - w / 2, cy + h);
  ctx.closePath(); ctx.stroke();
  // Arcos internos
  for (let i = 1; i <= 4; i++) {
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = a * (1 - i * 0.18);
    const ri = (w / 2) * (1 - i * 0.17);
    if (ri <= 4) break;
    ctx.beginPath(); ctx.arc(cx, cy, ri, Math.PI, 0); ctx.stroke();
  }
  ctx.globalAlpha = a;
}
export function decoRect(ctx, x, y, w, h, col, a, lw = 0.8) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}
export function decoDots(ctx, cx, cy, r, count, col, a) {
  ctx.fillStyle = col; ctx.globalAlpha = a;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
export function drawModule(ctx, type, x, y, w, h, c, a, phase) {
  const cx = x + w / 2, cy = y + h / 2;

  // Marco doble
  decoRect(ctx, x + 5, y + 5, w - 10, h - 10, c.gold, a, 1);
  decoRect(ctx, x + 9, y + 9, w - 18, h - 18, c.gold, a * 0.5, 0.4);

  if (type === 0) {
    // Portal con abanicos arriba y abajo
    decoFan(ctx, cx, y + 14, w * 0.32, 10, Math.PI, 0, c.gold, a);
    decoArchPortal(ctx, cx, cy, w * 0.45, h * 0.35, c.gold, a);
    decoFan(ctx, cx, y + h - 14, w * 0.32, 10, 0, Math.PI, c.gold, a);
    decoChevrons(ctx, cx, cy + h * 0.18, w * 0.14, 4, c.crimson, a * 0.9);

  } else if (type === 1) {
    // Sunburst central con zigzags
    decoSunburst(ctx, cx, cy, w * 0.12, w * 0.32, 16, c.gold, a);
    decoDots(ctx, cx, cy, w * 0.4, 12, c.gold, a * 0.8);
    decoZigzag(ctx, x + 12, cy - h * 0.28, x + w - 12, 5, 8, c.crimson, a * 0.8);
    decoZigzag(ctx, x + 12, cy + h * 0.28, x + w - 12, 5, 8, c.crimson, a * 0.8);

  } else if (type === 2) {
    // Arcos concéntricos laterales
    decoArcs(ctx, x + 12, cy, h * 0.38, 5, -Math.PI / 2, Math.PI / 2, c.gold, a);
    decoArcs(ctx, x + w - 12, cy, h * 0.38, 5, Math.PI / 2, Math.PI * 1.5, c.gold, a);
    decoChevrons(ctx, cx, cy, w * 0.16, 5, c.gold, a * 0.8);
    decoDots(ctx, cx, cy, h * 0.12, 8, c.crimson, a);

  } else if (type === 3) {
    // Cruz central con fans en 4 puntas
    decoFan(ctx, cx, y + 16, w * 0.28, 8, Math.PI, 0, c.gold, a * 0.9);
    decoFan(ctx, cx, y + h - 16, w * 0.28, 8, 0, Math.PI, c.gold, a * 0.9);
    decoFan(ctx, x + 16, cy, h * 0.28, 8, -Math.PI / 2, Math.PI / 2, c.gold, a * 0.9);
    decoFan(ctx, x + w - 16, cy, h * 0.28, 8, Math.PI / 2, Math.PI * 1.5, c.gold, a * 0.9);
    decoRect(ctx, cx - 8, cy - 8, 16, 16, c.crimson, a, 0.8);

  } else if (type === 4) {
    // Columnas de líneas con arco en cima
    const cols = 5;
    for (let i = 0; i < cols; i++) {
      const lx = x + 18 + i * ((w - 36) / (cols - 1));
      ctx.strokeStyle = c.gold; ctx.globalAlpha = a * 0.7; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(lx, cy); ctx.lineTo(lx, y + h - 16); ctx.stroke();
      // Arco en cima de cada columna
      ctx.globalAlpha = a * 0.5;
      ctx.beginPath(); ctx.arc(lx, cy, (w - 36) / (cols - 1) / 2.2, Math.PI, 0); ctx.stroke();
    }
    decoZigzag(ctx, x + 14, y + h * 0.72, x + w - 14, 4, 7, c.crimson, a * 0.8);
    decoArcs(ctx, cx, y + h - 14, w * 0.3, 3, 0, Math.PI, c.gold, a);

  } else if (type === 5) {
    // Diamante central con radiación
    const dw = w * 0.28, dh = h * 0.32;
    ctx.strokeStyle = c.gold; ctx.globalAlpha = a; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - dh); ctx.lineTo(cx + dw, cy);
    ctx.lineTo(cx, cy + dh); ctx.lineTo(cx - dw, cy);
    ctx.closePath(); ctx.stroke();
    decoSunburst(ctx, cx, cy, dw * 1.2, dw * 1.8, 12, c.gold, a * 0.7);
    decoDots(ctx, cx, cy, dh * 1.5, 8, c.arcana, a * 0.9);
    decoChevrons(ctx, cx, y + 20, w * 0.12, 3, c.crimson, a * 0.7);
    decoChevrons(ctx, cx, y + h - 20, w * 0.12, 3, c.crimson, a * 0.7);

  } else {
    // type === 6: Espejo con semicírculos escalonados
    for (let i = 0; i < 4; i++) {
      const ri = (w * 0.38) * (1 - i * 0.2);
      decoArcs(ctx, cx, y + 14, ri, 1, Math.PI, 0, c.gold, a * (1 - i * 0.15));
      decoArcs(ctx, cx, y + h - 14, ri, 1, 0, Math.PI, c.gold, a * (1 - i * 0.15));
    }
    // Líneas verticales escalonadas
    for (let i = -2; i <= 2; i++) {
      const lx = cx + i * (w * 0.1);
      const ly1 = y + 14 + Math.abs(i) * 8;
      const ly2 = y + h - 14 - Math.abs(i) * 8;
      ctx.strokeStyle = c.gold; ctx.globalAlpha = a * 0.6; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(lx, ly1); ctx.lineTo(lx, ly2); ctx.stroke();
    }
    decoDots(ctx, cx, cy, w * 0.22, 6, c.crimson, a);
  }
}
export function drawDeco() {
  const c = getDecoColors();
  dCtx.clearRect(0, 0, decoW, decoH);

  const alpha = isDark ? 0.70 : 0.45;

  // Trama base
  dCtx.globalAlpha = alpha * 0.18;
  dCtx.strokeStyle = c.gold;
  dCtx.lineWidth   = 0.3;
  const step = 24;
  for (let x = 0; x < decoW; x += step) {
    dCtx.beginPath(); dCtx.moveTo(x, 0); dCtx.lineTo(x, decoH); dCtx.stroke();
  }
  for (let y = 0; y < decoH; y += step) {
    dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(decoW, y); dCtx.stroke();
  }

  // Módulos
  const modW = 180, modH = 220;
  const cols = Math.ceil(decoW / modW) + 1;
  const rows = Math.ceil(decoH / modH) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const mx = col * modW - 20, my = row * modH - 20;
      const type = (row * 3 + col * 2 + row * col) % 7;
      drawModule(dCtx, type, mx, my, modW, modH, c, alpha, 0);
    }
  }
  dCtx.globalAlpha = 1;
}
export function mount() {
window.addEventListener('resize', buildDeco);
buildDeco();
drawDeco();
}
