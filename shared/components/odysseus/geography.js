// ══════════════════════════════════════════════════════
// Geografía real: Natural Earth (mundo, regiones, costa de Río) y
// OpenStreetMap (calles alrededor de cada maravilla). Anillos en deltas
// enteros; se arman como Path2D una sola vez.
// ══════════════════════════════════════════════════════
import DATA_od_geo from '../../../assets/data/odysseus/od-geo.js';

export const GEO = DATA_od_geo;
export const ringsOf = (str, q) => !str ? [] : str.split(';').map(s => { const a = s.split(',').map(Number), out = []; let x = a[0], y = a[1]; out.push([x / q, y / q]); for (let i = 2; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out.push([x / q, y / q]); } return out; });
export const pathOf = (rings, close) => { const p = new Path2D(); for (const r of rings) { r.forEach(([x, y], i) => (i ? p.lineTo(x, -y) : p.moveTo(x, -y))); if (close) p.closePath(); } return p; };
export const WORLD = { countries: pathOf(ringsOf(GEO.world.countries, 10), true), regions: {}, coast10: {} };
export const CITY = {};
export const cityLayers = id => {
  if (CITY[id]) return CITY[id];
  const s = GEO.sites[id], L = {};
  for (const cls of ['green', 'water', 'river', 'coast', 'path', 'minor', 'major', 'landmark']) L[cls] = pathOf(ringsOf(s[cls], 1), cls === 'green' || cls === 'water' || cls === 'landmark');
  return (CITY[id] = L);
};
export const PORTS = [
  { id: 'chichen', name: 'Chichén Itzá', wonder: 'Chichén Itzá', place: 'Yucatán, México', iata: 'CZA' },
  { id: 'machu', name: 'Machu Picchu', wonder: 'Machu Picchu', place: 'Cusco, Perú', iata: 'CUZ' },
  { id: 'cristo', name: 'Río de Janeiro', wonder: 'Cristo Redentor', place: 'Brasil', iata: 'GIG' },
  { id: 'coliseo', name: 'Roma', wonder: 'Coliseo', place: 'Italia', iata: 'FCO' },
  { id: 'petra', name: 'Petra', wonder: 'Petra', place: "Ma'an, Jordania", iata: 'AQJ' },
  { id: 'taj', name: 'Agra', wonder: 'Taj Mahal', place: 'Uttar Pradesh, India', iata: 'AGR' },
  { id: 'muralla', name: 'Badaling', wonder: 'Gran Muralla', place: 'Pekín, China', iata: 'PEK' },
].map(p => ({ ...p, lat: GEO.sites[p.id].lat, lon: GEO.sites[p.id].lon, r: GEO.sites[p.id].r }));
export const HOME = { id: 'gdl', name: 'Guadalajara', iata: 'GDL', lat: 20.6597, lon: -103.3496 };
export const fmtCoords = p => `${Math.abs(p.lat).toFixed(2)}° ${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lon).toFixed(2)}° ${p.lon >= 0 ? 'E' : 'O'}`;
export function mount() {
for (const [id, s] of Object.entries(GEO.world.regions)) WORLD.regions[id] = pathOf(ringsOf(s, 50), true);
for (const [id, s] of Object.entries(GEO.world.coast10)) WORLD.coast10[id] = pathOf(ringsOf(s, 20000), true);
}
