/* ==== 47b-lab.js ==== */
'use strict';
/* ================= el montaje: de las piezas al dibujo =================
   La frontera de este módulo, y el patrón que queremos repetir en los demás
   editores que en realidad son de figura:

     entra   un montaje saneado {piezas, flechas, estilo, col, borde} y un
             tema (colores del que dibuja), nada del estado de la app;
     sale    un dibujo — nodos SVG para la pantalla, opciones de TikZ para el
             PDF — que no consulta el DOM ni S.deck salvo por el tema.

   Las dos salidas leen la MISMA tabla de pintado (PINTURA_LAB): antes cada
   una tenía su copia y ya habían divergido —la sombra, el líquido, el metal y
   las líneas finas se veían distintos en pantalla y en el PDF—. */
/* ---------- rótulos que van a LaTeX ----------
   Las letras griegas y los símbolos matemáticos que se escriben en un rótulo
   no existen en el codificado de LaTeX: hay que pasarlos a modo matemático o
   el documento no compila. */
const UNI_TEX = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon',
  'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi',
  'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
  'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '∫': '\\int', '∑': '\\sum', '∏': '\\prod', '√': '\\sqrt{\\;}', '∞': '\\infty',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx', '±': '\\pm',
  '×': '\\times', '·': '\\cdot', '→': '\\rightarrow', '←': '\\leftarrow',
  '⇌': '\\rightleftharpoons', '°': '^\\circ', '−': '-', '′': "'", '″': "''",
  '∈': '\\in', '∀': '\\forall', '∃': '\\exists', '∩': '\\cap', '∪': '\\cup',
  '⊂': '\\subset', '∅': '\\emptyset', '□': '\\square', 'Å': '\\text{\\AA}'
};
const RE_UNI = new RegExp('[' + Object.keys(UNI_TEX).join('') + ']', 'g');
function rotuloTex(t) {
  const s = String(t == null ? '' : t);
  if (!RE_UNI.test(s)) { RE_UNI.lastIndex = 0; return texEscape(s); }
  RE_UNI.lastIndex = 0;
  const trozos = [];
  const con = s.replace(RE_UNI, c => { trozos.push(UNI_TEX[c]); return '\u0002' + (trozos.length - 1) + '\u0002'; });
  return texEscape(con).replace(/\u0002(\d+)\u0002/g, (_, i) => '$' + trozos[+i] + '$');
}

/* ================= estilos de dibujo =================
   El mismo dibujo se pinta de cuatro maneras. Cada papel decide su relleno,
   su grosor y su opacidad; el estilo decide qué papeles se ven. */
const ESTILOS_LAB = [
  { id: 'suave', n: 'Con cuerpo', d: 'Vidrio tintado, líquido y un reflejo. Es el que más se parece a un dibujo de manual.' },
  { id: 'linea', n: 'Línea', d: 'Solo contorno y líquido, sin rellenos. Limpio para un proyector con poco contraste.' },
  { id: 'solido', n: 'Sólido', d: 'Siluetas rellenas con los detalles en negativo. Se lee desde el fondo del aula.' },
  { id: 'tecnico', n: 'Técnico', d: 'Trazo fino y uniforme, sin rellenos, como un plano.' }
];
const EK_LAB = {}; ESTILOS_LAB.forEach(x => EK_LAB[x.id] = x);

/* Paleta de líquidos con nombre, para no tener que pensar el hex. */
const LIQ_COLORES = [
  ['auto', 'El del tema'], ['#3E86D6', 'Azul'], ['#E8892B', 'Ámbar'], ['#2FA36B', 'Verde'],
  ['#C7443C', 'Rojo'], ['#8E5BC6', 'Violeta'], ['#D8C33A', 'Amarillo'], ['#3FB0B8', 'Turquesa'],
  ['#C96BA0', 'Rosa'], ['#7B6A58', 'Pardo'], ['#9AA5B1', 'Incoloro']
];

/* Mezcla y aclarado, para tintar vidrio y sacar el reflejo. */
const ES_HEX = x => /^#[0-9a-f]{6}$/i.test(String(x || ''));
function labMezcla(a, b, t) {
  if (!ES_HEX(a) || !ES_HEX(b)) return ES_HEX(b) ? b : (ES_HEX(a) ? a : '#888888');
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t));
}
/* ---------- la tabla de pintado: el contrato del módulo ----------
   Cada papel dice, para cada estilo, cómo se pinta. Los colores se declaran
   como recetas —«fondo mezclado con la traza al 14 %»— y no como valores, para
   que el SVG y el TikZ resuelvan exactamente lo mismo. El ancho va en dos
   unidades porque el destino las tiene distintas: px en la pantalla, pt en el
   PDF; están una al lado de la otra para que no vuelvan a separarse.

   Ausente = no se dibuja en ese estilo. */
