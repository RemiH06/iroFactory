// ══════════════════════════════════════════════════════
// Mapa: hoja inclinada sobre la mesa con cámara (centro + zoom). Del
// mapamundi a las calles por niveles: países 110m → tierra 50m de la
// región → costa 10m (Río) → calles de OpenStreetMap con relieve.
// ══════════════════════════════════════════════════════
import { $, clamp, coarsePointer, cssVar, isDark, lerp, makeLoop, onTheme, reduceMotion, rgba, smooth } from './kit.js';
import { HOME, PORTS, WORLD, cityLayers } from './geography.js';
import { galaxy } from './galaxy.js';
import { topo } from './topography.js';

export const map = (() => {
  const stage = $('.od-stage'), canvas = $('#od-map'), ctx = canvas.getContext('2d');
  const ROT0 = ((Math.random() * 4) - 2) * Math.PI / 180;
  let W = 1, H = 1, dpr = 1, sheet = { w: 1, h: 1, rot: 0 }, zWorld = 0, cam = null, flight = null, hover = -1, compass = { a: 0, t: 0, next: 0 }, lastT = 0;
  let active = -1, route = new Set(), pal = {};
  const readPal = () => { pal = {}; for (const n of ['--sea', '--sea-dk', '--land', '--land-dk', '--ink', '--rust', '--stain', '--route', '--wonder', '--visited', '--unvisited', '--compass', '--bg', '--bg2', '--parchment', '--text', '--white']) pal[n] = cssVar(n); };
  const worldCam = () => ({ lon: sheet.w < sheet.h ? 6 : 12, lat: 12, z: zWorld });
  const cityZ = p => Math.log2((Math.min(sheet.w, sheet.h) / 2) / ((p.r * 0.78) / 110540));
  const portCam = p => ({ lon: p.lon, lat: p.lat, z: cityZ(p) });
  const layout = () => {
    const r = stage.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const pad = W < 700 ? 14 : 30, rot = W < 700 ? ROT0 * 0.5 : ROT0, c = Math.cos(rot), s = Math.abs(Math.sin(rot)), det = c * c - s * s;
    const sw = W - 2 * pad, sh = H - 2 * pad - (W >= 700 ? 10 : 0);
    sheet = { w: (sw * c - sh * s) / det, h: (sh * c - sw * s) / det, rot };
    // En vertical el mundo entero queda en una franja: se encuadra la ruta
    // (de Guadalajara a Pekín con sus etiquetas, ~255° de longitud) para que se lea.
    zWorld = Math.log2(Math.min(sheet.w / (sheet.w < sheet.h ? 255 : 360), sheet.h / 150));
    if (!cam) cam = worldCam(); else if (active < 0 && !flight) cam = worldCam(); else if (active >= 0 && !flight) cam = portCam(PORTS[active]);
    if (galaxy) galaxy.resize(sheet.w * 0.5, sheet.h * 0.5);
    if (topo) topo.resize(sheet.w * 0.5, sheet.h * 0.5);
  };
  // Matriz base: dpr · centro del escenario · giro de la hoja · origen en su esquina.
  const base = () => new DOMMatrix().scaleSelf(dpr, dpr).translateSelf(W / 2, H / 2).rotateSelf(sheet.rot * 180 / Math.PI).translateSelf(-sheet.w / 2, -sheet.h / 2);
  const view = () => { const k = 2 ** cam.z, zr = cam.z - zWorld, cosRef = Math.cos(cam.lat * Math.PI / 180 * smooth(4, 9, zr)); return { k, zr, cosRef }; };
  const project = (lon, lat, v) => [sheet.w / 2 + (lon - cam.lon) * v.k * v.cosRef, sheet.h / 2 - (lat - cam.lat) * v.k];
  const siteNear = () => PORTS.find(p => Math.abs(cam.lon - p.lon) < 13 && Math.abs(cam.lat - p.lat) < 9);
  const degXf = v => [v.k * v.cosRef, 0, 0, v.k, sheet.w / 2 - cam.lon * v.k * v.cosRef, sheet.h / 2 + cam.lat * v.k];

  const constellations = [
    { name: 'Osa Mayor', pts: [[.08, .2], [.14, .16], [.2, .18], [.25, .23], [.26, .32], [.33, .33], [.34, .25]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { name: 'Boyero', pts: [[.5, .42], [.47, .32], [.49, .21], [.53, .15], [.57, .22], [.55, .32]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
    { name: 'Pléyades', pts: [[.8, .22], [.83, .2], [.85, .24], [.82, .26], [.79, .25], [.84, .28], [.81, .19]], lines: [] },
  ];

  const frame = t => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    if (flight) {
      const s0 = clamp((t - flight.t0) / flight.dur, 0, 1), s = s0 < 0.5 ? 4 * s0 * s0 * s0 : 1 - Math.pow(-2 * s0 + 2, 3) / 2;
      const m = smooth(0.12, 0.88, s);
      cam = { lon: lerp(flight.A.lon, flight.B.lon, m), lat: lerp(flight.A.lat, flight.B.lat, m), z: (1 - s) * (1 - s) * flight.A.z + 2 * s * (1 - s) * flight.zM + s * s * flight.B.z };
      if (s0 >= 1) { const done = flight.done; cam = { ...flight.B }; flight = null; done && done(); }
    }
    const v = view(), M = base();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sombra de la hoja sobre la mesa
    ctx.setTransform(M); ctx.save();
    ctx.shadowColor = isDark ? 'rgba(4,2,6,.75)' : 'rgba(60,30,0,.45)'; ctx.shadowBlur = 28 * dpr; ctx.shadowOffsetX = 6 * dpr; ctx.shadowOffsetY = 9 * dpr;
    ctx.fillStyle = pal['--parchment']; ctx.fillRect(0, 0, sheet.w, sheet.h); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sheet.w, sheet.h); ctx.clip();
    const night = isDark, cityA = smooth(cityZ(PORTS[0]) - zWorld - 3.2, cityZ(PORTS[0]) - zWorld - 1.2, v.zr);
    // 1 · Mar (de noche, el cielo de Galaxy a escala de mundo)
    ctx.fillStyle = night ? pal['--sea-dk'] : pal['--sea']; ctx.fillRect(0, 0, sheet.w, sheet.h);
    const skyA = night ? 1 - smooth(5, 8, v.zr) : 0;
    if (skyA > 0.01 && galaxy) { galaxy.render(t); ctx.globalAlpha = skyA; ctx.drawImage(galaxy.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = 1; }
    // 2 · Retícula
    const gridA = (1 - smooth(6, 8.5, v.zr)) * (night ? 0.35 : 0.55);
    if (gridA > 0.01) {
      const step = v.zr < 3 ? 30 : v.zr < 5.5 ? 10 : 2;
      ctx.strokeStyle = night ? pal['--stain'] : pal['--sea-dk']; ctx.lineWidth = 0.6; ctx.globalAlpha = gridA; ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += step) { const [x] = project(lon, 0, v); if (x > -2 && x < sheet.w + 2) { ctx.moveTo(x, 0); ctx.lineTo(x, sheet.h); } }
      for (let lat = -90; lat <= 90; lat += step) { const [, y] = project(0, lat, v); if (y > -2 && y < sheet.h + 2) { ctx.moveTo(0, y); ctx.lineTo(sheet.w, y); } }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // 3 · Tierra por nivel de detalle
    const near = siteNear(), xf = degXf(v), sx = Math.sqrt(xf[0] * xf[3]);
    ctx.save(); ctx.transform(...xf);
    ctx.fillStyle = night ? pal['--land'] : pal['--land'];
    if (near && v.zr >= 3 && WORLD.regions[near.id]) {
      ctx.fill(WORLD.regions[near.id], 'evenodd');
      if (WORLD.coast10[near.id] && v.zr >= 7) {
        const [lo, la] = [near.lon, near.lat];
        ctx.fillStyle = night ? pal['--sea-dk'] : pal['--sea']; ctx.fillRect(lo - 0.12, -(la + 0.1), 0.24, 0.2);
        ctx.fillStyle = pal['--land']; ctx.fill(WORLD.coast10[near.id], 'evenodd');
      }
    } else ctx.fill(WORLD.countries, 'evenodd');
    const borderA = 1 - smooth(6, 9, v.zr);
    if (borderA > 0.01) { ctx.strokeStyle = pal['--ink']; ctx.globalAlpha = (night ? 0.45 : 0.4) * borderA; ctx.lineWidth = 0.7 / sx; ctx.stroke(WORLD.countries); ctx.globalAlpha = 1; }
    ctx.restore();
    // 4 · Relieve (Topography) y 5 · calles del puerto
    const city = near && cityA > 0.01 ? near : null;
    if (city && topo) { topo.render(t, PORTS.indexOf(city)); ctx.globalAlpha = cityA * (night ? 0.4 : 0.5); ctx.drawImage(topo.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = 1; }
    if (city) drawCity(city, v, cityA, night);
    // 6 · Ruta y 7 · alfileres
    const pinA = 1 - smooth(cityZ(PORTS[0]) - zWorld - 2.6, cityZ(PORTS[0]) - zWorld - 1.4, v.zr);
    if (pinA > 0.01) drawRoute(v, pinA, t);
    // 8 · Constelaciones (carta estelar)
    const starA = night ? 1 - smooth(1, 3, v.zr) : 0;
    if (starA > 0.01) drawStars(starA);
    // Etiquetas de océanos
    const oceanA = (1 - smooth(1, 2.5, v.zr)) * (night ? 0.3 : 0.32);
    if (oceanA > 0.01) {
      ctx.fillStyle = pal['--ink']; ctx.globalAlpha = oceanA; ctx.font = "14px 'Cabaret Voltaire', 'IM Fell English', serif"; ctx.textAlign = 'center';
      [['Oceanus Pacificus', -150, 4], ['Mare Atlanticum', -32, 16], ['Mare Indicum', 76, -18], ['Mare Arcticum', 10, 76]].forEach(([n, lo, la]) => { const [x, y] = project(lo, la, v); ctx.fillText(n, x, y); });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Marco doble de la hoja
    ctx.strokeStyle = pal['--ink']; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2; ctx.strokeRect(6, 6, sheet.w - 12, sheet.h - 12);
    ctx.lineWidth = 0.5; ctx.strokeRect(10, 10, sheet.w - 20, sheet.h - 20); ctx.globalAlpha = 1;
    drawCompass(v, dt);
  };

  function drawCity(p, v, a, night) {
    const L = cityLayers(p.id), kx0 = 111320 * Math.cos(p.lat * Math.PI / 180);
    const A = v.k * v.cosRef / kx0, D = v.k / 110540, E = sheet.w / 2 + (p.lon - cam.lon) * v.k * v.cosRef, F = sheet.h / 2 - (p.lat - cam.lat) * v.k, sc = Math.sqrt(A * D);
    ctx.save(); ctx.globalAlpha = a; ctx.transform(A, 0, 0, D, E, F);
    const wpx = px => px / sc;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = night ? rgba(pal['--visited'], 0.22) : rgba(pal['--visited'], 0.2); ctx.fill(L.green);
    ctx.fillStyle = night ? pal['--sea'] : pal['--sea']; ctx.fill(L.water);
    ctx.strokeStyle = pal['--sea-dk']; ctx.lineWidth = wpx(night ? 1.2 : 1); ctx.stroke(L.water);
    ctx.strokeStyle = night ? rgba(pal['--sea'], 1) : pal['--sea-dk']; ctx.lineWidth = wpx(1.6); ctx.stroke(L.river);
    ctx.strokeStyle = pal['--ink']; ctx.lineWidth = wpx(1); ctx.globalAlpha = a * 0.6; ctx.stroke(L.coast); ctx.globalAlpha = a;
    ctx.setLineDash([wpx(3), wpx(3)]); ctx.strokeStyle = night ? pal['--stain'] : pal['--ink']; ctx.globalAlpha = a * 0.45; ctx.lineWidth = wpx(0.8); ctx.stroke(L.path); ctx.setLineDash([]);
    if (night) {
      // De noche las calles son luces de ciudad: halo ancho y trazo fino, sumados.
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(pal['--compass'], 0.16); ctx.lineWidth = wpx(3.2); ctx.globalAlpha = a; ctx.stroke(L.minor);
      ctx.strokeStyle = rgba(pal['--compass'], 0.55); ctx.lineWidth = wpx(0.9); ctx.stroke(L.minor);
      ctx.strokeStyle = rgba(pal['--compass'], 0.3); ctx.lineWidth = wpx(5); ctx.stroke(L.major);
      ctx.strokeStyle = rgba(pal['--compass'], 0.9); ctx.lineWidth = wpx(1.6); ctx.stroke(L.major);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.strokeStyle = pal['--ink']; ctx.globalAlpha = a * 0.55; ctx.lineWidth = wpx(0.9); ctx.stroke(L.minor);
      ctx.globalAlpha = a; ctx.strokeStyle = pal['--parchment']; ctx.lineWidth = wpx(3.6); ctx.stroke(L.major);
      ctx.strokeStyle = pal['--rust']; ctx.lineWidth = wpx(1.8); ctx.stroke(L.major);
    }
    ctx.globalAlpha = a; ctx.fillStyle = rgba(pal['--wonder'], night ? 0.45 : 0.35); ctx.fill(L.landmark);
    ctx.strokeStyle = pal['--wonder']; ctx.lineWidth = wpx(1.1); ctx.stroke(L.landmark);
    ctx.restore();
    // Marcador de la maravilla
    const [x, y] = project(p.lon, p.lat, v), pulse = reduceMotion.matches ? 0.5 : (performance.now() / 1400) % 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = pal['--wonder']; ctx.lineWidth = 2; ctx.globalAlpha = a * (1 - pulse); ctx.beginPath(); ctx.arc(x, y, 10 + pulse * 26, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = pal['--wonder']; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    label(p.wonder, x + 12, y - 12, 18, 'left');
    ctx.restore();
  }
  // Etiquetas en Cabaret Voltaire; el epígrafe de la Odisea sigue en IM Fell.
  // Cabaret no trae vocales acentuadas: se escribe la base y la tilde se traza.
  const ACUTE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
  function label(text, x, y, size, align, fell) {
    ctx.font = fell ? `italic ${size}px 'IM Fell English', serif` : `${size + 1}px 'Cabaret Voltaire', 'IM Fell English', serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    const halo = isDark ? rgba(pal['--bg'], 0.9) : rgba(pal['--parchment'], 0.92), base = fell ? text : [...text].map(c => ACUTE[c] || c).join('');
    ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.lineWidth = 4; ctx.strokeText(base, x, y);
    ctx.fillStyle = pal['--text']; ctx.fillText(base, x, y);
    if (base === text) return;
    const total = ctx.measureText(base).width, x0 = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
    ctx.save(); ctx.lineCap = 'round';
    [...text].forEach((c, i) => {
      if (!ACUTE[c]) return;
      const m = ctx.measureText(base[i]), cx = x0 + ctx.measureText(base.slice(0, i)).width + m.width / 2, top = y - m.actualBoundingBoxAscent;
      const seg = () => { ctx.beginPath(); ctx.moveTo(cx - size * 0.07, top - size * 0.1); ctx.lineTo(cx + size * 0.11, top - size * 0.3); ctx.stroke(); };
      ctx.strokeStyle = halo; ctx.lineWidth = size * 0.08 + 4; seg();
      ctx.strokeStyle = pal['--text']; ctx.lineWidth = size * 0.08; seg();
    });
    ctx.restore();
  }
  const pinPos = v => PORTS.map(p => project(p.lon, p.lat, v));
  function drawRoute(v, a, t) {
    const pts = [HOME, ...PORTS].map(p => project(p.lon, p.lat, v));
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < pts.length - 1; i++) {
      const done = route.has(i), [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.18;
      ctx.setLineDash(done ? [] : [5, 6]); ctx.strokeStyle = pal['--route']; ctx.globalAlpha = a * (done ? 0.95 : 0.55);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = a;
    const [hx, hy] = pts[0], small = sheet.w < 520; ctx.fillStyle = pal['--ink']; ctx.fillRect(hx - 4, hy - 4, 8, 8); label('Guadalajara', small ? hx - 4 : hx, hy + 16, small ? 12 : 13, small ? 'left' : 'center');
    const pulse = reduceMotion.matches ? 0.5 : (t / 1600) % 1;
    PORTS.forEach((p, i) => {
      const [x, y] = pts[i + 1], on = i === active || i === hover;
      if (i === active) { ctx.strokeStyle = pal['--route']; ctx.lineWidth = 2; ctx.globalAlpha = a * (1 - pulse); ctx.beginPath(); ctx.arc(x, y, 8 + pulse * 18, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = a; }
      ctx.fillStyle = isDark ? pal['--bg'] : pal['--parchment']; ctx.beginPath(); ctx.arc(x, y, on ? 9 : 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.visited ? pal['--visited'] : pal['--unvisited']; if (i === active) ctx.fillStyle = pal['--route'];
      ctx.beginPath(); ctx.arc(x, y, on ? 6.5 : 5, 0, Math.PI * 2); ctx.fill();
      // Etiquetas arriba o abajo del alfiler según el puerto: los vecinos no se enciman.
      const below = p.id === 'machu' || p.id === 'cristo' || p.id === 'petra';
      label(p.name, x, y + (below ? 17 : -17), on ? 16 : (sheet.w < 520 ? 12 : 14), 'center');
    });
    ctx.restore();
  }
  function drawStars(a) {
    ctx.save(); ctx.globalAlpha = a;
    for (const c of constellations) {
      // Comprimidas a la franja ártica (y 4% a 21%): ahí no hay alfileres.
      const P = c.pts.map(([x, y]) => [x * sheet.w, (0.04 + (y - 0.14) * 0.6) * sheet.h]);
      ctx.strokeStyle = rgba(pal['--compass'], 0.55); ctx.lineWidth = 1; ctx.beginPath();
      c.lines.forEach(([i, j]) => { ctx.moveTo(...P[i]); ctx.lineTo(...P[j]); }); ctx.stroke();
      P.forEach(([x, y], i) => { ctx.fillStyle = pal['--white']; ctx.beginPath(); ctx.arc(x, y, c.lines.length ? 2.4 : 1.8, 0, Math.PI * 2); ctx.fill(); });
      const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = Math.max(...P.map(p => p[1]));
      label(c.name, cx, cy + 18, 14, 'center');
    }
    if (sheet.w < 600) { label('Odisea, canto V: Odiseo gobierna', sheet.w - 18, sheet.h - 42, 12, 'right', true); label('mirando las Pléyades, el Boyero y la Osa.', sheet.w - 18, sheet.h - 25, 12, 'right', true); }
    else label('Odisea, canto V: Odiseo gobierna mirando las Pléyades, el Boyero y la Osa.', sheet.w / 2 + 40, sheet.h - 26, 13, 'center', true);
    ctx.restore();
  }
  function drawCompass(v, dt) {
    // La brújula titubea en el mapamundi; con un puerto, apunta a él.
    const r = Math.max(30, Math.min(sheet.w, sheet.h) * 0.085), cx = r + 26, cy = sheet.h - r - 26;
    if (active >= 0 || flight) {
      const target = flight ? flight.to : active, [px, py] = project(PORTS[target].lon, PORTS[target].lat, v);
      const want = Math.atan2(px - cx, -(py - cy));
      compass.t = Math.abs(px - cx) + Math.abs(py - cy) < 4 ? 0 : want;
    } else if (performance.now() > compass.next) { compass.t = (Math.random() - 0.5) * 0.36; compass.next = performance.now() + 1200 + Math.random() * 1600; }
    let d = compass.t - compass.a; d = Math.atan2(Math.sin(d), Math.cos(d)); compass.a += d * (reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 3));
    const gold = pal['--compass'], ink = pal['--ink'], red = pal['--route'];
    ctx.save(); ctx.shadowColor = isDark ? 'rgba(4,2,6,.65)' : 'rgba(60,30,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 5;
    const g = ctx.createRadialGradient(cx - r * .2, cy - r * .2, 0, cx, cy, r); g.addColorStop(0, isDark ? '#2A2038' : '#FDF8F0'); g.addColorStop(1, isDark ? '#120E20' : '#E8DCC8');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = gold; ctx.lineWidth = r * .06; ctx.stroke();
    ['N', 'E', 'S', 'O'].forEach((dd, i) => { const ang = Math.PI / 2 * i - Math.PI / 2; ctx.fillStyle = dd === 'N' ? red : ink; ctx.font = `${r * .24}px 'IM Fell English', serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dd, cx + Math.cos(ang) * r * .64, cy + Math.sin(ang) * r * .64); });
    for (let deg = 0; deg < 360; deg += 15) { const ang = deg * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r * .8, cy + Math.sin(ang) * r * .8); ctx.lineTo(cx + Math.cos(ang) * r * .9, cy + Math.sin(ang) * r * .9); ctx.strokeStyle = gold; ctx.lineWidth = deg % 90 ? 0.6 : 1.4; ctx.stroke(); }
    ctx.translate(cx, cy); ctx.rotate(compass.a);
    ctx.beginPath(); ctx.moveTo(0, -r * .62); ctx.lineTo(-r * .07, 0); ctx.lineTo(0, r * .13); ctx.lineTo(r * .07, 0); ctx.closePath(); ctx.fillStyle = red; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, r * .56); ctx.lineTo(-r * .06, 0); ctx.lineTo(0, -r * .13); ctx.lineTo(r * .06, 0); ctx.closePath(); ctx.fillStyle = gold; ctx.globalAlpha = .75; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * .07, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill();
    ctx.restore();
  }

  // ── Interacción: alfileres, puntero para Galaxy, vuelos
  const toSheet = e => { const r = canvas.getBoundingClientRect(), p = base().inverse().transformPoint(new DOMPoint((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr)); return [p.x, p.y]; };
  const hit = e => { const v = view(); if (v.zr > cityZ(PORTS[0]) - zWorld - 2.4) return -1; const [x, y] = toSheet(e); let best = -1, bd = coarsePointer.matches ? 26 : 16; pinPos(v).forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } }); return best; };
  canvas.addEventListener('pointermove', e => {
    const h = hit(e); if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? 'pointer' : ''; loop.still(); }
    if (galaxy) { const [x, y] = toSheet(e); galaxy.pointer(x / sheet.w, y / sheet.h, x > 0 && y > 0 && x < sheet.w && y < sheet.h); }
  });
  canvas.addEventListener('pointerleave', () => { hover = -1; if (galaxy) galaxy.pointer(0.5, 0.5, false); });
  canvas.addEventListener('click', e => { const h = hit(e); if (h >= 0 && api.onPick) api.onPick(h); });
  const loop = makeLoop(stage, frame);
  readPal(); layout();
  new ResizeObserver(() => { layout(); loop.still(); }).observe(stage);
  onTheme(() => { readPal(); loop.still(); });
  if (document.fonts) { document.fonts.ready.then(() => loop.still()); document.fonts.load("16px 'Cabaret Voltaire'").then(() => loop.still()); }
  const api = {
    onPick: null,
    flyTo(i, done) {
      const B = i >= 0 ? portCam(PORTS[i]) : worldCam();
      if (reduceMotion.matches) { cam = B; active = i; loop.still(); done && done(); return; }
      const A = { ...cam }, dist = Math.hypot(B.lon - A.lon, B.lat - A.lat);
      const zApex = zWorld + Math.max(0.4, 7.5 - Math.log2(1 + dist) * 1.4), lo = Math.min(A.z, B.z);
      const zM = zApex < lo ? 2 * zApex - (A.z + B.z) / 2 : (A.z + B.z) / 2;
      flight = { A, B, zM, t0: performance.now(), dur: 1500 + 1100 * Math.min(1, dist / 120), to: i >= 0 ? i : active, done: () => { active = i; done && done(); } };
      if (i < 0) flight.to = Math.max(0, active);
      loop.start();
    },
    markLeg(i) { route.add(i); },
    redraw: () => loop.still(),
  };
  loop.still();
  return api;
})();
