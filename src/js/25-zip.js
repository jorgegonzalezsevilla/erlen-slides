/* ==== 25-zip.js ==== */
'use strict';
/* ================= escritor de ZIP =================
   Un .pptx es un ZIP de archivos XML. Esto lo arma sin librerías externas,
   comprimiendo con la API del navegador cuando está disponible. */

const _CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = _CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const _TE = new TextEncoder();
const bytesDe = x => typeof x === 'string' ? _TE.encode(x) : x;

async function desinfla(bytes) {
  if (typeof CompressionStream !== 'function') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter(); w.write(bytes); w.close();
    const trozos = []; const rd = cs.readable.getReader();
    for (;;) { const r = await rd.read(); if (r.done) break; trozos.push(r.value); }
    let n = 0; trozos.forEach(t => n += t.length);
    const out = new Uint8Array(n); let p = 0;
    trozos.forEach(t => { out.set(t, p); p += t.length; });
    return out.length < bytes.length ? out : null;
  } catch (e) { return null; }
}

/* archivos: [{nombre, datos}] · datos = string o Uint8Array */
async function armaZip(archivos) {
  const partes = [], centrales = [];
  let desplaza = 0;
  const u16 = n => [n & 255, (n >> 8) & 255];
  const u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const a of archivos) {
    const crudo = bytesDe(a.datos);
    const nom = _TE.encode(a.nombre);
    const suma = crc32(crudo);
    const comp = await desinfla(crudo);
    const datos = comp || crudo;
    const metodo = comp ? 8 : 0;
    const local = new Uint8Array(30 + nom.length);
    local.set([0x50, 0x4B, 0x03, 0x04, 20, 0, 0, 0].concat(u16(metodo), [0, 0, 0, 0],
      u32(suma), u32(datos.length), u32(crudo.length), u16(nom.length), [0, 0]));
    local.set(nom, 30);
    partes.push(local, datos);
    const cen = new Uint8Array(46 + nom.length);
    cen.set([0x50, 0x4B, 0x01, 0x02, 20, 0, 20, 0, 0, 0].concat(u16(metodo), [0, 0, 0, 0],
      u32(suma), u32(datos.length), u32(crudo.length), u16(nom.length),
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], u32(desplaza)));
    cen.set(nom, 46);
    centrales.push(cen);
    desplaza += local.length + datos.length;
  }
  let tamCen = 0; centrales.forEach(c => tamCen += c.length);
  const fin = new Uint8Array(22);
  fin.set([0x50, 0x4B, 0x05, 0x06, 0, 0, 0, 0].concat(u16(centrales.length), u16(centrales.length),
    u32(tamCen), u32(desplaza), [0, 0]));
  return new Blob(partes.concat(centrales, [fin]),
    { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

/* Utilidades de XML */
const RX_CTRL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g');
const xesc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  .replace(RX_CTRL, '');
const XMLCAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
/* data:...;base64,xxx -> bytes */
function b64aBytes(uri) {
  const i = uri.indexOf(',');
  const bin = atob(uri.slice(i + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

/* Las entidades con nombre (&nbsp; y demás) no existen en XML: al meter HTML
   dentro de un <foreignObject> hay que pasarlas a su forma numérica o el
   navegador se niega a dibujar la imagen. */
const _CANON = { amp: 1, lt: 1, gt: 1, quot: 1, apos: 1 };
function htmlAXml(html) {
  const caja = document.createElement('textarea');
  return String(html).replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (m, n) => {
    if (_CANON[n]) return m;
    caja.innerHTML = m;
    const t = caja.value;
    return (t && t !== m) ? '&#' + t.codePointAt(0) + ';' : '';
  });
}


