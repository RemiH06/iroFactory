// ══════════════════════════════════════════════════════
// Noise (React Bits) · el original pinta 1024² de ruido cada 2 cuadros.
// Aquí: una baldosa de 256² hecha una vez, que salta de lugar con CSS.
// ══════════════════════════════════════════════════════
import { $ } from './kit.js';

export function mount() {
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = 20 + Math.random() * 215; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0); $('.fg-grain').style.setProperty('--grain', `url(${c.toDataURL()})`);
})();
}
