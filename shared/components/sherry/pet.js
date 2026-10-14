// ══════════════════════════════════════════════════════
// Pet · un Tamauijetto que vive encima de la terminal. Misma especie
// (amphibia, sprites LCD de 32×32 con su parpadeo), mismas reglas que
// 25.Tamauijetto: come, evoluciona por etapas con ramas al azar, a las
// 24 h sin comer tiene hambre, a las 72 se muere de hambre y a las 168
// muere; lo siguiente que coma hace nacer la generación que sigue.
// Aquí la comida es lo que se hace en la página (bus de stats.js): un
// bocado cada 20 s de actividad como mucho, `feed` cada minuto y un
// banquete (dos bocados) al terminar el circuito del taller. Las ramas se inclinan por
// lo que más se usa: código (regex, JSON) lleva a la rana hechicera,
// terminal y soldadura a la salamandra reina, neón al ajolote astral.
// Camina sobre el borde de la terminal, se duerme si no pasa nada y
// reacciona: come, se asusta, se deslumbra con el modo claro, se deja
// acariciar. Comandos: pet, feed, play.
//   mount({ dock: '#sh-term', species: url })
// ══════════════════════════════════════════════════════
import { reduceMotion, cssVar } from './kit.js';
import { onTheme, theme } from '../../core/core.js';
import { onStat, bump, total } from './stats.js';
import { addCommand, say } from './terminal.js';
import { pulse } from './neon-bloom.js';

const SIZE = 32, HOUR = 3_600_000, KEY = 'sherry:pet';
const HOURS = { hungry: 24, starving: 72, dead: 168 };
export const NAMES = { egg: 'huevo', baby: 'cría', child: 'chiquito', teen: 'joven', astralAxolotl: 'ajolote astral', wizardFrog: 'rana hechicera', kingSalamander: 'salamandra reina' };
const AFFINITY = { astralAxolotl: ['neon', 'sign', 'pulse'], teen: ['cmd', 'regex', 'json', 'solder'], wizardFrog: ['regex', 'json'], kingSalamander: ['cmd', 'solder'] };
const MOODS = { full: 'contento', hungry: 'con hambre', starving: 'muriéndose de hambre', dead: 'muerto' };
const LINES = {
  cmd: ['ñam', '¡un comando!', 'crunch', '*mastica bytes*'], regex: ['¡regex!', '(a+)+ ñam'], json: ['{ ñam: true }', 'llaves crujientes'],
  neon: ['¡brilla!', 'ooh, neón'], sign: ['¡mi nombre en neón!', 'qué letrero'], solder: ['¡chispas!', 'huele a estaño'],
  pulse: ['¡bonito!', 'otra vez'], feed: ['¡basura rica!', 'ñam ñam'], play: ['¡wiii!', '¡otra!'],
};
const pickLine = k => { const l = LINES[k] || ['ñam']; return l[Math.floor(Math.random() * l.length)]; };

// Lápida de 32×32 (la misma de Tamauijetto): piedra redondeada con cruz hueca.
const TOMB = { timing: [1], frames: [Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => {
  if (y === 30 && x >= 4 && x <= 27) return '*';
  const stone = (y >= 16 && y <= 29 && x >= 9 && x <= 22) || (y < 16 && (x - 15.5) ** 2 + (y - 16) ** 2 <= 6.8 ** 2);
  const cross = (x >= 15 && x <= 16 && y >= 12 && y <= 22) || (y >= 15 && y <= 16 && x >= 12 && x <= 19);
  return stone && !cross ? '#' : '.';
}).join(''))] };

