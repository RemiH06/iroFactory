// ══════════════════════════════════════════════════════
// Tablero · un juego de mesa de vuelta al tablero, para dos.
//  · Los dados son el sólido elegido en la barra, en Three.js: con el cubo
//    se tiran dos d6 (como en los juegos de propiedades); con los otros, un
//    solo dado de 4, 8, 12 o 20 caras. Se tiran arrastrando el cubilete y
//    soltándolo (más fuerte, más vueltas) o con el botón. El dado vuela,
//    rebota y cae con la cara del resultado hacia arriba (anime.js anima el
//    Object3D con su adaptador de Three).
//  · Las fichas son draggables de anime.js: avanzan casilla por casilla
//    saltando, pero también se pueden arrastrar a mano a cualquier casilla.
//    Se acomodan en la más cercana y cuenta como trampa (y se nota).
//  · Reglas cortas: 20 casillas; cada jugador empieza con 100 fichas. Caer
//    en un juego libre lo compra (20); caer en el de la otra persona le paga
//    10. Pasar por Salida da 20; Bonus da 50; Pausa hace perder un turno;
//    Atajo regresa a Salida (y cobra); Suerte mueve de 3 atrás a 3 adelante.
// Con reduced motion, el dado cae directo y las fichas saltan sin animar.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { animate, createDraggable, createTimeline } from 'animejs';
import { cssVar, makeLoop, onTheme, reduceMotion } from './kit.js';
import { geometry, polyhedron } from './solid-three.js';
import { shape } from './solids.js';

const GAMES = ['Damas', 'Ajedrez', 'Dominó', 'Lotería', 'Parchís', 'Go', 'Mancala', 'Senet', 'Memoria', 'Canicas', 'Matatena', 'Oca', 'Gato', 'Rayuela'];
const GROUPS = ['--f', '--f', '--r', '--r', '--r', '--b', '--b', '--l', '--l', '--u', '--u', '--u', '--d', '--d'];
const SPECIAL = { 0: ['start', 'Salida', '+20 al pasar'], 5: ['pause', 'Pausa', 'pierdes un turno'], 10: ['bonus', 'Bonus', '+50'], 15: ['jump', 'Atajo', 'a Salida'], 3: ['luck', 'Suerte', '±3'], 13: ['luck', 'Suerte', '±3'] };
const CELLS = (() => { let g = 0; return Array.from({ length: 20 }, (_, i) => SPECIAL[i] ? { kind: SPECIAL[i][0], name: SPECIAL[i][1], note: SPECIAL[i][2] } : { kind: 'game', name: GAMES[g], token: GROUPS[g++], owner: -1 }); })();
// casilla → [fila, columna] en la rejilla de 6×6 (sentido horario desde arriba a la izquierda)
const SPOT = i => i < 6 ? [1, i + 1] : i < 10 ? [i - 4, 6] : i < 16 ? [6, 6 - (i - 10)] : [6 - (i - 15), 1];
const FACES = { cubo: 6, tetraedro: 4, octaedro: 8, dodecaedro: 12, icosaedro: 20 };
const PLAYERS = [{ name: 'J1', token: '--f' }, { name: 'J2', token: '--l' }];

