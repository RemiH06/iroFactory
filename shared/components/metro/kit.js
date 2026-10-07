// metro · base del tema: modo, lectura de tokens y utilidades que usan sus componentes.

import { reduceMotion, cssVar, hexRgb, updateHexes, inkSwatchLabels, initTheme, onTheme, theme } from '../../core/core.js';

export { reduceMotion, cssVar, updateHexes, inkSwatchLabels, onTheme };
export const hexToRgb = hexRgb;
// ── Modo ──────────────────────────────────────────────
export let metroDark = false;
onTheme(() => { metroDark = theme.alt; });
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
let ctl;
export const metroToggle = () => ctl && ctl.toggle();
export function mount() {
ctl = initTheme({ altClass: 'dark', toggle: '#metro-toggle', label: alt => (alt ? '☀ Light' : '☾ Dark'), aria: alt => (alt ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') });
onTheme(rebuildNodes);
if (!reduceMotion.matches) document.documentElement.classList.add('js-pin');
// ── Ciclo de color "_theme" ───────────────────────────
(function(){
  const el=document.querySelector('.metro-title-anim');
  if(!el) return;
  const toks=['--red','--yellow-ink','--green']; let i=0;
  function cycle(){ el.style.color=cssVar(toks[i]); i=(i+1)%3; }
  cycle(); setInterval(cycle,1200);
  onTheme(()=>{i=0;cycle();});
})();
}
