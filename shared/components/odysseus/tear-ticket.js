// ══════════════════════════════════════════════════════
// Tear Ticket (React Bits, motion → vanilla): talón perforado que se
// arranca. Misma geometría (puentes, muescas, aspereza), mismas fibras
// que se estiran y se rompen, y la caída con gravedad. Además: se puede
// romper solo (al elegir otro puerto) con la misma física.
// ══════════════════════════════════════════════════════
import { $, clamp, reduceMotion } from './kit.js';
import { fmtCoords } from './geography.js';

export const ticket = (() => {
  const root = $('#od-ticket'), stage = root.querySelector('.tear-ticket__stage');
  const bodyEl = root.querySelector('.tear-ticket__piece--body'), stubEl = root.querySelector('.tear-ticket__piece--stub');
  const fibresSvg = root.querySelector('.tear-ticket__fibres'), sr = root.querySelector('[role="status"]');
  const Wt = 440, Ht = 170, S = 120, R = 10, HOLES = 10, HOLE = 6, NOTCH = 4, ROUGH = 0.6;
  const TEAR = 30 * Math.PI / 180, STRETCH = 30, RESIST = 0.45, GRAVITY = 2400, RETRACT = 0.17;
  const f = n => n.toFixed(2), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const noise = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const geo = (() => {
    const main = Wt, cross = Ht, x = main - S, hr = HOLE / 2, n = HOLES, span = cross - 2 * NOTCH, bridge = Math.max(2, (span - n * HOLE) / (n + 1)), random = noise(n * 7919 + cross);
    const pt = (u, v) => `${f(u)},${f(v)}`, arc = (r, sw, u, v) => `A${f(r)},${f(r)} 0 0 ${sw} ${pt(u, v)}`;
    const bridges = [];
    for (let i = 0; i <= n; i++) { const y0 = NOTCH + i * (bridge + HOLE), y1 = y0 + bridge, steps = Math.max(2, Math.round(bridge / 2.2)), pts = []; for (let k = 1; k < steps; k++) pts.push([x + (random() - 0.5) * 2 * ROUGH, y0 + (bridge * k) / steps]); bridges.push({ y0, y1, mid: (y0 + y1) / 2, pts, x, y: (y0 + y1) / 2 }); }
    let body = `M${pt(R, 0)}L${pt(x - NOTCH, 0)}${arc(NOTCH, 0, x, NOTCH)}`;
    bridges.forEach((b, i) => { b.pts.forEach(p => { body += `L${pt(p[0], p[1])}`; }); body += `L${pt(x, b.y1)}`; if (i < n) body += arc(hr, 0, x, b.y1 + HOLE); });
    body += `${arc(NOTCH, 0, x - NOTCH, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}Z`;
    let stub = `M${pt(x + NOTCH, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + NOTCH, cross)}${arc(NOTCH, 0, x, cross - NOTCH)}`;
    for (let i = n; i >= 0; i--) { const b = bridges[i]; for (let k = b.pts.length - 1; k >= 0; k--) stub += `L${pt(b.pts[k][0], b.pts[k][1])}`; stub += `L${pt(x, b.y0)}`; if (i > 0) stub += arc(hr, 0, x, b.y0 - HOLE); }
    stub += `${arc(NOTCH, 0, x + NOTCH, 0)}Z`;
    const bodyOutline = `M${pt(x, cross - NOTCH)}${arc(NOTCH, 0, x - NOTCH, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}L${pt(x - NOTCH, 0)}${arc(NOTCH, 0, x, NOTCH)}`;
    const stubOutline = `M${pt(x, NOTCH)}${arc(NOTCH, 0, x + NOTCH, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + NOTCH, cross)}${arc(NOTCH, 0, x, cross - NOTCH)}`;
    return { cross, body, stub, bridges, ends: [{ x, y: NOTCH, v: NOTCH }, { x, y: cross - NOTCH, v: cross - NOTCH }], bodyOutline, stubOutline };
  })();
  root.querySelector('.tt-body-paper').style.clipPath = `path('${geo.body}')`;
  root.querySelector('.tt-stub-paper').style.clipPath = `path('${geo.stub}')`;
  root.querySelectorAll('.tear-ticket__edge').forEach(s => s.setAttribute('viewBox', `0 0 ${Wt} ${Ht}`));
  root.querySelector('.tt-body-outline').setAttribute('d', geo.bodyOutline); root.querySelector('.tt-stub-outline').setAttribute('d', geo.stubOutline);
  const fibres = [];
  geo.bridges.forEach(() => { for (let k = 0; k < 2; k++) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); fibresSvg.appendChild(p); fibres.push(p); } });
  const s = { raf: 0, last: 0, phase: 'idle', id: null, sign: 1, hinge: { x: 0, y: 0 }, hingeV: 0, grab: { x: 0, y: 0 }, start: { x: 0, y: 0 }, point: { x: 0, y: 0 }, a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0, pvx: 0, pvy: 0, pt: 0, fade: 1, age: 0, bx: 0, bv: 0, snapped: [], snapAt: [], span: [], used: false, auto: false };
  let onDepart = null, onTorn = null;
  const paint = now => {
    stubEl.style.transform = `translate(${f(s.sx)}px, ${f(s.sy)}px) rotate(${f(s.theta * s.sign * 180 / Math.PI)}deg)`;
    stubEl.style.opacity = s.fade.toFixed(3); bodyEl.style.transform = `translateX(${f(s.bx)}px)`;
    const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign); let busy = false;
    geo.bridges.forEach((b, i) => {
      const dx = b.x - s.hinge.x, dy = b.y - s.hinge.y, tx = s.hinge.x + dx * cos - dy * sin + s.sx, ty = s.hinge.y + dx * sin + dy * cos + s.sy;
      const ox = b.x + s.bx, oy = b.y, gx = tx - ox, gy = ty - oy, gap = Math.hypot(gx, gy), near = fibres[i * 2], far = fibres[i * 2 + 1];
      const live = s.phase !== 'idle' && !reduceMotion.matches;
      if (!s.snapped[i]) {
        if (!live || gap < 0.35) { near.style.opacity = far.style.opacity = '0'; return; }
        const k = clamp(gap / STRETCH, 0, 1), sag = gap * 0.18, w = (1.7 - 1.15 * k).toFixed(2), sxx = gx / 2, syy = sag + gy / 2;
        near.setAttribute('d', `M${f(ox)},${f(oy - 1.6)}Q${f(ox + sxx)},${f(oy - 1.6 + syy)} ${f(tx)},${f(ty - 1.6)}`);
        far.setAttribute('d', `M${f(ox)},${f(oy + 1.6)}Q${f(ox + gx - sxx)},${f(oy + 1.6 + gy - syy)} ${f(tx)},${f(ty + 1.6)}`);
        near.style.strokeWidth = far.style.strokeWidth = w; near.style.opacity = far.style.opacity = '1'; s.span[i] = gap; return;
      }
      const t = (now - s.snapAt[i]) / 1000 / RETRACT;
      if (!live || t >= 1 || !s.snapAt[i]) { near.style.opacity = far.style.opacity = '0'; return; }
      busy = true;
      const left = (1 - t) * (1 - t), len = (s.span[i] || STRETCH) * 0.5 * left, ux = gap > 0.01 ? gx / gap : 1, uy = gap > 0.01 ? gy / gap : 0;
      near.setAttribute('d', `M${f(ox)},${f(oy)}L${f(ox + ux * len)},${f(oy + uy * len)}`); far.setAttribute('d', `M${f(tx)},${f(ty)}L${f(tx - ux * len)},${f(ty - uy * len)}`);
      near.style.strokeWidth = far.style.strokeWidth = '0.9'; near.style.opacity = far.style.opacity = left.toFixed(2);
    });
    return busy;
  };
  const finish = () => { stubEl.style.visibility = 'hidden'; s.used = true; root.setAttribute('data-used', ''); sr.textContent = 'Talón arrancado'; const cb = onTorn; onTorn = null; cb && cb(); };
  const snapCheck = now => {
    const slack = Math.hypot(s.sx, s.sy); let left = 0;
    geo.bridges.forEach((b, i) => { if (s.snapped[i]) return; const d = Math.abs(b.mid - s.hingeV); if (2 * d * Math.sin(s.theta / 2) + slack > STRETCH || s.theta >= TEAR) { s.snapped[i] = true; s.snapAt[i] = now; s.bv -= 560 / geo.bridges.length; } else left++; });
    return left;
  };
  const toDrop = (vx, vy) => { s.vx = vx; s.vy = vy; s.spin = clamp(s.vx * 0.004, -6, 6) + 1.2 * s.sign; s.age = 0; s.phase = 'drop'; const cb = onDepart; onDepart = null; cb && cb(); };
  const step = now => {
    const dt = clamp((now - s.last) / 1000, 0.001, 0.034); s.last = now;
    if (s.phase === 'held') {
      const count = geo.bridges.length; let intact = 0; for (let i = 0; i < count; i++) if (!s.snapped[i]) intact++;
      const follow = 0.92 * (1 - clamp(RESIST, 0, 0.95) * (intact / count)), a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x);
      const want = clamp(wrap(a - s.a0) * s.sign * follow, 0, TEAR + 0.1);
      s.theta += (want - s.theta) * (1 - Math.exp(-dt / 0.035));
      const away = clamp((s.point.x - s.start.x) * 0.05, -2, 4), side = clamp((s.point.y - s.start.y) * 0.05, -3, 3);
      s.sx += (away - s.sx) * (1 - Math.exp(-dt / 0.05)); s.sy += (side - s.sy) * (1 - Math.exp(-dt / 0.05));
      if (snapCheck(now) === 0) { s.phase = 'free'; s.bv -= 150; }
    } else if (s.phase === 'auto') {
      // Rotura sin dedo: el talón gira hacia afuera a ritmo fijo y los puentes ceden igual.
      s.theta = Math.min(TEAR, s.theta + dt * TEAR / 0.3); s.sx += (2 - s.sx) * (1 - Math.exp(-dt / 0.05));
      if (snapCheck(now) === 0 || s.theta >= TEAR) { s.bv -= 150; toDrop(170, -220); }
    } else if (s.phase === 'free') {
      const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), gx = s.grab.x - s.hinge.x, gy = s.grab.y - s.hinge.y;
      const wx = s.point.x - s.hinge.x - (gx * cos - gy * sin), wy = s.point.y - s.hinge.y - (gx * sin + gy * cos);
      s.sx += (wx - s.sx) * (1 - Math.exp(-dt / 0.045)); s.sy += (wy - s.sy) * (1 - Math.exp(-dt / 0.045));
      const hang = TEAR * 0.55 + clamp(s.pvx * 0.0009 * s.sign, -0.3, 0.3); s.theta += (hang - s.theta) * (1 - Math.exp(-dt / 0.12));
    } else if (s.phase === 'drop') {
      s.age += dt; s.vy += GRAVITY * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.theta += s.spin * dt;
      if (s.age > 0.16) s.fade = clamp(1 - (s.age - 0.16) / 0.42, 0, 1);
      if (s.fade <= 0) { s.phase = 'idle'; finish(); }
    } else if (s.phase === 'return') {
      s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt; s.theta += s.thetaV * dt;
      s.sx += -s.sx * (1 - Math.exp(-dt / 0.07)); s.sy += -s.sy * (1 - Math.exp(-dt / 0.07));
      if (Math.abs(s.theta) < 0.0008 && Math.abs(s.thetaV) < 0.01 && Math.hypot(s.sx, s.sy) < 0.05) { s.theta = s.thetaV = s.sx = s.sy = 0; s.phase = 'idle'; }
    }
    s.bv += (-520 * s.bx - 30 * s.bv) * dt; s.bx += s.bv * dt;
    const busy = paint(now), moving = Math.abs(s.bx) > 0.02 || Math.abs(s.bv) > 0.5;
    if (s.phase !== 'idle' || moving || busy) s.raf = requestAnimationFrame(step); else { s.bx = s.bv = 0; paint(now); s.raf = 0; }
  };
  const run = () => { if (s.raf) return; s.last = performance.now(); s.raf = requestAnimationFrame(step); };
  const setHinge = far => { const end = geo.ends[far ? 1 : 0]; s.sign = far ? 1 : -1; s.hinge = { x: end.x, y: end.y }; s.hingeV = end.v; stubEl.style.transformOrigin = `${s.hinge.x}px ${s.hinge.y}px`; };
  const local = e => { const r = stage.getBoundingClientRect(), k = r.width / Wt || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  // Primero se marca usado y luego se zarpa: al revés, la llegada ponía un pase
  // nuevo y finish() lo volvía a marcar usado (pasaba con reduced-motion).
  const instantTear = () => { cancelAnimationFrame(s.raf); s.raf = 0; s.phase = 'idle'; root.setAttribute('data-instant', ''); const cb = onDepart; onDepart = null; finish(); cb && cb(); };
  const stubPaper = root.querySelector('.tt-stub-paper');
  stubPaper.addEventListener('pointerdown', e => {
    if (s.used || s.id !== null || s.phase === 'drop' || s.phase === 'auto' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { stubPaper.setPointerCapture(e.pointerId); } catch {}
    const p = local(e); s.id = e.pointerId; s.start = p; s.point = p; s.pt = performance.now(); s.pvx = s.pvy = 0;
    if (s.theta < 0.01) setHinge(p.y < geo.cross / 2);
    const cos = Math.cos(-s.theta * s.sign), sin = Math.sin(-s.theta * s.sign), ux = p.x - s.sx - s.hinge.x, uy = p.y - s.sy - s.hinge.y;
    s.grab = { x: s.hinge.x + ux * cos - uy * sin, y: s.hinge.y + ux * sin + uy * cos };
    s.a0 = Math.atan2(s.grab.y - s.hinge.y, s.grab.x - s.hinge.x) - (s.theta * s.sign) / 0.92;
    s.phase = 'held'; s.thetaV = 0; root.setAttribute('data-grabbing', '');
    onDepart = () => api.onUserTear && api.onUserTear();
    run();
  });
  stubPaper.addEventListener('pointermove', e => {
    if (s.id !== e.pointerId) return;
    const p = local(e), now = performance.now(), dt = Math.max(0.004, (now - s.pt) / 1000);
    s.pvx += ((p.x - s.point.x) / dt - s.pvx) * 0.35; s.pvy += ((p.y - s.point.y) / dt - s.pvy) * 0.35; s.pt = now; s.point = p;
    if (reduceMotion.matches && Math.hypot(p.x - s.start.x, p.y - s.start.y) > 28) { s.id = null; root.removeAttribute('data-grabbing'); instantTear(); }
  });
  const up = e => {
    if (s.id !== e.pointerId) return; s.id = null; root.removeAttribute('data-grabbing');
    try { if (stubPaper.hasPointerCapture(e.pointerId)) stubPaper.releasePointerCapture(e.pointerId); } catch {}
    if (s.phase === 'free') { const still = performance.now() - s.pt > 80; toDrop(still ? 0 : clamp(s.pvx, -1600, 1600), still ? 0 : clamp(s.pvy, -1600, 1200)); }
    else if (s.phase === 'held') { s.phase = 'return'; onDepart = null; }
    run();
  };
  stubPaper.addEventListener('pointerup', up); stubPaper.addEventListener('pointercancel', up);
  stubEl.addEventListener('keydown', e => { if (s.used || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); if (!e.repeat) { onDepart = () => api.onUserTear && api.onUserTear(); instantTear(); } });
  const fit = () => root.style.setProperty('--tt-fit', String(Math.min(1, root.parentElement.clientWidth / Wt) || 1));
  // La primera escala va sin transición: animada desde 440px, Chrome dejaba el
  // desborde del tamaño original como scroll horizontal en vertical.
  root.setAttribute('data-instant', ''); fit();
  new ResizeObserver(fit).observe(root.parentElement);
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-instant')));
  const api = {
    onUserTear: null,
    // Rompe el talón solo; depart() se llama al soltarlo, torn() al desaparecer.
    tear(depart, torn) {
      if (s.used) { depart && depart(); torn && torn(); return; }
      onDepart = depart; onTorn = torn;
      if (reduceMotion.matches) { instantTear(); return; }
      setHinge(false); s.phase = 'auto'; run();
    },
    set(from, to, n) {
      cancelAnimationFrame(s.raf); Object.assign(s, { raf: 0, phase: 'idle', id: null, theta: 0, thetaV: 0, sx: 0, sy: 0, fade: 1, age: 0, bx: 0, bv: 0, used: false, snapped: [], snapAt: [], span: [] });
      stubEl.style.visibility = ''; root.removeAttribute('data-used'); root.setAttribute('data-instant', ''); requestAnimationFrame(() => root.removeAttribute('data-instant'));
      root.querySelectorAll('.tt-from').forEach(el => { el.textContent = from.iata; }); root.querySelectorAll('.tt-to').forEach(el => { el.textContent = to.iata; });
      root.querySelector('.tt-from-city').textContent = from.name; root.querySelector('.tt-to-city').textContent = to.name;
      root.querySelector('.tt-n').textContent = n; root.querySelector('.tt-coords').textContent = fmtCoords(to);
      root.setAttribute('aria-label', `Pase de abordar de ${from.name} a ${to.name}`); stubEl.setAttribute('aria-label', `Arrancar el talón para zarpar a ${to.name}`);
      sr.textContent = ''; paint(performance.now());
    },
    setTo(to, n) { root.querySelectorAll('.tt-to').forEach(el => { el.textContent = to.iata; }); root.querySelector('.tt-to-city').textContent = to.name; root.querySelector('.tt-n').textContent = n; root.querySelector('.tt-coords').textContent = fmtCoords(to); },
  };
  paint(performance.now());
  return api;
})();
