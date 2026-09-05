/* ==== 55-disenador.js ==== */
'use strict';
/* ================= el Diseñador =================
   Mira la figura que acabas de poner —su forma, sus colores, dónde está el
   peso visual y cuánto ruido tiene— y también cuánto texto hay en la
   diapositiva. Con eso propone acomodos completos y los enseña en miniatura
   de verdad, no como dibujo: cada propuesta es una copia real de la
   diapositiva ya cambiada. Aplicarla es un solo paso, y se deshace con Ctrl+Z.
   No manda nada a ningún servidor: el análisis ocurre en un lienzo, aquí. */

/* ---------- análisis de la imagen ---------- */
const _analisis = new Map();
function analizaImagen(src) {
  const k = (src || '').slice(0, 96) + '|' + (src || '').length;
  if (_analisis.has(k)) return Promise.resolve(_analisis.get(k));
  return new Promise(ok => {
    const im = new Image();
    im.onerror = () => ok(null);
    im.onload = () => {
      try {
        const N = 56;
        const cv = document.createElement('canvas');
        const ar = im.naturalWidth / Math.max(1, im.naturalHeight);
        const W = ar >= 1 ? N : Math.max(8, Math.round(N * ar));
        const H = ar >= 1 ? Math.max(8, Math.round(N / ar)) : N;
        cv.width = W; cv.height = H;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.drawImage(im, 0, 0, W, H);
        const d = c.getImageData(0, 0, W, H).data;
        const lumDe = i => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

        let sumL = 0, satMax = 0, nGris = 0, nClaro = 0;
        const cubos = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx ? (mx - mn) / mx : 0;
          if (sat > satMax) satMax = sat;
          if (sat < 0.12) nGris++;
          const l = lumDe(i); sumL += l;
          if (l > 0.93) nClaro++;
          if (sat < 0.15 || l < 0.08 || l > 0.96) continue;
          const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
          const q = cubos.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          q.n++; q.r += r; q.g += g; q.b += b;
          cubos.set(key, q);
        }
        const px = d.length / 4;
        const lum = sumL / px;

        /* energía de bordes y hacia dónde tira el peso visual */
        let ruido = 0, pesoX = 0, pesoTot = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = (y * W + x) * 4;
            const e = Math.abs(lumDe(i) - lumDe(i + 4)) + Math.abs(lumDe(i) - lumDe(i + W * 4));
            ruido += e; pesoX += e * x; pesoTot += e;
          }
        }
        ruido /= Math.max(1, (W - 2) * (H - 2));
        const cx = pesoTot ? pesoX / pesoTot / W : 0.5;

        const dom = [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 5)
          .map(q => rgb2hex([q.r / q.n, q.g / q.n, q.b / q.n]));
        const grisez = nGris / px, claridad = nClaro / px;
        const tipo = grisez > 0.86 ? 'micrografia' : (claridad > 0.42 && dom.length <= 3) ? 'grafico' : 'foto';

        const r = { ar, lum, ruido, pesoX: cx, dom, tipo, grisez, claridad,
          oscura: lum < 0.42, clara: lum > 0.72, panoramica: ar > 1.55, vertical: ar < 0.82, satMax };
        _analisis.set(k, r);
        if (_analisis.size > 24) _analisis.delete(_analisis.keys().next().value);
        ok(r);
      } catch (e) { ok(null); }
    };
    im.src = src;
  });
}
/* Un acento sacado de la imagen que se lea sobre el fondo del tema. */
function acentoDeImagen(an, deck) {
  const th = temaDe(deck || S.deck);
  const fondo = th.bg || '#FFFFFF';
  if (!an || !an.dom.length) return null;
  let mejor = null;
  an.dom.forEach(hex => {
    let c = hex;
    for (let i = 0; i < 6; i++) {
      const cr = contraste(c, fondo);
      if (cr >= 4.5) break;
      c = mezcla(c, th.dark ? '#FFFFFF' : '#101418', 0.16);
    }
    const cr = contraste(c, fondo);
    const [r, g, b] = hex2rgb(c);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const punt = cr * 0.6 + sat * 4;
    if (cr >= 3.6 && (!mejor || punt > mejor.punt)) mejor = { c, punt };
  });
  return mejor ? mejor.c : null;
}

/* ---------- cuánto texto hay en la diapositiva ---------- */
function pesoTexto(sl) {
  let car = 0, vin = 0, otros = 0;
  zonas(sl).flat().forEach(b => {
    if (b.type === 'text') car += (b.text || '').length;
    else if (b.type === 'bullets') { vin += (b.items || []).length; car += (b.items || []).map(x => x.t || '').join(' ').length; }
    else if (b.type !== 'image' && b.type !== 'galeria') otros++;
  });
  return { car, vin, otros, poco: car < 130 && vin <= 3, mucho: car > 380 || vin > 6 };
}

