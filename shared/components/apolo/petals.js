// ══════════════════════════════════════════════════════
// CAPA 3 · Pétalos volando, en 3D (shared/components/petals-3d).
// Three.js se carga al inicio porque la tormenta de apertura va primero;
// si llega antes la tormenta, espera a que el componente esté listo.
// El bucle es el de apolo (statues.js llama drawPetals en cada cuadro).
// ══════════════════════════════════════════════════════
const canvas = document.getElementById('ap-petals');
let fx = null, pending = 0;

import('../petals-3d/petals-3d.js').then(m => {
  fx = m.mount({ canvas, colors: [['--petal', 0.6], ['--yellow', 0.4]] });
  if (!fx) { canvas.remove(); return; }
  if (pending) fx.storm(pending);
}).catch(() => canvas.remove());

export function seedAvalanche() {
  const n = 75; // antes 150: a la mitad, a pedido
  if (fx) fx.storm(n); else pending = n;
}
export function resizePetals() { if (fx) fx.resize(); }
export function drawPetals() { if (fx) fx.frame(); }
