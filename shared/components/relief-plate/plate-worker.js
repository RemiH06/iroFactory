// Worker de la placa: carga el pintor del tema (un módulo que exporta
// paint(opts) → { color, mask }), dibuja y saca el relieve fuera del hilo
// principal, y devuelve tres ImageBitmap (color, normales, metal y
// rugosidad) ya volteados para Three.js.
import { relief } from './relief.js';

onmessage = async ({ data }) => {
  const { id, painter, opts, reliefOpts } = data;
  const { paint } = await import(painter);
  const { color, mask } = paint(opts);
  const { normal, mr } = relief(mask, reliefOpts); // ~250 ms (aquí se pinta de verdad el lienzo)
  const flip = c => createImageBitmap(c, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
  const bitmaps = await Promise.all([flip(color), flip(normal), flip(mr)]);
  postMessage({ id, bitmaps }, bitmaps);
};
