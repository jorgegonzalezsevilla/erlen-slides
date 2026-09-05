/* ==== 17-pie.js ==== */
'use strict';
/* ================= pie de página y notas =================
   El modelo copia el de Beamer: una plantilla de pie (\setbeamertemplate
   {footline}) con celdas cuyo contenido son «inserts» (\insertshortauthor,
   \insertframenumber…), más texto libre con las mismas piezas entre llaves. */

const PIE_INSERTS = [
  { id: 'vacio',       n: '(vacío)',          tex: '' },
  { id: 'autor',       n: 'Autores',          tex: '\\insertshortauthor' },
  { id: 'titulo',      n: 'Título',           tex: '\\insertshorttitle' },
  { id: 'subtitulo',   n: 'Subtítulo',        tex: '\\insertsubtitle' },
  { id: 'institucion', n: 'Institución',      tex: '\\insertshortinstitute' },
  { id: 'fecha',       n: 'Fecha',            tex: '\\insertshortdate' },
  { id: 'seccion',     n: 'Sección actual',   tex: '\\insertsection' },
  { id: 'numero',      n: 'Número',           tex: '\\insertframenumber' },
  { id: 'numeroTotal', n: 'Número / total',   tex: '\\insertframenumber\\,/\\,\\inserttotalframenumber' },
  { id: 'fechaNum',    n: 'Fecha · número',   tex: '\\insertshortdate\\hfill\\insertframenumber' },
  { id: 'leyenda',     n: 'Leyenda del pie',  tex: null },
  { id: 'logo',        n: 'Logotipo',         tex: null },
  { id: 'texto',       n: 'Texto libre…',     tex: null }
];
const INS = {}; PIE_INSERTS.forEach(i => INS[i.id] = i);

const PIE_MODOS = [
  { id: 'tema',    n: 'El del tema',        d: 'Deja el pie que trae el tema Beamer elegido.' },
  { id: 'numero',  n: 'Solo el número',     d: 'Un número discreto en la esquina, sin barra.' },
  { id: 'linea',   n: 'Una línea',          d: 'Una franja con un solo texto, a lo ancho. Equivale a \\setbeamertemplate{footline}[text line].' },
  { id: 'celdas',  n: 'Celdas',             d: 'Dos o tres celdas con lo que tú elijas, como el pie de infolines o split.' },
  { id: 'ninguno', n: 'Sin pie',            d: 'Nada abajo. Equivale a \\setbeamertemplate{footline}{}.' }
];
const PIE_TAM = [['xs', 'Muy chico'], ['s', 'Chico'], ['m', 'Mediano'], ['l', 'Grande']];
const TAM_TEX = { xs: '\\tiny', s: '\\scriptsize', m: '\\footnotesize', l: '\\small' };
const TAM_PX  = { xs: 11.5, s: 13, m: 14.8, l: 16.6 };
const PIE_FONDOS = [['ninguno', 'Sin fondo'], ['tenue', 'Tenue'], ['acento', 'Acento'], ['barra', 'Barra del tema']];
const PIE_REGLAS = [['ninguna', 'Sin línea'], ['fina', 'Línea fina'], ['acento', 'Línea de acento']];

const PIE_DEF_CELDAS = {
  2: [{ t: 'autor' }, { t: 'numeroTotal' }],
  3: [{ t: 'autor' }, { t: 'titulo' }, { t: 'fechaNum' }]
};

/* Normaliza y rellena lo que falte; sirve también para mazos viejos. */
function pieDe(m) {
  const p = Object.assign({
    modo: 'tema', ncel: 3, texto: '', tam: 's', fondo: 'tenue', regla: 'ninguna',
    alineado: 'extremos', enPortada: false, enSecciones: false, numFormato: 'nN'
  }, m.pie || {});
  p.ncel = clamp(p.ncel || 3, 1, 3);
  if (!Array.isArray(p.celdas) || !p.celdas.length) p.celdas = deepCopy(PIE_DEF_CELDAS[p.ncel] || PIE_DEF_CELDAS[3]);
  while (p.celdas.length < p.ncel) p.celdas.push({ t: 'vacio' });
  return p;
}
/* Guarda la configuración normalizada dentro del mazo. */
function pieEdit(m) { m.pie = pieDe(m); return m.pie; }

