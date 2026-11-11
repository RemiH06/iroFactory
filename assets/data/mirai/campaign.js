// mirai · la campaña de ejemplo. La marca es inventada y propia: Mado (窓,
// «ventana»), lámparas de cápsula. El nombre que se arma por código sale de
// aquí; el del texto fijo de la página está en mirai/index.html.

export const BRAND = { name: 'Mado', kanji: '窓', kana: 'まど', product: 'lámparas de cápsula', claim: 'Enciende una ventana.', claimJa: '窓に、灯りをひとつ。' };

// El logo sobre una retícula de 8 módulos: un módulo redondeado (la cápsula)
// y un círculo (la ventana). `dx`, `dy` y `r` existen para los usos incorrectos.
export const logo = ({ dx = 0, dy = 0, r = 2.25 } = {}) => `<svg class="mado" viewBox="0 0 8 8" aria-hidden="true" focusable="false"><rect width="8" height="8" rx="2" fill="var(--logo-mass, currentColor)"/><circle cx="${4 + dx}" cy="${4 + dy}" r="${r}" fill="var(--logo-light, var(--shu))"/></svg>`;

// Las cuatro tintas planas, con su kanji y su lectura. El id va sin macrón
// (gunjo): Zen Kaku Gothic New no trae la ō y pedirla hace que el navegador
// baje las 120 rebanadas de la fuente buscándola.
export const INKS = [
  { id: 'shu', kanji: '朱', kana: 'しゅ', what: 'bermellón de sello' },
  { id: 'gunjo', kanji: '群青', kana: 'ぐんじょう', what: 'azul ultramar' },
  { id: 'ukon', kanji: '鬱金', kana: 'うこん', what: 'amarillo cúrcuma' },
  { id: 'tsutsuji', kanji: '躑躅', kana: 'つつじ', what: 'rosa azalea' },
];

// Los formatos de la campaña. `ratio` es la proporción real; `art`, los
// módulos del bloque de formas; `safe`, el porcentaje que se deja libre
// arriba y abajo; `day`, cuándo sale respecto al día de salida.
export const FORMATS = [
  { id: 'cartel', name: 'Cartel', ja: 'ポスター', size: '515 × 728 mm', note: 'B2 JIS', ratio: [515, 728], art: [5, 4], safe: [0, 0], day: -3, where: 'calle' },
  { id: 'post', name: 'Post', ja: '投稿', size: '1080 × 1080 px', note: '1:1', ratio: [1, 1], art: [6, 4], safe: [0, 0], day: 0, where: 'red social' },
  { id: 'historia', name: 'Historia', ja: 'ストーリー', size: '1080 × 1920 px', note: '9:16', ratio: [9, 16], art: [5, 4], safe: [13, 13], day: -7, where: 'red social' },
  { id: 'banner', name: 'Banner', ja: 'バナー', size: '970 × 250 px', note: 'billboard', ratio: [970, 250], art: [4, 3], safe: [0, 0], day: 0, where: 'sitio' },
];

export const FORMS = [['circulo', 'círculo'], ['capsula', 'cápsula'], ['cuarto', 'cuarto']];

// Brief de arranque. La fecha de salida se calcula al cargar (hoy + 21 días)
// para que la revisión no nazca con una fecha vencida.
export const BRIEF = {
  marca: 'Mado · lámparas de cápsula',
  objetivo: 'Que quien pase de noche por la calle quiera una ventana encendida.',
  audiencia: 'Personas que viven en departamentos chicos y trabajan de noche.',
  mensaje: BRAND.claim,
  si: 'Instrucciones breves, en imperativo. Una idea por pieza.',
  no: 'Superlativos, signos de admiración, promesas.',
  entregables: ['cartel', 'post', 'historia', 'banner'],
  tinta: 'shu',
  exito: '300 visitas al taller en la semana de salida.',
};