const TRAZO_BASE = { tecnico: [1.3, 0.3], linea: [2.4, 0.4], solido: [2.6, 0.5], suave: [2.4, 0.4] };
const PINTURA_LAB = {
  sombra: {
    solido: { relleno: ['traza', .13], sinTrazo: true },
    suave:  { relleno: ['traza', .13], sinTrazo: true }
  },
  brillo: {
    suave: { trazo: ['fondo', 1], ancho: [3.4, 1.1], opacidad: .72, sinUnion: true }
  },
  liq: {
    tecnico: { relleno: ['liq', .22], sinTrazo: true },
    linea:   { relleno: ['liq', .7], sinTrazo: true },
    solido:  { relleno: ['liq', .95], sinTrazo: true },
    suave:   { relleno: ['liq', .82], sinTrazo: true }
  },
  vidrio: {
    tecnico: {}, linea: {},
    solido:  { relleno: ['traza', .16] },
    suave:   { relleno: ['vidrio', .13] }
  },
  solido: {
    tecnico: {}, linea: {},
    solido:  { relleno: ['traza', 1] },
    suave:   { relleno: ['traza', .07] }
  },
  metal: {
    tecnico: {}, linea: {},
    solido:  { relleno: ['traza', .3] },
    suave:   { relleno: ['traza', .12] }
  },
  acento: {
    tecnico: { trazo: ['liq', 1], ancho: [1.4, 0.5] },
    linea:   { trazo: ['liq', 1], ancho: [2.6, 0.85] },
    solido:  { trazo: ['liq', 1], ancho: [3.2, 0.85] },
    suave:   { trazo: ['liq', 1], ancho: [2.6, 0.85] }
  },
  fina: {
    tecnico: { ancho: [0.9, 0.3], opacidad: .8 },
    linea:   { ancho: [1.5, 0.45], opacidad: .8 },
    solido:  { ancho: [1.5, 0.45], opacidad: .8 },
    suave:   { ancho: [1.5, 0.45], opacidad: .8 }
  },
  detalle: {
    tecnico: { ancho: [0.9, 0.3], opacidad: .78 },
    linea:   { ancho: [1.5, 0.45], opacidad: .78 },
    solido:  { trazo: ['fondo', 1], ancho: [1.5, 0.45], opacidad: .95 },
    suave:   { ancho: [1.5, 0.45], opacidad: .78 }
  }
};
/* Resuelve una receta contra los colores de este montaje. */
function tonoLab(receta, C) {
  if (!receta) return null;
  const [base, t] = receta;
  const fondo = C.fondo || '#ffffff';
  const col = base === 'traza' ? (C.traza || '#222222')
    : base === 'liq' ? C.liq
    : base === 'vidrio' ? (C.vidrio || '#6E8FA8')
    : fondo;
  return t >= 1 ? col : labMezcla(fondo, col, t);
}
/* La celda de la tabla para este papel y estilo, o null si no se dibuja. */
function celdaLab(pap, estilo) {
  const fila = PINTURA_LAB[pap];
  if (!fila) return {};                 /* traza: el contorno principal */
  const c = fila[estilo];
  return c === undefined ? null : c;
}

