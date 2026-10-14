// ══════════════════════════════════════════════════════
// La mesa de cartas en relieve · la placa compartida (relief-plate) con el
// grabado de chart-table-pattern.js, detrás de la sección del mapa. El
// grabado no se mueve: lo que corre es la luz. Una luz sigue al cursor muy
// cerca de la mesa (en táctil, al dedo) y otra la recorre despacio; de día
// es luz de ventana, blanca y fría, y de noche una lámpara de aceite,
// cálida y más baja, así el latón brilla distinto en cada modo.
// Los colores salen de los tokens del tema (--table, --table-dk, --brass,
// --brass-lt, --copper, --copper-lt, --chart-line).
//   mount({ host }) → { set() }
// ══════════════════════════════════════════════════════
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mount as plate } from '../relief-plate/plate-3d.js';
import { cssVar, onTheme, theme } from '../../core/core.js';

export function mount({ host = document.getElementById('viaje') } = {}) {
  if (!host) return null;
  const palette = () => ({ base: cssVar('--table'), grain: cssVar('--table-dk'), brass: [cssVar('--brass'), cssVar('--brass-lt')], copper: [cssVar('--copper'), cssVar('--copper-lt')], line: cssVar('--chart-line') });
  const api = plate({
    host, fill: 'host', fps: 30, className: 'od-chart-table',
    painter: new URL('./chart-table-pattern.js', import.meta.url).href, palette,
    reliefOpts: { strength: 3, blur: 1, rough: [0.26, 0.62, 0.2] },
    material: { clearcoat: 0.35, clearcoatRoughness: 0.5 },
    setup: ({ THREE, scene, renderer }) => {
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
      const hemi = new THREE.HemisphereLight(0xeef4ff, 0x20201c, 0.5);
      const cursor = new THREE.PointLight(0xffffff, 8, 7, 1.6), sweep = new THREE.PointLight(0xffffff, 5, 9, 1.6);
      scene.add(hemi, cursor, sweep);
      const tone = () => {
        const night = theme.alt;
        cursor.color.set(night ? 0xffb060 : 0xf4f8ff); cursor.intensity = night ? 11 : 7;
        sweep.color.set(night ? 0xff9a48 : 0xfff4e0); sweep.intensity = night ? 3 : 5;
        hemi.intensity = night ? 0.18 : 0.55; scene.environmentIntensity = night ? 0.12 : 0.32;
      };
      tone(); onTheme(tone);
      const aim = { x: 0.3, y: 0.2 }, cur = { x: 0, y: 0 };
      host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); aim.x = (e.clientX - r.left) / r.width * 2 - 1; aim.y = -((e.clientY - r.top) / r.height * 2 - 1); }, { passive: true });
      return (t, dt) => {
        const k = 1 - Math.exp(-dt * 3); cur.x += (aim.x - cur.x) * k; cur.y += (aim.y - cur.y) * k;
        cursor.position.set(cur.x * 8, cur.y * 4.5, theme.alt ? 0.9 : 1.3);
        sweep.position.set(Math.sin(t * 0.17) * 9, Math.cos(t * 0.11) * 4, 1.8);
        scene.environmentRotation.set(Math.sin(t * 0.05) * 0.4, t * 0.04, 0);
      };
    }
  });
  onTheme(() => api.set());
  return api;
}
