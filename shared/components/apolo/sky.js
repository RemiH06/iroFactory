// ══════════════════════════════════════════════════════
// CAPA 1 · Cielo (gradiente)
// ══════════════════════════════════════════════════════
import { isDark } from './kit.js';

export const skyCanvas = document.getElementById('ap-sky');
export const sCtx = skyCanvas.getContext('2d');
// Compartido entre buildTexture() y el lente: ancho de cada columna
// delgada, heredado del fuste de columna.
export const COL_GAP = 42;
// Compartido con buildTexture(): las columnas blancas se rellenan con
// este mismo degradado, desajustado · deben ser el mismo cielo.
// Claro: reajustado a la saturación real de prouned_apolo.webp (imagen
// del hero) · se muestreó su paleta dominante (ffmpeg palettegen: de
// #00236A a #0684EE/#13A1FB) y el cielo/mar/columnas quedaban muy
// pálidos al lado, un desajuste real que notó el usuario, no solo
// gusto. Mismo tono familiar (azul Egeo), bastante más saturado.
export function skyStops() {
  return isDark
    ? [[0,'#1A0828'],[0.35,'#601828'],[0.6,'#C04820'],[0.78,'#E08030'],[1,'#201840']]
    : [[0,'#B0D8FF'],[0.5,'#3E8DE0'],[0.75,'#1E68C4'],[1,'#0D4696']];
}
// Compartido entre lente/rays: hex a rgb 0..1.
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
}
export function buildSky() {
  const W = skyCanvas.width  = window.innerWidth;
  const H = skyCanvas.height = window.innerHeight;
  sCtx.clearRect(0, 0, W, H);

  // Degradado único y continuo, sin desajuste · el desajuste vive en
  // las columnas blancas de buildTexture(), no aquí (se probó y la
  // costura quedaba pegada al borde del texto, se veía mal).
  const grad = sCtx.createLinearGradient(0, 0, 0, H);
  skyStops().forEach(([offset, col]) => grad.addColorStop(offset, col));
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, W, H);
}
