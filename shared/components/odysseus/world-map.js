// ══════════════════════════════════════════════════════
// Mapa: hoja inclinada sobre la mesa con cámara (centro + zoom). Del
// mapamundi a las calles por niveles: países 110m → tierra 50m de la
// región → costa 10m (Río) → calles de OpenStreetMap con relieve. La
// cámara es libre: se arrastra, se acerca con pellizco, Ctrl + rueda,
// doble clic o los botones, y la longitud da la vuelta. Al alejarse más
// allá del mapamundi la hoja se enrolla en un globo (globe-3d.js) que se
// gira; al acercarse se desenrolla. En táctil el dedo es del scroll de la
// página hasta que se abre el mapa a pantalla completa, como en metro.
// ══════════════════════════════════════════════════════
import { $, clamp, coarsePointer, cssVar, isDark, lerp, makeLoop, onTheme, reduceMotion, rgba, smooth } from './kit.js';
import { HOME, PORTS, WORLD, cityLayers } from './geography.js';
import { gcPoint, subsolar } from './nav-math.js';
import { galaxy } from './galaxy.js';
import { topo } from './topography.js';

export const map = (() => {
  const stage = $('.od-stage'), canvas = $('#od-map'), ctx = canvas.getContext('2d');
  const ROT0 = ((Math.random() * 4) - 2) * Math.PI / 180;
  let W = 1, H = 1, dpr = 1, sheet = { w: 1, h: 1, rot: 0 }, zWorld = 0, cam = null, flight = null, hover = -1, compass = { a: 0, t: 0, next: 0 }, lastT = 0;
  let active = -1, route = new Set(), pal = {};
  // free: la cámara la movió quien mira (un cambio de tamaño ya no la regresa a su sitio).
  // plan: la ruta de la bitácora, trazada por círculo máximo cuando se pide verla.
  let free = false, plan = null, planOn = false, spinIdle = 0;
  const gest = new Map(); // punteros activos sobre el mapa
  // Globo (globe-3d.js, Three.js): se carga al acercarse al mapa o al primer gesto.
  let globe = null, globeLoading = false, sun = subsolar(), sunT = 0;
  const GLOBE_DZ = 0.9; let gBoost = 0.3; // cuánto hay que alejarse del mapamundi para que el globo se cierre
  const wantGlobe = () => {
    if (globe || globeLoading) return; globeLoading = true;
    import('./globe-3d.js').then(m => { globe = m.createGlobe(); if (globe) { globe.resize(sheet.w, sheet.h); globe.refresh(pal, isDark); } loop.still(); }).catch(() => {});
  };
  // Esfera celeste 3D (sky-3d.js, Three.js): se carga la primera vez que se hace de noche.
  let sky = null, skyLoading = false;
  // La hoja que se curva en vuelo (sheet-curl.js, Three.js): se carga con el primer vuelo.
  let curl = null, curlLoading = false;
  const wantCurl = () => { if (curl || curlLoading || reduceMotion.matches) return; curlLoading = true; import('./sheet-curl.js').then(m => { curl = m.mount({ stage, source: canvas }); }).catch(() => {}); };
  const wantSky = () => {
    if (sky || skyLoading || !isDark) return; skyLoading = true;
    import('./sky-3d.js').then(m => { sky = m.createSky({ reduceMotion }); if (sky) sky.resize(sheet.w, sheet.h); loop.still(); }).catch(() => {});
  };
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
    // Al cerrarse, el globo mide el 80% del lado corto de la hoja: la escala del centro crece lo necesario.
    gBoost = clamp(Math.log2((2 * Math.PI * 0.4 * Math.min(sheet.w, sheet.h) / 360) / 2 ** zWorld), 0, 1.5);
    if (!cam) cam = worldCam(); else if (free && !flight) cam.z = clamp(cam.z, zMin(), zMax()); else if (active < 0 && !flight) cam = worldCam(); else if (active >= 0 && !flight) cam = portCam(PORTS[active]);
    if (galaxy) galaxy.resize(sheet.w * 0.5, sheet.h * 0.5);
    if (topo) topo.resize(sheet.w * 0.5, sheet.h * 0.5);
    if (sky) sky.resize(sheet.w, sheet.h);
    if (globe) globe.resize(sheet.w, sheet.h);
  };
  // Matriz base: dpr · centro del escenario · giro de la hoja · origen en su esquina.
  const base = () => new DOMMatrix().scaleSelf(dpr, dpr).translateSelf(W / 2, H / 2).rotateSelf(sheet.rot * 180 / Math.PI).translateSelf(-sheet.w / 2, -sheet.h / 2);
  const wrap = d => ((d % 360) + 540) % 360 - 180;
  // g: cuánto se enrolla la hoja en globo. Mientras se enrolla la escala del centro crece un poco (el globo se ve más grande).
  const view = () => {
    const g = globe ? smooth(0, 0.8, (zWorld - cam.z) / GLOBE_DZ) : 0, z = cam.z < zWorld ? zWorld + gBoost * g : cam.z;
    const k = 2 ** z, zr = cam.z - zWorld, cosRef = Math.cos(cam.lat * Math.PI / 180 * smooth(4, 9, zr));
    return { k, zr, cosRef, g, R: 360 * k / (2 * Math.PI) };
  };
  // Proyección: [x, y, de frente]. Plana (equirectangular con la longitud envuelta alrededor de la cámara)
  // o sobre la esfera de globe-3d.js con las mismas fórmulas que su vértice.
  const project = (lon, lat, v) => {
    const dx = wrap(lon - cam.lon);
    if (v.g < 1e-4) return [sheet.w / 2 + dx * v.k * v.cosRef, sheet.h / 2 - (lat - cam.lat) * v.k, 1];
    const rho = v.R / v.g, phi = lat * v.k / rho, lam = dx * v.k / rho, al = cam.lat * v.k / rho;
    const s2l = 2 * Math.sin(lam / 2) ** 2, s2d = 2 * Math.sin((phi - al) / 2) ** 2, cp = Math.cos(phi);
    const x = rho * cp * Math.sin(lam), y = rho * Math.sin(phi - al) + rho * cp * Math.sin(al) * s2l, z = -rho * s2d - rho * cp * Math.cos(al) * s2l;
    return [sheet.w / 2 + x, sheet.h / 2 - y, (z + rho) / rho];
  };
  const siteNear = () => PORTS.find(p => Math.abs(wrap(cam.lon - p.lon)) < 13 && Math.abs(cam.lat - p.lat) < 9);
  const degXf = v => [v.k * v.cosRef, 0, 0, v.k, sheet.w / 2 - cam.lon * v.k * v.cosRef, sheet.h / 2 + cam.lat * v.k];
  // Límites de la cámara: el globo abajo; arriba, las calles cerca de un puerto y la escala de región lejos de ellos.
  const zMin = () => zWorld - (globe || globeLoading ? GLOBE_DZ : 0.25);
  const zMax = () => { const p = siteNear(); return p ? cityZ(p) + 0.8 : zWorld + 4.5; };
  // Polilínea que se corta donde salta de orilla (la costura del mapa) o pasa detrás del globo.
  const poly = (pts, v) => {
    let open = false, px = 0; ctx.beginPath();
    for (const q of pts) {
      const [x, y, f] = project(q.lon, q.lat, v);
      if (f < 0.02 || (open && Math.abs(x - px) > sheet.w * 0.5)) { open = f >= 0.02; if (open) ctx.moveTo(x, y); px = x; continue; }
      open ? ctx.lineTo(x, y) : ctx.moveTo(x, y); open = true; px = x;
    }
  };

  const constellations = [
    { name: 'Osa Mayor', pts: [[.08, .2], [.14, .16], [.2, .18], [.25, .23], [.26, .32], [.33, .33], [.34, .25]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { name: 'Boyero', pts: [[.5, .42], [.47, .32], [.49, .21], [.53, .15], [.57, .22], [.55, .32]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
    { name: 'Pléyades', pts: [[.8, .22], [.83, .2], [.85, .24], [.82, .26], [.79, .25], [.84, .28], [.81, .19]], lines: [] },
  ];

  const frame = t => {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    if (flight) {
      const s0 = clamp((t - flight.t0) / flight.dur, 0, 1), s = s0 < 0.5 ? 4 * s0 * s0 * s0 : 1 - Math.pow(-2 * s0 + 2, 3) / 2;
      const m = smooth(0.12, 0.88, s); flight.s = s;
      cam = { lon: lerp(flight.A.lon, flight.B.lon, m), lat: lerp(flight.A.lat, flight.B.lat, m), z: (1 - s) * (1 - s) * flight.A.z + 2 * s * (1 - s) * flight.zM + s * s * flight.B.z };
      // La cámara sigue al avión (que va en arco) en todo el tramo; solo al despegar
      // se suelta poco a poco de la vista del mundo.
      if (flight.leg) {
        const [px, py] = legPoint(flight.leg, s), w = smooth(0, 0.15, s);
        // Vuelo alto a escala de continente casi todo el tramo; el descenso a la ciudad, al final.
        const d = smooth(0.62, 1, s);
        cam.z = lerp(lerp(flight.A.z, flight.zM, smooth(0, 0.3, s)), flight.B.z, d * d);
        cam.lon = lerp(cam.lon, cam.lon + wrap(px - cam.lon), w); cam.lat = lerp(cam.lat, py, w);
      }
      if (s0 >= 1) { const done = flight.done; cam = { ...flight.B, lon: wrap(flight.B.lon) }; flight = null; free = false; done && done(); }
    }
    // Fuera de un vuelo: la escala vuelve a su límite si se pasó (al dejar un puerto arrastrando)
    // y el globo gira solo, despacio, cuando nadie lo toca.
    if (!flight && cam) {
      inFrame = true; stepZoom(dt); stepFling(dt);
      const zx = zMax(); if (cam.z > zx) cam.z = lerp(cam.z, zx, Math.min(1, dt * 6));
      // Una hoja a medio enrollar no se queda así: al soltarla termina de cerrarse o se extiende.
      const gNow = view().g;
      if (gNow > 0.01 && gNow < 0.99 && !gest.size && !zoomAnim && t > spinIdle - 4600) zoomSoft((gNow > 0.5 ? zWorld - GLOBE_DZ : zWorld) - cam.z);
      inFrame = false;
      if (!reduceMotion.matches && !gest.size && t > spinIdle && view().g > 0.98) { cam.lon = wrap(cam.lon + dt * 4); if (sky && isDark) sky.drag(dt * 4 * view().k, 0); }
    }
    if (t - sunT > 60000) { sun = subsolar(); sunT = t; }
    const v = view(), M = base();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sombra de la hoja sobre la mesa
    ctx.setTransform(M); ctx.save();
    ctx.shadowColor = isDark ? 'rgba(4,2,6,.75)' : 'rgba(60,30,0,.45)'; ctx.shadowBlur = 28 * dpr; ctx.shadowOffsetX = 6 * dpr; ctx.shadowOffsetY = 9 * dpr;
    ctx.fillStyle = pal['--parchment']; ctx.fillRect(0, 0, sheet.w, sheet.h); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sheet.w, sheet.h); ctx.clip();
    const night = isDark, cityA = smooth(cityZ(PORTS[0]) - zWorld - 3.2, cityZ(PORTS[0]) - zWorld - 1.2, v.zr);
    // El globo tapa la carta plana en cuanto empieza a enrollarse; un instante se funden.
    const near = siteNear(), globeA = globe ? smooth(0, 0.06, v.g) : 0, flatA = 1 - smooth(0.06, 0.1, v.g);
    const skyA = night ? 1 - smooth(5, 8, v.zr) : 0, starA = night ? 1 - smooth(1, 3, v.zr) : 0;
    if (flatA > 0.01) {
      // 1 · Mar (de noche, el cielo de Galaxy a escala de mundo)
      ctx.fillStyle = night ? pal['--sea-dk'] : pal['--sea']; ctx.fillRect(0, 0, sheet.w, sheet.h);
      if (skyA > 0.01 && galaxy) { galaxy.render(t); ctx.globalAlpha = skyA; ctx.drawImage(galaxy.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = 1; }
      // 2 · Retícula
      const gridA = (1 - smooth(6, 8.5, v.zr)) * (night ? 0.35 : 0.55);
      if (gridA > 0.01) {
        const step = v.zr < 3 ? 30 : v.zr < 5.5 ? 10 : 2;
        ctx.strokeStyle = night ? pal['--stain'] : pal['--sea-dk']; ctx.lineWidth = 0.6; ctx.globalAlpha = gridA; ctx.beginPath();
        for (let lon = -180; lon < 180; lon += step) { const [x] = project(lon, 0, v); if (x > -2 && x < sheet.w + 2) { ctx.moveTo(x, 0); ctx.lineTo(x, sheet.h); } }
        for (let lat = -90; lat <= 90; lat += step) { const [, y] = project(cam.lon, lat, v); if (y > -2 && y < sheet.h + 2) { ctx.moveTo(0, y); ctx.lineTo(sheet.w, y); } }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      // 3 · Tierra por nivel de detalle; el mundo se repite a los lados para que la longitud dé la vuelta.
      const xf = degXf(v), sx = Math.sqrt(xf[0] * xf[3]), half = sheet.w / 2 / xf[0];
      ctx.save(); ctx.transform(...xf);
      ctx.fillStyle = pal['--land'];
      const copies = [-360, 0, 360].filter(o => cam.lon - half < 180 + o && cam.lon + half > -180 + o);
      if (near && v.zr >= 3 && WORLD.regions[near.id]) {
        ctx.save(); ctx.translate(cam.lon - wrap(cam.lon - near.lon) - near.lon, 0);
        ctx.fill(WORLD.regions[near.id], 'evenodd');
        if (WORLD.coast10[near.id] && v.zr >= 7) {
          const [lo, la] = [near.lon, near.lat];
          ctx.fillStyle = night ? pal['--sea-dk'] : pal['--sea']; ctx.fillRect(lo - 0.12, -(la + 0.1), 0.24, 0.2);
          ctx.fillStyle = pal['--land']; ctx.fill(WORLD.coast10[near.id], 'evenodd');
        }
        ctx.restore();
      } else for (const o of copies) { ctx.save(); ctx.translate(o, 0); ctx.fill(WORLD.countries, 'evenodd'); ctx.restore(); }
      const borderA = 1 - smooth(6, 9, v.zr);
      if (borderA > 0.01) { ctx.strokeStyle = pal['--ink']; ctx.globalAlpha = (night ? 0.45 : 0.4) * borderA; ctx.lineWidth = 0.7 / sx; for (const o of copies) { ctx.save(); ctx.translate(o, 0); ctx.stroke(WORLD.countries); ctx.restore(); } ctx.globalAlpha = 1; }
      ctx.restore();
    }
    if (globeA > 0.01) drawGlobe(t, v, globeA, night, starA);
    // 4 · Relieve (Topography) y 5 · calles del puerto
    const city = near && cityA > 0.01 ? near : null;
    if (city && topo) { topo.render(t, PORTS.indexOf(city)); ctx.globalAlpha = cityA * (night ? 0.4 : 0.5); ctx.drawImage(topo.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = 1; }
    if (city) drawCity(city, v, cityA, night);
    // 6 · Ruta y 7 · alfileres
    const pinA = 1 - smooth(cityZ(PORTS[0]) - zWorld - 2.6, cityZ(PORTS[0]) - zWorld - 1.4, v.zr);
    if (pinA > 0.01) { if (planOn && plan) drawPlan(v, pinA); drawRoute(v, pinA, t); }
    // El avión se ve todo el vuelo: la cámara avanza a su ritmo, así que queda cerca del centro.
    if (flight && flight.leg) drawPlane(v, flight.leg, flight.s || 0);
    // 8 · Constelaciones (carta estelar)
    // (con el globo, el cielo va detrás de él: lo pinta drawGlobe)
    const topStarA = starA * (1 - globeA);
    if (topStarA > 0.01) {
      if (sky) { sky.render(t); ctx.globalAlpha = topStarA; ctx.drawImage(sky.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = 1; drawSkyLabels(topStarA); }
      else drawStars(topStarA);
    }
    // Etiquetas de océanos
    const oceanA = (1 - smooth(1, 2.5, v.zr)) * (night ? 0.3 : 0.32);
    if (oceanA > 0.01) {
      ctx.fillStyle = pal['--ink']; ctx.globalAlpha = oceanA; ctx.font = "14px 'Cabaret Voltaire', 'IM Fell English', serif"; ctx.textAlign = 'center';
      [['Oceanus Pacificus', -150, 4], ['Mare Atlanticum', -32, 16], ['Mare Indicum', 76, -18], ['Mare Arcticum', 10, 76]].forEach(([n, lo, la]) => { const [x, y, f] = project(lo, la, v); if (f > 0.3) ctx.fillText(n, x, y); });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Marco doble de la hoja
    ctx.strokeStyle = pal['--ink']; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2; ctx.strokeRect(6, 6, sheet.w - 12, sheet.h - 12);
    ctx.lineWidth = 0.5; ctx.strokeRect(10, 10, sheet.w - 20, sheet.h - 20); ctx.globalAlpha = 1;
    drawCompass(v, dt);
    if (curl) {
      if (flight && flight.leg) { const [x0] = project(...legPoint(flight.leg, 0), v), [x1] = project(...legPoint(flight.leg, 1), v); curl.show(true); curl.frame(flight.s || 0, Math.sign(x1 - x0) || 1); }
      else curl.show(false);
    }
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
  const arc = (leg, n = 24) => Array.from({ length: n + 1 }, (_, k) => { const [lon, lat] = legPoint(leg, k / n); return { lon, lat }; });
  function drawRoute(v, a, t) {
    const pts = [HOME, ...PORTS].map(p => project(p.lon, p.lat, v));
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    // Los tramos de la carta son arcos en grados (los mismos que sigue el avión), muestreados para que se corten en la costura.
    for (let i = 0; i < pts.length - 1; i++) {
      const done = route.has(i);
      ctx.setLineDash(done ? [] : [5, 6]); ctx.strokeStyle = pal['--route']; ctx.globalAlpha = a * (done ? 0.95 : 0.55);
      poly(arc([i, i + 1]), v); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = a;
    const [hx, hy, hf] = pts[0], small = sheet.w < 520;
    if (hf > 0.05) { ctx.fillStyle = pal['--ink']; ctx.fillRect(hx - 4, hy - 4, 8, 8); label('Guadalajara', small ? hx - 4 : hx, hy + 16, small ? 12 : 13, small ? 'left' : 'center'); }
    const pulse = reduceMotion.matches ? 0.5 : (t / 1600) % 1;
    PORTS.forEach((p, i) => {
      const [x, y, f] = pts[i + 1], on = i === active || i === hover;
      if (f < 0.05) return;
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
  // Avión que recorre el tramo del vuelo: el trazo se vuelve continuo detrás de él.
  // El arco se define en grados (el mismo que sigue la cámara) y luego se proyecta.
  const legPoint = ([i0, i1], u) => {
    const R = [HOME, ...PORTS], P0 = R[i0], P1 = R[i1], d = Math.hypot(P1.lon - P0.lon, P1.lat - P0.lat);
    const cx = (P0.lon + P1.lon) / 2, cy = (P0.lat + P1.lat) / 2 + d * 0.18;
    return [(1 - u) * (1 - u) * P0.lon + 2 * u * (1 - u) * cx + u * u * P1.lon, (1 - u) * (1 - u) * P0.lat + 2 * u * (1 - u) * cy + u * u * P1.lat];
  };
  function drawPlane(v, leg, s) {
    const at = u => project(...legPoint(leg, u), v);
    ctx.save(); ctx.strokeStyle = pal['--route']; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    poly(Array.from({ length: 33 }, (_, k) => { const [lon, lat] = legPoint(leg, s * k / 32); return { lon, lat }; }), v); ctx.stroke();
    const [px, py] = at(s), [qx, qy] = at(Math.min(1, s + 0.01)), ang = Math.atan2(qy - py, qx - px);
    ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = pal['--route']; ctx.strokeStyle = isDark ? pal['--bg'] : pal['--parchment']; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
  // Ruta de la bitácora: círculos máximos de verdad (en la carta plana se ven curvos), con rombos en las escalas.
  function drawPlan(v, a) {
    const st = plan.stops; if (st.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < st.length - 1; i++) {
      const pts = Array.from({ length: 49 }, (_, k) => gcPoint(st[i], st[i + 1], k / 48));
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = isDark ? rgba(pal['--bg'], 0.85) : rgba(pal['--parchment'], 0.9); ctx.lineWidth = 4.5; poly(pts, v); ctx.stroke();
      ctx.strokeStyle = pal['--wonder']; ctx.lineWidth = 2; poly(pts, v); ctx.stroke();
    }
    st.forEach((p, i) => {
      const [x, y, f] = project(p.lon, p.lat, v); if (f < 0.05) return;
      const r = i === plan.sel ? 6 : 4.5; ctx.globalAlpha = a;
      ctx.fillStyle = pal['--wonder']; ctx.strokeStyle = isDark ? pal['--bg'] : pal['--parchment']; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }
  // Globo: sombra en el papel, de noche el cielo detrás, la esfera y su filo a tinta.
  function drawGlobe(t, v, a, night, starA) {
    const cx = sheet.w / 2, cy = sheet.h / 2, ring = smooth(0.75, 1, v.g);
    ctx.save(); ctx.globalAlpha = a;
    if (starA > 0.01) {
      if (galaxy) { galaxy.render(t); ctx.drawImage(galaxy.canvas, 0, 0, sheet.w, sheet.h); }
      if (sky) { sky.render(t); ctx.globalAlpha = a * starA; ctx.drawImage(sky.canvas, 0, 0, sheet.w, sheet.h); ctx.globalAlpha = a; }
    }
    if (ring > 0.01) {
      // Sombra de contacto: una elipse difusa bajo la esfera, como la de un globo de escritorio.
      const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, v.R);
      sh.addColorStop(0, night ? 'rgba(2,1,4,.6)' : 'rgba(58,40,8,.3)'); sh.addColorStop(1, 'rgba(58,40,8,0)');
      ctx.save(); ctx.globalAlpha = a * ring; ctx.translate(cx + v.R * 0.1, cy + v.R * 1.03); ctx.scale(1, 0.16); ctx.fillStyle = sh; ctx.fillRect(-v.R, -v.R, 2 * v.R, 2 * v.R); ctx.restore();
    }
    globe.render({ lon: cam.lon, lat: cam.lat, k: v.k, c: v.g, sun });
    ctx.drawImage(globe.canvas, 0, 0, sheet.w, sheet.h);
    if (ring > 0.01) {
      ctx.globalAlpha = a * ring; ctx.strokeStyle = pal['--ink']; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, v.R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 0.6; ctx.globalAlpha = a * ring * 0.6; ctx.beginPath(); ctx.arc(cx, cy, v.R + 5, 0, Math.PI * 2); ctx.stroke();
      // Los nombres de las constelaciones que caerían sobre la Tierra no se escriben.
      if (starA > 0.01 && sky) { ctx.globalAlpha = a * starA; drawSkyLabels(starA, l => Math.hypot(l.x * sheet.w - cx, l.y * sheet.h - cy) > v.R + 14); }
    }
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
    epigraph();
    ctx.restore();
  }
  function epigraph() {
    if (sheet.w < 600) { label('Odisea, canto V: Odiseo gobierna', sheet.w - 18, sheet.h - 42, 12, 'right', true); label('mirando las Pléyades, el Boyero y la Osa.', sheet.w - 18, sheet.h - 25, 12, 'right', true); }
    else label('Odisea, canto V: Odiseo gobierna mirando las Pléyades, el Boyero y la Osa.', sheet.w / 2 + 40, sheet.h - 26, 13, 'center', true);
  }
  function drawSkyLabels(a, keep = () => true) {
    ctx.save(); ctx.globalAlpha = a;
    sky.labels().filter(keep).forEach(l => label(l.name, l.x * sheet.w, l.y * sheet.h, 14, 'center', true)); // en IM Fell: se distinguen de los puertos
    epigraph(); ctx.restore();
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

  // ── Interacción: alfileres, puntero para Galaxy, cámara libre
  const toSheet = (cx, cy) => { const r = canvas.getBoundingClientRect(), p = base().inverse().transformPoint(new DOMPoint((cx - r.left) * dpr, (cy - r.top) * dpr)); return [p.x, p.y]; };
  const hit = (cx, cy) => { const v = view(); if (v.zr > cityZ(PORTS[0]) - zWorld - 2.4) return -1; const [x, y] = toSheet(cx, cy); let best = -1, bd = coarsePointer.matches ? 26 : 16; pinPos(v).forEach(([px, py, f], i) => { const d = Math.hypot(px - x, py - y); if (f > 0.05 && d < bd) { bd = d; best = i; } }); return best; };
  // Dentro del cuadro (zoom animado, inercia) no se redibuja: still() dibuja en el acto y se llamaría a sí mismo.
  let inFrame = false;
  const touched = () => { free = true; spinIdle = performance.now() + 5000; if (!inFrame) loop.still(); };
  // Mover (en px de la hoja): en el plano desplaza; en el globo lo gira (a la misma escala en el centro).
  // De noche, a escala de mundo, el cielo gira con la Tierra.
  const panBy = (dx, dy) => {
    const v = view(), lim = v.g > 0.5 ? 88 : 80;
    cam.lon = wrap(cam.lon - dx / (v.k * v.cosRef)); cam.lat = clamp(cam.lat + dy / v.k, -lim, lim);
    if (sky && isDark && v.zr < 3) sky.drag(-dx, dy);
    touched();
  };
  // Acercar dejando quieto el punto bajo el cursor (en el globo, hacia el centro).
  const zoomAt = (dz, sx = sheet.w / 2, sy = sheet.h / 2) => {
    if (flight || !cam) return; wantGlobe();
    const v0 = view(), z1 = clamp(cam.z + dz, zMin(), Math.max(zMax(), cam.z));
    if (v0.g > 0.01 || z1 < zWorld) cam.z = z1;
    else {
      const lon = cam.lon + (sx - sheet.w / 2) / (v0.k * v0.cosRef), lat = cam.lat - (sy - sheet.h / 2) / v0.k;
      cam.z = z1; const v1 = view();
      cam.lon = wrap(lon - (sx - sheet.w / 2) / (v1.k * v1.cosRef)); cam.lat = clamp(lat + (sy - sheet.h / 2) / v1.k, -80, 80);
    }
    touched();
  };
  // Acercamiento animado (botones, doble clic, teclas): se reparte en varios cuadros.
  let zoomAnim = null;
  const zoomSoft = (dz, sx, sy) => { if (reduceMotion.matches) { zoomAt(dz, sx, sy); return; } zoomAnim = { left: dz, sx, sy }; loop.start(); };
  const stepZoom = dt => { if (!zoomAnim) return; const d = Math.abs(zoomAnim.left) < 0.01 ? zoomAnim.left : zoomAnim.left * Math.min(1, dt * 9); zoomAt(d, zoomAnim.sx, zoomAnim.sy); zoomAnim.left -= d; if (Math.abs(zoomAnim.left) < 1e-3) zoomAnim = null; };
  let fling = { x: 0, y: 0 };
  const stepFling = dt => { if (gest.size || Math.hypot(fling.x, fling.y) < 12) return; panBy(fling.x * dt, fling.y * dt); const f = Math.exp(-dt * 4.5); fling.x *= f; fling.y *= f; };

  // Punteros. Ratón y pluma: arrastrar mueve, doble clic acerca. Táctil: con el mapa abierto a pantalla
  // completa un dedo mueve, dos acercan y doble toque acerca; cerrado, un dedo es del scroll de la página,
  // dos dedos mueven y acercan, y un toque elige un alfiler o abre el mapa.
  let pinch = null, dragged = false, downAt = null, lastTap = null, lastMove = 0;
  const pairOf = () => { const [a, b] = [...gest.values()].map(g => toSheet(g.x, g.y)); return { mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, d: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])) }; };
  const coop = e => e.pointerType === 'touch' && !expanded;
  canvas.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    downAt = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    if (flight) return;
    gest.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!coop(e)) canvas.setPointerCapture?.(e.pointerId);
    if (gest.size === 1) { dragged = false; fling = { x: 0, y: 0 }; zoomAnim = null; }
    if (gest.size === 2) { pinch = pairOf(); dragged = true; }
    wantGlobe();
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch') {
      const h = gest.size ? -1 : hit(e.clientX, e.clientY);
      if (h !== hover) { hover = h; loop.still(); }
      canvas.style.cursor = gest.size && dragged ? 'grabbing' : h >= 0 ? 'pointer' : 'grab';
    }
    if (galaxy) { const [x, y] = toSheet(e.clientX, e.clientY); galaxy.pointer(x / sheet.w, y / sheet.h, x > 0 && y > 0 && x < sheet.w && y < sheet.h); }
    const g = gest.get(e.pointerId); if (!g) return;
    if (gest.size === 1) {
      if (coop(e)) return;
      if (!dragged && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6) return;
      const [ax, ay] = toSheet(g.x, g.y), [bx, by] = toSheet(e.clientX, e.clientY), now = performance.now();
      dragged = true; panBy(bx - ax, by - ay);
      const k = 1000 / Math.max(8, now - lastMove); fling = { x: (bx - ax) * k, y: (by - ay) * k }; lastMove = now;
    } else if (gest.size === 2 && pinch) {
      g.x = e.clientX; g.y = e.clientY; const p = pairOf();
      panBy(p.mx - pinch.mx, p.my - pinch.my); zoomAt(Math.log2(p.d / pinch.d), p.mx, p.my); pinch = p;
      return;
    }
    g.x = e.clientX; g.y = e.clientY;
  });
  const endPointer = e => {
    const had = gest.delete(e.pointerId);
    if (gest.size < 2) pinch = null;
    if (!gest.size && had) { canvas.style.cursor = ''; if (performance.now() - lastMove > 90 || reduceMotion.matches) fling = { x: 0, y: 0 }; }
    if (e.type !== 'pointerup' || !downAt || downAt.id !== e.pointerId) return;
    const quick = performance.now() - downAt.t < 350 && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 10;
    if (!quick || dragged || flight) return;
    const h = hit(e.clientX, e.clientY);
    if (h >= 0) { if (api.onPick) api.onPick(h); return; }
    if (coop(e)) { setExpanded(true); return; }
    if (e.pointerType === 'touch') {
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { lastTap = null; const [sx, sy] = toSheet(e.clientX, e.clientY); zoomSoft(1, sx, sy); }
      else lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  };
  canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { hover = -1; if (galaxy) galaxy.pointer(0.5, 0.5, false); } });
  canvas.addEventListener('dblclick', e => { const [sx, sy] = toSheet(e.clientX, e.clientY); zoomSoft(e.shiftKey ? -1 : 1, sx, sy); });
  // Rueda: acerca con el mapa abierto o con Ctrl (y el pellizco del trackpad, que llega como Ctrl + rueda).
  // Sin eso la rueda es del scroll de la página y se avisa cómo acercar.
  const hintEl = $('#od-map-hint'); let hintT = 0;
  const hint = (txt, ms = 1800) => { if (!hintEl) return; hintEl.textContent = txt; hintEl.classList.add('is-on'); clearTimeout(hintT); hintT = setTimeout(() => hintEl.classList.remove('is-on'), ms); };
  canvas.addEventListener('wheel', e => {
    if (flight) return;
    if (!expanded && !e.ctrlKey && !e.metaKey) { hint('Ctrl + rueda para acercar · o abre el mapa con ⤢'); return; }
    e.preventDefault();
    const [sx, sy] = toSheet(e.clientX, e.clientY), px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(-px * (e.ctrlKey && Math.abs(px) < 50 ? 0.012 : 0.0022), sx, sy);
  }, { passive: false });
  // Teclado (el mapa recibe foco): flechas mueven, + y − acercan, 0 regresa al mapamundi.
  canvas.addEventListener('keydown', e => {
    const step = 60, k = e.key;
    if (k === 'ArrowLeft') panBy(step, 0); else if (k === 'ArrowRight') panBy(-step, 0); else if (k === 'ArrowUp') panBy(0, step); else if (k === 'ArrowDown') panBy(0, -step);
    else if (k === '+' || k === '=') zoomSoft(0.5); else if (k === '-' || k === '_') zoomSoft(-0.5); else if (k === '0') home();
    else return;
    e.preventDefault();
  });
  // Botones de la hoja: acercar, alejar, globo y abrir a pantalla completa.
  const tools = $('.od-map-tools'), openBtn = $('#od-map-open'), closeBtn = $('#od-map-close');
  let expanded = false;
  function setExpanded(on) {
    if (on === expanded) return; expanded = on;
    stage.classList.toggle('is-expanded', on); document.documentElement.classList.toggle('od-map-open', on);
    canvas.style.touchAction = on ? 'none' : ''; gest.clear(); pinch = null;
    if (openBtn) { openBtn.setAttribute('aria-expanded', on); openBtn.setAttribute('aria-label', on ? 'Cerrar el mapa' : 'Abrir el mapa a pantalla completa'); openBtn.textContent = on ? '✕' : '⤢'; }
    if (closeBtn) closeBtn.hidden = !on;
    if (on) hint(coarsePointer.matches ? 'Un dedo mueve · dos dedos acercan · doble toque se acerca' : 'Arrastra para mover · rueda para acercar · doble clic se acerca', 3200);
    (on ? closeBtn : openBtn)?.focus({ preventScroll: true });
  }
  const home = () => { if (flight) return; if (active < 0) api.flyTo(-1); else document.dispatchEvent(new CustomEvent('od:world')); };
  if (tools) tools.addEventListener('click', e => {
    const z = e.target.closest('button')?.dataset.z; if (!z) return;
    if (z === 'in') zoomSoft(1); else if (z === 'out') zoomSoft(-1);
    else if (z === 'globe') { wantGlobe(); zoomSoft(view().g > 0.5 ? zWorld - cam.z : zWorld - GLOBE_DZ - cam.z); }
    else if (z === 'open') setExpanded(!expanded);
  });
  if (closeBtn) closeBtn.addEventListener('click', () => setExpanded(false));
  // Esc cierra primero el mapa abierto; después (en voyage.js) regresa al mapamundi.
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && expanded) { e.stopImmediatePropagation(); setExpanded(false); } }, true);
  // Ruta de la bitácora (logbook.js): se recibe siempre y se traza cuando se pide verla.
  const planChip = $('#od-plan-chip');
  document.addEventListener('od:plan', e => { plan = e.detail; loop.still(); });
  document.addEventListener('od:world', () => { planOn = true; if (planChip) planChip.hidden = false; if (active < 0 && !flight) api.flyTo(-1); loop.still(); });
  if (planChip) planChip.addEventListener('click', () => { planOn = false; planChip.hidden = true; loop.still(); });
  // El globo se prepara cuando el mapa se acerca a la vista, para que el primer gesto no espere.
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); (window.requestIdleCallback || setTimeout)(wantGlobe, { timeout: 1500 }); } }, { rootMargin: '200px' }).observe(stage);
  const loop = makeLoop(stage, frame);
  readPal(); layout(); wantSky();
  new ResizeObserver(() => { layout(); loop.still(); }).observe(stage);
  onTheme(() => { readPal(); wantSky(); if (sky) sky.refresh(); if (globe) globe.refresh(pal, isDark); loop.still(); });
  if (document.fonts) { document.fonts.ready.then(() => loop.still()); document.fonts.load("16px 'Cabaret Voltaire'").then(() => loop.still()); }
  const api = {
    onPick: null,
    flyTo(i, done) {
      const B = i >= 0 ? portCam(PORTS[i]) : worldCam();
      if (reduceMotion.matches) { cam = B; active = i; free = false; loop.still(); done && done(); return; }
      wantCurl();
      // Por el camino corto: si el globo quedó girado, la longitud de llegada se desenvuelve respecto a la de salida.
      const A = { ...cam, lon: wrap(cam.lon) }; B.lon = A.lon + wrap(B.lon - A.lon); zoomAnim = null; fling = { x: 0, y: 0 };
      const dist = Math.hypot(B.lon - A.lon, B.lat - A.lat);
      const zApex = zWorld + Math.max(0.4, 7.5 - Math.log2(1 + dist) * 1.4), lo = Math.min(A.z, B.z);
      const zM = zApex < lo ? 2 * zApex - (A.z + B.z) / 2 : (A.z + B.z) / 2;
      flight = { A, B, zM, t0: performance.now(), dur: 1500 + 1100 * Math.min(1, dist / 120), to: i >= 0 ? i : active, done: () => { active = i; done && done(); } };
      // Tramo en la ruta (índices en [Guadalajara, ...puertos]): del puerto actual (o casa) al nuevo.
      if (i >= 0) {
        flight.leg = [active >= 0 ? active + 1 : 0, i + 1];
        // En el punto alto del vuelo se ven los continentes bajo el avión, no mar liso.
        flight.zM = Math.min(flight.zM, zWorld + 1.6);
      }
      if (i < 0) flight.to = Math.max(0, active);
      loop.start();
    },
    markLeg(i) { route.add(i); },
    redraw: () => loop.still(),
  };
  loop.still();
  return api;
})();
