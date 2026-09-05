/* ==== 53-imagen-estilo.js ==== */
'use strict';
/* ================= estilos de figura =================
   Forma, marco, sombra y filtro de color, como los «Estilos de imagen» de
   PowerPoint. En pantalla se hace con CSS y un filtro SVG —así se ve al
   instante y no toca los píxeles originales—; al exportar, el mismo efecto
   se cuece en el archivo con un lienzo, de modo que el PDF sale idéntico
   sin necesidad de paquetes raros de LaTeX. */

const IMG_FORMAS = [
  { id: 'recta', n: 'Recta', d: 'Como viene la imagen.' },
  { id: 'redondo', n: 'Esquinas suaves', d: 'Esquinas redondeadas; quita dureza sin llamar la atención.' },
  { id: 'circulo', n: 'Círculo', d: 'Recorta un círculo centrado. Va bien para retratos y para iconos.' },
  { id: 'hexagono', n: 'Hexágono', d: 'Recorte hexagonal, útil en pósteres y portadas.' },
  { id: 'suave', n: 'Bordes difuminados', d: 'Los bordes se desvanecen hacia el fondo.' }
];
const IMG_MARCOS = [
  { id: 'none', n: 'Sin marco', d: '' },
  { id: 'fino', n: 'Fino', d: 'Una línea de un punto, discreta.' },
  { id: 'grueso', n: 'Grueso', d: 'Un borde marcado que separa la figura del fondo.' },
  { id: 'acento', n: 'Del color de acento', d: 'El marco toma el color de la presentación.' },
  { id: 'papel', n: 'Tipo foto', d: 'Un borde blanco ancho, como una copia en papel.' }
];
const IMG_FILTROS = [
  { id: 'none', n: 'Sin filtro', d: '' },
  { id: 'gris', n: 'Blanco y negro', d: 'Quita el color; unifica figuras de fuentes distintas.' },
  { id: 'duo', n: 'Duotono', d: 'Dos tonos a partir del color de acento. Muy útil en portadas.' },
  { id: 'contraste', n: 'Más contraste', d: 'Sube el contraste; rescata micrografías apagadas.' },
  { id: 'claro', n: 'Aclarada', d: 'La suaviza para poder escribir encima sin perder el texto.' }
];
const FK_FORMA = {}; IMG_FORMAS.forEach(x => FK_FORMA[x.id] = x);
const FK_MARCO = {}; IMG_MARCOS.forEach(x => FK_MARCO[x.id] = x);
const FK_FILTRO = {}; IMG_FILTROS.forEach(x => FK_FILTRO[x.id] = x);

const estiloImgPorOmision = () => ({ forma: 'recta', marco: 'none', sombra: false, filtro: 'none' });
function estImg(b) {
  const e = b.est || {};
  return { forma: FK_FORMA[e.forma] ? e.forma : 'recta', marco: FK_MARCO[e.marco] ? e.marco : 'none',
    sombra: !!e.sombra, filtro: FK_FILTRO[e.filtro] ? e.filtro : 'none' };
}
const imgConEstilo = b => { const e = estImg(b); return e.forma !== 'recta' || e.marco !== 'none' || e.sombra || e.filtro !== 'none'; };

