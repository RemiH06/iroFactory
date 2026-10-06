// metro · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export function cssVar(n){return getComputedStyle(document.body).getPropertyValue(n).trim();}
export function hexToRgb(hex){
  const h = hex.replace('#','');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v.slice(0,6),16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// ── Toggle ────────────────────────────────────────────
export let metroDark = false;
export const changeListeners = [];
export function metroToggle() {
  metroDark = !metroDark;
  document.body.classList.toggle('dark', metroDark);
  document.getElementById('metro-toggle').textContent = metroDark ? '☀ Light' : '☾ Dark';
  changeListeners.forEach(fn => fn());
  updateHexes();
  rebuildNodes();
}
// ── Fondo: grafo de nodos animado (se queda tal cual) ───
export const canvas = document.getElementById('metro-bg');
export const ctx    = canvas.getContext('2d');
export let W, H, nodes = [];
export const COLS_D = ['#ff4560','#f5a623','#00e5a0'];
export const COLS_L = ['#8B1A1A','#C4691A','#2A6B3A'];
export function rebuildNodes() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  const cols = metroDark ? COLS_D : COLS_L;
  nodes = Array.from({length:36}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5,
    r: 2+Math.random()*3,
    col: cols[Math.floor(Math.random()*cols.length)],
    alpha: 0.35+Math.random()*.45,
  }));
  if (reduceMotion.matches && typeof drawBg === 'function') drawBg();
}
export function drawBg() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = metroDark ? '#0a0c10' : '#F5F0E8';
  ctx.fillRect(0,0,W,H);
  const gc = metroDark ? 'rgba(30,37,53,0.55)' : 'rgba(200,191,176,0.30)';
  ctx.strokeStyle = gc; ctx.lineWidth = 1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // Con prefers-reduced-motion los nodos no se mueven: un solo cuadro,
  // redibujado al cambiar tema o tamaño (antes el loop seguía a 60fps).
  if (!reduceMotion.matches) nodes.forEach(n=>{
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<0||n.x>W) n.vx*=-1;
    if(n.y<0||n.y>H) n.vy*=-1;
  });
  const maxD = Math.min(W,H)*0.20;
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<maxD){
        const s=1-d/maxD;
        ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y);
        ctx.strokeStyle = metroDark ? `rgba(30,37,53,${s*.9})` : `rgba(200,191,176,${s*.7})`;
        ctx.lineWidth = s*1.5; ctx.stroke();
      }
    }
  }
  nodes.forEach(n=>{
    const s = n.r * 2;
    if(metroDark){
      const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,s*2.5);
      g.addColorStop(0,n.col+'55'); g.addColorStop(1,n.col+'00');
      ctx.beginPath(); ctx.arc(n.x,n.y,s*2.5,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    }
    ctx.fillStyle=n.col; ctx.globalAlpha=n.alpha;
    ctx.fillRect(n.x - s/2, n.y - s/2, s, s);
    ctx.globalAlpha=1;
  });
  if (!reduceMotion.matches) requestAnimationFrame(drawBg);
}
// ── Etiquetas hex de la paleta ─────────────────────────
// Antes: color fijo con mix-blend-mode: difference. En medios tonos
// (naranjas, verdes, el gris) quedaba un gris turbio de 1.1 a 2.5:1.
// Ahora cada etiqueta usa la tinta del modo vigente (--text o --bg)
// con mayor contraste WCAG real contra su muestra; si ninguna llega
// a 4.5:1, va sobre una pastilla --bg con --text (skill colorimetría).
export function inkSwatchLabels() {
  const rgbOf = s => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const hexRgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const inks = ['--text', '--bg'].map(t => ({ t, c: hexRgb(cssVar(t)) }));
  document.querySelectorAll('.swatch-hex').forEach(el => {
    const sw = rgbOf(getComputedStyle(el.parentElement).backgroundColor);
    if (!sw) return;
    const best = inks.map(i => ({ t: i.t, r: ratio(i.c, sw) })).sort((a, b) => b.r - a.r)[0];
    const chip = best.r < 4.5;
    el.classList.toggle('is-chip', chip);
    el.style.color = chip ? 'var(--text)' : `var(${best.t})`;
  });
}
// ── Hexes ─────────────────────────────────────────────
export function updateHexes(){
  const m={'hex-red':'--red','hex-yellow':'--yellow','hex-green':'--green','hex-blue':'--blue','hex-purple':'--purple','hex-orange':'--orange','hex-pink':'--pink','hex-brown':'--brown','hex-black':'--black','hex-gray':'--gray','hex-white':'--white','hex-accent':'--accent','hex-ok':'--ok','hex-warn':'--warn','hex-danger':'--danger'};
  Object.entries(m).forEach(([id,tok])=>{const el=document.getElementById(id);if(el)el.textContent=cssVar(tok).toUpperCase();});
  inkSwatchLabels();
}
export function mount() {
if (!reduceMotion.matches) document.documentElement.classList.add('js-pin');
// ── Ciclo de color "_theme" ───────────────────────────
(function(){
  const el=document.querySelector('.metro-title-anim');
  if(!el) return;
  const toks=['--red','--yellow-ink','--green']; let i=0;
  function cycle(){ el.style.color=cssVar(toks[i]); i=(i+1)%3; }
  cycle(); setInterval(cycle,1200);
  changeListeners.push(()=>{i=0;cycle();});
})();
}
