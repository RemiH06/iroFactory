// ══════════════════════════════════════════════════════
// FONDO TETRIS — tablero lleno con piezas reales
// ══════════════════════════════════════════════════════
import { cssVar, isLight } from './kit.js';

export const tetrisCanvas = document.getElementById('ludus-tetris');
export const tCtx = tetrisCanvas.getContext('2d');
// Definición de tetrominos (rotación 0)
export const TETROMINOS = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};
export function getPieceColor(type) {
  const map = {I:'--piece-i',O:'--piece-o',T:'--piece-t',S:'--piece-s',Z:'--piece-z',J:'--piece-j',L:'--piece-l'};
  return cssVar(map[type]);
}
export function buildTetris() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  tetrisCanvas.width  = W;
  tetrisCanvas.height = H;

  const CELL = 22;
  const COLS = Math.ceil(W / CELL) + 2;
  const ROWS = Math.ceil(H / CELL) + 2;

  // Crear un tablero lleno con piezas aleatorias
  // Usamos una grilla y colocamos piezas hasta llenarla
  const board   = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  const types   = Object.keys(TETROMINOS);

  // Llenar por filas de arriba a abajo
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const type  = types[Math.floor(Math.random() * types.length)];
      const shape = TETROMINOS[type];
      const sw    = shape[0].length;
      const sh    = shape.length;

      // Intentar colocar la pieza
      let fits = true;
      for (let dr = 0; dr < sh && fits; dr++)
        for (let dc = 0; dc < sw && fits; dc++)
          if (shape[dr][dc] && (r+dr >= ROWS || c+dc >= COLS || board[r+dr][c+dc]))
            fits = false;

      if (fits) {
        for (let dr = 0; dr < sh; dr++)
          for (let dc = 0; dc < sw; dc++)
            if (shape[dr][dc]) board[r+dr][c+dc] = type;
        c += sw;
      } else {
        // Forzar un cuadrado 1×1 para no dejar huecos
        if (!board[r][c]) board[r][c] = types[Math.floor(Math.random() * types.length)];
        c++;
      }
    }
  }

  // Dibujar — bicromático en oscuro (solo rojo y dorado), multicolor en claro
  tCtx.clearRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = board[r][c];
      if (!type) continue;
      const color = isLight ? getPieceColor(type) :
        ((r + c) % 2 === 0 ? '#901828' : '#C8901A'); // bicromático carpa
      const x = c * CELL, y = r * CELL;
      tCtx.globalAlpha = isLight ? 0.18 : 0.14;
      tCtx.fillStyle   = color;
      tCtx.fillRect(x+1, y+1, CELL-2, CELL-2);
      tCtx.globalAlpha = isLight ? 0.35 : 0.28;
      tCtx.strokeStyle = color;
      tCtx.lineWidth   = 0.8;
      tCtx.strokeRect(x+1, y+1, CELL-2, CELL-2);
    }
  }
  tCtx.globalAlpha = 1;

  // ── Spotlight estático (solo oscuro) ──
  if (!isLight) {
    const sx = W * (0.25 + Math.random() * 0.5); // posición aleatoria fija al cargar
    const sg = tCtx.createRadialGradient(sx, -H*0.1, 0, sx, H*0.5, H*0.85);
    sg.addColorStop(0,   'rgba(240,200,80,0.09)');
    sg.addColorStop(0.35,'rgba(220,160,40,0.05)');
    sg.addColorStop(1,   'rgba(200,120,20,0)');
    tCtx.fillStyle = sg;
    tCtx.fillRect(0, 0, W, H);

    const curtainW = W * 0.335;
    const curtainH = H;
    const stripes  = 12;
    const stripeW  = curtainW / stripes;
    const crimson  = '#901828';
    const cream    = '#F0E8D8';

    function drawCurtain(ctx, cW, cH, flipX) {
      const sW = cW / stripes;
      ctx.save();
      if (flipX) { ctx.scale(-1, 1); ctx.translate(-cW, 0); }

      const cx = cW * 1.00;

      // Galón
      for (let i = 0; i < stripes; i++) {
        ctx.beginPath(); ctx.rect(i*sW, 0, sW, cH*0.05);
        ctx.fillStyle = i%2===0 ? crimson : cream;
        ctx.globalAlpha = 0.97; ctx.fill();
      }
      for (let i = 0; i < stripes; i++) {
        ctx.beginPath();
        ctx.arc(i*sW+sW/2, cH*0.05, sW*0.55, 0, Math.PI);
        ctx.fillStyle = i%2===0 ? cream : crimson;
        ctx.globalAlpha = 0.94; ctx.fill();
      }

      // Superior convergente
      for (let i = 0; i < stripes; i++) {
        const topX0=i*sW, topX1=(i+1)*sW;
        const botX0=cx+(topX0-cx)*0.1, botX1=cx+(topX1-cx)*0.1;
        const midH=cH*0.50;
        ctx.beginPath();
        ctx.moveTo(topX0,cH*0.05); ctx.lineTo(topX1,cH*0.05);
        ctx.bezierCurveTo(topX1,cH*0.2,botX1+6,midH*0.82,botX1,midH);
        ctx.lineTo(botX0,midH);
        ctx.bezierCurveTo(botX0-6,midH*0.82,topX0,cH*0.2,topX0,cH*0.05);
        ctx.closePath();
        ctx.fillStyle = i%2===0 ? crimson : cream;
        ctx.globalAlpha = 0.90; ctx.fill();
      }

      // Inferior divergente
      for (let i = 0; i < stripes; i++) {
        const topX0=cx+(i*sW-cx)*0.1, topX1=cx+((i+1)*sW-cx)*0.1;
        const botX0=i*sW, botX1=(i+1)*sW;
        const topH=cH*0.50;
        ctx.beginPath();
        ctx.moveTo(topX0,topH); ctx.lineTo(topX1,topH);
        ctx.bezierCurveTo(topX1-4,topH+cH*0.18,botX1,cH*0.88,botX1,cH);
        ctx.lineTo(botX0,cH);
        ctx.bezierCurveTo(botX0,cH*0.88,topX0+4,topH+cH*0.18,topX0,topH);
        ctx.closePath();
        ctx.fillStyle = i%2===0 ? crimson : cream;
        ctx.globalAlpha = 0.90; ctx.fill();
      }

      ctx.globalAlpha = 1; ctx.restore();
    }

    const offsetX = W * 0.010;

    // Derecha
    tCtx.save();
    tCtx.translate(W - curtainW + offsetX, 0);
    drawCurtain(tCtx, curtainW, curtainH, false);
    tCtx.restore();

    // Izquierda (mirror)
    tCtx.save();
    tCtx.translate(-offsetX, 0);
    drawCurtain(tCtx, curtainW, curtainH, true);
    tCtx.restore();
  }
}
// ── Polvo dorado (modo oscuro) ──────────────────────
export const dustCanvas = document.createElement('canvas');
export const dCtx = dustCanvas.getContext('2d');
export let dustParticles = [];
export function makeDust() {
  return {
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    vx:    (Math.random() - 0.5) * 0.3,
    vy:   -(0.1 + Math.random() * 0.25),
    r:     0.5 + Math.random() * 1.2,
    alpha: 0.2 + Math.random() * 0.5,
    flicker: Math.random() * Math.PI * 2,
    flickerSpeed: 0.02 + Math.random() * 0.04,
    col: Math.random() < 0.6 ? '#E8A820' : '#C8901A',
  };
}
export function drawDust() {
  const W = dustCanvas.width  = window.innerWidth;
  const H = dustCanvas.height = window.innerHeight;
  dCtx.clearRect(0,0,W,H);

  if (isLight) { requestAnimationFrame(drawDust); return; }

  if (dustParticles.length < 80) dustParticles.push(makeDust());

  dustParticles = dustParticles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.flicker += p.flickerSpeed;
    const fa = p.alpha * (0.6 + Math.sin(p.flicker) * 0.4);
    dCtx.save();
    dCtx.shadowColor = p.col;
    dCtx.shadowBlur  = 4;
    dCtx.beginPath(); dCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    dCtx.fillStyle = p.col; dCtx.globalAlpha = fa; dCtx.fill();
    dCtx.restore();
    if (p.y < -5) { Object.assign(p, makeDust(), {y: H+5}); }
    return true;
  });

  requestAnimationFrame(drawDust);
}
export function mount() {
window.addEventListener('resize', buildTetris);
buildTetris();
dustCanvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none';
document.body.insertBefore(dustCanvas, document.querySelector('.page'));
requestAnimationFrame(drawDust);
}
