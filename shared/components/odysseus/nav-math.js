// ══════════════════════════════════════════════════════
// Cuentas de navegación, sin dependencias: distancia ortodrómica
// (haversine, radio medio de 6371 km), rumbo inicial, punto intermedio
// del círculo máximo, huso horario real de cada puerto (Intl, con su
// horario de verano), salida y puesta del sol (ecuación de NOAA) y el
// punto subsolar para la luz del globo.
// ══════════════════════════════════════════════════════
export const R_KM = 6371, KM_NM = 1.852, EARTH_KM = 2 * Math.PI * R_KM;
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

export const haversine = (a, b) => {
  const dφ = rad(b.lat - a.lat), dλ = rad(b.lon - a.lon);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};
// Rumbo inicial de a hacia b, en grados desde el norte (0 a 360).
export const bearing = (a, b) => {
  const φ1 = rad(a.lat), φ2 = rad(b.lat), dλ = rad(b.lon - a.lon);
  return (deg(Math.atan2(Math.sin(dλ) * Math.cos(φ2), Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ))) + 360) % 360;
};
const ROSE = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export const rose = b => ROSE[Math.round(b / 22.5) % 16];
// Punto a la fracción f del círculo máximo entre a y b.
export const gcPoint = (a, b, f) => {
  const φ1 = rad(a.lat), λ1 = rad(a.lon), φ2 = rad(b.lat), λ2 = rad(b.lon), d = haversine(a, b) / R_KM;
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2), y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2), z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) };
};
export const antipode = p => ({ lat: -p.lat, lon: p.lon > 0 ? p.lon - 180 : p.lon + 180 });
export const dms = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60); const [mm, ss] = s === 60 ? [m + 1, 0] : [m, s]; return `${d}° ${String(mm).padStart(2, '0')}′ ${String(ss).padStart(2, '0')}″ ${v >= 0 ? pos : neg}`; };
export const fmtDMS = p => `${dms(p.lat, 'N', 'S')} · ${dms(p.lon, 'E', 'O')}`;

// ── Husos: desfase en minutos de una zona IANA en una fecha (con horario de verano)
const offFmt = new Map();
export const tzOffset = (tz, date = new Date()) => {
  if (!offFmt.has(tz)) offFmt.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }));
  const name = offFmt.get(tz).formatToParts(date).find(p => p.type === 'timeZoneName')?.value || 'GMT';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
};
export const fmtOffset = min => `UTC${min < 0 ? '−' : '+'}${Math.floor(Math.abs(min) / 60)}${Math.abs(min) % 60 ? ':' + String(Math.abs(min) % 60).padStart(2, '0') : ''}`;
const fmts = new Map();
const fmt = (tz, opts) => { const k = tz + JSON.stringify(opts); if (!fmts.has(k)) fmts.set(k, new Intl.DateTimeFormat('es-MX', { timeZone: tz, ...opts })); return fmts.get(k); };
export const clock = (tz, date = new Date()) => fmt(tz, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
export const dayClock = (tz, date) => fmt(tz, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(/\./g, '').replace(' de ', ' ');
export const shortDay = (tz, date) => fmt(tz, { day: 'numeric', month: 'short' }).format(date).replace(/\./g, '');
// Fecha civil (año, mes, día) de una zona en un instante.
const ymd = (tz, date) => { const o = {}; fmt(tz, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date).forEach(p => { o[p.type] = +p.value; }); return o; };
// Instante UTC que corresponde a una hora civil de una zona (dos pasadas por el horario de verano).
export const zonedToUTC = (tz, y, mo, d, h, mi) => { let t = Date.UTC(y, mo - 1, d, h, mi); for (let k = 0; k < 2; k++) t = Date.UTC(y, mo - 1, d, h, mi) - tzOffset(tz, new Date(t)) * 60000; return new Date(t); };

// ── Sol: ecuación de salida y puesta (NOAA, simplificada; error de un par de minutos)
const J2000 = 2451545, toJ = ms => ms / 86400000 + 2440587.5, fromJ = j => new Date((j - 2440587.5) * 86400000);
const solar = j => {
  const M = rad((357.5291 + 0.98560028 * (j - J2000)) % 360), C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  const λ = rad((deg(M) + C + 180 + 102.9372) % 360);
  return { M, λ, δ: Math.asin(Math.sin(λ) * Math.sin(rad(23.4397))) };
};
// Salida y puesta del día civil de `date` en la zona del puerto. polar: 'día' o 'noche' si no sale o no se pone.
export const sunTimes = (p, date = new Date()) => {
  const { year, month, day } = ymd(p.tz, date), noon = zonedToUTC(p.tz, year, month, day, 12, 0);
  const n = Math.round(toJ(noon.getTime()) - J2000 - 0.0009 + p.lon / 360), Js = J2000 + 0.0009 + n - p.lon / 360;
  const { M, λ, δ } = solar(Js), Jt = Js + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * λ);
  const c = (Math.sin(rad(-0.833)) - Math.sin(rad(p.lat)) * Math.sin(δ)) / (Math.cos(rad(p.lat)) * Math.cos(δ));
  if (c > 1) return { polar: 'noche', noon: fromJ(Jt) };
  if (c < -1) return { polar: 'día', noon: fromJ(Jt) };
  const w = deg(Math.acos(c)) / 360;
  return { rise: fromJ(Jt - w), set: fromJ(Jt + w), noon: fromJ(Jt), hours: w * 48 };
};
// Punto subsolar (lat, lon) en un instante: declinación y ángulo horario de Greenwich con la ecuación del tiempo.
export const subsolar = (date = new Date()) => {
  const j = toJ(date.getTime()), { M, λ, δ } = solar(j);
  const eot = 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * λ); // días
  const utcDays = ((j + 0.5) % 1 + 1) % 1;
  let lon = -(utcDays - 0.5 - eot) * 360; lon = ((lon + 540) % 360) - 180;
  return { lat: deg(δ), lon };
};
