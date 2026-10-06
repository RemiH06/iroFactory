// ══════════════════════════════════════════════════════
// CAPA 5 · Tilt-card: cada columna rota en 3D hacia el cursor
// (motion.dev "js-tilt-card", reconstruido desde el concepto:
// rotateX/rotateY + perspective siguiendo el puntero, con
// transición suave en vez de física de resorte real).
// ══════════════════════════════════════════════════════
import { COL_GAP } from './sky.js';
import { shuffledIndices } from './single-canvas.js';

export let tiltCols = [];
export function buildTiltColumns() {
  const layer = document.getElementById('ap-tilt-layer');
  layer.innerHTML = '';
  tiltCols = [];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const n = Math.ceil(W / COL_GAP) + 1;
  const pauseEvery = 7; // mismo ritmo que buildTexture() · ahí se funden 2 en una doble

  const pauseSet = new Set();
  for (let i = 0; i <= n; i++) {
    if (i % pauseEvery === Math.floor(pauseEvery / 2)) pauseSet.add(i);
  }

  // Cada columna es un div real con su propio recorte de la imagen del
  // hero como background (background-position sobre una copia virtual
  // de ancho n×COL_GAP) · "la misma imagen pero desordenada", a
  // pedido del usuario, y ahora con contenido de verdad que SÍ se ve
  // rotar con el tilt (antes era un div vacío). El barajado se hace a
  // nivel de "slot" (gap o doble-gap), no por columna individual, para
  // que las 5 posiciones dobles (CD, JK, QR, XY, AEAF...) reciban UNA
  // sola tira del doble de ancho en vez de dos tiras independientes
  // pegadas sin costura · a pedido explícito del usuario.
  const heroSrc = document.getElementById('ap-hero-img').src;
  const virtualW = n * COL_GAP;
  const perm = shuffledIndices(n);
  let permCursor = 0;

  for (let i = 0; i < n; i++) {
    if (pauseSet.has(i)) continue; // ya se creó como parte de la doble anterior
    const isDouble = pauseSet.has(i + 1);
    const units = isDouble ? 2 : 1;
    const width = COL_GAP * units;
    // offset en unidades de COL_GAP, recortado para que la ventana no
    // se salga del ancho virtual (relevante sobre todo para dobles).
    const offset = Math.min(perm[permCursor++ % perm.length], n - units);

    // Margen del 8% por lado: sin esto, las tilt-card cubren el 100%
    // del slot en reposo y la capa de atrás (#ap-back-stripes) nunca
    // se alcanza a ver · el escorzo 3D del tilt por sí solo no abría
    // hueco suficiente para notarse (probado, no alcanzaba). Con el
    // margen, siempre hay una franja visible de la capa de atrás entre
    // tarjetas, más ancha todavía al tiltear.
    const margin = width * 0.08;
    const div = document.createElement('div');
    div.className = 'tilt-col';
    div.style.left = (i * COL_GAP + margin) + 'px';
    div.style.width = (width - margin * 2) + 'px';
    div.style.backgroundImage = `url("${heroSrc}")`;
    div.style.backgroundSize = `${virtualW}px ${H}px`;
    div.style.backgroundPosition = `${-(offset * COL_GAP + margin)}px 0`;
    layer.appendChild(div);
    tiltCols.push({ el: div, cx: i * COL_GAP + width / 2 });
  }
}
export function updateTilt(mx, my) {
  const H = window.innerHeight;
  const maxTilt = 16;          // grados máximos de rotación
  const influence = 260;       // radio de columnas que reaccionan, en px
  const yFactor = (my / H - 0.5) * 2; // -1..1, arriba/abajo de la pantalla
  tiltCols.forEach(col => {
    const dx = mx - col.cx;
    const dist = Math.abs(dx);
    if (dist > influence) {
      col.el.style.transform = 'rotateY(0deg) rotateX(0deg)';
      return;
    }
    const strength = 1 - dist / influence; // 0..1, más cerca = más fuerte
    const dirX = dx < 0 ? 1 : -1; // la columna se inclina "hacia" el cursor
    const rotY = dirX * strength * maxTilt;
    const rotX = -yFactor * strength * (maxTilt * 0.5);
    col.el.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
  });
}
