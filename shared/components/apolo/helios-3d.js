// ══════════════════════════════════════════════════════
// Helios y el día · la placa en relieve (relief-plate/plate-3d.js) con el
// paño de mármol y oro de helios-pattern.js, y detrás, en el mismo lienzo,
// el cielo que se ve por el óculo: degradado, mar con islas, sol, luna y
// estrellas, todo en un shader que solo depende de la hora.
// La hora sale del scroll: de día la página va del amanecer a la noche
// (6:00 a 22:30); de atardecer, del ocaso al amanecer siguiente (17:30 a
// 6:30). El sol cruza el óculo de izquierda a derecha y es la luz de la
// piedra: al alba y al ocaso entra rasante y naranja (el oro se marca y
// la piedra pulida refleja de lado), a mediodía cae de arriba, blanca; de
// noche alumbra la luna, fría y tenue.
// La piedra cambia con el modo: verde antico de día, pórfido de atardecer.
// Avisa la hora con el evento `ap:hour` ({ hour, sun, x }: x es el sol en
// la vista, de 0 a 1) para el reloj de la página y los rayos de luz.
//   mount({ host }) → { set(), hour() }
// ══════════════════════════════════════════════════════
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mount as plate } from '../relief-plate/plate-3d.js';
import { clamp, onTheme, reduceMotion, smooth, theme } from '../../core/core.js';

// las dos piedras: verde antico (día) y pórfido (atardecer), con el oro y la piedra de los medallones
const VERDE = { stone: '#1F3B33', deep: '#0F201B', vein: '#CFDCCB', inlay: '#6E2A24', gold: ['#8C6A22', '#EBCB74'] };
const PORPHYRY = { stone: '#4A1E2C', deep: '#230C14', vein: '#E2C2B0', inlay: '#1F3B33', gold: ['#946A20', '#F0C860'] };