// ── Ciclo de vida (puerto de 25.Tamauijetto/src/pet.js) ──
const iso = ms => new Date(ms).toISOString();
const hatch = (sp, at, generation = 1) => ({ generation, stage: sp.stages[0].name, food: 0, bornAt: iso(at), lastFedAt: iso(at), diedAt: null });
const stageOf = (sp, name) => sp.stages.find(s => s.name === name);
function pick(probabilities) {
  // los pesos de la especie, inclinados por lo que más se ha usado
  const all = Object.values(total).reduce((a, b) => a + b, 0) || 1;
  const entries = Object.entries(probabilities).map(([n, p]) => [n, p * (1 + 2 * (AFFINITY[n] || []).reduce((a, k) => a + (total[k] || 0), 0) / all)]);
  let roll = Math.random() * entries.reduce((s, [, p]) => s + p, 0);
  for (const [n, p] of entries) if ((roll -= p) < 0) return n;
  return entries.at(-1)[0];
}
function starve(pet, at) {
  const fed = Date.parse(pet.lastFedAt);
  if (!pet.diedAt && at - fed > HOURS.dead * HOUR) pet.diedAt = iso(fed + HOURS.dead * HOUR);
}
function mood(pet, now = Date.now()) {
  const h = (now - Date.parse(pet.lastFedAt)) / HOUR;
  return { state: pet.diedAt ? 'dead' : h >= HOURS.starving ? 'starving' : h >= HOURS.hungry ? 'hungry' : 'full', health: pet.diedAt ? 0 : Math.max(0, 1 - h / HOURS.dead) };
}

