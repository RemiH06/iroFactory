// Corre la expresión fuera del hilo principal: un patrón con retroceso
// catastrófico se queda aquí y regex-lab.js termina el Worker por tiempo.
onmessage = ({ data: { id, src, flags, text, repl } }) => {
  let re;
  try { re = new RegExp(src, flags); } catch (e) { postMessage({ id, error: e.message }); return; }
  const matches = [];
  if (src) {
    const g = new RegExp(src, flags.includes('g') ? flags : flags + 'g');
    for (const m of text.matchAll(g)) {
      matches.push({ i: m.index, s: m[0], groups: m.slice(1), named: m.groups || null });
      if (matches.length >= 2000 || !flags.includes('g')) break;
    }
  }
  let replaced = null;
  if (repl !== null && src) { try { replaced = text.replace(re, repl); } catch { replaced = null; } }
  postMessage({ id, matches, replaced });
};
