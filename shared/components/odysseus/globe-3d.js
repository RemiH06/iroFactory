// ══════════════════════════════════════════════════════
// Globo · Three.js r186 (shared/vendor/three, MIT).
// Al alejarse del mapamundi la hoja se enrolla en una esfera. La malla es
// la carta equirectangular (longitud relativa al centro de la cámara, así
// la costura queda siempre atrás) y el vértice la dobla sobre una esfera
// de radio ρ = R / c conservando la longitud de arco: con c = 0 es la hoja
// plana, idéntica al canvas 2D del mapa; con c = 1, el globo de radio
// R = 360·k / 2π. La textura se dibuja una vez por modo con los mismos
// Path2D de Natural Earth y los tokens del tema. La luz es la del sol en
// este instante (punto subsolar real), y aparece conforme se enrolla.
// Se dibuja fuera del DOM y world-map.js la pega en la hoja.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';
import { WORLD } from './geography.js';

const VS = `
attribute vec2 aLL;
uniform float uK, uC, uR, uLat0, uLon0;
varying vec2 vUV; varying vec3 vN; varying vec3 vGeo;
void main(){
  float X = aLL.x * uK, Y = aLL.y * uK, Y0 = uLat0 * uK;
  vec3 p, n;
  if (uC < 1e-4) { p = vec3(X, Y - Y0, 0.0); n = vec3(0.0, 0.0, 1.0); }
  else {
    // Fórmulas con sin² de medio ángulo: con ρ enorme (casi plano) no se pierde precisión.
    float rho = uR / uC, phi = Y / rho, lam = X / rho, al = Y0 / rho;
    float sl = sin(lam * 0.5), s2l = 2.0 * sl * sl, sd = sin((phi - al) * 0.5), s2d = 2.0 * sd * sd;
    p = vec3(rho * cos(phi) * sin(lam), rho * sin(phi - al) + rho * cos(phi) * sin(al) * s2l, -rho * s2d - rho * cos(phi) * cos(al) * s2l);
    n = vec3(p.xy, p.z + rho) / rho;
  }
  vN = n;
  vUV = vec2((aLL.x + uLon0 + 180.0) / 360.0, (aLL.y + 90.0) / 180.0);
  float la = radians(aLL.y), lo = radians(aLL.x + uLon0);
  vGeo = vec3(cos(la) * cos(lo), cos(la) * sin(lo), sin(la));
  gl_Position = projectionMatrix * vec4(p, 1.0);
}`;
const FS = `
uniform sampler2D uMap; uniform float uC, uDark; uniform vec3 uSun, uShade;
varying vec2 vUV; varying vec3 vN; varying vec3 vGeo;
void main(){
  vec3 c = texture2D(uMap, vUV).rgb;
  // Día y noche reales: el lado de noche se tiñe con la sombra del tema.
  float day = smoothstep(-0.12, 0.18, dot(normalize(vGeo), uSun));
  c = mix(c, mix(c * uShade, c, day), uC * mix(0.55, 0.75, uDark));
  // Borde que se oscurece como en un globo de escritorio.
  float rim = clamp(normalize(vN).z, 0.0, 1.0);
  c *= mix(1.0, 0.72 + 0.28 * pow(rim, 0.6), uC);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export function createGlobe() {
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true }); }
  catch { return null; }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e6, 1e6);
  // Malla: longitud relativa de −180 a 180 y latitud de −90 a 90, cada 2°.
  const SX = 180, SY = 90, ll = [], idx = [];
  for (let j = 0; j <= SY; j++) for (let i = 0; i <= SX; i++) ll.push(-180 + 360 * i / SX, -90 + 180 * j / SY);
  for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) { const a = j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aLL', new THREE.Float32BufferAttribute(ll, 2));
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(ll.length / 2 * 3), 3));
  geo.setIndex(idx);
  // Textura equirectangular dibujada con los mismos Path2D del mapa.
  const tc = document.createElement('canvas'); tc.width = 4096; tc.height = 2048;
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const U = { uMap: { value: tex }, uK: { value: 1 }, uC: { value: 0 }, uR: { value: 1 }, uLat0: { value: 0 }, uLon0: { value: 0 }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uShade: { value: new THREE.Color() }, uDark: { value: 0 } };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS }));
  mesh.frustumCulled = false; scene.add(mesh);

  const paint = (pal, night) => {
    const c = tc.getContext('2d'), s = tc.width / 360;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = night ? pal['--sea-dk'] : pal['--sea']; c.fillRect(0, 0, tc.width, tc.height);
    // x = (lon + 180)·s, y = (90 − lat)·s; los Path2D vienen en (lon, −lat).
    c.setTransform(s, 0, 0, s, 180 * s, 90 * s);
    c.strokeStyle = night ? pal['--stain'] : pal['--sea-dk']; c.globalAlpha = night ? 0.35 : 0.55; c.lineWidth = 2.2 / s; c.beginPath();
    for (let lo = -180; lo <= 180; lo += 30) { c.moveTo(lo, -90); c.lineTo(lo, 90); }
    for (let la = -90; la <= 90; la += 30) { c.moveTo(-180, la); c.lineTo(180, la); }
    c.stroke(); c.globalAlpha = 1;
    c.fillStyle = pal['--land']; c.fill(WORLD.countries, 'evenodd');
    c.strokeStyle = pal['--ink']; c.globalAlpha = night ? 0.45 : 0.4; c.lineWidth = 2.6 / s; c.stroke(WORLD.countries); c.globalAlpha = 1;
    tex.needsUpdate = true;
    U.uShade.value.set(night ? pal['--sea-dk'] : pal['--ink']).lerp(new THREE.Color(1, 1, 1), night ? 0.15 : 0.55); U.uDark.value = night ? 1 : 0;
  };
  let w = 1, h = 1;
  return {
    canvas,
    refresh: paint,
    resize(W, H) { w = W; h = H; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 }); camera.updateProjectionMatrix(); },
    // k: px por grado en el centro; c: cuánto se enrolla (0 a 1); sun: punto subsolar.
    render({ lon, lat, k, c, sun }) {
      U.uK.value = k; U.uC.value = c; U.uR.value = 360 * k / (2 * Math.PI); U.uLat0.value = lat; U.uLon0.value = lon;
      const a = sun.lat * Math.PI / 180, b = sun.lon * Math.PI / 180; U.uSun.value.set(Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a));
      renderer.render(scene, camera);
    },
  };
}