/* ---------- las propuestas ----------
   Cada una dice cómo se llama, por qué la propone y qué cambia. */
function propuestasDiseno(sl, b, an, deck) {
  const T = pesoTexto(sl);
  const th = temaDe(deck);
  const acc = acentoDeImagen(an, deck);
  const izq = an && an.pesoX < 0.44;      /* el motivo tira a la izquierda */
  const der = an && an.pesoX > 0.56;
  const P = [];
  const add = (id, n, d, fn, punt) => P.push({ id, n, d, aplica: fn, punt: punt || 0 });
  const est = e => Object.assign({ forma: 'recta', marco: 'none', sombra: false, filtro: 'none' }, e);

  /* la figura manda: a todo lo ancho */
  add('protagonista', 'La figura manda',
    'A todo lo ancho, con los márgenes estrechados y el texto reducido a un pie. Es lo que conviene cuando la figura es el argumento.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'ancho');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 96; blk.est = est({ sombra: true }); alFrente(s2, id); }
    }, T.poco ? 9 : 5);

  /* figura y texto lado a lado, del lado que no estorbe */
  add(der ? 'lado-izq' : 'lado-der', der ? 'Texto a la izquierda, figura a la derecha' : 'Figura a la izquierda, texto a la derecha',
    der ? 'El motivo de la imagen tira hacia la derecha, así que el texto va del otro lado y las miradas no se cruzan.'
        : (izq ? 'El motivo tira hacia la izquierda: la figura va ahí y el texto ocupa el resto.'
               : 'Dos columnas: la figura de un lado y el texto del otro, que es el acomodo que mejor aguanta el texto largo.'),
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'twocol');
      const blk = buscaBloque(s2, id);
      if (blk) {
        blk.w = 100; blk.est = est({ forma: 'redondo' });
        mueveA(s2, id, der ? 1 : 0);
        repartirResto(s2, id, der ? 0 : 1);
      }
    }, T.mucho ? 9 : 6);

  /* enunciado con la figura de fondo emocional */
  if (an && an.tipo === 'foto') add('portada', 'Portada suave',
    'Una sola idea grande con la figura aclarada debajo, para que el texto encima se lea. Va bien para abrir una sección.',
    (d, i, id) => {
      const s2 = d.slides[i];
      const blk = buscaBloque(s2, id);
      cambiaLayoutSilencioso(s2, 'enunciado');
      if (blk) { blk.w = 100; blk.est = est({ filtro: 'claro', forma: 'redondo' }); alFondo(s2, id); }
    }, T.poco ? 8 : 3);

  /* duotono con el acento: unifica figuras de origen distinto */
  if (an && an.tipo !== 'grafico') add('duotono', 'Duotono del tema',
    'La figura pasa a dos tonos del color de acento. Es lo que hace que un montón de fotos de fuentes distintas parezcan de la misma presentación.',
    (d, i, id) => { const blk = buscaBloque(d.slides[i], id); if (blk) blk.est = est({ filtro: 'duo', forma: 'redondo' }); },
    an.tipo === 'foto' ? 7 : 4);

  /* recorte en círculo: retratos y detalles */
  if (an && Math.abs(an.ar - 1) < 0.5) add('circulo', 'Recorte circular',
    'Un círculo con el marco del color de acento. Funciona con retratos y con detalles ampliados; no con espectros ni con gráficas.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'twocol');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 88; blk.est = est({ forma: 'circulo', marco: 'acento', sombra: true }); mueveA(s2, id, 0); repartirResto(s2, id, 1); }
    }, an.tipo === 'foto' ? 6 : 2);

  /* micrografías: contraste y marco fino, que es lo que pide una revista */
  if (an && (an.tipo === 'micrografia' || an.ruido > 0.09)) add('micrografia', 'Acabado de artículo',
    'Marco fino, más contraste y la figura centrada con su pie. Es el acabado que piden las revistas para una micrografía.',
    (d, i, id) => {
      const s2 = d.slides[i];
      cambiaLayoutSilencioso(s2, 'content');
      const blk = buscaBloque(s2, id);
      if (blk) { blk.w = 74; blk.est = est({ marco: 'fino', filtro: an.tipo === 'micrografia' ? 'contraste' : 'none' }); alFrente(s2, id); }
    }, an.tipo === 'micrografia' ? 9 : 4);

  /* foto en papel: da aire y separa del fondo */
  add('papel', 'Copia en papel',
    'Borde blanco ancho y sombra, como una foto sobre la mesa. Separa la figura del fondo sin tener que ponerle una caja.',
    (d, i, id) => { const blk = buscaBloque(d.slides[i], id); if (blk) { blk.est = est({ marco: 'papel', sombra: true }); blk.w = Math.min(84, (blk.w || 70) + 8); } },
    an && an.clara ? 6 : 4);

  /* tomar el color de la imagen como acento de la presentación */
  if (acc && acc.toUpperCase() !== (th.acc || '').toUpperCase()) add('acento', 'Color de la figura',
    'Toma el color dominante de la imagen —ya corregido para que contraste— y lo usa como acento de toda la presentación.',
    d => { d.meta.acento = acc; }, 5, acc);

  /* si hay varias figuras sueltas, juntarlas en una galería */
  const otras = zonas(sl).flat().filter(x => x.type === 'image' && x.src);
  if (otras.length >= 2) add('galeria', 'Juntarlas en una galería',
    'Las ' + otras.length + ' figuras de esta diapositiva pasan a una sola galería numerada (a), (b), (c) con un pie común, como en un artículo.',
    (d, i) => {
      const s2 = d.slides[i];
      const imgs = [];
      CLAVES_ZONA.forEach(z => {
        (s2[z] || []).forEach(x => { if (x.type === 'image' && x.src) imgs.push({ src: x.src, cap: x.caption || '', alt: x.alt || '' }); });
        if (s2[z]) s2[z] = s2[z].filter(x => !(x.type === 'image' && x.src));
      });
      const gal = Object.assign(newBlock('galeria'), { w: 94, caption: '', gal: { imgs, modo: imgs.length >= 4 ? 'rejilla' : 'tira', cols: imgs.length >= 4 ? 2 : imgs.length, letras: true, hueco: 8 } });
      zona(s2, 0).push(gal);
    }, 10);

  P.forEach(x => { x.color = x.color || null; });
  P.sort((a, b) => b.punt - a.punt);
  return P.slice(0, 7);
}
/* mover el color propuesto a la propuesta correspondiente */
function propuestaColor(p) { return p.id === 'acento' ? p.col : null; }

