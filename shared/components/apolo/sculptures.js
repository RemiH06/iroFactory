// ══════════════════════════════════════════════════════
// La gliptoteca · las piezas de la galería, en orden cronológico. Casi
// todas son escaneos de vaciados en yeso de la Real Colección de Vaciados
// del SMK (Statens Museum for Kunst, Copenhague), en dominio público; el
// Laocoonte es el mismo vaciado texturizado por el BCDH de Bonn, y el
// kuros y la Terpsícore son mármoles del Museo de Arte de Cleveland.
// Cada GLB va en assets/models/apolo/<file>.glb, descargado de Sketchfab
// y reducido con gltf-transform (como los cráneos de tarot). La galería
// solo muestra las que tienen `ready` (las que ya están en el repo).
//   { file, ready, name, year (para la línea de tiempo), date, author, original,
//     cast, h (cm), look, scan, by, license, url, rot? [x, y, z] }
// ══════════════════════════════════════════════════════
const SMK = { by: 'SMK · National Gallery of Denmark', license: 'CC0' };
const CMA = { by: 'The Cleveland Museum of Art', license: 'CC0' };

export const SCULPTURES = [
  { file: 'kuros', name: 'Torso de kuros', year: -550, date: 'Hacia 550 a. C.', author: 'Taller griego, época arcaica', original: 'Mármol · Museo de Arte de Cleveland (1953.125)', h: 62.5,
    look: 'La simetría frontal del arcaico: el cuerpo como un bloque que apenas empieza a moverse.', ...CMA, url: 'https://sketchfab.com/3d-models/384326f9d7a34c14bc4641aa78c90557' },
  { file: 'kore', name: 'Koré con quitón y epiblema', year: -530, date: 'Hacia 530 a. C.', author: 'Taller griego, época arcaica', original: 'Mármol', cast: 'Vaciado KAS1800', h: null,
    look: 'La sonrisa arcaica y los pliegues en zigzag del manto, todavía más dibujados que caídos.', ...SMK, url: 'https://sketchfab.com/3d-models/185f351f4d1249749b4c88b0d2c27511' },
  { file: 'artemisio', name: 'Zeus o Poseidón del Artemisio', year: -460, date: 'Hacia 460 a. C.', author: 'Escultor desconocido, estilo severo', original: 'Bronce original, hallado en el mar frente al cabo Artemisio · Museo Arqueológico Nacional de Atenas', cast: 'Vaciado KAS2100', h: 201,
    look: 'La mano derecha está vacía: si sostenía un rayo es Zeus; si un tridente, Poseidón. Nadie lo sabe.', ...SMK, url: 'https://sketchfab.com/3d-models/d4876aa609304682945145debedfc77e' },
  { file: 'discobolo', name: 'Discóbolo', year: -455, date: 'Hacia 460 a 450 a. C.', author: 'Mirón de Eléuteras', original: 'Bronce perdido; se conoce por copias romanas en mármol', cast: 'Vaciado KAS1549', h: null,
    look: 'El instante muerto del giro, justo antes de soltar el disco: todo el movimiento cabe en una pausa.', ...SMK, url: 'https://sketchfab.com/3d-models/50f50abf45414ad8a658325df7a5fcb3' },
  { file: 'doriforo', name: 'Doríforo', year: -440, date: 'Hacia 450 a 440 a. C.', author: 'Policleto', original: 'Bronce perdido; la copia más completa, de Pompeya, está en el Museo Arqueológico Nacional de Nápoles', cast: 'Vaciado KAS11', h: null,
    look: 'El canon: cada parte en proporción con las demás, el peso en una pierna y la cadera que responde.', ...SMK, url: 'https://sketchfab.com/3d-models/2b213f98afa742a5880af130b4d4eddc' },
  { file: 'belvedere', name: 'Apolo del Belvedere', year: -330, date: 'Hacia 330 a 320 a. C. (copia romana, hacia 120 a 140 d. C.)', author: 'Atribuido a Leócares', original: 'Copia romana en mármol de un bronce perdido · Museos Vaticanos', cast: 'Vaciado KAS353', h: 232,
    look: 'El brazo sigue extendido y la cabeza ya gira: la flecha acaba de salir.', ...SMK, url: 'https://sketchfab.com/3d-models/fe5c0cffdc2a4f3985872212c692af0c' },
  { file: 'milo', name: 'Afrodita de Milo', year: -130, date: 'Hacia 150 a 125 a. C.', author: 'Atribuida a Alejandro de Antioquía', original: 'Mármol de Paros · Museo del Louvre', cast: 'Vaciado KAS434/1', h: null,
    look: 'El torso sube en espiral y el manto parece a punto de caer: el helenismo juega con lo inestable.', ...SMK, url: 'https://sketchfab.com/3d-models/53082b5d6cef4c34a9701a2a24f58075' },
  { file: 'laocoonte', name: 'Laocoonte y sus hijos', year: -40, date: 'Siglo I a. C. o I d. C.', author: 'Agesandro, Atenodoro y Polidoro de Rodas', original: 'Mármol · Museos Vaticanos', cast: 'Vaciado KAS385 del SMK, texturizado por el BCDH', h: 242,
    look: 'La diagonal del cuerpo y el dolor en el rostro: lo contrario de la calma clásica.', by: 'Bonn Center for Digital Humanities', license: 'CC BY 4.0', url: 'https://sketchfab.com/3d-models/4e253a98bfc842cabfe7610c38daa7ab' },
  { file: 'terpsicore', name: 'Terpsícore lírica', year: 1816, date: '1816', author: 'Antonio Canova', original: 'Mármol · Museo de Arte de Cleveland (1968.212)', h: 177.5,
    look: 'Una musa de Apolo dos mil años después: la Antigüedad como la imaginó el Neoclasicismo.', ...CMA, url: 'https://sketchfab.com/3d-models/6827af1276ab407ebbfa1e7d0a4b9a19' },
  { file: 'apollo-statue', ready: true, name: 'Apolo', year: null, date: 'Sin datar en la fuente', author: 'Escaneo de una estatua de Apolo', original: 'La fuente no indica la obra ni el museo', h: null,
    look: 'El mismo Apolo que acompaña las pestañas, aquí bajo la luz de la sala.', by: 'artfletch', license: 'CC BY 4.0', url: 'https://sketchfab.com/3d-models/apollo-statue-a01dbaf0b7db4c308c9fcecade6d4283' }
];
