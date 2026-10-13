// Worker del tapiz: dibuja el tapiz y su relieve fuera del hilo principal y
// devuelve tres ImageBitmap (color, normales, metal y rugosidad) ya
// volteados para Three.js.
import { paint } from './deco-pattern.js';
import { relief } from './relief.js';

onmessage = async ({ data }) => {
  const { id, opts } = data;
  const { color, mask } = paint(opts);
  const { normal, mr } = relief(mask); // ~250 ms (aquí se pinta de verdad el lienzo)
  const flip = c => createImageBitmap(c, { imageOrientation: 'flipY' });
  const bitmaps = await Promise.all([flip(color), flip(normal), flip(mr)]);
  postMessage({ id, bitmaps }, bitmaps);
};