export function mount({ root = document.getElementById('lx-board') } = {}) {
  if (!root) return;
  const card = root.closest('.hud'), center = root.querySelector('.lx-board-center'), msg = root.querySelector('.lx-board-msg');
  const rollBtn = card.querySelector('.lx-roll'), cup = root.querySelector('.lx-cup'), side = card.querySelector('.lx-players');

  // ── Casillas
  const cellEls = CELLS.map((c, i) => {
    const d = document.createElement('div'), [r, col] = SPOT(i);
    d.className = `lx-cell is-${c.kind}`; d.style.gridArea = `${r} / ${col}`;
    if (c.token) d.style.setProperty('--g', `var(${c.token})`);
    d.innerHTML = `<b>${c.name}</b>${c.kind === 'game' ? '<small>20</small>' : `<small>${c.note}</small>`}`;
    root.insertBefore(d, center); return d;
  });

  // ── Jugadores y fichas (draggables)
  const state = { turn: 0, busy: false, skip: [false, false] };
  const players = PLAYERS.map((p, k) => ({ ...p, k, pos: 0, chips: 100, owned: 0, cheats: 0 }));
  const layer = root.querySelector('.lx-tokens');
  const spotXY = (i, k) => { const c = cellEls[i]; return [c.offsetLeft + c.offsetWidth / 2 + (k ? 7 : -7), c.offsetTop + c.offsetHeight / 2 + (k ? 5 : -5)]; };
  players.forEach(p => {
    const t = document.createElement('div'); t.className = 'lx-token'; t.style.setProperty('--c', `var(${p.token})`);
    t.innerHTML = '<span class="lx-pawn"></span>'; t.setAttribute('aria-label', `Ficha de ${p.name}`); layer.appendChild(t); p.el = t;
    p.drag = createDraggable(t, {
      velocityMultiplier: 0.3, releaseStiffness: 120, cursor: { onHover: 'grab', onGrab: 'grabbing' },
      onGrab: () => { p.grabbed = true; },
      onSettle: self => {
        if (!p.grabbed) return; p.grabbed = false;
        // a la casilla más cercana; si es otra, fue trampa (y la casilla cuenta)
        let best = 0, bd = Infinity;
        cellEls.forEach((_, i) => { const [x, y] = spotXY(i, p.k), d = Math.hypot(x - self.x, y - self.y); if (d < bd) { bd = d; best = i; } });
        const [x, y] = spotXY(best, p.k);
        animate(self, { x, y, duration: 260, ease: 'outBack(1.7)' });
        if (best !== p.pos && !state.busy) { p.pos = best; p.cheats++; say(`${p.name} movió su ficha con la mano: trampa #${p.cheats}. ${land(p)}`); paint(); }
      }
    });
  });
  const place = () => players.forEach(p => { const [x, y] = spotXY(p.pos, p.k); p.drag.setX(x, true); p.drag.setY(y, true); });

  // ── Marcador
  const say = t => { msg.textContent = t; };
  const paint = () => {
    side.innerHTML = players.map(p => `<p class="${p.k === state.turn ? 'is-turn' : ''}" style="--c:var(${p.token})"><i></i><b>${p.name}</b> ${p.chips} fichas · ${p.owned} juegos${p.cheats ? ` · ${p.cheats} trampas` : ''}${state.skip[p.k] ? ' · en pausa' : ''}</p>`).join('');
    cellEls.forEach((el, i) => { const c = CELLS[i]; if (c.kind === 'game') { el.classList.toggle('is-owned', c.owner >= 0); el.style.setProperty('--own', c.owner >= 0 ? `var(${PLAYERS[c.owner].token})` : 'transparent'); } });
    rollBtn.textContent = `Tirar · ${players[state.turn].name}`;
  };

  // ── Reglas al caer en una casilla
  const land = p => {
    const c = CELLS[p.pos], o = players[1 - p.k];
    if (c.kind === 'game') {
      if (c.owner < 0 && p.chips >= 20) { c.owner = p.k; p.chips -= 20; p.owned++; return `${p.name} compra ${c.name}.`; }
      if (c.owner === o.k) { p.chips -= 10; o.chips += 10; return `${c.name} es de ${o.name}: le paga 10.`; }
      return c.owner === p.k ? `${c.name}: ya es suyo.` : `${c.name}: no alcanza para comprarlo.`;
    }
    if (c.kind === 'bonus') { p.chips += 50; return `Bonus: +50 para ${p.name}.`; }
    if (c.kind === 'pause') { state.skip[p.k] = true; return `${p.name} pierde el siguiente turno.`; }
    return '';
  };
  // avanzar n casillas saltando (o retroceder con n negativo)
  const hop = (p, n) => new Promise(done => {
    const dir = Math.sign(n), steps = Math.abs(n);
    if (!steps) return done();
    if (reduceMotion.matches) { for (let s = 0; s < steps; s++) { p.pos = (p.pos + dir + 20) % 20; if (p.pos === 0 && dir > 0) p.chips += 20; } place(); return done(); }
    const tl = createTimeline({ onComplete: done });
    for (let s = 0; s < steps; s++) {
      const next = (p.pos + dir * (s + 1) + 40) % 20, [x, y] = spotXY(next, p.k);
      tl.add(p.drag, { x, y, duration: 230, ease: 'inOut(2)', onComplete: () => { if (next === 0 && dir > 0) { p.chips += 20; say(`${p.name} pasa por Salida: +20.`); paint(); } } })
        .add(p.el.firstChild, { translateY: [0, -12, 0], scale: [1, 1.15, 1], duration: 230, ease: 'out(2)' }, '<<');
    }
    p.pos = (p.pos + n + 40) % 20;
  });
  const turnEnd = () => {
    state.turn = 1 - state.turn;
    if (state.skip[state.turn]) { state.skip[state.turn] = false; say(`${players[state.turn].name} está en pausa: pasa el turno.`); state.turn = 1 - state.turn; }
    state.busy = false; rollBtn.disabled = false; paint();
  };
  const play = async total => {
    const p = players[state.turn];
    await hop(p, total);
    let note = land(p);
    const c = CELLS[p.pos];
    if (c.kind === 'luck') { const m = [-3, -2, -1, 1, 2, 3][(Math.random() * 6) | 0]; say(`Suerte: ${m > 0 ? '+' : ''}${m}.`); await new Promise(r => setTimeout(r, 450)); await hop(p, m); note = land(p); }
    if (CELLS[p.pos].kind === 'jump') { say('Atajo: de vuelta a Salida.'); await new Promise(r => setTimeout(r, 400)); await hop(p, 20 - p.pos); note = 'Atajo: +20 por llegar a Salida.'; }
    if (note) say(note);
    turnEnd();
  };

  // ── Los dados en Three.js
  const canvas = center.querySelector('canvas');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { /* sin WebGL: el resultado se muestra en texto */ }
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); camera.position.set(0, 0, 10);
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0x5a5262, 1.8)); const key = new THREE.DirectionalLight(0xfffaf0, 1.6); key.position.set(-2, 3, 6); scene.add(key);
  // números en blanco (el material los tiñe con el color de quien tira)
  const numTex = {};
  const drawNum = (t, n) => {
    const x = t.image.getContext('2d'); x.clearRect(0, 0, 128, 128);
    x.fillStyle = '#F6F2EA'; x.font = '64px "Silkscreen", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 68);
    if (n === 6 || n === 9) x.fillRect(40, 100, 48, 6); // para no confundir 6 y 9
    t.needsUpdate = true;
  };
  const number = n => numTex[n] ||= (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; drawNum(t, n); return t; })();
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05, flatShading: true });
  let dice = [];
  const makeDie = name => {
    const R = 0.95, g = new THREE.Group(), body = new THREE.Mesh(geometry(name, R), bodyMat); g.add(body);
    const { verts, polys } = polyhedron(name), normals = [];
    polys.forEach((f, i) => {
      const inr = Math.min(...f.vs.map((a, k) => { const b = f.vs[(k + 1) % f.vs.length]; return verts[a].clone().add(verts[b]).multiplyScalar(0.5).distanceTo(f.center); })) * R;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(inr * 1.5, inr * 1.5), new THREE.MeshBasicMaterial({ map: number(i + 1), transparent: true, depthWrite: false }));
      m.position.copy(f.center).multiplyScalar(R).addScaledVector(f.normal, 0.01);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal);
      g.add(m); normals.push(f.normal.clone());
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(R * 0.9, 32), new THREE.MeshBasicMaterial({ color: 0x08070a, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.position.z = -1.2; scene.add(shadow, g);
    return { g, normals, shadow, faces: polys.length };
  };
  const build = () => {
    dice.forEach(d => { scene.remove(d.g, d.shadow); d.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== bodyMat) o.material.dispose(); }); d.shadow.geometry.dispose(); });
    const name = shape(), count = name === 'cubo' ? 2 : 1;
    dice = Array.from({ length: count }, (_, i) => { const d = makeDie(name); d.g.position.x = count > 1 ? (i ? 1.1 : -1.1) : 0; d.g.rotation.set(0.5, 0.6, 0); return d; });
    tint(); loop?.still();
  };
  const tint = () => { bodyMat.color.set(cssVar('--white')); dice.forEach(d => d.g.children.forEach(o => { if (o.material?.map) o.material.color.set(cssVar(PLAYERS[state.turn].token)); })); };
  // orientación que deja la cara n mirando a la cámara (con un giro al azar)
  const faceUp = (d, n) => {
    const q = new THREE.Quaternion().setFromUnitVectors(d.normals[n], new THREE.Vector3(0, 0, 1));
    return new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * 1.2).multiply(q));
  };
  const deg = THREE.MathUtils.radToDeg;
  const roll = (power = 1) => {
    if (state.busy) return; state.busy = true; rollBtn.disabled = true; tint();
    const res = dice.map(d => (Math.random() * d.faces) | 0), total = res.reduce((s, r) => s + r + 1, 0);
    const spins = Math.max(1, Math.min(5, Math.round(1 + power)));
    const done = () => { say(`${players[state.turn].name} saca ${res.map(r => r + 1).join(' + ')}${res.length > 1 ? ` = ${total}` : ''}.`); setTimeout(() => play(total), reduceMotion.matches ? 0 : 350); };
    if (!renderer || reduceMotion.matches) { dice.forEach((d, i) => d.g.rotation.copy(faceUp(d, res[i]))); loop?.still(); done(); return; }
    let left = dice.length;
    dice.forEach((d, i) => {
      const e = faceUp(d, res[i]), r = d.g.rotation, sx = Math.sign(Math.random() - 0.5) || 1;
      const to = (cur, aim, k) => aim + 360 * (Math.round((cur - aim) / 360) + k * sx); // misma orientación, k vueltas más
      const x1 = d.g.position.x;
      animate(d.g, {
        rotateX: to(deg(r.x), deg(e.x), spins), rotateY: to(deg(r.y), deg(e.y), spins - 1), rotateZ: to(deg(r.z), deg(e.z), 1),
        x: [x1 - 2.2 * sx, x1], y: [-1.6, 0], duration: 1100 + i * 120, ease: 'out(3)'
      });
      animate(d.g, { z: [{ to: 2.4, duration: 300, ease: 'out(2)' }, { to: 0, duration: 330, ease: 'in(2)' }, { to: 0.7, duration: 220, ease: 'out(2)' }, { to: 0, duration: 230, ease: 'in(2)' }, { to: 0.15, duration: 90 }, { to: 0, duration: 90 }], delay: i * 60, onComplete: () => { if (!--left) done(); } });
    });
  };
  const resize = () => { if (!renderer) return; const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const face = root.closest('.lx-face');
  const loop = renderer ? makeLoop(center, () => {
    if (face && !face.matches('.is-current, .is-arriving')) return;
    dice.forEach(d => { d.shadow.position.x = d.g.position.x + d.g.position.z * 0.25; d.shadow.position.y = d.g.position.y - d.g.position.z * 0.25; d.shadow.material.opacity = 0.22 / (1 + d.g.position.z * 0.6); });
    renderer.render(scene, camera);
  }, 60) : null;
  if (renderer) { renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping; resize(); new ResizeObserver(resize).observe(canvas); }
  build();

  // ── El cubilete: draggable que se suelta para tirar
  const cupDrag = createDraggable(cup, {
    releaseStiffness: 200, cursor: { onHover: 'grab', onGrab: 'grabbing' },
    onRelease: self => {
      const power = Math.hypot(self.velocity || 0) / 6; // más fuerte, más vueltas
      animate(self, { x: 0, y: 0, duration: 420, ease: 'outBack(1.6)' }); cup.style.rotate = '0deg';
      if (Math.hypot(self.x, self.y) > 20) roll(power);
    },
    onDrag: self => { cup.style.rotate = `${Math.max(-25, Math.min(25, self.x * 0.4))}deg`; }
  });
  cup.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); roll(1); } });
  rollBtn.addEventListener('click', () => roll(1 + Math.random() * 2));

  document.addEventListener('ludus:shape', () => { if (!state.busy) build(); });
  onTheme(() => { tint(); loop?.still(); paint(); });
  document.fonts?.load('64px "Silkscreen"').then(() => { Object.entries(numTex).forEach(([n, t]) => drawNum(t, +n)); loop?.still(); });
  new ResizeObserver(place).observe(root);
  // El draggable de anime.js guarda la transformación de sus ancestros al
  // crearse; aquí los ancestros son la cara del prisma, que en ese momento
  // estaba girada (120° en Juguetes), y el arrastre salía al revés. Se vuelve
  // a medir al agarrar, cuando la cara ya está de frente.
  root.addEventListener('pointerdown', () => [cupDrag, ...players.map(p => p.drag)].forEach(d => { d.transforms.inversedMatrix = d.transforms.getMatrix().inverse(); }), { capture: true });
  place(); paint(); say('Arrastra el cubilete y suéltalo para tirar.');
}