/* ---------- utilidades que usan las propuestas ---------- */
function buscaBloque(sl, id) { return zonas(sl).flat().find(x => x.id === id) || null; }
function alFrente(sl, id) {
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k > 0) sl[z].unshift(sl[z].splice(k, 1)[0]);
  });
}
function alFondo(sl, id) {
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k >= 0 && k < sl[z].length - 1) sl[z].push(sl[z].splice(k, 1)[0]);
  });
}
/* Deja el bloque en la zona pedida y el resto del contenido en la otra. */
function mueveA(sl, id, zi) {
  let blk = null;
  CLAVES_ZONA.forEach(z => {
    if (!sl[z]) return;
    const k = sl[z].findIndex(x => x.id === id);
    if (k >= 0) blk = sl[z].splice(k, 1)[0];
  });
  if (blk) zona(sl, zi).push(blk);
}
function repartirResto(sl, id, zi) {
  const otros = [];
  CLAVES_ZONA.forEach((z, k) => {
    if (!sl[z] || k === zi) return;
    for (let i = sl[z].length - 1; i >= 0; i--) if (sl[z][i].id !== id) otros.unshift(sl[z].splice(i, 1)[0]);
  });
  if (otros.length) zona(sl, zi).push(...otros);
}
/* Cambio de acomodo sin tocar el estado ni el historial: es para una copia. */
function cambiaLayoutSilencioso(sl, to) {
  if (sl.layout === to) return;
  const destino = zonasDe(to);
  const todos = CLAVES_ZONA.reduce((a, k) => a.concat(sl[k] || []), []);
  CLAVES_ZONA.forEach(k => delete sl[k]);
  sl.layout = to;
  if (destino > 0) { for (let i = 0; i < destino; i++) zona(sl, i); zona(sl, 0).push(...todos); }
  else sl.blocks = [];
  if (typeof prepararZonas === 'function') { try { prepararZonas(sl, to); } catch (e) { /* el arranque es opcional */ } }
}