/* ---------- los dos tonos del duotono ---------- */
function duoTonos(deck) {
  const th = temaDe(deck || S.deck);
  const oscuro = mezcla(th.dark ? '#0B0F14' : '#12161B', th.acc, 0.35);
  const claro = mezcla(th.bg || '#FFFFFF', th.acc, 0.45);
  return [oscuro, claro];
}
/* Un filtro SVG por pareja de tonos, creado una sola vez. */
const _duoHechos = new Set();
function duoFiltro(deck) {
  const [a, b] = duoTonos(deck);
  const id = 'duo' + (a + b).replace(/#/g, '');
  if (_duoHechos.has(id)) return id;
  let raiz = $('#tpFiltros');
  if (!raiz) {
    raiz = sv('svg', { id: 'tpFiltros', width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden' });
    document.body.append(raiz);
  }
  const A = hex2rgb(a).map(v => v / 255), B = hex2rgb(b).map(v => v / 255);
  const f = sv('filter', { id, 'color-interpolation-filters': 'sRGB' });
  f.append(sv('feColorMatrix', { type: 'matrix',
    values: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0' }));
  const ct = sv('feComponentTransfer');
  ['R', 'G', 'B'].forEach((c, i) => ct.append(sv('feFunc' + c, { type: 'table', tableValues: A[i].toFixed(4) + ' ' + B[i].toFixed(4) })));
  f.append(ct);
  raiz.append(f);
  _duoHechos.add(id);
  return id;
}

/* ---------- pintar en pantalla ---------- */
/* Devuelve los estilos CSS que hay que poner en el envoltorio y en la imagen. */
function cssImagen(b, deck) {
  const e = estImg(b);
  const th = temaDe(deck || S.deck);
  const env = {}, img = {};
  if (e.forma === 'redondo') img.borderRadius = '3.2%';
  if (e.forma === 'circulo') { img.borderRadius = '50%'; img.aspectRatio = '1'; img.objectFit = 'cover'; }
  if (e.forma === 'hexagono') img.clipPath = 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)';
  if (e.forma === 'suave') img.maskImage = img.webkitMaskImage =
    'radial-gradient(ellipse 76% 76% at 50% 50%, #000 55%, transparent 100%)';
  const fs = [];
  if (e.filtro === 'gris') fs.push('grayscale(1) contrast(1.05)');
  if (e.filtro === 'contraste') fs.push('contrast(1.28) saturate(1.12)');
  if (e.filtro === 'claro') fs.push('brightness(1.22) saturate(.72) contrast(.88)');
  if (e.filtro === 'duo') fs.push('url(#' + duoFiltro(deck) + ')');
  if (e.sombra) fs.push('drop-shadow(0 6px 14px rgba(0,0,0,.28))');
  if (fs.length) img.filter = fs.join(' ');
  if (e.marco !== 'none') {
    const col = e.marco === 'acento' ? th.acc : e.marco === 'papel' ? (th.bg || '#fff') : th.fg;
    const gr = e.marco === 'fino' ? 1 : e.marco === 'grueso' ? 3 : e.marco === 'papel' ? 9 : 2.4;
    img.border = gr + 'px solid ' + col;
    img.boxSizing = 'border-box';
    if (e.marco === 'papel') img.outline = '1px solid rgba(0,0,0,.18)';
  }
  return { env, img };
}
function aplicaEstiloImg(nodo, b, deck) {
  const { env, img } = cssImagen(b, deck);
  Object.assign(nodo.style, env);
  const im = nodo.querySelector('img');
  if (im) Object.assign(im.style, img);
}

/* ---------- cocer el estilo en el archivo para exportar ---------- */
const _cacheProc = new Map();
function claveProc(b, deck) {
  const e = estImg(b);
  return (b.src || '').slice(0, 64) + '|' + (b.src || '').length + '|' + JSON.stringify(e) + '|' + duoTonos(deck).join('');
}
function cargaImagen(src) {
  return new Promise((ok, mal) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => mal(new Error('no se pudo leer la imagen'));
    im.src = src;
  });
}
/* Camino de un hexágono o de un círculo dentro de un rectángulo. */
function caminoForma(ctx, forma, W, H) {
  ctx.beginPath();
  if (forma === 'circulo') { const r = Math.min(W, H) / 2; ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); return; }
  if (forma === 'hexagono') {
    const pts = [[.25, .03], [.75, .03], [1, .5], [.75, .97], [.25, .97], [0, .5]];
    pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * W, y * H));
    ctx.closePath(); return;
  }
  if (forma === 'redondo') {
    const r = Math.min(W, H) * 0.032;
    if (ctx.roundRect) { ctx.roundRect(0, 0, W, H, r); return; }
    ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.quadraticCurveTo(W, 0, W, r);
    ctx.lineTo(W, H - r); ctx.quadraticCurveTo(W, H, W - r, H);
    ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath(); return;
  }
  ctx.rect(0, 0, W, H);
}
/* Aplica el filtro de color píxel a píxel: así el PDF sale igual que la pantalla. */
function filtraPixeles(ctx, W, H, filtro, deck) {
  if (filtro === 'none') return;
  const d = ctx.getImageData(0, 0, W, H), p = d.data;
  const [ca, cb] = duoTonos(deck);
  const A = hex2rgb(ca), B = hex2rgb(cb);
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], b2 = p[i + 2];
    if (filtro === 'gris') { const l = 0.2126 * r + 0.7152 * g + 0.0722 * b2; r = g = b2 = clamp((l - 128) * 1.05 + 128, 0, 255); }
    else if (filtro === 'contraste') {
      const s = (v, m) => clamp((v - 128) * 1.28 + 128, 0, 255);
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b2;
      r = clamp(l + (s(r) - l) * 1.12, 0, 255); g = clamp(l + (s(g) - l) * 1.12, 0, 255); b2 = clamp(l + (s(b2) - l) * 1.12, 0, 255);
    }
    else if (filtro === 'claro') {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b2;
      const mez = (v) => clamp(((v - l) * 0.72 + l - 128) * 0.88 + 128, 0, 255) * 1.22;
      r = clamp(mez(r), 0, 255); g = clamp(mez(g), 0, 255); b2 = clamp(mez(b2), 0, 255);
    }
    else if (filtro === 'duo') {
      const t = (0.2126 * r + 0.7152 * g + 0.0722 * b2) / 255;
      r = A[0] + (B[0] - A[0]) * t; g = A[1] + (B[1] - A[1]) * t; b2 = A[2] + (B[2] - A[2]) * t;
    }
    p[i] = r; p[i + 1] = g; p[i + 2] = b2;
  }
  ctx.putImageData(d, 0, 0);
}
/* Devuelve el data: de la imagen ya con su estilo, o el original si no tiene. */
async function imagenProcesada(b, deck) {
  if (!b || !b.src) return b ? b.src : '';
  if (!imgConEstilo(b)) return b.src;
  if (/^data:image\/svg/i.test(b.src)) return b.src;      /* un SVG se deja intacto */
  const k = claveProc(b, deck);
  if (_cacheProc.has(k)) return _cacheProc.get(k);
  const e = estImg(b);
  let salida = b.src;
  try {
    const im = await cargaImagen(b.src);
    const lado = e.forma === 'circulo' ? Math.min(im.naturalWidth, im.naturalHeight) : 0;
    const W = lado || im.naturalWidth, H = lado || im.naturalHeight;
    const mg = e.sombra ? Math.round(Math.max(W, H) * 0.05) : 0;
    const gr = e.marco === 'none' ? 0 : Math.round(Math.max(W, H) *
      (e.marco === 'fino' ? 0.003 : e.marco === 'grueso' ? 0.011 : e.marco === 'papel' ? 0.032 : 0.008));
    const cv = document.createElement('canvas');
    cv.width = W + mg * 2; cv.height = H + mg * 2;
    const ctx = cv.getContext('2d');

    /* la imagen recortada a su forma, en su propio lienzo */
    const in1 = document.createElement('canvas');
    in1.width = W; in1.height = H;
    const c1 = in1.getContext('2d');
    if (lado) c1.drawImage(im, (im.naturalWidth - lado) / 2, (im.naturalHeight - lado) / 2, lado, lado, 0, 0, W, H);
    else c1.drawImage(im, 0, 0, W, H);
    filtraPixeles(c1, W, H, e.filtro, deck);
    if (e.forma === 'suave') {
      const g = c1.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c1.globalCompositeOperation = 'destination-in';
      c1.fillStyle = g; c1.fillRect(0, 0, W, H);
      c1.globalCompositeOperation = 'source-over';
    } else if (e.forma !== 'recta') {
      c1.globalCompositeOperation = 'destination-in';
      caminoForma(c1, e.forma, W, H);
      c1.fillStyle = '#000'; c1.fill();
      c1.globalCompositeOperation = 'source-over';
    }
    if (e.sombra) { ctx.shadowColor = 'rgba(0,0,0,.30)'; ctx.shadowBlur = mg * 1.2; ctx.shadowOffsetY = mg * 0.42; }
    ctx.drawImage(in1, mg, mg);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (gr) {
      const th = temaDe(deck || S.deck);
      ctx.save();
      ctx.translate(mg, mg);
      ctx.lineWidth = gr * 2;                       /* la mitad queda dentro del recorte */
      ctx.strokeStyle = e.marco === 'acento' ? th.acc : e.marco === 'papel' ? (th.bg || '#ffffff') : th.fg;
      caminoForma(ctx, e.forma === 'suave' ? 'recta' : e.forma, W, H);
      ctx.save(); ctx.clip(); ctx.stroke(); ctx.restore();
      ctx.restore();
    }
    salida = cv.toDataURL(/^data:image\/jpe?g/i.test(b.src) && e.forma === 'recta' && !e.sombra ? 'image/jpeg' : 'image/png', 0.92);
  } catch (err) { salida = b.src; }
  _cacheProc.set(k, salida);
  if (_cacheProc.size > 40) _cacheProc.delete(_cacheProc.keys().next().value);
  return salida;
}