let info = null;
// Para las métricas, el BIOS y el protector de pantalla.
export const petInfo = () => info;
export const terminalArt = frame => { const rows = frame.map(r => r.replace(/\./g, ' ').replace(/#/g, '█').replace(/\*/g, '▒').trimEnd()); while (rows.length && !rows[0]) rows.shift(); return rows.join('\n'); };
export function paintSprite(ctx, frame, scale, { body, detail, flip = false, ox = 0, oy = 0 }) {
  ctx.save();
  if (flip) { ctx.translate(ox * 2 + SIZE * scale, 0); ctx.scale(-1, 1); }
  const dot = scale >= 3 ? scale - 1 : scale;
  [['#', body], ['*', detail]].forEach(([ch, col]) => {
    ctx.fillStyle = col;
    frame.forEach((row, y) => { for (let x = 0; x < SIZE; x++) if (row[x] === ch) ctx.fillRect(ox + x * scale, oy + y * scale, dot, dot); });
  });
  ctx.restore();
}

export async function mount({ dock = '#sh-term', species = new URL('../../../assets/data/sherry/amphibia.json', import.meta.url) } = {}) {
  const host = typeof dock === 'string' ? document.querySelector(dock) : dock;
  if (!host) return;
  let sp;
  try { sp = await (await fetch(species)).json(); } catch { return; }

  let pet;
  try { pet = JSON.parse(localStorage.getItem(KEY)); } catch { pet = null; }
  if (!pet || !stageOf(sp, pet.stage)) pet = hatch(sp, Date.now());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pet)); } catch { /* sin almacenamiento */ } };
  starve(pet, Date.now()); save();

  const el = document.createElement('div');
  el.className = 'sh-pet';
  el.innerHTML = `<p class="sh-pet-bubble" aria-live="polite"></p><button type="button" class="sh-pet-btn"><canvas width="${SIZE}" height="${SIZE}"></canvas></button>`;
  host.appendChild(el);
  const btn = el.querySelector('button'), cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), bubble = el.querySelector('.sh-pet-bubble');

  const S = () => (matchMedia('(max-width: 760px)').matches ? 2 : 3);
  let scale = S(), frameI = 0, frameT = 0, flip = false, x = 0, target = 0, pause = 2, hop = 0, shake = 0, sleeping = false, lastInput = performance.now(), lastMeal = 0, bubbleT = 0;
  const sprite = () => (pet.diedAt ? TOMB : sp.sprites[pet.stage]);
  const update = () => {
    const m = mood(pet), st = stageOf(sp, pet.stage);
    info = { stage: pet.stage, name: NAMES[pet.stage] || pet.stage, generation: pet.generation, food: pet.food, required: Object.keys(st.probabilities || {}).length ? st.requiredFood : null, mood: m.state, moodLabel: MOODS[m.state], health: m.health, bornAt: pet.bornAt, sprite: sprite() };
    btn.setAttribute('aria-label', `Tamauijetto: ${info.name}, generación ${pet.generation}, ${info.moodLabel}. Tocar para acariciar.`);
    el.dataset.mood = m.state;
  };
  const colors = () => (pet.diedAt ? { body: cssVar('--text3'), detail: cssVar('--text3') } : { body: cssVar('--lime'), detail: cssVar('--magenta') });
  const draw = () => {
    const sz = SIZE * scale;
    if (cv.width !== sz) { cv.width = cv.height = sz; }
    ctx.clearRect(0, 0, sz, sz);
    const s = sprite(), f = sleeping ? s.frames[s.frames.length - 1] : s.frames[frameI % s.frames.length];
    paintSprite(ctx, f, scale, { ...colors(), flip });
  };
  const talk = (text, ms = 2400) => { bubble.textContent = text; bubble.classList.add('is-on'); bubbleT = performance.now() + ms; };
  const wake = () => { lastInput = performance.now(); if (sleeping) { sleeping = false; draw(); } };

  // ── Comer y evolucionar ──
  function eat(n, why) {
    const now = Date.now();
    starve(pet, now);
    if (pet.diedAt) { const g = pet.generation + 1; pet = hatch(sp, now, g); talk(`¡nació la generación ${g}!`, 3200); say(`<span class="sh-term-here">●</span> Nació un huevo nuevo: generación ${g}.`); }
    pet.food += n; pet.lastFedAt = iso(now);
    let st = stageOf(sp, pet.stage);
    const before = pet.stage;
    while (Object.keys(st.probabilities || {}).length && pet.food >= st.requiredFood) { pet.stage = pick(st.probabilities); st = stageOf(sp, pet.stage); }
    save(); update(); frameI = 0;
    hop = 1;
    if (pet.stage !== before) {
      talk(`¡evolucionó a ${NAMES[pet.stage]}!`, 3600);
      say(`<span class="sh-term-here">★</span> Tu Tamauijetto evolucionó: ${NAMES[before]} → <b>${NAMES[pet.stage]}</b>.`);
      const r = cv.getBoundingClientRect(); pulse(r.left + r.width / 2, r.top + r.height / 2, cssVar('--lime'));
    } else if (why) talk(why);
    draw();
  }
  onStat((key) => {
    wake();
    if (key === 'feed' || key === 'play') return;
    const now = performance.now();
    if (now - lastMeal > 20000) { lastMeal = now; eat(1, pickLine(key)); }
    else if (Math.random() < 0.25) { talk(pickLine(key), 1400); hop = 1; }
  });
  addEventListener('sh:feast', () => { wake(); lastMeal = performance.now(); eat(2, '¡banquete de chatarra!'); });
  addEventListener('sh:mood', e => { wake(); if (e.detail === 'scared') { shake = 1; talk('¡!¡!', 1600); } });
  onTheme(() => { wake(); talk(theme.alt ? '¡mis ojos!' : 'ahh, oscurito'); shake = theme.alt ? 0.6 : 0; });
  btn.addEventListener('click', () => { wake(); hop = 1; talk(pet.diedAt ? 'descansa en paz…' : ['♥', '♥ ♥', '*ronronea*', '¡hola!'][Math.floor(Math.random() * 4)], 1600); });
  ['pointerdown', 'keydown', 'scroll'].forEach(t => addEventListener(t, () => { if (sleeping) wake(); else lastInput = performance.now(); }, { passive: true }));

  // ── Comandos ──
  let lastFeed = -Infinity;
  const status = () => {
    update();
    const bar = '█'.repeat(Math.round(info.health * 12)).padEnd(12, '░');
    return [`<pre class="sh-term-art" aria-label="Dibujo de ${info.name}">${terminalArt(sprite().frames[0])}</pre>`,
      `<b>${info.name}</b> · generación ${pet.generation} · ${info.moodLabel}`,
      `comida ${pet.food}${info.required ? ' / ' + info.required : ' · forma final'} · vida <span class="sh-term-here">${bar}</span>`];
  };
  addCommand('pet', { help: 'tu Tamauijetto: dibujo y estado', show: true, entry: { group: 'Mascota', label: 'Ver a la mascota', keys: 'tamauijetto tamagotchi estado' }, fn: status });
  addCommand('feed', { help: 'le das basura de comer (una vez por minuto)', entry: { group: 'Mascota', label: 'Darle de comer', keys: 'comida basura alimentar' }, fn: () => {
    if (performance.now() - lastFeed < 60000 && !pet.diedAt) { talk('ya estoy lleno'); return ['Está lleno; vuelve en un minuto.']; }
    lastFeed = performance.now(); bump('feed'); eat(1, pickLine('feed'));
    return [`Se comió un capacitor viejo. Comida: ${pet.food}.`];
  } });
  addCommand('play', { help: 'juega con la mascota', entry: { group: 'Mascota', label: 'Jugar con la mascota', keys: 'jugar saltar' }, fn: () => {
    if (pet.diedAt) return ['No contesta…'];
    bump('play'); wake(); hop = 1.6; talk(pickLine('play'));
    const r = cv.getBoundingClientRect(); pulse(r.left + r.width / 2, r.top, cssVar('--cyan'));
    return ['¡Salta!'];
  } });

  // ── Bucle: camina, parpadea, salta, se duerme ──
  let raf = 0, last = 0;
  const width = () => Math.max(0, host.clientWidth - SIZE * scale - 8);
  const tick = t => {
    raf = 0;
    const dt = Math.min(0.1, (t - (last || t)) / 1000); last = t;
    const s = sprite();
    const idle = t - lastInput > 45000 && !pet.diedAt;
    if (idle && !sleeping) { sleeping = true; talk('z z z', 99999); draw(); }
    if (!sleeping && !pet.diedAt && s.frames.length > 1 && !reduceMotion.matches) {
      frameT += dt;
      if (frameT >= (s.timing[frameI % s.frames.length] || 1)) { frameT = 0; frameI++; draw(); }
    }
    if (!sleeping && !pet.diedAt && !reduceMotion.matches && pet.stage !== 'egg') {
      if (pause > 0) pause -= dt;
      else {
        const dir = Math.sign(target - x), sp2 = mood(pet).state === 'full' ? 22 : 10;
        if (dir && (dir < 0) !== flip) { flip = dir < 0; draw(); }
        x += dir * sp2 * dt;
        if (Math.abs(target - x) < 1) { x = target; pause = 2 + Math.random() * 5; target = Math.random() * width(); }
      }
    }
    hop = Math.max(0, hop - dt * 2.2); shake = Math.max(0, shake - dt * 1.5);
    const jy = reduceMotion.matches ? 0 : -Math.sin(Math.min(1, hop) * Math.PI) * 14;
    const sx = reduceMotion.matches ? 0 : Math.sin(t / 30) * 3 * shake;
    el.style.transform = `translate(${(x + sx).toFixed(1)}px, ${jy.toFixed(1)}px)`;
    if (bubbleT && t > bubbleT) { bubble.classList.remove('is-on'); bubbleT = 0; }
    // con reduced motion no camina ni parpadea: basta revisar dos veces por segundo
    if (!document.hidden) raf = reduceMotion.matches ? setTimeout(() => requestAnimationFrame(tick), 500) : requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { last = 0; raf = requestAnimationFrame(tick); } });
  addEventListener('resize', () => { const n = S(); if (n !== scale) { scale = n; draw(); } x = Math.min(x, width()); target = Math.min(target, width()); });
  // Cada hora, por si la pestaña queda abierta días: también se muere de hambre.
  setInterval(() => { starve(pet, Date.now()); save(); update(); draw(); }, HOUR / 4);

  update(); x = target = width() * 0.82; draw();
  raf = requestAnimationFrame(tick);
  if (pet.diedAt) talk('murió de hambre… dale de comer para que nazca otro', 5000);
  else if (info.mood !== 'full') talk('tengo hambre', 3000);
  dispatchEvent(new CustomEvent('sh:pet', { detail: info }));
}