/* ---------- el panel ---------- */
let _disPanel = null, _disCuerpo = null, _disBloque = null;
function panelDisenador() {
  if (_disPanel) return _disPanel;
  _disCuerpo = h('div', { class: 'dis-cuerpo' });
  _disPanel = h('aside', { class: 'dis', id: 'disPanel', role: 'complementary', 'aria-label': 'Ideas de diseño' },
    h('div', { class: 'dis-head' },
      h('span', { class: 'dis-tit' }, '✨ Ideas de diseño'),
      h('button', { class: 'icon-btn', title: 'Cerrar', onclick: cierraDisenador }, '✕')),
    _disCuerpo,
    h('div', { class: 'dis-pie' },
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!(S.prefs && S.prefs.sinDisenador),
          onchange: e => { S.prefs = S.prefs || {}; S.prefs.sinDisenador = e.target.checked; if (typeof guardaPrefs === 'function') guardaPrefs(); } }),
        'No abrirlo solo al poner una figura')));
  $('#asisRoot').append(_disPanel);
  return _disPanel;
}
function cierraDisenador() {
  document.body.classList.remove('con-dis');
  if (_disPanel) _disPanel.classList.remove('on');
  _disBloque = null;
}
async function abreDisenador(b) {
  const blk = b || (S.selBlock && (findBlock(S.selBlock) || {}).block);
  if (!blk) return;
  if (blk.type !== 'image' && blk.type !== 'galeria') { toast('Las ideas de diseño trabajan sobre una figura'); return; }
  const src = blk.type === 'galeria' ? ((galDe(blk).imgs[0] || {}).src || '') : blk.src;
  if (!src) { toast('Primero elige la imagen'); return; }
  if (typeof cierraAsistente === 'function') cierraAsistente();
  panelDisenador();
  _disBloque = blk.id;
  document.body.classList.add('con-dis');
  _disPanel.classList.add('on');
  _disCuerpo.innerHTML = '';
  _disCuerpo.append(h('p', { class: 'hint' }, 'Mirando la figura…'));
  const an = await analizaImagen(src);
  if (_disBloque !== blk.id) return;
  pintaDisenador(blk, an);
}
function pintaDisenador(blk, an) {
  _disCuerpo.innerHTML = '';
  const sl = curSlide();
  const props = propuestasDiseno(sl, blk, an, S.deck);
  _disCuerpo.append(h('p', { class: 'dis-lee' }, leeImagen(an)));
  const [W, H] = slideDims(S.deck);
  props.forEach(p => {
    /* la miniatura es la diapositiva de verdad, ya cambiada */
    const copia = deepCopy(S.deck);
    try { p.aplica(copia, S.cur, blk.id); } catch (e) { return; }
    const tw = 344, k = tw / W;
    const clip = h('div', { class: 'dis-clip', style: `width:${tw}px;height:${Math.round(H * k)}px` });
    let mini;
    try { mini = renderSlide(copia, S.cur, 'thumb'); } catch (e) { return; }
    mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
    clip.append(mini);
    const tar = h('button', { class: 'dis-tar', title: p.d, onclick: () => aplicaPropuesta(p, blk) },
      clip,
      h('div', { class: 'dis-txt' }, h('b', null, p.n), h('em', null, p.d)));
    _disCuerpo.append(tar);
  });
  if (!props.length) _disCuerpo.append(h('p', { class: 'hint' }, 'No se me ocurre nada mejor de lo que ya tienes.'));
}
function leeImagen(an) {
  if (!an) return 'No pude leer la figura, pero aquí van los acomodos que suelen funcionar.';
  const t = an.tipo === 'micrografia' ? 'Parece una micrografía o una imagen en escala de grises'
    : an.tipo === 'grafico' ? 'Parece una gráfica o un dibujo con fondo claro'
    : 'Parece una fotografía';
  const f = an.panoramica ? 'panorámica' : an.vertical ? 'vertical' : 'casi cuadrada';
  const l = an.oscura ? ' y oscura' : an.clara ? ' y clara' : '';
  const p = an.pesoX < 0.44 ? ', con el motivo hacia la izquierda' : an.pesoX > 0.56 ? ', con el motivo hacia la derecha' : '';
  return t + ', ' + f + l + p + '. Toca una propuesta para aplicarla; se deshace con Ctrl+Z.';
}
function aplicaPropuesta(p, blk) {
  try { conTutorEnSilencio(() => p.aplica(S.deck, S.cur, blk.id)); } catch (e) { toast('No se pudo aplicar esa idea'); return; }
  S.selBlock = null;
  conTutorEnSilencio(() => commit());
  { const sl = curSlide(); const l = typeof leccionPendiente === 'function' ? leccionPendiente(sl) : null;
    if (l) ensena(l.id, 'Por qué el Diseñador lo acomodó así'); }
  toast('Diseño aplicado · ' + p.n, null, { t: 'Deshacer', fn: doUndo });
  const b2 = buscaBloque(curSlide(), blk.id);
  if (b2) { analizaImagen(b2.type === 'galeria' ? (galDe(b2).imgs[0] || {}).src : b2.src).then(an => { if (_disBloque) pintaDisenador(b2, an); }); }
  else cierraDisenador();
}
/* Se llama al terminar de poner una imagen. */
function disenadorAlPonerImagen(b) {
  if (!b || !b.src) return;
  if (S.prefs && S.prefs.sinDisenador) return;
  setTimeout(() => { if (b.src) abreDisenador(b); }, 260);
}


