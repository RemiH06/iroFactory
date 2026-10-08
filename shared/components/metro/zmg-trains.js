// ══════════════════════════════════════════════════════
// Tren Ligero de la ZMG · simulación compartida (sin Three).
// Las líneas salen de OpenStreetMap (assets/data/metro/zmg-map.json):
// polilíneas en metros con el nivel de cada tramo (túnel, superficie,
// puente) y sus estaciones. Cada línea lleva trenes en ambos sentidos
// que paran en las estaciones, a veces se demoran o quedan retenidos,
// y al llegar al borde del mapa esperan y regresan. El tablero, el mapa
// y la ciudad 3D leen los mismos trenes.
// ══════════════════════════════════════════════════════
const SPEED = 16;          // m/s en la simulación
const DWELL = 5;           // s en andén
const TRACK = 1.8;         // m del eje a cada vía (sentido derecho)
const Y = { '-5': -22, '-4': -20, '-3': -18, '-2': -14, '-1': -9, 0: 0.6, 1: 9, 2: 11 };
const rnd = (a, b) => a + Math.random() * (b - a);

function prepare(l) {
  const n = l.pts.length, S = new Float64Array(n);
  for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
  // altura por vértice, suavizada en ±70 m para que las rampas no sean escalones
  const raw = l.pts.map(p => Y[p[2]] ?? 0), ys = raw.map((_, i) => { let a = 0, w = 0; for (let j = 0; j < n; j++) { const d = Math.abs(S[j] - S[i]); if (d < 70) { const k = 1 - d / 70; a += raw[j] * k; w += k; } } return a / w; });
  const len = S[n - 1];
  // estaciones proyectadas sobre la línea (distancia recorrida), sin duplicados
  const proj = (x, z) => { let best = 0, bd = Infinity; for (let i = 1; i < n; i++) { const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); const d = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2; if (d < bd) { bd = d; best = S[i - 1] + t * Math.sqrt(L2); } } return best; };
  const stations = [];
  for (const st of l.stations) { const s = proj(st.x, st.z); if (s > 1 && s < len - 1 && !stations.some(o => o.name === st.name)) stations.push({ name: st.name, s, x: st.x, z: st.z }); }
  stations.sort((a, b) => a.s - b.s);
  return { ...l, S, ys, len, stations };
}

// Punto sobre la línea a la distancia s (x, y, z y rumbo), corrido a la vía del sentido `dir`.
export function pointAt(line, s, dir = 1, out = {}) {
  const { S, pts, ys } = line; s = Math.max(0, Math.min(line.len, s));
  let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
  const t = (s - S[lo]) / ((S[hi] - S[lo]) || 1), [ax, az] = pts[lo], [bx, bz] = pts[hi];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, ux = dx / L * dir, uz = dz / L * dir;
  out.x = ax + dx * t - uz * TRACK; out.z = az + dz * t + ux * TRACK; out.y = ys[lo] + (ys[hi] - ys[lo]) * t;
  out.hx = ux; out.hz = uz; return out;
}

export function createSim(data) {
  const lines = data.lines.map(prepare);
  const trains = [];
  lines.forEach((line, li) => {
    // cuatro trenes por línea, dos por sentido, repartidos a lo largo
    [[1, 0.2], [-1, 0.75], [1, 0.62], [-1, 0.3]].forEach(([dir, f], k) =>
      trains.push({ line, li, k, dir, s: line.len * f, status: 'ok', speed: 1, until: rnd(4, 20), dwell: 0, wait: 0, next: null, eta: 0, lastStop: null }));
  });
  const nextStation = t => {
    const st = t.line.stations;
    return t.dir > 0 ? st.find(o => o.s > t.s + 0.5) : [...st].reverse().find(o => o.s < t.s - 0.5);
  };
  const roll = (t, now) => {
    const r = Math.random();
    t.status = r < 0.7 ? 'ok' : r < 0.9 ? 'warn' : 'danger';
    t.speed = t.status === 'ok' ? 1 : t.status === 'warn' ? 0.45 : 0;
    t.until = now + (t.status === 'danger' ? rnd(5, 9) : rnd(14, 28));
  };
  let now = 0;
  const step = dt => {
    now += dt;
    for (const t of trains) {
      if (now > t.until) roll(t, now);
      if (t.wait > 0) { t.wait -= dt; if (t.wait <= 0) t.dir *= -1; }
      else if (t.dwell > 0) t.dwell -= dt;
      else {
        const n = nextStation(t), before = t.s;
        t.s += t.dir * SPEED * t.speed * dt;
        if (n && t.speed > 0 && (t.dir > 0 ? before < n.s && t.s >= n.s : before > n.s && t.s <= n.s)) { t.s = n.s; t.dwell = DWELL; t.lastStop = n; }
        if (t.s <= 0 || t.s >= t.line.len) { t.s = Math.max(0, Math.min(t.line.len, t.s)); t.wait = rnd(6, 12); }
      }
      const n = t.dwell > 0 ? t.lastStop : nextStation(t);
      t.next = n || null;
      t.eta = t.dwell > 0 || !n ? 0 : Math.abs(n.s - t.s);
      t.toward = t.line.ends[t.dir > 0 ? 1 : 0];
    }
  };
  step(0);
  return { lines, trains, step, mapBox: data.mapBox, cityBox: data.cityBox };
}