const skyFs = `
varying vec2 vUv;
uniform float uSunEl, uTime, uAspect, uHorizon;
uniform vec2 uSun, uMoon;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(float x) { float i = floor(x), f = fract(x); return mix(hash(vec2(i, 0.0)), hash(vec2(i + 1.0, 0.0)), f * f * (3.0 - 2.0 * f)); }
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);            // y hacia abajo, como el lienzo del paño
  float horizon = uHorizon;
  float day = smoothstep(-0.12, 0.45, uSunEl), dusk = 1.0 - smoothstep(0.0, 0.32, abs(uSunEl + 0.03));
  vec3 zen = mix(vec3(0.03, 0.04, 0.12), vec3(0.16, 0.42, 0.82), day);
  vec3 hor = mix(vec3(0.09, 0.11, 0.24), vec3(0.66, 0.83, 0.96), day);
  float nearSun = exp(-abs(uv.x - uSun.x) * 2.2);
  hor = mix(hor, vec3(0.98, 0.55, 0.32), dusk * (0.55 + 0.45 * nearSun));
  zen = mix(zen, vec3(0.28, 0.24, 0.52), dusk * 0.6);
  float t = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
  vec3 col = mix(hor, zen, pow(t, 0.7));
  vec2 d = (uv - uSun) * vec2(uAspect, 1.0);
  float sd = length(d);
  vec3 sunCol = mix(vec3(1.0, 0.55, 0.28), vec3(1.0, 0.97, 0.9), smoothstep(0.0, 0.4, uSunEl));
  col += sunCol * (smoothstep(0.021, 0.018, sd) * 1.4 + exp(-sd * 9.0) * 0.45 * (0.4 + dusk)) * step(uv.y, horizon);
  // estrellas y luna
  float night = 1.0 - smoothstep(-0.25, 0.05, uSunEl);
  vec2 g = uv * vec2(320.0, 180.0), id = floor(g), f = fract(g) - 0.5;
  float h = hash(id), tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
  col += vec3(0.9, 0.92, 1.0) * smoothstep(0.08, 0.0, length(f)) * step(0.965, h) * tw * night * step(uv.y, horizon);
  vec2 m = (uv - uMoon) * vec2(uAspect, 1.0); float md = length(m);
  float phase = smoothstep(0.016, 0.013, length(m - vec2(0.007, -0.003)));
  col += vec3(0.92, 0.93, 0.86) * smoothstep(0.016, 0.013, md) * (1.0 - phase * 0.85) * night * step(uv.y, horizon);
  col += vec3(0.5, 0.55, 0.75) * exp(-md * 14.0) * 0.25 * night;
  // islas en el horizonte
  float isle = horizon - 0.018 * smoothstep(0.35, 0.75, noise(uv.x * 30.0 + 3.0)) - 0.008 * noise(uv.x * 110.0);
  if (uv.y > isle && uv.y < horizon) col = mix(hor, zen, 0.5) * mix(0.42, 0.62, day);
  // el mar: refleja el cielo, más oscuro, con la estela del sol (o de la luna)
  if (uv.y >= horizon) {
    float k = (uv.y - horizon) / (1.0 - horizon);
    col = mix(hor * 0.62, zen * 0.45 + vec3(0.0, 0.03, 0.06), clamp(k * 1.6, 0.0, 1.0));
    float wave = noise(uv.x * 260.0 + uTime * 0.6 + k * 80.0) * noise(uv.y * 900.0 - uTime * 0.4);
    float trail = exp(-abs(uv.x - uSun.x) * 30.0) * smoothstep(-0.05, 0.1, uSunEl);
    float mtrail = exp(-abs(uv.x - uMoon.x) * 40.0) * night;
    col += sunCol * trail * smoothstep(0.45, 0.85, wave) * 1.2 + vec3(0.8, 0.85, 1.0) * mtrail * smoothstep(0.55, 0.9, wave) * 0.6;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// hora → posición en el cielo del óculo (coordenadas del lienzo, y hacia
// abajo): el óculo mide 21 de 100 de alto, centrado; el horizonte va a 2/3
const HORIZON = 0.58, arc = a => [0.5 - 0.1 * Math.cos(a), HORIZON - 0.17 * Math.sin(a)];

export function mount({ host = document.body } = {}) {
  let target = 6, now = 6, said = -1, api;
  const fromScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    return theme.alt ? 17.5 + p * 13 : 6 + p * 16.5;
  };
  // x del sol en la vista: la placa cubre la vista y recorta los lados si la pantalla es más angosta que 16:9
  const viewX = px => (px - 0.5) * Math.max(1, (16 / 9) / (innerWidth / innerHeight)) + 0.5;
  const emit = () => { if (Math.abs(now - said) < 0.01) return; said = now; const a = (now - 6) / 12 * Math.PI; document.dispatchEvent(new CustomEvent('ap:hour', { detail: { hour: now, sun: Math.sin(a), x: viewX(arc(a)[0]) } })); };
  now = target = fromScroll();
  api = plate({
    host, className: 'ap-helios', fps: 30,
    painter: new URL('./helios-pattern.js', import.meta.url).href,
    palette: () => (theme.alt ? PORPHYRY : VERDE),
    reliefOpts: { strength: 3.2, blur: 1, rough: [0.2, 0.3, 0.14] },
    material: { clearcoat: 0.85, clearcoatRoughness: 0.12, alphaTest: 0.5 },
    setup: ({ THREE, scene, renderer }) => {
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
      // el cielo, justo detrás de la placa y del mismo tamaño
      const U = { uSunEl: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 16 / 9 }, uHorizon: { value: HORIZON }, uSun: { value: new THREE.Vector2() }, uMoon: { value: new THREE.Vector2() } };
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: skyFs, depthWrite: false }));
      sky.position.z = -0.02; sky.renderOrder = -1; scene.add(sky);
      const sun = new THREE.DirectionalLight(0xffffff, 0), moon = new THREE.DirectionalLight(0x9fb4ff, 0), hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a3a28, 0.3);
      scene.add(sun, moon, hemi);
      const warm = new THREE.Color(0xff9a52), white = new THREE.Color(0xfff3e2), skyDay = new THREE.Color(0xbcd6f2), skyDusk = new THREE.Color(0xc89aa8), skyNight = new THREE.Color(0x2a3260);
      return t => {
        target = fromScroll();
        now += (target - now) * (reduceMotion.matches ? 1 : 0.12);
        if (Math.abs(target - now) < 0.001) now = target;
        const a = (now - 6) / 12 * Math.PI, el = Math.sin(a), ma = a - Math.PI, mel = Math.sin(ma);
        const [sx, sy] = arc(a), [mx, my] = arc(ma);
        U.uSun.value.set(sx, sy); U.uMoon.value.set(mx, my); U.uSunEl.value = el; U.uTime.value = t;
        U.uAspect.value = 16 / 9;
        // el sol: rasante y naranja cerca del horizonte, alto y blanco a mediodía
        const up = smooth(-0.04, 0.18, el), high = smooth(0.05, 0.6, el);
        sun.position.set(-Math.cos(a) * 6, el * 4.2, 0.7 + 2.6 * Math.max(0, el));
        sun.color.copy(warm).lerp(white, high); sun.intensity = 4 * up;
        moon.position.set(-Math.cos(ma) * 6, mel * 4, 2.2); moon.intensity = 0.9 * smooth(0, 0.25, mel) * (1 - up);
        const dusk = 1 - smooth(0, 0.3, Math.abs(el));
        hemi.color.copy(skyNight).lerp(skyDay, smooth(-0.15, 0.4, el)).lerp(skyDusk, dusk * 0.5);
        hemi.intensity = 0.18 + 0.5 * smooth(-0.15, 0.4, el);
        scene.environmentIntensity = 0.08 + 0.3 * smooth(-0.1, 0.4, el);
        emit();
      };
    }
  });
  addEventListener('scroll', () => { if (reduceMotion.matches) api.still(); }, { passive: true });
  emit(); // el reloj tiene hora antes de que llegue el primer cuadro
  onTheme(() => { api.set(); api.preload(theme.alt ? VERDE : PORPHYRY); });
  api.preload(theme.alt ? VERDE : PORPHYRY); // el otro modo, a la caché
  return { set: () => api.set(), hour: () => now };
}