/* Cómo se pinta cada papel en cada estilo, en atributos de SVG. */
function pinturaLab(pap, C, estilo) {
  const c = celdaLab(pap, estilo);
  if (!c) return null;
  const g = C.traza, base = (TRAZO_BASE[estilo] || TRAZO_BASE.suave)[0];
  const P = { fill: 'none', stroke: g, 'stroke-width': base, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (c.sinTrazo) {
    const o = { fill: tonoLab(c.relleno, C), stroke: 'none' };
    /* El líquido y la sombra se pintan con opacidad en pantalla: sobre el papel
       de la diapositiva es lo mismo que mezclar, y deja ver lo que hay debajo. */
    const base2 = c.relleno && c.relleno[1];
    if (base2 < 1) { o.fill = c.relleno[0] === 'liq' ? C.liq : tonoLab([c.relleno[0], 1], C); o.opacity = base2; }
    return o;
  }
  const out = Object.assign({}, P);
  if (c.sinUnion) delete out['stroke-linejoin'];
  if (c.trazo) out.stroke = tonoLab(c.trazo, C);
  if (c.ancho) out['stroke-width'] = c.ancho[0];
  if (c.relleno) out.fill = tonoLab(c.relleno, C);
  if (c.opacidad != null) out.opacity = c.opacidad;
  return out;
}

/* ---------- de figura a SVG ---------- */
function figuraASvg(f, C, estilo) {
  /* Compatibilidad: antes se llamaba con (fig, tinta, liq). */
  if (typeof C === 'string') C = { traza: C, liq: estilo || C, fondo: '#ffffff' };
  const est = estilo && EK_LAB[estilo] ? estilo : (C.estilo || 'suave');
  const pap = f.pap || (f.liq ? 'liq' : f.fill ? 'solidoRelleno' : 'traza');
  if (pap === 'solidoRelleno') {
    const base = { fill: C.traza, stroke: 'none' };
    return figuraNodo(f, base);
  }
  const base = pinturaLab(pap, C, est);
  if (!base) return null;
  return figuraNodo(f, base);
}
function figuraNodo(f, base) {
  if (f.t === 'p') return sv('path', Object.assign({ d: f.d }, base));
  if (f.t === 'l') return sv('line', Object.assign({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2 }, base));
  if (f.t === 'c') return sv('circle', Object.assign({ cx: f.cx, cy: f.cy, r: f.r }, base));
  if (f.t === 'e') return sv('ellipse', Object.assign({ cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry }, base));
  if (f.t === 'r') return sv('rect', Object.assign({ x: f.x, y: f.y, width: f.w, height: f.h, rx: f.rx }, base));
  return null;
}

/* Orden de pintado: primero lo que va detrás. */
const ORDEN_PAP = { sombra: 0, vidrio: 1, solido: 1, metal: 1, liq: 2, traza: 3, acento: 4, fina: 4, detalle: 5, brillo: 6 };
const papDe = f => f.pap || (f.liq ? 'liq' : f.fill ? 'traza' : 'traza');

/* Dibuja una pieza suelta, para la galería y para el lienzo.
   nivel recorta el líquido para poder subirlo o bajarlo. */
let _clipN = 0;
function piezaSvg(id, C, estilo, nivel) {
  const def = LABK[id];
  const g = sv('g');
  if (!def) return g;
  if (typeof C === 'string') C = { traza: C, liq: estilo || C, fondo: '#ffffff' };
  const est = estilo && EK_LAB[estilo] ? estilo : (C.estilo || 'suave');
  const figs = def.fig.slice().sort((a, b) => (ORDEN_PAP[papDe(a)] ?? 3) - (ORDEN_PAP[papDe(b)] ?? 3));
  let clipId = null;
  if (nivel != null && nivel < 0.999) {
    clipId = 'liqclip' + (++_clipN);
    const defs = sv('defs');
    const cp = sv('clipPath', { id: clipId });
    /* La caja de la pieza es 100 × 140; el líquido se recorta desde abajo. */
    cp.append(sv('rect', { x: -20, y: 140 - 140 * clamp(nivel, 0, 1), width: 140, height: 200 }));
    defs.append(cp); g.append(defs);
  }
  figs.forEach(f => {
    const n = figuraASvg(f, C, est);
    if (!n) return;
    if (clipId && papDe(f) === 'liq') n.setAttribute('clip-path', 'url(#' + clipId + ')');
    g.append(n);
  });
  return g;
}
/* ¿La pieza tiene trazos de este papel? El líquido decide si mostramos el
   control de nivel; el acento, si su color propio tiene dónde verse. */
function tienePapel(k, pap) {
  const d = LABK[k];
  return !!(d && d.fig.some(f => papDe(f) === pap));
}
const tieneLiquido = k => tienePapel(k, 'liq');
/* Colores efectivos de una pieza: los suyos, si no los del bloque, si no los del tema. */
function coloresLab(p, m, deck) {
  const th = temaDe(deck || S.deck);
  const pick = (...v) => { for (const x of v) if (x && x !== 'auto') return x; return null; };
  const liq = pick(p && p.col, m && m.col) || th.acc;
  let traza = pick(p && p.borde, m && m.borde) || th.fg || '#23373B';
  /* El color propio se ve en el líquido y en los trazos de acento. Una pieza
     que no tiene ninguno de los dos —un soporte, un imán, un icono— se quedaría
     igual por más color que le pusieras, así que ahí tiñe el dibujo entero. */
  const propio = p && p.col && p.col !== 'auto';
  const conBorde = p && p.borde && p.borde !== 'auto';
  if (propio && !conBorde && p.k && !tienePapel(p.k, 'liq') && !tienePapel(p.k, 'acento')) traza = p.col;
  return {
    traza, liq, vidrio: pick(m && m.vidrio) || '#6E8FA8',
    fondo: th.bg || '#ffffff',
    estilo: (p && p.est) || (m && m.estilo) || 'suave'
  };
}


