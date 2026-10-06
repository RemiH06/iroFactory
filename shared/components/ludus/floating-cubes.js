// ══════════════════════════════════════════════════════
// CUBOS FLOTANTES — paleta de ludus
// ══════════════════════════════════════════════════════
import { cssVar, updateHexes } from './kit.js';

export const cubeScene = document.getElementById('ludus-cubes');
export const LUDUS_COLORS = [
  '--piece-i','--piece-o','--piece-t','--piece-s',
  '--piece-z','--piece-j','--piece-l',
];
export function getLudusColor() {
  const tok = LUDUS_COLORS[Math.floor(Math.random() * LUDUS_COLORS.length)];
  return cssVar(tok);
}
export function createParticles(cube, color) {
  const rect = cube.getBoundingClientRect();
  const particles = [];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'cube-particle';
    p.style.left  = rect.left + rect.width  / 2 + 'px';
    p.style.top   = rect.top  + rect.height / 2 + 'px';
    p.style.backgroundColor = color;
    p.style.setProperty('--dx', (Math.random() - .5) * 100 + 'px');
    p.style.setProperty('--dy', (Math.random() - .5) * 100 + 'px');
    p.style.animation = 'cube-particle-fly .5s forwards';
    document.body.appendChild(p);
    particles.push(p);
  }
  setTimeout(() => particles.forEach(p => p.remove()), 500);
}
export function createCube() {
  const cube  = document.createElement('div');
  cube.className = 'cube';
  const color = getLudusColor();
  const innerColor = getLudusColor();

  for (let i = 0; i < 6; i++) {
    const face = document.createElement('div');
    face.style.background = color;
    face.style.border = `2px solid ${color}`;
    cube.appendChild(face);
  }

  const inner = document.createElement('div');
  inner.className = 'inner-cube';
  for (let i = 0; i < 6; i++) {
    const face = document.createElement('div');
    face.style.background = innerColor;
    face.style.border = `2px solid ${innerColor}`;
    inner.appendChild(face);
  }
  cube.appendChild(inner);

  const xDir = Math.random() * 2 - 1;
  const yDir = Math.random() * 2 - 1;
  cube.style.setProperty('--x-dir', xDir);
  cube.style.setProperty('--y-dir', yDir);
  cube.style.left = Math.random() * 100 + 'vw';
  cube.style.top  = Math.random() * 100 + 'vh';

  const spinDur = (Math.random() * 3 + 2).toFixed(1) + 's';
  const moveDur = (Math.random() * 5 + 7).toFixed(1) + 's';
  cube.style.animationDuration = `${spinDur}, ${moveDur}`;

  cubeScene.appendChild(cube);

  setTimeout(() => {
    cube.style.animation = 'cube-explode .5s forwards';
    setTimeout(() => {
      createParticles(cube, color);
      cube.remove();
    }, 500);
  }, parseFloat(moveDur) * 1000);
}
export function mount() {
setInterval(createCube, 200);
updateHexes();
}