/* ---------- valores en pantalla ---------- */
function textoInsert(id, deck, idx, extra) {
  const m = deck.meta, n = idx + 1, N = deck.slides.length;
  const ctx = countersFor(deck, idx);
  switch (id) {
    case 'autor': return m.authors || '';
    case 'titulo': return m.short || m.title || '';
    case 'subtitulo': return m.subtitle || '';
    case 'institucion': return m.institute || '';
    case 'fecha': return m.date || '';
    case 'seccion': return ctx.secName || '';
    case 'numero': return String(n);
    case 'numeroTotal': return n + ' / ' + N;
    case 'fechaNum': return (m.date ? m.date + ' · ' : '') + n;
    case 'leyenda': return m.pieTexto || '';
    case 'texto': return expandePie(extra || '', deck, idx);
    default: return '';
  }
}
/* Texto libre con piezas entre llaves: {autor} {titulo} {n} {N} {seccion}… */
function expandePie(txt, deck, idx) {
  const m = deck.meta;
  const mapa = {
    autor: m.authors || '', titulo: m.title || '', tituloCorto: m.short || m.title || '',
    subtitulo: m.subtitle || '', institucion: m.institute || '', fecha: m.date || '',
    seccion: countersFor(deck, idx).secName || '', leyenda: m.pieTexto || '',
    n: String(idx + 1), N: String(deck.slides.length)
  };
  return String(txt || '').replace(/\{(\w+)\}/g, (todo, k) => (mapa[k] != null ? mapa[k] : todo));
}

/* ---------- pie en pantalla ---------- */
function renderPie(deck, idx, mode) {
  const m = deck.meta, sl = deck.slides[idx], p = pieDe(m);
  const esPortada = sl.layout === 'title', esSeccion = sl.layout === 'section';
  if ((esPortada && !p.enPortada) || (esSeccion && !p.enSecciones)) return null;
  if (p.modo === 'ninguno') return null;
  if (p.modo === 'numero') {
    const txt = p.numFormato === 'n' ? String(idx + 1) : (idx + 1) + ' / ' + deck.slides.length;
    return h('div', { class: 'pagenum' }, txt);
  }
  const cont = h('div', { class: `footline pie-x fo-${p.fondo} rg-${p.regla} al-${p.alineado}`,
    style: `font-size:${TAM_PX[p.tam] || 13}px` });
  const celda = (contenido, clase) => h('div', { class: 'fl-cell ' + (clase || '') }, contenido);

  if (p.modo === 'linea') {
    const t = expandePie(p.texto, deck, idx);
    cont.classList.add('pie-linea');
    cont.append(celda(h('span', { html: inlineRich(t) }), 'fl-sola'));
    return cont;
  }
  /* celdas */
  const cel = p.celdas.slice(0, p.ncel);
  cel.forEach((c, i) => {
    if (c.t === 'logo') {
      cont.append(celda(m.logo ? h('img', { class: 'fl-logo-img', src: m.logo, alt: '' }) : h('span', null, ' ')));
      return;
    }
    const t = textoInsert(c.t, deck, idx, c.x);
    cont.append(celda(h('span', { html: inlineRich(t || ' ') })));
  });
  return cont;
}

/* ---------- notas ---------- */
const NOTA_MODOS = [
  { id: 'ninguna',  n: 'No incluirlas',        d: 'Las notas se quedan en la app; el PDF de Beamer no las lleva.' },
  { id: 'paginas',  n: 'Páginas aparte',       d: 'Después de cada diapositiva, una página con sus notas. \\setbeameroption{show notes}' },
  { id: 'derecha',  n: 'Segunda pantalla · derecha', d: 'Cada página sale al doble de ancho: la diapositiva a la izquierda y las notas a la derecha. Es lo que leen pdfpc e Impressive.' },
  { id: 'abajo',    n: 'Segunda pantalla · abajo',   d: 'Igual, pero las notas debajo de la diapositiva.' }
];
const notasDe = m => Object.assign({ modo: 'ninguna', mini: true }, m.notas || {});

/* Convierte el texto de la nota en párrafos y viñetas (las líneas que
   empiezan con «-» o «·» se vuelven una lista). */
function partesNota(txt) {
  const out = [];
  let lista = null;
  String(txt || '').split('\n').forEach(ln => {
    const t = ln.trim();
    const mm = /^[-·*•]\s+(.*)$/.exec(t);
    if (mm) { if (!lista) { lista = []; out.push({ tipo: 'lista', items: lista }); } lista.push(mm[1]); return; }
    lista = null;
    if (t) out.push({ tipo: 'p', texto: t });
  });
  return out;
}
/* Minutos previstos de una diapositiva y total del mazo. */
const minutosDe = sl => (sl && sl.min > 0) ? +sl.min : 0;
function minutosTotales(deck) { return deck.slides.reduce((a, sl) => a + ((typeof esRespaldo === 'function' && esRespaldo(sl)) || (typeof fueraDeRama === 'function' && fueraDeRama(sl, deck)) ? 0 : minutosDe(sl)), 0); }
function minutosHasta(deck, idx) { let a = 0; for (let i = 0; i <= idx && i < deck.slides.length; i++) a += minutosDe(deck.slides[i]); return a; }
const mmss = min => {
  const s = Math.round(min * 60);
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
};