/* ---------- panel de la pestaña Bloque ---------- */
function panelEstiloImagen(b, cont) {
  if (!b.est) b.est = estiloImgPorOmision();
  const e = b.est;
  const fila = (et, ops, campo, alCambiar) => {
    const caja = h('div', { class: 'ie-fila' }, h('span', { class: 'an-et' }, et));
    const seg = h('div', { class: 'seg seg-wrap' });
    ops.forEach(o => seg.append(h('button', { class: e[campo] === o.id ? 'on' : '', title: o.d || o.n,
      onclick: () => { e[campo] = o.id; commit(); if (alCambiar) alCambiar(); } }, o.n)));
    caja.append(seg);
    return caja;
  };
  cont.append(fila('Forma', IMG_FORMAS, 'forma'));
  cont.append(fila('Marco', IMG_MARCOS, 'marco'));
  cont.append(fila('Filtro', IMG_FILTROS, 'filtro'));
  cont.append(h('label', { class: 'chk' },
    h('input', { type: 'checkbox', checked: !!e.sombra, onchange: ev => { e.sombra = ev.target.checked; commit(); } }),
    h('span', null, 'Sombra bajo la figura')));
  const act = FK_FILTRO[e.filtro];
  cont.append(h('p', { class: 'hint' }, e.filtro === 'duo'
    ? 'El duotono usa el color de acento de la presentación: si lo cambias, la figura cambia con él.'
    : (act && act.d) || 'El estilo se cuece en el archivo al exportar, así que el PDF sale igual que la pantalla.'));
}


