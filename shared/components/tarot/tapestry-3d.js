// ══════════════════════════════════════════════════════
// Tapiz en relieve · la placa compartida (relief-plate/plate-3d.js) con el
// tapiz de deco-pattern.js: el oro levantado y pulido (metal), los
// mosaicos hundidos y laqueados (clearcoat). Se guarda por bioma y modo.
// El brillo que corre por las líneas doradas de mosaico en mosaico sale de:
//  · el entorno (RoomEnvironment) girando despacio, que desliza los
//    reflejos sobre los biseles del oro,
//  · una luz que sigue al cursor muy cerca de la placa (en táctil, al dedo
//    o al giroscopio) y otra que barre sola.
//   mount({ host, palette: () => opts de paint }) → { set(), preload(opts) }
// ══════════════════════════════════════════════════════
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mount as plate } from '../relief-plate/plate-3d.js';

export function mount({ host = document.body, palette }) {
  return plate({ host, palette, className: 'tr-tapestry', painter: new URL('./deco-pattern.js', import.meta.url).href, setup: ({ THREE, scene, renderer }) => {
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environmentIntensity = 0.3;
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x202030, 0.35));
    const cursor = new THREE.PointLight(0xffe6b0, 9, 7, 1.6), sweep = new THREE.PointLight(0xfff0d0, 6, 9, 1.6);
    scene.add(cursor, sweep);
    // la luz sigue al cursor (suavizado); en táctil, el dedo o el giroscopio
    const aim = { x: 0.2, y: 0.1 }, cur = { x: 0, y: 0 };
    addEventListener('pointermove', e => { aim.x = e.clientX / innerWidth * 2 - 1; aim.y = -(e.clientY / innerHeight * 2 - 1); });
    addEventListener('deviceorientation', e => { if (e.gamma == null) return; aim.x = Math.max(-1, Math.min(1, e.gamma / 30)); aim.y = Math.max(-1, Math.min(1, (45 - e.beta) / 30)); });
    return (t, dt) => {
      const k = 1 - Math.exp(-dt * 3); cur.x += (aim.x - cur.x) * k; cur.y += (aim.y - cur.y) * k;
      cursor.position.set(cur.x * 8, cur.y * 4.5, 1.1);
      sweep.position.set(Math.sin(t * 0.21) * 9, Math.cos(t * 0.13) * 4, 1.6);
      scene.environmentRotation.set(Math.sin(t * 0.07) * 0.5, t * 0.05, 0);
    };
  } });
}
