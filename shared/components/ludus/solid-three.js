// ══════════════════════════════════════════════════════
// Los sólidos de ludus en Three.js: la geometría de cada uno y, para la
// navegación, sus seis lugares (aristas, vértices o caras, según el
// sólido; ver solids.js) con las regiones de su superficie que tocan a
// cada lugar, listas para pintarse como pegatinas.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

// geometría con radio circunscrito r
export function geometry(name, r = 1) {
  if (name === 'tetraedro') return new THREE.TetrahedronGeometry(r);
  if (name === 'octaedro') return new THREE.OctahedronGeometry(r);
  if (name === 'dodecaedro') return new THREE.DodecahedronGeometry(r);
  if (name === 'icosaedro') return new THREE.IcosahedronGeometry(r);
  const s = 2 * r / Math.sqrt(3); return new THREE.BoxGeometry(s, s, s);
}

// Caras poligonales (no triángulos), vértices únicos y aristas
function polyhedron(name) {
  const g = geometry(name), p = g.attributes.position, idx = g.index;
  const verts = [], key = v => v.toArray().map(x => Math.round(x * 1e3) + 0).join(','), vmap = new Map();
  const vid = v => { const k = key(v); if (!vmap.has(k)) { vmap.set(k, verts.length); verts.push(v.clone()); } return vmap.get(k); };
  const tri = i => new THREE.Vector3().fromBufferAttribute(p, idx ? idx.getX(i) : i);
  const n = idx ? idx.count : p.count, faces = new Map();
  for (let i = 0; i < n; i += 3) {
    const a = tri(i), b = tri(i + 1), c = tri(i + 2);
    const nrm = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const k = key(nrm); if (!faces.has(k)) faces.set(k, { normal: nrm, ids: new Set() });
    [a, b, c].forEach(v => faces.get(k).ids.add(vid(v)));
  }
  g.dispose();
  // ordenar cada cara alrededor de su centro (sentido antihorario visto desde fuera)
  const polys = [...faces.values()].map(({ normal, ids }) => {
    const vs = [...ids], c = vs.reduce((s, i) => s.add(verts[i]), new THREE.Vector3()).divideScalar(vs.length);
    const u = new THREE.Vector3().subVectors(verts[vs[0]], c).normalize(), w = new THREE.Vector3().crossVectors(normal, u);
    vs.sort((i, j) => { const a = verts[i].clone().sub(c), b = verts[j].clone().sub(c); return Math.atan2(a.dot(w), a.dot(u)) - Math.atan2(b.dot(w), b.dot(u)); });
    return { normal, center: c, vs };
  });
  const edges = new Map();
  polys.forEach(f => f.vs.forEach((a, k) => { const b = f.vs[(k + 1) % f.vs.length], e = a < b ? `${a}-${b}` : `${b}-${a}`; if (!edges.has(e)) edges.set(e, [Math.min(a, b), Math.max(a, b)]); }));
  return { verts, polys, edges: [...edges.values()] };
}

// Los seis lugares de cada sólido. Cada «sitio» es un punto de la
// superficie con su dirección y el lugar (0 a 5) al que pertenece; en los
// pares opuestos, los dos extremos son sitios del mismo lugar.
const KIND = { tetraedro: 'edge', octaedro: 'vertex', icosaedro: 'vertex', dodecaedro: 'face' };
export function layout(name) {
  const { verts, polys, edges } = polyhedron(name), kind = KIND[name];
  const raw = kind === 'edge' ? edges.map(([a, b]) => verts[a].clone().add(verts[b]).multiplyScalar(0.5))
    : kind === 'vertex' ? verts.map(v => v.clone()) : polys.map(f => f.center.clone());
  // agrupar opuestos cuando hay doce (icosaedro y dodecaedro)
  const place = new Array(raw.length).fill(-1); let next = 0;
  raw.forEach((p, i) => {
    if (place[i] >= 0) return; place[i] = next;
    if (raw.length === 12) { const j = raw.findIndex((q, k) => k !== i && q.clone().normalize().dot(p.clone().normalize()) < -0.999); if (j >= 0) place[j] = next; }
    next++;
  });
  const sites = raw.map((p, i) => ({ point: p, dir: p.clone().normalize(), place: place[i] }));
  // regiones: polígonos de la superficie, cada uno del lugar más cercano
  const regions = [];
  const vSite = new Map(); if (kind === 'vertex') verts.forEach((v, i) => vSite.set(i, sites[i].place));
  const eSite = new Map(); if (kind === 'edge') edges.forEach(([a, b], i) => eSite.set(`${a}-${b}`, sites[i].place));
  polys.forEach((f, fi) => {
    const P = f.vs.map(i => verts[i]), c = f.center, m = P.length;
    if (kind === 'face') regions.push({ place: sites[fi].place, normal: f.normal, pts: P });
    else if (kind === 'vertex') P.forEach((v, k) => {
      const prev = P[(k + m - 1) % m], nxt = P[(k + 1) % m];
      regions.push({ place: vSite.get(f.vs[k]), normal: f.normal, pts: [c, prev.clone().add(v).multiplyScalar(0.5), v, nxt.clone().add(v).multiplyScalar(0.5)] });
    });
    else P.forEach((v, k) => {
      const a = f.vs[k], b = f.vs[(k + 1) % m];
      regions.push({ place: eSite.get(a < b ? `${a}-${b}` : `${b}-${a}`), normal: f.normal, pts: [c, v, P[(k + 1) % m]] });
    });
  });
  return { verts, polys, edges, sites, regions };
}

// Un BufferGeometry por lugar con sus regiones encogidas (pegatinas)
export function stickers(lay, shrink = 0.84, lift = 0.012) {
  const per = Array.from({ length: 6 }, () => []);
  lay.regions.forEach(({ place, normal, pts }) => {
    const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const q = pts.map(p => p.clone().sub(c).multiplyScalar(shrink).add(c).addScaledVector(normal, lift));
    for (let k = 1; k < q.length - 1; k++) per[place].push(q[0], q[k], q[k + 1]);
  });
  return per.map(list => { const g = new THREE.BufferGeometry().setFromPoints(list); g.computeVertexNormals(); return g; });
}
