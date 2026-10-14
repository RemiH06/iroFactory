// ══════════════════════════════════════════════════════
// Sound · sonido sintetizado (Web Audio, sin archivos), apagado por
// defecto. Teclas de la terminal como teclado mecánico, un zap por cada
// anillo de neón, chispa al soldar, dos notas cuando come la mascota y el
// zumbido de un tubo de neón mientras está el protector de pantalla. Se
// prende con el botón del altavoz o con `sound on`; se recuerda.
//   mount({ toggle: '#snd-btn' })
// ══════════════════════════════════════════════════════
import { addCommand } from './terminal.js';
import { onStat } from './stats.js';

const KEY = 'sherry:sound';

export function mount({ toggle = '#snd-btn' } = {}) {
  const btn = document.querySelector(toggle);
  let on = false, ac = null, noiseBuf = null, hum = null;
  try { on = localStorage.getItem(KEY) === '1'; } catch { on = false; }
  const ctx = () => {
    if (!ac) {
      ac = new AudioContext();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const env = (g, t, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const noise = (freq, q, peak, dur) => {
    const a = ctx(), t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; env(g, t, peak, dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.02);
  };
  const tone = (from, to, peak, dur, type = 'sine', delay = 0) => {
    const a = ctx(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur); env(g, t, peak, dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const humOn = () => {
    if (hum) return;
    const a = ctx(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; g.gain.linearRampToValueAtTime(0.025, a.currentTime + 0.8);
    const os = [60, 120.4, 180.2].map((hz, i) => { const o = a.createOscillator(); o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); return o; });
    f.connect(g).connect(a.destination);
    hum = { g, os };
  };
  const humOff = () => { if (!hum) return; const { g, os } = hum; hum = null; g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3); os.forEach(o => o.stop(ac.currentTime + 0.35)); };

  const paint = () => { if (!btn) return; btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Apagar el sonido' : 'Encender el sonido'); btn.title = on ? 'Sonido encendido' : 'Sonido apagado'; };
  const set = v => { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* sin almacenamiento */ } if (v) tone(880, 1320, 0.05, 0.08); else humOff(); paint(); };
  btn?.addEventListener('click', () => set(!on));
  paint();

  document.addEventListener('keydown', e => { if (on && e.target.closest?.('.sh-term-in, .sh-pal-in') && e.key.length === 1) noise(e.key === ' ' ? 900 : 2400 + Math.random() * 1400, 3, 0.18, 0.03); });
  addEventListener('sh:pulse', () => { if (on) tone(620, 180, 0.04, 0.16, 'triangle'); });
  addEventListener('sh:saver', e => { if (on) (e.detail ? humOn() : humOff()); });
  addEventListener('sh:feast', () => { if (on) [523, 659, 784, 1046].forEach((hz, i) => tone(hz, hz, 0.05, 0.12, 'square', i * 0.1)); });
  onStat(key => {
    if (!on) return;
    if (key === 'solder') noise(5200, 1.2, 0.12, 0.09);
    else if (key === 'feed' || key === 'play') { tone(660, 660, 0.05, 0.07, 'square'); tone(990, 990, 0.05, 0.08, 'square', 0.08); }
  });
  addCommand('sound', { args: () => ['on', 'off'], help: 'enciende o apaga el sonido', entry: () => ({ group: 'Acciones', label: on ? 'Apagar el sonido' : 'Encender el sonido', keys: 'audio snd volumen' }), fn: ([a]) => { set(a === 'on' ? true : a === 'off' ? false : !on); return [`sonido ${on ? 'encendido' : 'apagado'}`]; } });
}
