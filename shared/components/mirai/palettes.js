// ══════════════════════════════════════════════════════
// mirai · las tiradas (刷り). La página se imprime con una de sus cuatro
// tintas como clave, como los biomas de tarot: cada tirada trae su papel,
// su tinta de texto, su laca para urushi y el orden en que las otras tres
// tintas visten las secciones. Los colores viven en mirai.css (selectores
// [data-palette]); aquí van los nombres y el estado. La tirada se recuerda
// en el navegador; un script en línea al abrir <body> la pone antes de la
// primera pintura, para que no parpadee la de shu.
// ══════════════════════════════════════════════════════
export const PALETTES = [
  { id: 'shu', ja: '朱刷り', kana: 'しゅずり', paper: ['胡粉', 'ごふん'], sumi: ['墨', 'すみ'], night: ['漆黒', 'しっこく'], order: ['shu', 'gunjo', 'tsutsuji', 'ukon'] },
  { id: 'gunjo', ja: '群青刷り', kana: 'ぐんじょうずり', paper: ['卯の花', 'うのはな'], sumi: ['濃藍', 'こいあい'], night: ['搗色', 'かちいろ'], order: ['gunjo', 'shu', 'ukon', 'tsutsuji'] },
  { id: 'ukon', ja: '鬱金刷り', kana: 'うこんずり', paper: ['白鼠', 'しろねずみ'], sumi: ['憲法黒茶', 'けんぽうくろちゃ'], night: ['黒茶', 'くろちゃ'], order: ['ukon', 'gunjo', 'tsutsuji', 'shu'] },
  { id: 'tsutsuji', ja: '躑躅刷り', kana: 'つつじずり', paper: ['桜色', 'さくらいろ'], sumi: ['黒紅', 'くろべに'], night: ['茄子紺', 'なすこん'], order: ['tsutsuji', 'gunjo', 'ukon', 'shu'] },
];
const KEY = 'mirai:tirada';
let current = PALETTES.find(p => p.id === document.body.dataset.palette) || PALETTES[0];
export const palette = () => current;
export const nextPalette = () => PALETTES[(PALETTES.indexOf(current) + 1) % PALETTES.length];
export const onPalette = fn => document.addEventListener('mirai:palette', e => fn(e.detail));
export function setPalette(id) {
  const p = PALETTES.find(x => x.id === id);
  if (!p || p === current) return false;
  current = p; document.body.dataset.palette = p.id;
  try { localStorage.setItem(KEY, p.id); } catch { /* sin almacenamiento: dura lo que la visita */ }
  document.dispatchEvent(new CustomEvent('mirai:palette', { detail: p }));
  return true;
}
