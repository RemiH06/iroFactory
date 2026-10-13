// ══════════════════════════════════════════════════════
// El catálogo del gabinete · nueve biomas, cada uno una vitrina con su
// tapiz, sus colores, su objeto de memento mori, sus cráneos (escaneos del
// Museo de Historia Natural de la Universitat de València, CC BY), su palo
// de la baraja y sus arcanos mayores, repartidos por su sentido.
// Colores: tres por bioma, como las franjas del proun; `day` para el
// gabinete de día (tonos de lámina) y `night` para el de noche (saturados,
// como el proun invertido). Ninguno llega a #000 ni a #fff.
// ══════════════════════════════════════════════════════
// sigla de inventario del MUVHN y el modelo en Sketchfab (CC BY 4.0)
const SKULL = (file, name, sci, id, uid, night = false) => ({ file, name, sci, id, url: `https://sketchfab.com/3d-models/${uid}`, night });

export const BIOMES = [
  { id: 'selva', name: 'Selva tropical', motif: 'frond', memento: 'orchid', suit: 'Frondas', deal: 'tres',
    day: ['#2F6B4F', '#C9772E', '#1F5560'], night: ['#1FAF6E', '#FF8A2A', '#17A3B8'],
    skulls: [SKULL('tucan', 'Tucán toco', 'Ramphastos toco', 'VER0000618', 'ea9b7b6b79834efb8b8923b141bb610d')], arcana: [21, 3] },
  { id: 'humedal', name: 'Humedal y marisma', motif: 'reed', memento: 'candle', suit: 'Carrizos', deal: 'tres',
    day: ['#6B7F3E', '#6E8AA0', '#7E5D3E'], night: ['#9BC23A', '#5FA8E0', '#C98A4A'],
    skulls: [SKULL('garza', 'Garza real', 'Ardea cinerea', 'VER0000486', '56d5007b0da84a1b9718597e4f7352e5'), SKULL('martinete', 'Martinete', 'Nycticorax nycticorax', 'VER0000465', 'db21e1fbde894994b4c89c834687063d', true)], arcana: [14, 18] },
  { id: 'laguna', name: 'Laguna salina', motif: 'crystal', memento: 'hourglass', suit: 'Cristales', deal: 'cruz',
    day: ['#C46A80', '#4E86A6', '#B9A88A'], night: ['#FF6F9A', '#3FB7F0', '#E9D27A'],
    skulls: [SKULL('flamenco', 'Flamenco común', 'Phoenicopterus roseus', 'VER0000489', 'e5c3e68067f949f7a99837fc7b3cb59f')], arcana: [17, 6] },
  { id: 'costa', name: 'Costa y acantilado', motif: 'scallop', memento: 'shell', suit: 'Olas', deal: 'cruz',
    day: ['#24456E', '#3C8A8A', '#B08538'], night: ['#3E6FE0', '#2FD0C0', '#F0B03A'],
    skulls: [SKULL('cormoran', 'Cormorán grande', 'Phalacrocorax carbo', 'VER0000461', 'fc00bbf3a2674ca8b414559d049f1911')], arcana: [16, 7] },
  { id: 'rios', name: 'Ríos y lagos', motif: 'ripple', memento: 'feather', suit: 'Ondas', deal: 'solitario',
    day: ['#1F6656', '#2E68A0', '#BE9C46'], night: ['#22C28F', '#4A8CFF', '#F2C94A'],
    skulls: [SKULL('anade', 'Ánade real', 'Anas platyrhynchos', 'VER0000441', 'b31a54a5a75a484daac993b1a0abe99e')], arcana: [10, 1] },
  { id: 'dehesa', name: 'Dehesa y estepa', motif: 'sun', memento: 'wheel', suit: 'Soles', deal: 'tres',
    day: ['#B8832E', '#C47A56', '#4F5E30'], night: ['#FFB238', '#FF8A66', '#9AC24A'],
    skulls: [SKULL('abubilla', 'Abubilla', 'Upupa epops', 'VER0000623', '76379c55baaa483fb805399b4273d7c8')], arcana: [19, 4] },
  { id: 'bosque', name: 'Bosque mediterráneo', motif: 'pine', memento: 'moth', suit: 'Pinos', deal: 'solitario',
    day: ['#2F5A3C', '#B6A43A', '#4C4C5E'], night: ['#3ECF7A', '#F0E04A', '#9A8CFF'],
    skulls: [SKULL('curruca', 'Curruca cabecinegra', 'Sylvia melanocephala', 'VER0000634', '2844b8bdf20f478087134bb804c2fdd1'), SKULL('verdecillo', 'Verdecillo', 'Serinus serinus', 'VER0000658', '0ef7faf5917641cd8302335a3c17a246')], arcana: [9, 2] },
  { id: 'campina', name: 'Campiña', motif: 'wheat', memento: 'scythe', suit: 'Gavillas', deal: 'cruz',
    day: ['#BE9638', '#A2502C', '#5A7434'], night: ['#FFD24A', '#FF6A3A', '#8ED04A'],
    skulls: [SKULL('faisan', 'Faisán común', 'Phasianus colchicus', 'VER0000424', '6fce323c573244a9bc62ea3b50325c97')], arcana: [8, 5] },
  { id: 'montana', name: 'Roquedo y montaña', motif: 'ziggurat', memento: 'skull', suit: 'Cumbres', deal: 'cruz',
    day: ['#4E5568', '#93562F', '#8E9870'], night: ['#8A94C8', '#FF7A3A', '#C8D48A'],
    skulls: [SKULL('milano', 'Milano negro', 'Milvus migrans', 'VER0000545', '53b22bc10bba405294c685f206275810'), SKULL('cuervo', 'Cuervo grande', 'Corvus corax', 'VER0000641', 'e208d125f5b144ddab6334c6b50f3c26'), SKULL('buho', 'Búho real', 'Bubo bubo', 'VER0000575', 'ace84e9892744faaa7abf99a9cc67366', true)], arcana: [13, 12, 15, 0, 20, 11] }
];

// Los 22 arcanos mayores (número romano, nombre)
export const ARCANA = ['El Loco', 'El Mago', 'La Sacerdotisa', 'La Emperatriz', 'El Emperador', 'El Hierofante', 'Los Enamorados', 'El Carro', 'La Fuerza', 'El Ermitaño', 'La Rueda', 'La Justicia', 'El Colgado', 'La Muerte', 'La Templanza', 'El Diablo', 'La Torre', 'La Estrella', 'La Luna', 'El Sol', 'El Juicio', 'El Mundo'];
export const roman = n => (n === 0 ? '0' : [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, ''));

// Bioma actual: se recuerda y avisa con `tarot:biome`
const KEY = 'tarot:biome';
let current = BIOMES[0];
try { const b = BIOMES.find(x => x.id === localStorage.getItem(KEY)); if (b) current = b; } catch {}
export const biome = () => current;
export function setBiome(id) {
  const b = BIOMES.find(x => x.id === id);
  if (!b || b === current) return;
  current = b;
  try { localStorage.setItem(KEY, id); } catch {}
  document.dispatchEvent(new CustomEvent('tarot:biome', { detail: b }));
}
// cráneos visibles según el modo: de noche entran los nocturnos si el bioma los tiene
export const skullsFor = (b, night) => { const n = b.skulls.filter(s => s.night); return night && n.length ? n : b.skulls.filter(s => !s.night); };
