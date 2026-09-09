/* ==== 47-lab-catalogo.js ==== */
'use strict';
/* ================= material de laboratorio: el catálogo =================
   Dibujos vectoriales de vidrio y equipo para armar el diagrama de un montaje
   o de una ruta experimental. Cada pieza vive en una caja de 100 × 140 y se
   dibuja con trazos, así que hereda el color del tema y no se pixela nunca.

   Aquí solo hay datos: cada pieza es una lista de figuras. Quien las convierte
   en un dibujo es 47b-lab.js, y quien las coloca, 48-lab-edit.js. */

/* Ayudas de dibujo: d() arma un path, y las piezas devuelven una lista de
   figuras {t:'p'|'l'|'c'|'r'|'e', ...} que se convierten a SVG o a TikZ. */
const P_ = (...seg) => ({ t: 'p', d: seg.join(' ') });
const L_ = (x1, y1, x2, y2) => ({ t: 'l', x1, y1, x2, y2 });
const C_ = (cx, cy, r) => ({ t: 'c', cx, cy, r });
const R_ = (x, y, w, h, rx) => ({ t: 'r', x, y, w, h, rx: rx || 0 });
const E_ = (cx, cy, rx, ry) => ({ t: 'e', cx, cy, rx, ry });
const F_ = fig => Object.assign({}, fig, { fill: true });     // relleno (líquido)

/* nivel de líquido: se dibuja como una figura rellena tenue */
const LIQ = fig => Object.assign({}, fig, { pap: 'liq' });
/* Papel de cada trazo: de él dependen el grosor, el relleno y si se dibuja
   o no en cada estilo. Es lo que separa un dibujo plano de uno con cuerpo. */
const V_ = fig => Object.assign({}, fig, { pap: 'vidrio' });   // cuerpo de vidrio
const S_ = fig => Object.assign({}, fig, { pap: 'solido' });   // carcasa de un equipo
const D_ = fig => Object.assign({}, fig, { pap: 'detalle' });  // marcas finas
const B_ = fig => Object.assign({}, fig, { pap: 'brillo' });   // reflejo del vidrio
const G_ = fig => Object.assign({}, fig, { pap: 'sombra' });   // sombra de apoyo
const M_ = fig => Object.assign({}, fig, { pap: 'metal' });    // pinzas, soportes
const A_ = fig => Object.assign({}, fig, { pap: 'acento' });   // rayo, señal, flecha en color
const N_ = fig => Object.assign({}, fig, { pap: 'fina' });     // marca fina suelta (fuera del cuerpo)

/* ---- ayudantes para lo que se repite ----
   Cuando una pieza necesita el mismo trazo diez veces, escribirlo diez veces
   solo invita a que el décimo salga descuadrado. Estos generan lo repetido a
   partir de una tabla escrita en el fuente: nunca de Math.random, porque el
   mismo dibujo tiene que salir idéntico en pantalla, en TikZ y en el PPTX. */

/* Una cinta: la misma curva serpenteante de ida y de vuelta, separada w en
   horizontal y cerrada en lazo. Es lo que convierte un alambre en un cuerpo.
   v se lee [x,y, cx,cy, x,y, cx,cy, x,y, …]: una M y luego tantas Q como haga falta. */
const cintaQ = (v, w) => {
  const n = v.length;
  let d = 'M' + (v[0] + w) + ' ' + v[1];
  for (let i = 2; i < n; i += 4) d += ' Q' + (v[i] + w) + ' ' + v[i + 1] + ' ' + (v[i + 2] + w) + ' ' + v[i + 3];
  d += ' L' + (v[n - 2] - w) + ' ' + v[n - 1];
  for (let i = n - 4; i >= 2; i -= 4) d += ' Q' + (v[i] - w) + ' ' + v[i + 1] + ' ' + (v[i - 2] - w) + ' ' + v[i - 1];
  return P_(d + ' Z');
};
/* La hebra gemela: el mismo trazado reflejado en el eje de la caja. */
const espejoQ = v => v.map((c, i) => i % 2 ? c : 100 - c);

/* Un fosfolípido: cabeza polar y sus dos colas. s dice hacia dónde cuelgan. */
const lipido = (x, y, s) => [
  S_(C_(x, y, 4.6)),
  N_(P_('M' + (x - 2) + ' ' + (y + 4.6 * s) + ' Q' + (x - 3.6) + ' ' + (y + 11 * s) + ' ' + (x - 2.2) + ' ' + (y + 20 * s) +
    ' M' + (x + 2) + ' ' + (y + 4.6 * s) + ' Q' + (x + 3.6) + ' ' + (y + 11 * s) + ' ' + (x + 2.2) + ' ' + (y + 20 * s)))];
const monocapa = (xs, y, s) => xs.reduce((a, x) => a.concat(lipido(x, y, s)), []);

/* Espículas de un virus: mango y cabeza. El paso lo fija la tabla de ángulos,
   no el azar; por eso los ocho radios cada 45° dejan de parecer una rueda. */
const espiculas = (cx, cy, r0, r1, ang) => {
  const red = n => Math.round(n * 10) / 10;
  const en = (a, r) => [red(cx + r * Math.cos(a * Math.PI / 180)), red(cy + r * Math.sin(a * Math.PI / 180))];
  const mangos = ang.map(a => { const p = en(a, r0), q = en(a, r1); return 'M' + p[0] + ' ' + p[1] + ' L' + q[0] + ' ' + q[1]; });
  return [N_(P_(mangos.join(' ')))].concat(ang.map(a => { const p = en(a, r1 + 2.4); return M_(C_(p[0], p[1], 2.6)); }));
};

/* El esqueleto de una hebra de ADN. Los cruces caen a 20, 40, 68, 88 y 116:
   los huecos se alternan corto (20) y largo (28), y de esa desigualdad salen
   el surco menor y el mayor. La otra hebra es este mismo trazado en espejo. */
const ADN_HEBRA = [36, 12, 44, 15, 50, 20, 82, 30, 50, 40, 18, 54, 50, 68, 82, 78, 50, 88, 18, 102, 50, 116, 58, 121, 64, 124];

const LAB = [
  /* ---------- vidrio ----------
     Cada pieza se arma con un cuerpo cerrado (para poder rellenarlo), sus
     marcas finas aparte, un reflejo y la sombra de apoyo. */
  { id: 'vaso', n: 'Vaso de precipitados', grp: 'vidrio', fig: [
    G_(E_(50, 127, 30, 4)),
    V_(P_('M24 36 L24 116 Q24 126 34 126 L66 126 Q76 126 76 116 L76 36 Z')),
    LIQ(P_('M25 74 Q50 79 75 74 L75 116 Q75 125 66 125 L34 125 Q25 125 25 116 Z')),
    P_('M24 36 L24 116 Q24 126 34 126 L66 126 Q76 126 76 116 L76 36'),
    P_('M18 36 Q26 32 34 36'), L_(34, 36, 76, 36), P_('M76 36 Q84 39 88 45'),
    D_(P_('M28 60 L38 60 M28 74 L38 74 M28 88 L38 88 M28 102 L38 102')),
    D_(P_('M25 74 Q50 79 75 74')),
    B_(P_('M33 46 L33 108'))] },

  { id: 'erlenmeyer', n: 'Matraz Erlenmeyer', grp: 'vidrio', fig: [
    G_(E_(50, 127, 31, 4)),
    V_(P_('M41 24 L41 56 L19 116 Q17 126 26 126 L74 126 Q83 126 81 116 L59 56 L59 24 Z')),
    LIQ(P_('M29 96 Q50 101 71 96 L79 118 Q80 125 74 125 L26 125 Q20 125 21 118 Z')),
    P_('M41 24 L41 56 L19 116 Q17 126 26 126 L74 126 Q83 126 81 116 L59 56 L59 24'),
    P_('M37 21 Q50 17 63 21'), L_(38, 24, 62, 24),
    D_(P_('M29 96 Q50 101 71 96')), D_(P_('M41 40 L59 40')),
    B_(P_('M46 30 L46 54 L30 100'))] },

  { id: 'balon', n: 'Matraz de fondo redondo', grp: 'vidrio', fig: [
    G_(E_(50, 127, 26, 4)),
    V_(P_('M42 20 L42 62 A34 34 0 1 0 58 62 L58 20 Z')),
    LIQ(P_('M17 92 Q50 98 83 92 A34 34 0 0 1 17 92 Z')),
    P_('M42 20 L42 62 A34 34 0 1 0 58 62 L58 20'),
    P_('M38 17 Q50 13 62 17'), L_(39, 20, 61, 20),
    D_(L_(42, 34, 58, 34)), D_(L_(42, 40, 58, 40)),
    D_(P_('M17 92 Q50 98 83 92')),
    B_(P_('M46 26 L46 58')), B_(P_('M27 82 A28 28 0 0 1 34 66'))] },

  { id: 'balon2', n: 'Matraz de dos bocas', grp: 'vidrio', fig: [
    G_(E_(50, 127, 26, 4)),
    V_(P_('M42 22 L42 60 A34 34 0 1 0 58 60 L58 22 Z')),
    V_(P_('M70 34 L78 50 A34 34 0 0 0 62 58 Z')),
    LIQ(P_('M17 92 Q50 98 83 92 A34 34 0 0 1 17 92 Z')),
    P_('M42 22 L42 60 A34 34 0 1 0 58 60 L58 22'),
    P_('M66 32 L74 48'), P_('M78 30 L86 46'),
    P_('M38 19 Q50 15 62 19'), P_('M64 29 Q71 25 80 27'),
    D_(P_('M17 92 Q50 98 83 92')),
    B_(P_('M46 28 L46 56'))] },

  { id: 'aforado', n: 'Matraz aforado', grp: 'vidrio', fig: [
    G_(E_(50, 127, 29, 4)),
    V_(P_('M44 16 L44 68 Q22 96 22 112 Q22 126 34 126 L66 126 Q78 126 78 112 Q78 96 56 68 L56 16 Z')),
    LIQ(P_('M32 88 Q50 92 68 88 Q78 100 78 112 Q78 125 66 125 L34 125 Q22 125 22 112 Q22 100 32 88 Z')),
    P_('M44 16 L44 68 Q22 96 22 112 Q22 126 34 126 L66 126 Q78 126 78 112 Q78 96 56 68 L56 16'),
    P_('M40 13 Q50 9 60 13'), L_(41, 16, 59, 16),
    D_(L_(43, 46, 57, 46)), D_(P_('M32 88 Q50 92 68 88')),
    B_(P_('M48 22 L48 64')), B_(P_('M31 102 Q28 112 30 120'))] },

  { id: 'probeta', n: 'Probeta', grp: 'vidrio', fig: [
    G_(E_(50, 131, 22, 4)),
    V_(P_('M37 22 L37 112 L30 126 L70 126 L63 112 L63 22 Z')),
    LIQ(P_('M37.5 66 Q50 70 62.5 66 L62.5 112 L37.5 112 Z')),
    P_('M37 22 L37 112 L30 126 L70 126 L63 112 L63 22'),
    P_('M31 22 Q38 18 44 21'), L_(37, 22, 63, 22), P_('M63 22 Q69 25 72 30'),
    D_(P_('M38 34 L47 34 M38 42 L44 42 M38 50 L47 50 M38 58 L44 58 M38 74 L47 74 M38 82 L44 82 M38 90 L47 90 M38 98 L44 98')),
    D_(P_('M37.5 66 Q50 70 62.5 66')),
    B_(P_('M43 30 L43 106'))] },

  { id: 'tubo', n: 'Tubo de ensayo', grp: 'vidrio', fig: [
    G_(E_(50, 128, 15, 3)),
    V_(P_('M39 22 L39 108 Q39 126 50 126 Q61 126 61 108 L61 22 Z')),
    LIQ(P_('M39.5 84 Q50 88 60.5 84 L60.5 108 Q60.5 125 50 125 Q39.5 125 39.5 108 Z')),
    P_('M39 22 L39 108 Q39 126 50 126 Q61 126 61 108 L61 22'),
    P_('M34 21 Q50 16 66 21'), D_(P_('M39.5 84 Q50 88 60.5 84')),
    B_(P_('M44 30 L44 100'))] },

  { id: 'embudo', n: 'Embudo', grp: 'vidrio', fig: [
    V_(P_('M18 34 L45 82 L45 122 L55 122 L55 82 L82 34 Z')),
    P_('M18 34 L45 82 L45 122 L55 122 L55 82 L82 34 Z'),
    P_('M14 32 Q50 26 86 32'), D_(L_(45, 122, 55, 122)),
    B_(P_('M28 40 L46 74')), G_(E_(50, 124, 12, 3))] },

  { id: 'separacion', n: 'Embudo de separación', grp: 'vidrio', fig: [
    V_(P_('M40 16 L40 40 Q24 56 24 78 Q24 104 50 112 Q76 104 76 78 Q76 56 60 40 L60 16 Z')),
    LIQ(P_('M26 82 Q50 88 74 82 Q70 105 50 112 Q30 105 26 82 Z')),
    P_('M40 16 L40 40 Q24 56 24 78 Q24 104 50 112 Q76 104 76 78 Q76 56 60 40 L60 16'),
    P_('M36 13 Q50 9 64 13'),
    M_(C_(50, 118, 6)), P_('M50 112 L50 130'), D_(L_(44, 118, 56, 118)),
    D_(P_('M26 82 Q50 88 74 82')),
    B_(P_('M44 22 L44 42 Q32 56 31 74'))] },

  { id: 'kitasato', n: 'Kitasato y Büchner', grp: 'vidrio', fig: [
    G_(E_(50, 127, 30, 4)),
    V_(P_('M40 58 L40 74 L20 116 Q18 126 27 126 L73 126 Q82 126 80 116 L60 74 L60 58 Z')),
    V_(P_('M31 20 L38 54 L62 54 L69 20 Z')),
    LIQ(P_('M28 100 Q50 105 72 100 L78 118 Q79 125 73 125 L27 125 Q21 125 22 118 Z')),
    P_('M40 58 L40 74 L20 116 Q18 126 27 126 L73 126 Q82 126 80 116 L60 74 L60 58'),
    P_('M31 20 L38 54 L62 54 L69 20 Z'), D_(L_(38, 44, 62, 44)),
    P_('M60 82 L84 82'), P_('M84 77 L84 87'),
    P_('M36 57 Q50 53 64 57'),
    D_(P_('M28 100 Q50 105 72 100')),
    B_(P_('M45 62 L45 72 L30 106'))] },

  { id: 'refrigerante', n: 'Refrigerante Liebig', grp: 'vidrio', fig: [
    V_(P_('M38 12 L38 30 L29 40 L29 106 L38 116 L38 134 L62 134 L62 116 L71 106 L71 40 L62 30 L62 12 Z')),
    P_('M38 12 L38 30 L29 40 L29 106 L38 116 L38 134'),
    P_('M62 12 L62 30 L71 40 L71 106 L62 116 L62 134'),
    P_('M34 11 Q50 7 66 11'), P_('M34 135 Q50 139 66 135'),
    D_(L_(44, 44, 44, 102)), D_(L_(56, 44, 56, 102)),
    P_('M29 54 L14 44'), P_('M71 94 L86 104'),
    P_('M11 40 L17 49'), P_('M83 99 L89 108'),
    D_(P_('M35 62 Q41 66 35 70 M65 82 Q59 86 65 90')),
    B_(P_('M34 46 L34 100'))] },

  { id: 'pipeta', n: 'Pipeta aforada', grp: 'vidrio', fig: [
    V_(P_('M45 10 L45 44 Q45 52 40 56 Q37 62 37 74 Q37 86 40 92 Q45 96 45 104 L45 120 L50 132 L55 120 L55 104 Q55 96 60 92 Q63 86 63 74 Q63 62 60 56 Q55 52 55 44 L55 10 Z')),
    LIQ(P_('M38 78 Q50 82 62 78 Q62 88 60 92 Q55 96 55 104 L55 120 L50 130 L45 120 L45 104 Q45 96 40 92 Q38 88 38 78 Z')),
    P_('M45 10 L45 44 Q45 52 40 56 Q37 62 37 74 Q37 86 40 92 Q45 96 45 104 L45 120 L50 132 L55 120 L55 104 Q55 96 60 92 Q63 86 63 74 Q63 62 60 56 Q55 52 55 44 L55 10'),
    P_('M41 9 Q50 5 59 9'),
    D_(L_(45, 26, 55, 26)), D_(L_(45, 32, 52, 32)),
    D_(P_('M38 78 Q50 82 62 78')),
    B_(P_('M48 16 L48 42')), B_(P_('M41 64 Q39 74 41 84'))] },

  { id: 'bureta', n: 'Bureta', grp: 'vidrio', fig: [
    V_(P_('M40 12 L40 100 L44 108 L44 116 L56 116 L56 108 L60 100 L60 12 Z')),
    LIQ(P_('M40.5 40 Q50 44 59.5 40 L59.5 100 L56 107 L44 107 L40.5 100 Z')),
    P_('M40 12 L40 100 L44 108 L44 116 L56 116 L56 108 L60 100 L60 12'),
    P_('M35 11 Q50 7 65 11'),
    M_(C_(50, 112, 7)), P_('M50 119 L50 132'), D_(L_(43, 112, 57, 112)),
    D_(P_('M41 24 L49 24 M41 32 L46 32 M41 48 L49 48 M41 56 L46 56 M41 64 L49 64 M41 72 L46 72 M41 80 L49 80 M41 88 L46 88')),
    D_(P_('M40.5 40 Q50 44 59.5 40')),
    B_(P_('M45 20 L45 96'))] },

  { id: 'petri', n: 'Caja Petri', grp: 'vidrio', fig: [
    G_(E_(50, 118, 40, 5)),
    V_(P_('M10 92 L10 104 Q10 116 50 116 Q90 116 90 104 L90 92 Q90 80 50 80 Q10 80 10 92 Z')),
    V_(P_('M16 74 L16 82 Q16 92 50 92 Q84 92 84 82 L84 74 Q84 64 50 64 Q16 64 16 74 Z')),
    E_(50, 92, 40, 13), P_('M10 92 L10 104 Q10 116 50 116 Q90 116 90 104 L90 92'),
    E_(50, 74, 34, 10), P_('M16 74 L16 82 Q16 92 50 92 Q84 92 84 82 L84 74'),
    B_(P_('M24 72 Q30 66 42 65'))] },

  { id: 'reloj', n: 'Vidrio de reloj', grp: 'vidrio', fig: [
    G_(E_(50, 100, 34, 4)),
    V_(P_('M14 94 Q50 56 86 94 Q50 104 14 94 Z')),
    P_('M14 94 Q50 56 86 94'), P_('M14 94 Q50 104 86 94'),
    B_(P_('M28 88 Q38 72 52 68'))] },

  { id: 'crisol', n: 'Crisol', grp: 'vidrio', fig: [
    G_(E_(50, 120, 24, 4)),
    S_(P_('M28 56 L38 118 L62 118 L72 56 Z')),
    P_('M28 56 L38 118 L62 118 L72 56 Z'), P_('M24 55 Q50 50 76 55'),
    S_(P_('M32 44 Q50 32 68 44 L68 47 L32 47 Z')), P_('M32 44 Q50 32 68 44'), L_(30, 47, 70, 47),
    D_(L_(34, 84, 66, 84))] },

  { id: 'mortero', n: 'Mortero y pistilo', grp: 'vidrio', fig: [
    G_(E_(50, 120, 30, 4)),
    S_(P_('M20 74 Q20 118 50 118 Q80 118 80 74 Z')),
    P_('M20 74 Q20 118 50 118 Q80 118 80 74'), P_('M16 73 Q50 66 84 73'),
    S_(P_('M62 20 L70 26 L52 62 Q45 69 41 62 Q39 55 46 51 Z')),
    P_('M62 20 L70 26 L52 62 Q45 69 41 62 Q39 55 46 51 Z'),
    B_(P_('M28 82 Q30 100 40 110'))] },

  { id: 'frasco', n: 'Frasco de reactivo', grp: 'vidrio', fig: [
    G_(E_(50, 127, 28, 4)),
    S_(R_(42, 12, 16, 16, 2)),
    V_(P_('M34 28 L34 42 Q22 52 22 68 L22 116 Q22 126 32 126 L68 126 Q78 126 78 116 L78 68 Q78 52 66 42 L66 28 Z')),
    LIQ(P_('M23 62 Q50 67 77 62 L77 116 Q77 125 68 125 L32 125 Q23 125 23 116 Z')),
    P_('M34 28 L34 42 Q22 52 22 68 L22 116 Q22 126 32 126 L68 126 Q78 126 78 116 L78 68 Q78 52 66 42 L66 28'),
    R_(42, 12, 16, 16, 2),
    D_(R_(31, 74, 38, 30, 3)), D_(P_('M37 84 L63 84 M37 92 L57 92')),
    B_(P_('M30 56 L30 110'))] },

  /* ---------- montaje y calor ---------- */
  { id: 'soporte', n: 'Soporte universal', grp: 'montaje', fig: [
    G_(E_(50, 126, 38, 4)),
    M_(P_('M12 116 L88 116 Q92 116 92 120 L92 124 Q92 128 88 128 L12 128 Q8 128 8 124 L8 120 Q8 116 12 116 Z')),
    M_(R_(23, 14, 7, 104, 3)),
    M_(R_(30, 37, 46, 6, 3)), M_(R_(64, 30, 14, 20, 3)),
    M_(R_(30, 76, 34, 6, 3)), M_(R_(54, 69, 12, 20, 3)),
    D_(C_(71, 40, 3)), D_(C_(60, 79, 3)),
    B_(P_('M25 22 L25 110'))] },

  { id: 'pinza', n: 'Pinza de sujeción', grp: 'montaje', fig: [
    M_(R_(8, 65, 34, 12, 4)),
    P_('M42 71 Q58 55 78 56 Q84 57 86 62'),
    P_('M42 71 Q58 87 78 86 Q84 85 86 80'),
    M_(C_(47, 71, 5)), D_(C_(47, 71, 2)),
    D_(P_('M14 68 L14 74 M20 68 L20 74'))] },

  { id: 'mechero', n: 'Mechero Bunsen', grp: 'montaje', fig: [
    G_(E_(50, 128, 26, 4)),
    M_(P_('M28 128 Q50 110 72 128 Z')), P_('M28 128 Q50 110 72 128 Z'),
    M_(R_(44, 50, 12, 62, 2)), M_(R_(39, 44, 22, 8, 3)),
    M_(C_(37, 98, 6)), D_(C_(37, 98, 2.5)),
    LIQ(P_('M50 42 Q39 24 50 4 Q61 24 50 42 Z')),
    P_('M50 42 Q39 24 50 4 Q61 24 50 42 Z'),
    D_(P_('M50 36 Q45 24 50 14 Q55 24 50 36 Z')),
    B_(P_('M46 54 L46 106'))] },

  { id: 'parrilla', n: 'Parrilla de agitación', grp: 'montaje', fig: [
    G_(E_(50, 122, 40, 4)),
    S_(P_('M10 82 Q10 78 14 78 L86 78 Q90 78 90 82 L90 114 Q90 120 84 120 L16 120 Q10 120 10 114 Z')),
    P_('M10 82 Q10 78 14 78 L86 78 Q90 78 90 82 L90 114 Q90 120 84 120 L16 120 Q10 120 10 114 Z'),
    M_(E_(50, 78, 32, 7)), E_(50, 78, 32, 7),
    D_(E_(50, 77, 22, 4)),
    M_(C_(27, 102, 7)), D_(C_(27, 102, 2.5)), D_(P_('M27 96 L27 99')),
    M_(C_(45, 102, 7)), D_(C_(45, 102, 2.5)),
    S_(R_(60, 94, 22, 14, 3)), D_(P_('M65 101 L77 101')),
    B_(P_('M16 86 L16 112'))] },

  { id: 'agitador', n: 'Barra magnética', grp: 'montaje', fig: [
    S_(R_(28, 60, 44, 13, 6)), R_(28, 60, 44, 13, 6),
    D_(L_(40, 61, 40, 72)), D_(L_(60, 61, 60, 72)),
    B_(P_('M34 63 L66 63'))] },

  { id: 'termometro', n: 'Termómetro', grp: 'montaje', fig: [
    V_(P_('M44 14 L44 96 Q37 103 37 110 Q37 123 50 123 Q63 123 63 110 Q63 103 56 96 L56 14 Z')),
    LIQ(P_('M47 58 L53 58 L53 98 Q60 104 60 110 Q60 120 50 120 Q40 120 40 110 Q40 104 47 98 Z')),
    P_('M44 14 L44 96 Q37 103 37 110 Q37 123 50 123 Q63 123 63 110 Q63 103 56 96 L56 14'),
    P_('M41 13 Q50 9 59 13'),
    D_(P_('M57 28 L66 28 M57 36 L62 36 M57 44 L66 44 M57 52 L62 52 M57 60 L66 60 M57 68 L62 68 M57 76 L66 76')),
    B_(P_('M47 22 L47 90'))] },

  /* ---------- equipo ---------- */
  { id: 'mufla', n: 'Mufla', grp: 'equipo', fig: [
    G_(E_(50, 122, 36, 4)),
    S_(R_(10, 30, 80, 84, 5)),
    R_(10, 30, 80, 84, 5),
    S_(R_(20, 42, 44, 50, 3)), R_(20, 42, 44, 50, 3),
    LIQ(R_(24, 62, 36, 26)),
    D_(P_('M28 74 L34 82 L40 68 L46 82 L52 70')),
    M_(C_(77, 54, 7)), D_(C_(77, 54, 2.5)), D_(P_('M77 47 L77 51')),
    S_(R_(70, 72, 14, 8, 2)), D_(P_('M73 76 L81 76')),
    M_(R_(14, 114, 8, 10, 2)), M_(R_(78, 114, 8, 10, 2)),
    B_(P_('M16 38 L16 106'))] },

  { id: 'estufa', n: 'Estufa de secado', grp: 'equipo', fig: [
    G_(E_(50, 122, 36, 4)),
    S_(R_(10, 26, 80, 90, 5)), R_(10, 26, 80, 90, 5),
    V_(R_(19, 36, 50, 70, 3)), R_(19, 36, 50, 70, 3),
    D_(L_(19, 60, 69, 60)), D_(L_(19, 82, 69, 82)),
    M_(C_(80, 42, 6)), D_(C_(80, 42, 2)),
    S_(R_(74, 58, 12, 6, 2)), D_(P_('M76 68 L84 68 M76 74 L82 74')),
    M_(R_(14, 116, 8, 10, 2)), M_(R_(78, 116, 8, 10, 2)),
    B_(P_('M24 42 L24 100'))] },

  { id: 'rotavapor', n: 'Rotavapor', grp: 'equipo', fig: [
    G_(E_(58, 128, 40, 4)),
    S_(R_(8, 92, 36, 30, 4)), R_(8, 92, 36, 30, 4),
    M_(C_(26, 107, 8)), D_(C_(26, 107, 3)),
    P_('M44 102 L56 102'),
    V_(P_('M56 34 L56 96 L60 96 L60 34 Z')), P_('M56 34 L56 96'), P_('M60 34 L60 96'),
    V_(C_(72, 34, 17)), C_(72, 34, 17),
    LIQ(P_('M56 40 A17 17 0 0 0 88 40 A17 17 0 0 1 56 40 Z')),
    P_('M52 26 L64 26'),
    V_(C_(74, 104, 17)), C_(74, 104, 17),
    LIQ(P_('M58 110 A17 17 0 0 0 90 110 A17 17 0 0 1 58 110 Z')),
    P_('M74 87 L74 74 L62 74'),
    D_(P_('M12 98 L26 98')),
    B_(P_('M62 28 A15 15 0 0 0 60 42'))] },

  { id: 'bomba', n: 'Bomba de vacío', grp: 'equipo', fig: [
    G_(E_(48, 122, 36, 4)),
    S_(P_('M12 58 Q12 54 16 54 L74 54 Q78 54 78 58 L78 112 Q78 118 72 118 L18 118 Q12 118 12 112 Z')),
    P_('M12 58 Q12 54 16 54 L74 54 Q78 54 78 58 L78 112 Q78 118 72 118 L18 118 Q12 118 12 112 Z'),
    M_(C_(43, 86, 16)), C_(43, 86, 16), D_(C_(43, 86, 6)),
    D_(P_('M43 70 L43 78 M43 94 L43 102 M27 86 L35 86 M51 86 L59 86')),
    S_(R_(78, 72, 10, 14, 2)), P_('M88 79 L96 79'),
    M_(R_(18, 118, 8, 8, 2)), M_(R_(66, 118, 8, 8, 2)),
    B_(P_('M18 62 L18 108'))] },

  { id: 'balanza', n: 'Balanza analítica', grp: 'equipo', fig: [
    G_(E_(50, 118, 38, 4)),
    S_(P_('M12 78 Q12 74 16 74 L84 74 Q88 74 88 78 L88 108 Q88 114 82 114 L18 114 Q12 114 12 108 Z')),
    P_('M12 78 Q12 74 16 74 L84 74 Q88 74 88 78 L88 108 Q88 114 82 114 L18 114 Q12 114 12 108 Z'),
    S_(R_(22, 86, 34, 16, 2)), R_(22, 86, 34, 16, 2),
    D_(P_('M27 94 L39 94 M43 94 L51 94')),
    M_(E_(62, 72, 20, 5)), E_(62, 72, 20, 5),
    V_(P_('M20 40 L20 72 M84 40 L84 72')), P_('M20 40 L20 72'), P_('M84 40 L84 72'),
    V_(R_(18, 34, 68, 8, 3)), R_(18, 34, 68, 8, 3),
    D_(P_('M62 66 L62 72')),
    B_(P_('M18 80 L18 106'))] },

  { id: 'ultrasonido', n: 'Baño de ultrasonido', grp: 'equipo', fig: [
    G_(E_(50, 122, 38, 4)),
    S_(P_('M10 58 Q10 54 14 54 L86 54 Q90 54 90 58 L90 112 Q90 118 84 118 L16 118 Q10 118 10 112 Z')),
    P_('M10 58 Q10 54 14 54 L86 54 Q90 54 90 58 L90 112 Q90 118 84 118 L16 118 Q10 118 10 112 Z'),
    V_(R_(20, 62, 44, 40, 3)), R_(20, 62, 44, 40, 3),
    LIQ(P_('M21 76 Q42 81 63 76 L63 101 L21 101 Z')),
    D_(P_('M21 76 Q42 81 63 76')),
    D_(P_('M27 88 Q33 82 39 88 Q45 94 51 88 Q57 82 57 88')),
    M_(C_(78, 68, 5)), D_(C_(78, 68, 1.8)), M_(C_(78, 84, 4)),
    S_(R_(72, 96, 14, 6, 2)),
    B_(P_('M25 68 L25 98'))] },

  { id: 'centrifuga', n: 'Centrífuga', grp: 'equipo', fig: [
    G_(E_(50, 122, 40, 4)),
    S_(P_('M12 70 L12 104 Q12 120 50 120 Q88 120 88 104 L88 70 Z')),
    P_('M12 70 L12 104 Q12 120 50 120 Q88 120 88 104 L88 70'),
    V_(E_(50, 70, 38, 13)), E_(50, 70, 38, 13),
    D_(E_(50, 70, 26, 8)),
    M_(P_('M30 66 L38 50 L44 52 L36 68 Z')), M_(P_('M70 66 L62 50 L56 52 L64 68 Z')),
    M_(C_(50, 70, 6)), D_(C_(50, 70, 2.5)),
    S_(R_(58, 100, 20, 9, 2)), D_(P_('M62 105 L74 105')),
    B_(P_('M18 78 L18 100'))] },

  { id: 'uvvis', n: 'Espectrofotómetro', grp: 'equipo', fig: [
    G_(E_(50, 116, 42, 4)),
    S_(P_('M8 50 Q8 46 12 46 L88 46 Q92 46 92 50 L92 106 Q92 112 86 112 L14 112 Q8 112 8 106 Z')),
    P_('M8 50 Q8 46 12 46 L88 46 Q92 46 92 50 L92 106 Q92 112 86 112 L14 112 Q8 112 8 106 Z'),
    V_(R_(16, 56, 32, 26, 3)), R_(16, 56, 32, 26, 3),
    D_(P_('M22 64 L42 64 M22 71 L36 71')),
    S_(R_(56, 56, 28, 20, 2)), R_(56, 56, 28, 20, 2),
    LIQ(R_(62, 60, 8, 12)),
    D_(P_('M20 94 L44 94 M52 94 L82 94')),
    M_(C_(86, 60, 3.5)),
    B_(P_('M14 54 L14 102'))] },

  { id: 'drx', n: 'Difractómetro', grp: 'equipo', fig: [
    G_(E_(50, 124, 34, 4)),
    S_(C_(50, 82, 33)), C_(50, 82, 33),
    D_(C_(50, 82, 24)),
    M_(P_('M50 82 L26 60 L20 66 L44 88 Z')), M_(P_('M50 82 L78 66 L82 74 L54 88 Z')),
    S_(R_(14, 50, 16, 14, 3)), R_(14, 50, 16, 14, 3),
    S_(R_(72, 56, 16, 14, 3)), R_(72, 56, 16, 14, 3),
    M_(C_(50, 82, 6)), LIQ(C_(50, 82, 3.5)),
    D_(P_('M36 82 A14 14 0 0 1 44 69')),
    M_(R_(30, 118, 40, 8, 2)),
    B_(P_('M26 68 A32 32 0 0 0 24 92'))] },

  { id: 'campana', n: 'Campana de extracción', grp: 'equipo', fig: [
    G_(E_(50, 124, 42, 4)),
    S_(P_('M10 28 Q10 24 14 24 L86 24 Q90 24 90 28 L90 94 L10 94 Z')),
    P_('M10 28 Q10 24 14 24 L86 24 Q90 24 90 28 L90 94 L10 94 Z'),
    V_(R_(18, 34, 64, 30, 2)), R_(18, 34, 64, 30, 2), D_(L_(18, 52, 82, 52)),
    S_(R_(10, 94, 80, 24, 2)), R_(10, 94, 80, 24, 2),
    D_(P_('M20 104 L44 104 M52 104 L80 104')),
    M_(P_('M40 24 L40 8 L60 8 L60 24')), D_(P_('M46 16 L54 16')),
    D_(P_('M24 70 L76 70')),
    B_(P_('M22 40 L22 60'))] },

  { id: 'guantes', n: 'Equipo de protección', grp: 'equipo', fig: [
    V_(P_('M28 58 Q28 38 50 38 Q72 38 72 58 L72 72 Q72 78 66 78 L34 78 Q28 78 28 72 Z')),
    P_('M28 58 Q28 38 50 38 Q72 38 72 58 L72 72 Q72 78 66 78 L34 78 Q28 78 28 72 Z'),
    P_('M22 56 Q50 44 78 56'), D_(L_(28, 66, 72, 66)),
    B_(P_('M36 50 Q44 44 54 44')),
    S_(P_('M34 92 L34 122 Q34 128 40 128 L60 128 Q66 128 66 122 L66 92 Q66 86 60 86 L40 86 Q34 86 34 92 Z')),
    P_('M34 92 L34 122 Q34 128 40 128 L60 128 Q66 128 66 122 L66 92 Q66 86 60 86 L40 86 Q34 86 34 92 Z'),
    D_(P_('M41 86 L41 96 M50 86 L50 96 M59 86 L59 96'))] },

  /* ---------- biología ----------
     Convención de papeles, la misma que en el vidrio pero que hasta ahora solo
     estaba de hecho y no escrita:
       · G_ va la primera: una elipse plana bajo la pieza, la sombra de apoyo
         que la asienta en el papel. En un corte —la bicapa, la raíz— no hay
         suelo, así que va detrás, como masa que da profundidad.
       · B_ va el último y siempre en la mitad izquierda: la luz entra por
         arriba y por la izquierda, como en todo el catálogo.
       · Lo que representa un objeto lleva papel de cuerpo (S_ o V_). Sin él la
         pieza sale idéntica en «con cuerpo» y en «línea», y ahí es donde se
         nota que un dibujo es barato.
       · Lo de dentro de un cuerpo va en D_, que es el único papel que se pinta
         en negativo sobre el relleno del estilo sólido. N_ solo por fuera. */
  { id: 'celula-animal', n: 'Célula animal', grp: 'bio', fig: [
    G_(E_(50, 117, 32, 4)),
    S_(P_('M46 26 Q72 24 85 40 Q96 56 88 74 Q80 100 54 111 Q28 116 15 94 Q3 72 12 50 Q22 28 46 26 Z')),
    /* Núcleo con envoltura doble y nucléolo; a su derecha el retículo rugoso,
       con los ribosomas como puntadas sobre las cisternas. */
    D_(E_(38, 58, 17, 14)), D_(E_(38, 58, 13.5, 10.5)), D_(C_(35, 58, 4.2)),
    D_(P_('M30 51 Q36 48 43 51 M31 65 Q38 68 46 63')),
    D_(P_('M56 44 Q68 50 66 66 M60 40 Q75 47 72 68')),
    D_(P_('M57 46 L55 45 M62 48 L61 45 M66 54 L69 54 M65 62 L68 63 M64 41 L63 38 M70 46 L72 44 M74 54 L77 54 M72 64 L75 66')),
    D_(E_(67, 91, 12, 7)), D_(P_('M58 91 Q62 85 65 91 Q68 97 71 91 Q74 85 76 91')),
    D_(P_('M24 88 Q34 84 44 88 M25 94 Q34 90 43 94 M26 100 Q34 96 42 100')),
    D_(C_(47, 82, 2.2)), D_(C_(27, 102, 2.2)), D_(C_(62, 50, 5)),
    D_(P_('M20 44 L26 47 M22 41 L24 50')),
    B_(P_('M18 62 Q20 40 38 30'))] },
  { id: 'celula-vegetal', n: 'Célula vegetal', grp: 'bio', fig: [
    G_(E_(50, 113, 38, 4)),
    S_(R_(10, 34, 80, 74, 5)),
    D_(R_(16, 40, 68, 62, 4)),
    LIQ(R_(30, 66, 42, 28, 7)), D_(R_(30, 66, 42, 28, 7)),
    D_(E_(31, 58, 11, 9)), D_(C_(31, 58, 3.5)),
    D_(E_(62, 52, 10, 6)), D_(E_(74, 76, 8, 5)), D_(E_(44, 100, 9, 5)),
    D_(P_('M56 52 L68 52')), D_(P_('M68 74 L80 78')),
    B_(P_('M15 44 L15 96'))] },
  { id: 'bacteria', n: 'Bacteria', grp: 'bio', fig: [
    G_(E_(50, 97, 28, 4)),
    N_(R_(15, 46, 70, 50, 25)),
    S_(R_(19, 50, 62, 42, 21)),
    D_(R_(23, 54, 54, 34, 17)),
    /* Capsula, pared y membrana son tres trazos distintos porque son tres
       cosas distintas. El nucleoide es un lazo que se enrolla sobre sí mismo. */
    D_(P_('M37 63 Q27 67 31 76 Q38 84 48 80 Q58 77 54 68 Q50 60 40 62 Q34 63 36 69 Q39 74 45 72')),
    D_(P_('M27 58 L27 61 M45 55 L45 58 M62 57 L62 60 M72 60 L72 63 M31 84 L31 87 M52 84 L52 87 M25 71 L25 74')),
    D_(E_(67, 79, 6, 4)),
    M_(R_(79, 67, 5, 8, 2.5)),
    P_('M84 71 Q90 62 95 70 Q99 78 93 86'),
    N_(P_('M44 46 L43 38 M56 46 L58 38 M44 96 L43 104 M56 96 L58 103 M20 58 L13 52 M80 58 L87 52 M20 84 L13 90')),
    B_(P_('M26 60 Q27 55 34 53'))] },
  { id: 'virus', n: 'Virus', grp: 'bio', fig: [
    G_(E_(50, 105, 20, 4)),
    /* Envoltura (doble trazo, que es una bicapa) y dentro la nucleocápside con
       su genoma enrollado; las espículas llevan mango y cabeza. */
    S_(C_(50, 68, 26)), D_(C_(50, 68, 22)), D_(C_(50, 68, 14)),
    D_(P_('M40 61 Q45 56 50 63 Q55 70 60 65 M40 73 Q45 68 50 75 Q55 82 60 77')),
    B_(P_('M31 58 A22 22 0 0 1 43 47'))]
    .concat(espiculas(50, 68, 26, 33, [6, 38, 63, 97, 121, 152, 184, 211, 243, 268, 299, 331])) },
  { id: 'bacteriofago', n: 'Bacteriófago', grp: 'bio', fig: [
    G_(E_(50, 129, 26, 4)),
    S_(P_('M50 18 L69 30 L69 52 L50 64 L31 52 L31 30 Z')),
    D_(P_('M50 18 L50 40 L31 30 M50 40 L69 30 M50 40 L50 64')),
    S_(R_(44, 64, 12, 26, 2)), D_(P_('M44 72 L56 72 M44 80 L56 80')),
    M_(R_(36, 89, 28, 5, 2)),
    P_('M42 94 L34 116'), P_('M50 94 L50 118'), P_('M58 94 L66 116'),
    P_('M34 116 L27 122'), P_('M66 116 L73 122'), P_('M50 118 L50 126'),
    B_(P_('M36 32 L48 25'))] },
  { id: 'adn', n: 'ADN', grp: 'bio', fig: [
    G_(E_(50, 131, 20, 4)),
    S_(cintaQ(ADN_HEBRA, 3.4)), S_(cintaQ(espejoQ(ADN_HEBRA), 3.4)),
    /* Los pares de bases: la mitad larga es la purina y la corta la pirimidina,
       y de qué lado cae la larga lo dice esta secuencia, escrita a mano. */
    A_(P_('M48 27 L61 27 M39 33 L52 33 M41.5 47 L51 47 M48 54 L62.5 54 M48.5 61 L58.5 61 M39 75 L52 75 M48 81 L61 81 M41.5 95 L51 95 M37.5 102 L52 102 M48.5 109 L58.5 109')),
    N_(P_('M39 27 L48 27 M52 33 L61 33 M51 47 L58.5 47 M37.5 54 L48 54 M41.5 61 L48.5 61 M52 75 L61 75 M39 81 L48 81 M51 95 L58.5 95 M52 102 L62.5 102 M41.5 109 L48.5 109')),
    /* Las dos hebras son antiparalelas: los galones lo dicen sin una palabra. */
    D_(P_('M31 51 L34 55 L37 51 M63 57 L66 53 L69 57')),
    B_(P_('M38 25 Q30 30 38 35'))] },
  { id: 'cromosoma', n: 'Cromosoma', grp: 'bio', fig: [
    G_(E_(50, 130, 26, 4)),
    S_(P_('M28 24 Q28 16 36 16 Q45 16 45 24 L45 44 Q49 48 49 52 Q49 56 45 60 L45 116 Q45 124 36 124 Q28 124 28 116 L28 60 Q38 56 38 52 Q38 48 28 44 Z')),
    S_(P_('M72 24 Q72 16 64 16 Q55 16 55 24 L55 44 Q51 48 51 52 Q51 56 55 60 L55 116 Q55 124 64 124 Q72 124 72 116 L72 60 Q62 56 62 52 Q62 48 72 44 Z')),
    /* El bandeo va a la misma altura en las dos cromátidas, que para eso son
       hermanas; las dos bandas de los extremos hacen de telómero. */
    D_(P_('M30 22 L43 22 M30 30 L43 30 M30 32.5 L43 32.5 M30 40 L43 40 M30 62 L43 62 M30 71 L43 71 M30 73.5 L43 73.5 M30 84 L43 84 M30 97 L43 97 M30 99.5 L43 99.5 M30 110 L43 110 M30 118 L43 118')),
    D_(P_('M57 22 L70 22 M57 30 L70 30 M57 32.5 L70 32.5 M57 40 L70 40 M57 62 L70 62 M57 71 L70 71 M57 73.5 L70 73.5 M57 84 L70 84 M57 97 L70 97 M57 99.5 L70 99.5 M57 110 L70 110 M57 118 L70 118')),
    M_(E_(43, 52, 4, 3)), M_(E_(57, 52, 4, 3)),
    B_(P_('M33 28 L33 44 M33 62 L33 104'))] },
  { id: 'neurona', n: 'Neurona', grp: 'bio', fig: [
    G_(E_(48, 136, 26, 3.5)),
    /* Soma piramidal: la dendrita apical sale gruesa del vértice y las basales
       de la base, que es lo que distingue una neurona de una estrella. Apical y
       soma van en un solo contorno: como dos cuerpos sueltos se cruzaban en el
       vértice y la apical cerraba con una raya por dentro del soma. */
    S_(P_('M45 7 Q49 19 52 30 Q62 33 69 46 Q74 57 64 57 L53 57 L52 61 L44 61 L43 57 L31 57 Q22 58 26 48 Q33 35 43 31 Q41 19 38 8 Z')),
    P_('M40 9 Q32 5 24 4 M42 8 L43 2 M44 9 Q52 5 60 6'),
    N_(P_('M24 4 L17 2 M24 4 L20 9 M60 6 L67 3 M60 6 L65 11')),
    P_('M34 52 Q20 58 8 58 M36 46 Q22 38 12 34 M62 52 Q78 56 90 52 M60 46 Q74 42 84 40'),
    N_(P_('M8 58 L2 55 M8 58 L4 63 M12 34 L6 30 M12 34 L6 39 M90 52 L96 48 M90 52 L96 57 M84 40 L90 36 M84 40 L91 43')),
    D_(E_(45, 42, 9, 7)), D_(P_('M39 43 Q44 39 50 43')),
    /* El cono axónico: donde el soma se estrecha para dar el axón. */
    D_(P_('M43 52 Q48 55 53 52')),
    /* La vaina va a trozos y entre trozo y trozo asoma el axón: eso son los
       nódulos de Ranvier, y por eso el axón se dibuja solo en los huecos. */
    M_(R_(43.5, 60, 9, 16, 4.5)), M_(R_(43.5, 80, 9, 16, 4.5)), M_(R_(43.5, 100, 9, 16, 4.5)),
    P_('M48 56 L48 60 M48 76 L48 80 M48 96 L48 100 M48 116 L48 119'),
    D_(P_('M44 64 L52 64 M44 84 L52 84 M44 104 L52 104')),
    P_('M48 119 Q40 123 34 128 M48 119 L48 131 M48 119 Q56 123 62 128'),
    M_(C_(32, 130, 3)), M_(C_(48, 133, 3)), M_(C_(64, 130, 3)),
    /* El reflejo baja por la apical: en el soma no cabe sin comerse el núcleo. */
    B_(P_('M43.5 12 Q44.5 20 45.5 28'))] },
  { id: 'mitocondria', n: 'Mitocondria', grp: 'bio', fig: [
    G_(E_(50, 99, 30, 4)),
    S_(E_(50, 70, 40, 25)),
    /* Membrana interna: es ella la que se pliega, así que las crestas salen de
       su trazo y no flotan sueltas dentro de la elipse. Se alternan arriba y
       abajo para que ninguna se cruce con la de enfrente. */
    D_(P_('M20 62 Q20 52 29 52 Q28 74 33 80 Q38 74 37 52 L45 52 Q44 78 49 84 Q54 78 53 52 L61 52 Q60 72 65 78 Q70 72 69 52 Q80 52 80 62 L80 78 Q80 88 69 88 L61 88 Q62 66 57 60 Q52 66 53 88 L45 88 Q46 62 41 56 Q36 62 37 88 L29 88 Q20 88 20 78 Z')),
    D_(C_(25, 70, 1.8)), D_(C_(75, 72, 1.8)),
    B_(P_('M21 60 Q30 51 44 49'))] },
  { id: 'cloroplasto', n: 'Cloroplasto', grp: 'bio', fig: [
    G_(E_(50, 99, 30, 4)),
    S_(E_(50, 70, 38, 24)),
    LIQ(E_(31, 61, 8, 4.5)), LIQ(E_(31, 79, 8, 4.5)), LIQ(E_(57, 59, 8, 4.5)),
    LIQ(E_(57, 77, 8, 4.5)), LIQ(E_(72, 68, 7, 4)),
    D_(E_(31, 61, 8, 4.5)), D_(E_(31, 79, 8, 4.5)), D_(E_(57, 59, 8, 4.5)),
    D_(E_(57, 77, 8, 4.5)), D_(E_(72, 68, 7, 4)),
    D_(P_('M39 61 L49 59 M39 79 L49 77 M65 59 L72 64')),
    B_(P_('M24 60 Q36 50 54 49'))] },
  { id: 'nucleo', n: 'Núcleo celular', grp: 'bio', fig: [
    G_(E_(50, 107, 26, 4)),
    S_(C_(50, 70, 32)), D_(C_(50, 70, 24)),
    D_(E_(44, 64, 9, 7)), D_(P_('M56 78 Q62 74 64 80')),
    M_(C_(22, 61, 2.8)), M_(C_(29, 46, 2.8)), M_(C_(50, 38, 2.8)), M_(C_(71, 47, 2.8)),
    M_(C_(80, 67, 2.8)), M_(C_(72, 92, 2.8)), M_(C_(50, 102, 2.8)), M_(C_(28, 94, 2.8)),
    B_(P_('M28 58 A28 28 0 0 1 42 44'))] },
  { id: 'membrana', n: 'Bicapa lipídica', grp: 'bio', fig: [
    /* Un corte no se apoya en nada: la sombra va detrás y de lado a lado,
       marcando el interior hidrófobo. Sin bordes propios no parece una caja. */
    G_(R_(0, 53, 100, 34, 0))]
    /* La proteína va centrada y los lípidos repartidos a los dos lados: con
       cuatro a la izquierda y uno a la derecha la bicapa se caía de lado. */
    .concat(monocapa([7, 19, 31, 69, 81, 93], 48, 1), monocapa([7, 19, 31, 69, 81, 93], 92, -1), [
      /* El colesterol se mete de canto entre las colas, con el hidroxilo
         arrimado a las cabezas: por eso el bloque toca la fila de cabezas. */
      M_(R_(22.7, 55, 4.6, 12, 2.3)), N_(P_('M25 67 Q26.2 70 25.2 73')),
      M_(R_(72.7, 73, 4.6, 12, 2.3)), N_(P_('M75 73 Q73.2 70 74.2 67')),
      S_(P_('M46 40 Q40 42 40 52 Q38 70 40 88 Q40 98 46 100 L54 100 Q60 98 60 88 Q62 70 60 52 Q60 42 54 40 Z')),
      D_(P_('M50 43 Q46 57 50 70 Q54 83 50 97')),
      D_(P_('M39 54 L61 54 M39 86 L61 86')),
      N_(P_('M46 40 Q43 33 50 32 Q57 33 54 40')),
      /* El reflejo baja por la pared de la proteína, que es el único cuerpo
         con sitio: sobre una cabeza de 4,6 de radio se la comía entera. */
      B_(P_('M43.5 60 Q42.5 70 43.5 82'))]) },
  { id: 'enzima', n: 'Enzima y sustrato', grp: 'bio', fig: [
    G_(E_(50, 116, 32, 4)),
    /* El hueco es estrecho de boca (12) y ancho por dentro (24): el sustrato
       entra y queda sujeto. Eso es el ajuste inducido, y se ve sin explicarlo.
       Tiene que sobrar hueco alrededor del sustrato, o no se ve que hay hueco. */
    S_(P_('M20 92 Q14 62 30 46 Q42 36 44 52 Q38 58 38 70 Q39 82 50 82 Q61 82 62 70 Q62 58 56 52 Q58 36 70 46 Q86 62 80 92 Q70 112 50 112 Q30 112 20 92 Z')),
    LIQ(P_('M50 58 L58.5 63 L58.5 73 L50 78 L41.5 73 L41.5 63 Z')),
    N_(P_('M50 58 L58.5 63 L58.5 73 L50 78 L41.5 73 L41.5 63 Z')),
    /* Los residuos catalíticos: lo único de la pieza que va en color, porque
       son el punto donde de verdad pasa algo. */
    A_(P_('M38.5 66 L41 67 M61.5 66 L59 67')),
    D_(P_('M28 70 Q24 86 32 98 M74 74 Q78 88 70 100')),
    B_(P_('M26 88 Q20 70 25 58'))] },
  { id: 'anticuerpo', n: 'Anticuerpo', grp: 'bio', fig: [
    G_(E_(50, 130, 18, 4)),
    S_(P_('M13 25 L45 71 L45 119 Q45 126 50 126 Q55 126 55 119 L55 71 L87 25 Q86 16 77 19 L50 62 L23 19 Q14 16 13 25 Z')),
    D_(P_('M27 45 L37 38 M73 45 L63 38')),
    D_(P_('M24 21 L36 38 M76 21 L64 38')),
    D_(P_('M45 75 L55 75 M45 96 L55 96')),
    A_(P_('M46 80 L54 80 M46 85 L54 85')),
    A_(P_('M16 23 Q20 19 24 21 M84 23 Q80 19 76 21')),
    B_(P_('M24 34 L40 57'))] },
  { id: 'colonias', n: 'Placa con colonias', grp: 'bio', fig: [
    G_(E_(50, 112, 36, 5)),
    V_(C_(50, 74, 38)), D_(C_(50, 74, 33)),
    LIQ(C_(38, 62, 5.5)), LIQ(C_(59, 55, 4)), LIQ(C_(67, 77, 6.5)),
    LIQ(C_(41, 89, 4.5)), LIQ(C_(57, 91, 3)), LIQ(C_(29, 77, 3.5)), LIQ(C_(50, 72, 3)),
    N_(C_(38, 62, 5.5)), N_(C_(67, 77, 6.5)), N_(C_(41, 89, 4.5)),
    B_(P_('M27 56 A34 34 0 0 1 45 40'))] },
  { id: 'microscopio', n: 'Microscopio', grp: 'bio', fig: [
    G_(E_(50, 129, 30, 4)),
    S_(P_('M26 126 Q30 112 50 112 Q70 112 74 126 Z')),
    S_(P_('M40 112 L40 88 Q40 80 48 76 L52 76 L52 112 Z')),
    S_(R_(26, 76, 46, 11, 3)),
    M_(P_('M49 76 L49 44 Q49 33 62 30 L62 40 Q57 42 57 46 L57 76 Z')),
    S_(R_(55, 16, 16, 16, 3)), M_(R_(44, 55, 12, 20, 2)),
    M_(C_(36, 96, 6.5)), M_(C_(36, 96, 2.5)),
    D_(P_('M32 82 L66 82')), D_(P_('M60 20 L66 20')),
    B_(P_('M52 48 L52 74'))] },
  { id: 'eppendorf', n: 'Tubo Eppendorf', grp: 'bio', fig: [
    G_(E_(50, 122, 12, 3)),
    V_(P_('M38 28 L40 96 Q42 112 50 118 Q58 112 60 96 L62 28 Z')),
    LIQ(P_('M42 86 Q50 90 58 86 L58 96 Q56 110 50 116 Q44 110 42 96 Z')),
    P_('M38 28 L40 96 Q42 112 50 118 Q58 112 60 96 L62 28'),
    V_(P_('M34 18 Q50 11 66 18 L66 28 L34 28 Z')),
    P_('M34 18 Q50 11 66 18 L66 28 L34 28 Z'), P_('M66 23 L77 17'),
    D_(P_('M42 86 Q50 90 58 86')), D_(P_('M41 60 L59 60')),
    B_(P_('M44 34 L45 92'))] },
  { id: 'micropipeta', n: 'Micropipeta', grp: 'bio', fig: [
    G_(E_(50, 128, 10, 3)),
    S_(R_(40, 10, 20, 15, 4)),
    S_(R_(43, 25, 14, 47, 2)), D_(R_(45, 32, 10, 12, 1)),
    S_(R_(37, 72, 26, 13, 4)),
    M_(P_('M46 85 L48 108 L52 108 L54 85 Z')),
    V_(P_('M48 108 L49 124 L51 124 L52 108 Z')), P_('M48 108 L49 124 L51 124 L52 108'),
    M_(P_('M60 40 L71 35')), S_(R_(66, 29, 11, 13, 2)),
    D_(P_('M45 52 L55 52 M45 58 L55 58')),
    B_(P_('M45 28 L45 68'))] },
  { id: 'gradilla', n: 'Gradilla', grp: 'bio', fig: [
    G_(E_(50, 115, 40, 4)),
    V_(P_('M23 48 L23 90 Q23 100 29 100 Q35 100 35 90 L35 48 Z')),
    V_(P_('M45 48 L45 90 Q45 100 51 100 Q57 100 57 90 L57 48 Z')),
    V_(P_('M67 48 L67 90 Q67 100 73 100 Q79 100 79 90 L79 48 Z')),
    LIQ(P_('M23.5 72 Q29 76 34.5 72 L34.5 90 Q34.5 99 29 99 Q23.5 99 23.5 90 Z')),
    LIQ(P_('M45.5 66 Q51 70 56.5 66 L56.5 90 Q56.5 99 51 99 Q45.5 99 45.5 90 Z')),
    LIQ(P_('M67.5 80 Q73 84 78.5 80 L78.5 90 Q78.5 99 73 99 Q67.5 99 67.5 90 Z')),
    P_('M23 48 L23 90 Q23 100 29 100 Q35 100 35 90 L35 48'),
    P_('M45 48 L45 90 Q45 100 51 100 Q57 100 57 90 L57 48'),
    P_('M67 48 L67 90 Q67 100 73 100 Q79 100 79 90 L79 48'),
    S_(R_(12, 76, 76, 32, 3)), D_(P_('M12 88 L88 88')),
    D_(P_('M23.5 72 Q29 76 34.5 72')), D_(P_('M45.5 66 Q51 70 56.5 66')),
    B_(P_('M27 54 L27 84'))] },
  { id: 'gel', n: 'Gel de electroforesis', grp: 'bio', fig: [
    G_(E_(50, 122, 34, 4)),
    V_(R_(12, 38, 76, 80, 3)),
    D_(R_(20, 44, 14, 6, 1)), D_(R_(43, 44, 14, 6, 1)), D_(R_(66, 44, 14, 6, 1)),
    LIQ(R_(21, 62, 12, 4, 1)), LIQ(R_(44, 58, 12, 4, 1)), LIQ(R_(67, 64, 12, 4, 1)),
    LIQ(R_(21, 78, 12, 4, 1)), LIQ(R_(44, 84, 12, 4, 1)), LIQ(R_(67, 80, 12, 4, 1)),
    LIQ(R_(44, 100, 12, 4, 1)), LIQ(R_(67, 98, 12, 4, 1)),
    P_('M12 38 L88 38 L88 118 L12 118 Z'),
    N_(P_('M14 30 L20 30 M17 27 L17 33')), N_(P_('M80 30 L86 30')),
    B_(P_('M17 46 L17 110'))] },
  { id: 'pcr', n: 'Termociclador', grp: 'bio', fig: [
    G_(E_(50, 115, 42, 4)),
    S_(R_(10, 54, 80, 58, 5)),
    S_(P_('M18 54 L18 40 Q18 33 26 33 L74 33 Q82 33 82 40 L82 54 Z')),
    D_(R_(23, 60, 36, 20, 2)),
    D_(C_(30, 66, 2.6)), D_(C_(38, 66, 2.6)), D_(C_(46, 66, 2.6)), D_(C_(53, 66, 2.6)),
    D_(C_(30, 74, 2.6)), D_(C_(38, 74, 2.6)), D_(C_(46, 74, 2.6)), D_(C_(53, 74, 2.6)),
    LIQ(R_(66, 60, 17, 13, 2)), D_(R_(66, 60, 17, 13, 2)),
    D_(P_('M20 94 L46 94 M20 102 L38 102')),
    M_(C_(72, 96, 5)),
    B_(P_('M15 60 L15 104'))] },
  { id: 'flujo', n: 'Campana de flujo', grp: 'bio', fig: [
    G_(E_(50, 132, 40, 4)),
    S_(R_(10, 20, 80, 84, 3)),
    D_(R_(18, 28, 64, 18, 2)),
    A_(P_('M26 50 L26 60 M38 50 L38 60 M50 50 L50 60 M62 50 L62 60 M74 50 L74 60')),
    V_(R_(18, 64, 64, 30, 2)), P_('M18 64 L82 64 L82 94 L18 94 Z'),
    S_(R_(10, 104, 80, 14, 2)),
    M_(L_(24, 118, 24, 128)), M_(L_(76, 118, 76, 128)),
    D_(P_('M22 34 L78 34 M22 40 L60 40')),
    B_(P_('M23 68 L23 90'))] },
  { id: 'hoja', n: 'Hoja', grp: 'bio', fig: [
    G_(E_(50, 130, 16, 4)),
    /* El margen aserrado no se pinta encima: cada diente es un quiebro del
       propio contorno, un arco que sale y una recta que vuelve a entrar. El
       diente entra solo 2: más hondo deja de ser una hoja y parece una piña.
       El ápice es acuminado porque el control sale casi pegado a la punta. */
    S_(P_('M50 10 Q56 14 57.5 25 L55.5 27 Q64 32 65.5 42 L63.5 44 Q69 50 69 56 L67 58 Q68 66 66 72 L64 74 Q63 82 58.5 88 L57 89 Q55 96 50 104 Q45 96 43 89 L41.5 88 Q37 82 36 74 L34 72 Q32 66 33 58 L31 56 Q31 50 34.5 44 L36.5 42 Q36 32 44.5 27 L42.5 25 Q44 14 50 10 Z')),
    M_(P_('M47 102 L48 124 Q50 129 52 124 L53 102 Z')),
    D_(P_('M50 20 L50 104')),
    /* Las secundarias mueren en el seno de un diente, que es adonde van. */
    D_(P_('M50 50 Q56 43 61 36 M50 50 Q44 43 39 36 M50 68 Q58 60 66 54 M50 68 Q42 60 34 54 M50 86 Q57 78 63 70 M50 86 Q43 78 37 70')),
    B_(P_('M46 29 Q44.5 33 44 37'))] },
  { id: 'raiz', n: 'Raíz', grp: 'bio', fig: [
    /* Aquí no hay suelo donde apoyarse: la sombra hace de tierra y va detrás,
       con el borde de abajo redondeado para que no parezca una caja. */
    G_(P_('M2 20 L98 20 L98 114 Q50 134 2 114 Z')),
    N_(P_('M4 20 L20 20 M26 20 L40 20 M60 20 L74 20 M80 20 L96 20')),
    S_(P_('M38 20 Q42 56 42 96 Q43 116 47 126 Q51 116 52 96 Q54 56 62 20 Z')),
    /* Cada lateral arranca con sus dos extremos sobre el contorno de la
       principal, no dentro: así se sueldan en Y en vez de cruzarse. */
    S_(P_('M40.2 44 Q30 52 21 72 Q25 75 27 68 Q34 57 40.7 52 Z')),
    S_(P_('M55.3 58 Q65 67 72 88 Q68 91 65.5 84 Q59 70 54.2 68 Z')),
    S_(P_('M41.9 86 Q35 95 31 110 Q35 112 37 105 Q40 96 42 94 Z')),
    N_(P_('M41 60 L34 57 M41.5 68 L34 66 M42 76 L35 75 M55.1 60 L62 58 M54.2 68 L62 66 M53.2 78 L61 77 M42 90 L36 89 M52.4 88 L59 87 M25 66 L20 63 M24 70 L19 68 M68 79 L73 77 M70 85 L75 84 M37 95 L32 93 M34 101 L29 99')),
    /* La cofia: el casquete que protege el meristemo en la punta. */
    D_(P_('M44.2 116 Q47 122 49.8 116')),
    A_(P_('M50 20 L50 8 M50 12 Q45 4 38 6 M50 12 Q55 4 62 6')),
    B_(P_('M43.5 26 Q44 40 44.8 56'))] },

  /* ---------- circuitos ----------
     Símbolos normalizados. El cuerpo va como metal para que se rellene en los
     estilos con cuerpo, y la señal en color de acento. */
  { id: 'pila', n: 'Pila', grp: 'circuito', fig: [
    L_(8, 70, 40, 70), M_(R_(38, 52, 4, 36, 1)), M_(R_(50, 61, 4, 18, 1)), L_(54, 70, 92, 70),
    N_(P_('M28 42 L28 52 M23 47 L33 47')), N_(P_('M63 47 L73 47'))] },
  { id: 'bateria', n: 'Batería', grp: 'circuito', fig: [
    L_(6, 70, 24, 70),
    M_(R_(24, 52, 4, 36, 1)), M_(R_(34, 60, 4, 20, 1)),
    M_(R_(44, 52, 4, 36, 1)), M_(R_(54, 60, 4, 20, 1)),
    M_(R_(64, 52, 4, 36, 1)), M_(R_(74, 60, 4, 20, 1)),
    L_(28, 70, 34, 70), L_(38, 70, 44, 70), L_(48, 70, 54, 70), L_(58, 70, 64, 70), L_(68, 70, 74, 70),
    L_(78, 70, 94, 70),
    N_(P_('M14 46 L14 56 M9 51 L19 51')), N_(P_('M81 51 L91 51'))] },
  { id: 'resistencia', n: 'Resistencia', grp: 'circuito', fig: [
    L_(6, 70, 24, 70), M_(R_(24, 57, 52, 26, 3)), P_('M24 57 L76 57 L76 83 L24 83 Z'),
    L_(76, 70, 94, 70),
    D_(P_('M32 57 L32 83 M40 57 L40 83 M60 57 L60 83')),
    B_(P_('M28 62 L72 62'))] },
  { id: 'condensador', n: 'Condensador', grp: 'circuito', fig: [
    L_(6, 70, 44, 70), M_(R_(42, 48, 4, 44, 1)), M_(R_(54, 48, 4, 44, 1)), L_(58, 70, 94, 70),
    A_(P_('M48 62 L52 62 M50 60 L50 64'))] },
  { id: 'inductor', n: 'Bobina', grp: 'circuito', fig: [
    L_(6, 70, 22, 70),
    P_('M22 70 A7 7 0 0 1 36 70 A7 7 0 0 1 50 70 A7 7 0 0 1 64 70 A7 7 0 0 1 78 70'),
    L_(78, 70, 94, 70), N_(P_('M22 76 L78 76'))] },
  { id: 'diodo', n: 'Diodo', grp: 'circuito', fig: [
    L_(6, 70, 36, 70), M_(P_('M36 53 L65 70 L36 87 Z')), P_('M36 53 L65 70 L36 87 Z'),
    M_(R_(63, 51, 4, 38, 1)), L_(67, 70, 94, 70)] },
  { id: 'led', n: 'LED', grp: 'circuito', fig: [
    L_(6, 70, 36, 70), M_(P_('M36 53 L65 70 L36 87 Z')), P_('M36 53 L65 70 L36 87 Z'),
    M_(R_(63, 51, 4, 38, 1)), L_(67, 70, 94, 70),
    A_(P_('M60 44 L74 30')), A_(P_('M68 30 L74 30 L74 36')),
    A_(P_('M70 48 L84 34')), A_(P_('M78 34 L84 34 L84 40'))] },
  { id: 'interruptor', n: 'Interruptor', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), M_(C_(33, 70, 3.4)), P_('M36 68 L66 50'), M_(C_(69, 70, 3.4)),
    L_(72, 70, 94, 70), N_(P_('M52 44 A22 22 0 0 1 58 54'))] },
  { id: 'lampara', n: 'Lámpara', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), M_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    A_(P_('M37 57 L63 83')), A_(P_('M63 57 L37 83')),
    B_(P_('M40 60 A18 18 0 0 1 50 54'))] },
  { id: 'amperimetro', n: 'Amperímetro', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M44 79 L50 59 L56 79')), D_(P_('M46.4 72 L53.6 72')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'voltimetro', n: 'Voltímetro', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M44 61 L50 81 L56 61')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'fuente-ac', n: 'Fuente alterna', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M39 70 Q44.5 56 50 70 Q55.5 84 61 70')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'tierra', n: 'Tierra', grp: 'circuito', fig: [
    L_(50, 28, 50, 64), M_(R_(29, 62, 42, 4, 2)), M_(R_(36, 74, 28, 4, 2)), M_(R_(43, 86, 14, 4, 2))] },
  { id: 'transistor', n: 'Transistor', grp: 'circuito', fig: [
    S_(C_(52, 70, 25)), P_('M27 70 A25 25 0 1 1 77 70 A25 25 0 1 1 27 70'),
    L_(18, 70, 40, 70), M_(R_(38, 53, 4, 34, 1)),
    P_('M42 62 L70 45'), P_('M42 78 L70 95'),
    L_(70, 28, 70, 45), L_(70, 95, 70, 112),
    M_(P_('M59 84 L71 95 L58 96 Z')),
    B_(P_('M36 60 A25 25 0 0 1 48 50'))] },
  { id: 'motor', n: 'Motor', grp: 'circuito', fig: [
    L_(6, 70, 32, 70), S_(C_(50, 70, 18)), P_('M32 70 A18 18 0 1 1 68 70 A18 18 0 1 1 32 70'),
    L_(68, 70, 94, 70),
    D_(P_('M42 79 L42 61 L50 74 L58 61 L58 79')),
    B_(P_('M39 62 A18 18 0 0 1 48 55'))] },
  { id: 'osciloscopio', n: 'Osciloscopio', grp: 'circuito', fig: [
    G_(E_(50, 113, 40, 4)),
    S_(R_(10, 38, 80, 64, 5)),
    V_(R_(17, 46, 46, 36, 3)), P_('M17 46 L63 46 L63 82 L17 82 Z'),
    D_(P_('M21 64 L59 64 M40 48 L40 80')),
    A_(P_('M21 66 Q27 48 33 66 Q39 84 45 66 Q51 48 57 66')),
    M_(C_(74, 55, 6.5)), M_(C_(74, 55, 2)), M_(C_(74, 74, 5.5)), M_(C_(74, 74, 1.8)),
    D_(R_(67, 87, 16, 6, 2)),
    M_(L_(20, 102, 20, 112)), M_(L_(80, 102, 80, 112)),
    B_(P_('M21 50 L21 78'))] },
  { id: 'multimetro', n: 'Multímetro', grp: 'circuito', fig: [
    G_(E_(50, 121, 32, 4)),
    S_(R_(20, 24, 60, 94, 6)),
    V_(R_(27, 34, 46, 24, 2)), P_('M27 34 L73 34 L73 58 L27 58 Z'),
    D_(P_('M33 50 L38 50 M44 42 L44 50 M52 42 L52 50 M60 42 L60 50')),
    M_(C_(50, 78, 12.5)), D_(C_(50, 78, 12.5)), D_(P_('M50 78 L50 67')),
    D_(P_('M36 70 L33 66 M64 70 L67 66 M50 92 L50 96')),
    M_(C_(33, 105, 4.2)), M_(C_(50, 105, 4.2)), M_(C_(67, 105, 4.2)),
    B_(P_('M25 38 L25 100'))] },
  { id: 'generador', n: 'Generador de funciones', grp: 'circuito', fig: [
    G_(E_(50, 111, 40, 4)),
    S_(R_(10, 44, 80, 56, 5)),
    V_(R_(17, 52, 40, 22, 2)), P_('M17 52 L57 52 L57 74 L17 74 Z'),
    A_(P_('M21 64 Q27 53 33 64 Q39 75 45 64')),
    M_(C_(74, 61, 7.5)), M_(C_(74, 61, 2.2)), D_(P_('M74 61 L79 56')),
    M_(R_(63, 82, 9, 7, 2)), M_(R_(77, 82, 9, 7, 2)),
    M_(L_(20, 100, 20, 110)), M_(L_(80, 100, 80, 110)),
    B_(P_('M21 56 L21 70'))] },

  /* ---------- óptica y mecánica ---------- */
  { id: 'lente-conv', n: 'Lente convergente', grp: 'fisica', fig: [
    V_(P_('M50 24 Q67 70 50 116 Q33 70 50 24 Z')),
    P_('M50 24 Q67 70 50 116 Q33 70 50 24 Z'),
    A_(L_(12, 70, 88, 70)),
    N_(P_('M44 30 L50 23 L56 30')), N_(P_('M44 110 L50 117 L56 110')),
    B_(P_('M45 38 Q40 62 44 86'))] },
  { id: 'lente-div', n: 'Lente divergente', grp: 'fisica', fig: [
    V_(P_('M39 24 L61 24 Q50 70 61 116 L39 116 Q50 70 39 24 Z')),
    P_('M39 24 L61 24 Q50 70 61 116 L39 116 Q50 70 39 24 Z'),
    A_(L_(12, 70, 88, 70)),
    N_(P_('M44 20 L50 27 L56 20')), N_(P_('M44 120 L50 113 L56 120')),
    B_(P_('M44 32 Q52 68 44 104'))] },
  { id: 'espejo', n: 'Espejo cóncavo', grp: 'fisica', fig: [
    M_(P_('M62 22 Q33 70 62 118 L69 118 Q40 70 69 22 Z')),
    P_('M62 22 Q33 70 62 118'), P_('M69 22 Q40 70 69 118'),
    N_(P_('M66 30 L74 25 M65 46 L73 41 M64 62 L72 57 M64 78 L72 73 M65 94 L73 89 M66 110 L74 105')),
    A_(L_(12, 70, 58, 70)),
    B_(P_('M58 34 Q44 70 58 106'))] },
  { id: 'prisma', n: 'Prisma', grp: 'fisica', fig: [
    V_(P_('M50 24 L85 106 L15 106 Z')), P_('M50 24 L85 106 L15 106 Z'),
    A_(P_('M2 72 L36 72')),
    A_(P_('M64 86 L96 74')), A_(P_('M64 90 L96 88')), A_(P_('M64 94 L96 102')),
    B_(P_('M46 36 L28 90'))] },
  { id: 'laser', n: 'Láser', grp: 'fisica', fig: [
    G_(E_(37, 88, 26, 4)),
    S_(R_(12, 56, 48, 28, 4)), P_('M12 56 L60 56 L60 84 L12 84 Z'),
    M_(R_(58, 64, 6, 12, 2)),
    A_(P_('M64 70 L96 70')), A_(P_('M88 65 L97 70 L88 75')),
    D_(C_(24, 70, 4.5)), D_(R_(34, 62, 9, 7, 1)),
    B_(P_('M17 61 L55 61'))] },
  { id: 'rendija', n: 'Rendija', grp: 'fisica', fig: [
    M_(R_(40, 12, 20, 44, 1)), P_('M40 12 L60 12 L60 56 L40 56 Z'),
    M_(R_(40, 84, 20, 44, 1)), P_('M40 84 L60 84 L60 128 L40 128 Z'),
    A_(P_('M50 56 L50 84')),
    N_(P_('M66 60 L72 60 M66 80 L72 80 M69 60 L69 80'))] },
  { id: 'pantalla', n: 'Pantalla', grp: 'fisica', fig: [
    G_(E_(50, 134, 18, 3)),
    S_(R_(38, 14, 24, 110, 2)), P_('M38 14 L62 14 L62 124 L38 124 Z'),
    M_(L_(50, 124, 50, 132)), M_(L_(37, 132, 63, 132)),
    LIQ(R_(41, 40, 18, 5, 2)), LIQ(R_(41, 58, 18, 5, 2)), LIQ(R_(41, 76, 18, 5, 2)),
    D_(P_('M41 40 L59 40 M41 58 L59 58 M41 76 L59 76')),
    B_(P_('M42 22 L42 116'))] },
  { id: 'plano-inclinado', n: 'Plano inclinado', grp: 'fisica', fig: [
    G_(E_(50, 116, 42, 4)),
    S_(P_('M12 112 L88 112 L88 42 Z')), P_('M12 112 L88 112 L88 42 Z'),
    M_(R_(57, 60, 22, 18, 2)), P_('M57 60 L79 60 L79 78 L57 78 Z'),
    A_(P_('M74 86 L88 100')), A_(P_('M80 98 L88 100 L86 92')),
    N_(P_('M24 105 A18 18 0 0 1 36 99')),
    B_(P_('M60 64 L76 64'))] },
  { id: 'polea', n: 'Polea', grp: 'fisica', fig: [
    M_(C_(50, 44, 20)), P_('M30 44 A20 20 0 1 1 70 44 A20 20 0 1 1 30 44'),
    D_(C_(50, 44, 14)), M_(C_(50, 44, 4.5)),
    M_(L_(50, 24, 50, 12)), M_(R_(37, 8, 26, 5, 2)),
    P_('M30 46 L30 100'), P_('M70 46 L70 88'),
    S_(R_(19, 100, 22, 20, 2)), P_('M19 100 L41 100 L41 120 L19 120 Z'),
    S_(R_(59, 88, 22, 20, 2)), P_('M59 88 L81 88 L81 108 L59 108 Z'),
    B_(P_('M36 34 A20 20 0 0 1 48 26'))] },
  { id: 'resorte', n: 'Resorte con masa', grp: 'fisica', fig: [
    M_(R_(28, 10, 44, 5, 2)),
    N_(P_('M30 15 L26 21 M40 15 L36 21 M50 15 L46 21 M60 15 L56 21 M70 15 L66 21')),
    L_(50, 15, 50, 26),
    P_('M50 26 L64 34 L36 46 L64 58 L36 70 L64 82 L50 90'),
    S_(R_(33, 90, 34, 28, 3)), P_('M33 90 L67 90 L67 118 L33 118 Z'),
    D_(P_('M40 104 L60 104')),
    A_(P_('M78 96 L78 122')), A_(P_('M73 116 L78 123 L83 116')),
    B_(P_('M37 95 L37 113'))] },
  { id: 'pendulo', n: 'Péndulo', grp: 'fisica', fig: [
    M_(R_(20, 12, 60, 5, 2)),
    N_(P_('M24 17 L20 23 M34 17 L30 23 M44 17 L40 23 M54 17 L50 23 M64 17 L60 23 M74 17 L70 23')),
    N_(P_('M50 17 L50 100')),
    L_(50, 17, 74, 95), S_(C_(77, 102, 10)), P_('M67 102 A10 10 0 1 1 87 102 A10 10 0 1 1 67 102'),
    A_(P_('M50 78 A28 28 0 0 0 67 92')),
    B_(P_('M71 96 A10 10 0 0 1 77 93'))] },
  { id: 'masa', n: 'Bloque con fuerzas', grp: 'fisica', fig: [
    S_(R_(31, 56, 38, 34, 3)), P_('M31 56 L69 56 L69 90 L31 90 Z'),
    M_(R_(10, 90, 80, 4, 1)),
    N_(P_('M14 94 L10 100 M26 94 L22 100 M38 94 L34 100 M50 94 L46 100 M62 94 L58 100 M74 94 L70 100 M86 94 L82 100')),
    A_(P_('M69 73 L95 73')), A_(P_('M88 68 L96 73 L88 78')),
    A_(P_('M50 56 L50 24')), A_(P_('M45 31 L50 23 L55 31')),
    D_(P_('M38 73 L62 73')),
    B_(P_('M35 61 L35 85'))] },
  { id: 'dinamometro', n: 'Dinamómetro', grp: 'fisica', fig: [
    V_(R_(38, 22, 24, 84, 4)), P_('M38 22 L62 22 L62 106 L38 106 Z'),
    M_(P_('M50 10 A8 8 0 1 1 50 22')), M_(L_(50, 106, 50, 116)),
    M_(P_('M50 116 A8 8 0 1 0 50 128')),
    D_(P_('M42 42 L58 42 M42 54 L52 54 M42 66 L58 66 M42 78 L52 78 M42 90 L58 90')),
    A_(R_(40, 68, 20, 3, 1)),
    B_(P_('M43 28 L43 100'))] },
  { id: 'iman', n: 'Imán', grp: 'fisica', fig: [
    G_(E_(50, 112, 36, 4)),
    S_(P_('M28 108 L28 62 A22 22 0 0 1 72 62 L72 108 L56 108 L56 62 A6 6 0 0 0 44 62 L44 108 Z')),
    LIQ(P_('M28 108 L28 92 L44 92 L44 108 Z')),
    P_('M28 108 L28 62 A22 22 0 0 1 72 62 L72 108 L56 108 L56 62 A6 6 0 0 0 44 62 L44 108 Z'),
    D_(L_(28, 92, 44, 92)), D_(L_(56, 92, 72, 92)),
    B_(P_('M33 84 L33 62 A17 17 0 0 1 42 49'))] },
  { id: 'solenoide', n: 'Solenoide', grp: 'fisica', fig: [
    P_('M22 84 A9 13 0 0 1 22 56'), P_('M22 56 L36 56'), P_('M36 56 A9 13 0 0 1 36 84'),
    P_('M36 84 L50 84'), P_('M50 84 A9 13 0 0 1 50 56'), P_('M50 56 L64 56'),
    P_('M64 56 A9 13 0 0 1 64 84'), P_('M64 84 L78 84'),
    L_(8, 70, 22, 70), L_(78, 70, 92, 70),
    A_(P_('M18 100 L84 100')), A_(P_('M77 95 L85 100 L77 105')),
    N_(P_('M22 44 L78 44'))] },
  { id: 'onda', n: 'Onda', grp: 'fisica', fig: [
    N_(L_(6, 70, 94, 70)),
    A_(P_('M8 70 Q20 34 32 70 Q44 106 56 70 Q68 34 80 70 Q86 88 92 78')),
    N_(P_('M20 50 L20 90')),
    N_(P_('M8 40 L32 40')), N_(P_('M8 35 L8 45')), N_(P_('M32 35 L32 45')),
    N_(P_('M8 40 L14 36 M8 40 L14 44')), N_(P_('M32 40 L26 36 M32 40 L26 44'))] },
  { id: 'vector', n: 'Vector', grp: 'fisica', fig: [
    A_(P_('M18 104 L79 41')), A_(P_('M66 42 L79 41 L78 54')),
    N_(P_('M18 104 L79 104')), N_(P_('M79 41 L79 104')),
    N_(P_('M33 104 A16 16 0 0 0 29 92'))] },
  { id: 'calorimetro', n: 'Calorímetro', grp: 'fisica', fig: [
    G_(E_(50, 121, 30, 4)),
    S_(P_('M22 40 L26 118 L74 118 L78 40 Z')),
    LIQ(P_('M27 78 Q50 83 73 78 L72 116 L28 116 Z')),
    P_('M22 40 L26 118 L74 118 L78 40'),
    M_(R_(17, 36, 66, 5, 2)),
    S_(R_(35, 24, 30, 13, 2)), P_('M35 24 L65 24 L65 37 L35 37 Z'),
    M_(L_(50, 24, 50, 12)),
    M_(L_(59, 14, 59, 100)), M_(C_(59, 106, 5)),
    D_(P_('M27 78 Q50 83 73 78')), D_(P_('M56 40 L62 40')),
    B_(P_('M31 48 L33 110'))] },
  { id: 'banco', n: 'Banco óptico', grp: 'fisica', fig: [
    G_(E_(50, 112, 44, 4)),
    S_(R_(8, 94, 84, 14, 2)), P_('M8 94 L92 94 L92 108 L8 108 Z'),
    D_(P_('M14 94 L14 108 M26 94 L26 108 M38 94 L38 108 M50 94 L50 108 M62 94 L62 108 M74 94 L74 108 M86 94 L86 108')),
    M_(R_(20, 58, 8, 36, 1)), M_(R_(46, 50, 8, 44, 1)), M_(R_(70, 62, 8, 32, 1)),
    V_(E_(50, 50, 9, 5)), N_(E_(50, 50, 9, 5)),
    A_(P_('M12 40 L88 40')), A_(P_('M81 35 L89 40 L81 45')),
    B_(P_('M12 98 L88 98'))] },

  /* ---------- iconos ----------
     Pictogramas simples, centrados en la caja, para acompañar una idea.
     Comparten motor con el resto: color, estilo y salida a TikZ. */
  { id: 'ic-idea', n: 'Idea', grp: 'icono', fig: [
    S_(P_('M50 32 A20 20 0 0 1 62 68 L62 80 L38 80 L38 68 A20 20 0 0 1 50 32 Z')),
    P_('M50 32 A20 20 0 0 1 62 68 L62 80 L38 80 L38 68 A20 20 0 0 1 50 32 Z'),
    M_(R_(40, 84, 20, 6, 2)), M_(R_(42, 94, 16, 5, 2)),
    A_(P_('M50 20 L50 12 M28 30 L22 24 M72 30 L78 24 M22 52 L14 52 M78 52 L86 52')),
    D_(P_('M44 80 L44 66 M56 80 L56 66'))] },
  { id: 'ic-objetivo', n: 'Objetivo', grp: 'icono', fig: [
    C_(50, 70, 34), C_(50, 70, 22), S_(C_(50, 70, 10)),
    A_(P_('M50 70 L88 32')), A_(P_('M78 32 L88 32 L88 42'))] },
  { id: 'ic-reloj', n: 'Reloj', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32),
    D_(P_('M50 50 L50 70 L66 78')), D_(P_('M50 40 L50 44 M80 70 L76 70 M50 100 L50 96 M20 70 L24 70'))] },
  { id: 'ic-calendario', n: 'Calendario', grp: 'icono', fig: [
    S_(R_(18, 44, 64, 56, 5)), R_(18, 44, 64, 56, 5),
    D_(P_('M18 60 L82 60')), M_(L_(32, 36, 32, 50)), M_(L_(68, 36, 68, 50)),
    D_(P_('M30 72 L38 72 M46 72 L54 72 M62 72 L70 72 M30 86 L38 86 M46 86 L54 86'))] },
  { id: 'ic-lupa', n: 'Lupa', grp: 'icono', fig: [
    C_(44, 62, 24), C_(44, 62, 17), M_(P_('M62 80 L84 102')), M_(R_(76, 90, 8, 20, 4))] },
  { id: 'ic-grafica', n: 'Gráfica', grp: 'icono', fig: [
    P_('M20 34 L20 100 L84 100'),
    S_(R_(30, 76, 12, 22, 2)), S_(R_(48, 60, 12, 38, 2)), S_(R_(66, 44, 12, 54, 2)),
    A_(P_('M28 66 L44 54 L60 58 L80 34')), A_(C_(80, 34, 4))] },
  { id: 'ic-engranaje', n: 'Engranaje', grp: 'icono', fig: [
    S_(P_('M44 32 L56 32 L58 42 L67 46 L76 41 L84 49 L79 58 L83 67 L93 69 L93 81 L83 83 L79 92 L84 101 L76 109 L67 104 L58 108 L56 118 L44 118 L42 108 L33 104 L24 109 L16 101 L21 92 L17 83 L7 81 L7 69 L17 67 L21 58 L16 49 L24 41 L33 46 L42 42 Z')),
    P_('M44 32 L56 32 L58 42 L67 46 L76 41 L84 49 L79 58 L83 67 L93 69 L93 81 L83 83 L79 92 L84 101 L76 109 L67 104 L58 108 L56 118 L44 118 L42 108 L33 104 L24 109 L16 101 L21 92 L17 83 L7 81 L7 69 L17 67 L21 58 L16 49 L24 41 L33 46 L42 42 Z'),
    D_(C_(50, 75, 14))] },
  { id: 'ic-candado', n: 'Candado', grp: 'icono', fig: [
    S_(R_(24, 66, 52, 42, 6)), R_(24, 66, 52, 42, 6),
    M_(P_('M34 66 L34 52 A16 16 0 0 1 66 52 L66 66')),
    D_(C_(50, 84, 6)), D_(P_('M50 90 L50 98'))] },
  { id: 'ic-nube', n: 'Nube', grp: 'icono', fig: [
    S_(P_('M30 92 A16 16 0 0 1 32 60 A22 22 0 0 1 72 56 A18 18 0 0 1 74 92 Z')),
    P_('M30 92 A16 16 0 0 1 32 60 A22 22 0 0 1 72 56 A18 18 0 0 1 74 92 Z')] },
  { id: 'ic-datos', n: 'Base de datos', grp: 'icono', fig: [
    S_(P_('M22 46 A28 10 0 0 1 78 46 L78 96 A28 10 0 0 1 22 96 Z')),
    P_('M22 46 L22 96 A28 10 0 0 0 78 96 L78 46'),
    E_(50, 46, 28, 10), D_(P_('M22 63 A28 10 0 0 0 78 63')), D_(P_('M22 80 A28 10 0 0 0 78 80'))] },
  { id: 'ic-servidor', n: 'Servidor', grp: 'icono', fig: [
    S_(R_(20, 40, 60, 22, 4)), S_(R_(20, 68, 60, 22, 4)), S_(R_(20, 96, 60, 22, 4)),
    D_(C_(30, 51, 3)), D_(C_(30, 79, 3)), D_(C_(30, 107, 3)),
    D_(P_('M42 51 L70 51 M42 79 L70 79 M42 107 L70 107'))] },
  { id: 'ic-documento', n: 'Documento', grp: 'icono', fig: [
    S_(P_('M26 34 L62 34 L78 50 L78 110 L26 110 Z')),
    P_('M26 34 L62 34 L78 50 L78 110 L26 110 Z'), P_('M62 34 L62 50 L78 50'),
    D_(P_('M36 66 L68 66 M36 78 L68 78 M36 90 L58 90'))] },
  { id: 'ic-carpeta', n: 'Carpeta', grp: 'icono', fig: [
    S_(P_('M16 42 L42 42 L50 52 L84 52 L84 102 L16 102 Z')),
    P_('M16 42 L42 42 L50 52 L84 52 L84 102 L16 102 Z'), D_(P_('M16 62 L84 62'))] },
  { id: 'ic-correo', n: 'Correo', grp: 'icono', fig: [
    S_(R_(16, 48, 68, 46, 4)), R_(16, 48, 68, 46, 4),
    D_(P_('M16 52 L50 78 L84 52')), D_(P_('M16 90 L38 70 M84 90 L62 70'))] },
  { id: 'ic-ubicacion', n: 'Ubicación', grp: 'icono', fig: [
    S_(P_('M50 30 A24 24 0 0 1 74 54 Q74 76 50 110 Q26 76 26 54 A24 24 0 0 1 50 30 Z')),
    P_('M50 30 A24 24 0 0 1 74 54 Q74 76 50 110 Q26 76 26 54 A24 24 0 0 1 50 30 Z'),
    D_(C_(50, 54, 9))] },
  { id: 'ic-usuario', n: 'Persona', grp: 'icono', fig: [
    S_(C_(50, 52, 17)), C_(50, 52, 17),
    S_(P_('M20 108 A30 30 0 0 1 80 108 Z')), P_('M20 108 A30 30 0 0 1 80 108 Z')] },
  { id: 'ic-equipo', n: 'Equipo', grp: 'icono', fig: [
    S_(C_(34, 52, 13)), C_(34, 52, 13), S_(C_(66, 52, 13)), C_(66, 52, 13),
    S_(P_('M10 100 A24 24 0 0 1 58 100 Z')), P_('M10 100 A24 24 0 0 1 58 100 Z'),
    S_(P_('M42 100 A24 24 0 0 1 90 100 Z')), P_('M42 100 A24 24 0 0 1 90 100 Z')] },
  { id: 'ic-estrella', n: 'Estrella', grp: 'icono', fig: [
    S_(P_('M50 30 L60 60 L92 60 L66 79 L76 110 L50 91 L24 110 L34 79 L8 60 L40 60 Z')),
    P_('M50 30 L60 60 L92 60 L66 79 L76 110 L50 91 L24 110 L34 79 L8 60 L40 60 Z')] },
  { id: 'ic-corazon', n: 'Corazón', grp: 'icono', fig: [
    S_(P_('M50 108 Q14 82 14 58 A20 20 0 0 1 50 46 A20 20 0 0 1 86 58 Q86 82 50 108 Z')),
    P_('M50 108 Q14 82 14 58 A20 20 0 0 1 50 46 A20 20 0 0 1 86 58 Q86 82 50 108 Z')] },
  { id: 'ic-aviso', n: 'Aviso', grp: 'icono', fig: [
    S_(P_('M50 32 L88 104 L12 104 Z')), P_('M50 32 L88 104 L12 104 Z'),
    D_(P_('M50 58 L50 82')), D_(C_(50, 92, 3.5))] },
  { id: 'ic-check', n: 'Correcto', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(P_('M32 70 L44 84 L70 54'))] },
  { id: 'ic-cruz', n: 'Incorrecto', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(P_('M36 56 L64 84 M64 56 L36 84'))] },
  { id: 'ic-pregunta', n: 'Pregunta', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34),
    D_(P_('M40 60 A10 10 0 0 1 60 62 Q60 72 50 76 L50 82')), D_(C_(50, 92, 3.5))] },
  { id: 'ic-info', n: 'Información', grp: 'icono', fig: [
    S_(C_(50, 70, 34)), C_(50, 70, 34), D_(C_(50, 54, 3.5)), D_(P_('M50 64 L50 88'))] },
  { id: 'ic-papelera', n: 'Papelera', grp: 'icono', fig: [
    M_(R_(22, 44, 56, 8, 2)), M_(R_(40, 34, 20, 10, 2)),
    S_(P_('M28 52 L32 108 L68 108 L72 52 Z')), P_('M28 52 L32 108 L68 108 L72 52 Z'),
    D_(P_('M42 62 L44 98 M58 62 L56 98'))] },
  { id: 'ic-descarga', n: 'Descargar', grp: 'icono', fig: [
    A_(P_('M50 32 L50 84')), A_(P_('M34 68 L50 86 L66 68')), M_(P_('M20 96 L20 110 L80 110 L80 96'))] },
  { id: 'ic-subida', n: 'Subir', grp: 'icono', fig: [
    A_(P_('M50 96 L50 44')), A_(P_('M34 60 L50 42 L66 60')), M_(P_('M20 100 L20 112 L80 112 L80 100'))] },
  { id: 'ic-sincronizar', n: 'Sincronizar', grp: 'icono', fig: [
    A_(P_('M24 70 A26 26 0 0 1 72 56')), A_(P_('M62 52 L74 55 L71 67')),
    A_(P_('M76 70 A26 26 0 0 1 28 84')), A_(P_('M38 88 L26 85 L29 73'))] },
  { id: 'ic-enlace', n: 'Enlace', grp: 'icono', fig: [
    M_(P_('M42 54 L34 46 A16 16 0 0 0 12 68 L20 76')), M_(P_('M58 86 L66 94 A16 16 0 0 0 88 72 L80 64')),
    A_(P_('M36 84 L64 56'))] },
  { id: 'ic-etiqueta', n: 'Etiqueta', grp: 'icono', fig: [
    S_(P_('M14 70 L48 36 L86 36 L86 74 L52 108 Z')), P_('M14 70 L48 36 L86 36 L86 74 L52 108 Z'),
    D_(C_(72, 50, 6))] },
  { id: 'ic-filtro', n: 'Filtro', grp: 'icono', fig: [
    S_(P_('M16 40 L84 40 L58 74 L58 106 L42 98 L42 74 Z')), P_('M16 40 L84 40 L58 74 L58 106 L42 98 L42 74 Z')] },
  { id: 'ic-ajustes', n: 'Ajustes', grp: 'icono', fig: [
    P_('M22 50 L78 50 M22 72 L78 72 M22 94 L78 94'),
    M_(C_(38, 50, 7)), M_(C_(62, 72, 7)), M_(C_(44, 94, 7))] },
  { id: 'ic-casa', n: 'Casa', grp: 'icono', fig: [
    S_(P_('M50 30 L90 64 L82 64 L82 108 L18 108 L18 64 L10 64 Z')),
    P_('M50 30 L90 64 L82 64 L82 108 L18 108 L18 64 L10 64 Z'),
    D_(R_(40, 80, 20, 28, 2))] },
  { id: 'ic-edificio', n: 'Edificio', grp: 'icono', fig: [
    S_(R_(22, 32, 56, 78, 3)), R_(22, 32, 56, 78, 3),
    D_(P_('M32 46 L42 46 M52 46 L62 46 M32 62 L42 62 M52 62 L62 62 M32 78 L42 78 M52 78 L62 78')),
    D_(R_(42, 92, 16, 18, 2))] },
  { id: 'ic-fabrica', n: 'Fábrica', grp: 'icono', fig: [
    S_(P_('M14 108 L14 66 L38 80 L38 66 L62 80 L62 66 L86 80 L86 108 Z')),
    P_('M14 108 L14 66 L38 80 L38 66 L62 80 L62 66 L86 80 L86 108 Z'),
    M_(R_(70, 34, 12, 30, 2)), D_(P_('M28 92 L36 92 M52 92 L60 92 M74 92 L80 92'))] },
  { id: 'ic-universidad', n: 'Universidad', grp: 'icono', fig: [
    S_(P_('M50 32 L92 52 L50 72 L8 52 Z')), P_('M50 32 L92 52 L50 72 L8 52 Z'),
    P_('M24 60 L24 88 Q50 104 76 88 L76 60'), M_(P_('M88 54 L88 84')), M_(C_(88, 88, 4))] },
  { id: 'ic-libro', n: 'Libro', grp: 'icono', fig: [
    S_(P_('M50 46 Q30 34 12 40 L12 100 Q30 94 50 106 Q70 94 88 100 L88 40 Q70 34 50 46 Z')),
    P_('M50 46 Q30 34 12 40 L12 100 Q30 94 50 106 Q70 94 88 100 L88 40 Q70 34 50 46 Z'),
    D_(P_('M50 46 L50 106'))] },
  { id: 'ic-birrete', n: 'Graduación', grp: 'icono', fig: [
    S_(P_('M50 36 L94 56 L50 76 L6 56 Z')), P_('M50 36 L94 56 L50 76 L6 56 Z'),
    P_('M26 64 L26 90 Q50 104 74 90 L74 64'), M_(P_('M90 58 L90 92')), M_(R_(86, 92, 8, 8, 3))] },
  { id: 'ic-lapiz', n: 'Lápiz', grp: 'icono', fig: [
    S_(P_('M22 100 L28 78 L74 32 L88 46 L42 92 Z')), P_('M22 100 L28 78 L74 32 L88 46 L42 92 Z'),
    D_(P_('M68 38 L82 52')), D_(P_('M28 78 L42 92'))] },
  { id: 'ic-regla', n: 'Regla', grp: 'icono', fig: [
    S_(R_(14, 58, 72, 26, 3)), R_(14, 58, 72, 26, 3),
    D_(P_('M26 58 L26 70 M38 58 L38 66 M50 58 L50 70 M62 58 L62 66 M74 58 L74 70'))] },
  { id: 'ic-clip', n: 'Adjunto', grp: 'icono', fig: [
    M_(P_('M70 52 L70 96 A20 20 0 0 1 30 96 L30 46 A12 12 0 0 1 54 46 L54 92 A5 5 0 0 1 44 92 L44 54'))] },
  { id: 'ic-bandera', n: 'Bandera', grp: 'icono', fig: [
    M_(P_('M26 30 L26 112')), S_(P_('M26 36 L80 36 L70 54 L80 72 L26 72 Z')),
    P_('M26 36 L80 36 L70 54 L80 72 L26 72 Z')] },
  { id: 'ic-trofeo', n: 'Trofeo', grp: 'icono', fig: [
    S_(P_('M32 32 L68 32 L68 62 A18 18 0 0 1 32 62 Z')), P_('M32 32 L68 32 L68 62 A18 18 0 0 1 32 62 Z'),
    M_(P_('M32 40 L20 40 A12 12 0 0 0 32 56')), M_(P_('M68 40 L80 40 A12 12 0 0 1 68 56')),
    M_(P_('M50 80 L50 94')), M_(R_(34, 94, 32, 10, 2)), M_(R_(28, 104, 44, 8, 2))] },
  { id: 'ic-cohete', n: 'Cohete', grp: 'icono', fig: [
    S_(P_('M50 24 Q70 46 70 78 L62 92 L38 92 L30 78 Q30 46 50 24 Z')),
    P_('M50 24 Q70 46 70 78 L62 92 L38 92 L30 78 Q30 46 50 24 Z'),
    D_(C_(50, 54, 8)), M_(P_('M30 74 L16 94 L34 88')), M_(P_('M70 74 L84 94 L66 88')),
    A_(P_('M44 96 L44 112 M50 98 L50 118 M56 96 L56 112'))] },
  { id: 'ic-globo', n: 'Mundo', grp: 'icono', fig: [
    C_(50, 70, 34), D_(E_(50, 70, 14, 34)), D_(P_('M18 58 L82 58 M18 82 L82 82')), D_(P_('M50 36 L50 104'))] },
  { id: 'ic-mapa', n: 'Mapa', grp: 'icono', fig: [
    S_(P_('M12 44 L36 34 L64 46 L88 36 L88 100 L64 110 L36 98 L12 108 Z')),
    P_('M12 44 L36 34 L64 46 L88 36 L88 100 L64 110 L36 98 L12 108 Z'),
    D_(P_('M36 34 L36 98 M64 46 L64 110'))] },
  { id: 'ic-brujula', n: 'Brújula', grp: 'icono', fig: [
    C_(50, 70, 34), S_(P_('M66 54 L56 76 L34 86 L44 64 Z')), P_('M66 54 L56 76 L34 86 L44 64 Z'), D_(C_(50, 70, 3))] },
  { id: 'ic-bateria', n: 'Batería', grp: 'icono', fig: [
    S_(R_(16, 52, 62, 36, 5)), R_(16, 52, 62, 36, 5), M_(R_(78, 63, 8, 14, 2)),
    LIQ(R_(22, 58, 34, 24, 2)), D_(R_(22, 58, 34, 24, 2))] },
  { id: 'ic-enchufe', n: 'Energía', grp: 'icono', fig: [
    A_(P_('M54 30 L32 74 L48 74 L44 110 L68 64 L52 64 Z')),
    S_(P_('M54 30 L32 74 L48 74 L44 110 L68 64 L52 64 Z'))] },
  { id: 'ic-sol', n: 'Sol', grp: 'icono', fig: [
    S_(C_(50, 70, 18)), C_(50, 70, 18),
    A_(P_('M50 40 L50 28 M50 100 L50 112 M20 70 L8 70 M80 70 L92 70 M29 49 L20 40 M71 91 L80 100 M71 49 L80 40 M29 91 L20 100'))] },
  { id: 'ic-gota', n: 'Gota', grp: 'icono', fig: [
    S_(P_('M50 30 Q78 66 78 82 A28 28 0 0 1 22 82 Q22 66 50 30 Z')),
    P_('M50 30 Q78 66 78 82 A28 28 0 0 1 22 82 Q22 66 50 30 Z'),
    B_(P_('M36 86 A16 16 0 0 0 44 98'))] },
  { id: 'ic-fuego', n: 'Fuego', grp: 'icono', fig: [
    S_(P_('M50 26 Q76 54 74 80 A24 24 0 0 1 26 80 Q26 62 40 50 Q42 66 52 62 Q58 50 50 26 Z')),
    P_('M50 26 Q76 54 74 80 A24 24 0 0 1 26 80 Q26 62 40 50 Q42 66 52 62 Q58 50 50 26 Z'),
    D_(P_('M50 96 A12 12 0 0 1 42 78 Q52 82 50 96 Z'))] },
  { id: 'ic-hoja', n: 'Sostenible', grp: 'icono', fig: [
    S_(P_('M22 106 Q22 44 84 38 Q86 100 26 102 Z')), P_('M22 106 Q22 44 84 38 Q86 100 26 102 Z'),
    D_(P_('M30 100 Q54 74 78 46'))] },
  { id: 'ic-reciclaje', n: 'Reciclaje', grp: 'icono', fig: [
    A_(P_('M50 34 L64 58 L50 58 Z')), A_(P_('M30 96 L20 72 L34 78 Z')), A_(P_('M76 92 L52 96 L60 84 Z')),
    P_('M56 40 L74 70 L64 76'), P_('M44 40 L26 70 L36 76'), P_('M34 98 L66 98')] },
  { id: 'ic-arbol', n: 'Árbol', grp: 'icono', fig: [
    S_(C_(50, 58, 26)), C_(50, 58, 26), S_(C_(32, 76, 16)), C_(32, 76, 16), S_(C_(68, 76, 16)), C_(68, 76, 16),
    M_(R_(45, 84, 10, 28, 2))] },
  { id: 'ic-rayo', n: 'Rayo', grp: 'icono', fig: [
    A_(P_('M56 28 L30 76 L46 76 L42 112 L70 62 L54 62 Z'))] },
  { id: 'ic-escudo', n: 'Protección', grp: 'icono', fig: [
    S_(P_('M50 28 L82 42 L82 74 Q82 98 50 112 Q18 98 18 74 L18 42 Z')),
    P_('M50 28 L82 42 L82 74 Q82 98 50 112 Q18 98 18 74 L18 42 Z'),
    D_(P_('M36 70 L46 82 L66 58'))] },
  { id: 'ic-llave', n: 'Llave', grp: 'icono', fig: [
    C_(34, 62, 18), C_(34, 62, 7), M_(P_('M47 75 L84 112')), M_(P_('M70 98 L80 88 M78 106 L88 96'))] },
  { id: 'ic-huella', n: 'Identidad', grp: 'icono', fig: [
    P_('M26 82 A24 24 0 0 1 74 82'), P_('M34 90 A16 16 0 0 1 66 90'), P_('M42 98 A8 8 0 0 1 58 98'),
    P_('M18 74 A32 32 0 0 1 82 74'), C_(50, 100, 3)] },
  { id: 'ic-atomo', n: 'Átomo', grp: 'icono', fig: [
    S_(C_(50, 70, 7)), E_(50, 70, 34, 13),
    P_('M31 44 A34 13 60 0 1 69 96'), P_('M69 44 A34 13 120 0 1 31 96')] },
  { id: 'ic-molecula', n: 'Molécula', grp: 'icono', fig: [
    P_('M34 50 L50 74 L34 96 M50 74 L78 62 M50 74 L76 96'),
    S_(C_(34, 50, 9)), C_(34, 50, 9), S_(C_(50, 74, 10)), C_(50, 74, 10),
    S_(C_(34, 96, 8)), C_(34, 96, 8), S_(C_(78, 62, 8)), C_(78, 62, 8), S_(C_(76, 96, 8)), C_(76, 96, 8)] },
  { id: 'ic-cristal', n: 'Celda unitaria', grp: 'icono', fig: [
    P_('M28 52 L28 96 L64 112 L64 68 Z'), P_('M28 52 L58 38 L94 54 L64 68'),
    P_('M94 54 L94 98 L64 112'),
    M_(C_(28, 52, 3.5)), M_(C_(58, 38, 3.5)), M_(C_(94, 54, 3.5)), M_(C_(64, 68, 3.5)),
    M_(C_(28, 96, 3.5)), M_(C_(64, 112, 3.5)), M_(C_(94, 98, 3.5))] },
  { id: 'ic-microscopio', n: 'Análisis', grp: 'icono', fig: [
    M_(P_('M44 106 L44 74 A16 16 0 0 1 62 46')), S_(R_(56, 32, 16, 16, 3)), R_(56, 32, 16, 16, 3),
    M_(R_(26, 70, 30, 8, 2)), S_(P_('M24 112 Q50 102 76 112 Z')), P_('M24 112 Q50 102 76 112 Z'),
    D_(C_(36, 88, 6))] },
  { id: 'ic-muestra', n: 'Muestra', grp: 'icono', fig: [
    V_(P_('M38 32 L38 92 Q38 108 50 108 Q62 108 62 92 L62 32 Z')),
    LIQ(P_('M38.5 76 Q50 80 61.5 76 L61.5 92 Q61.5 107 50 107 Q38.5 107 38.5 92 Z')),
    P_('M38 32 L38 92 Q38 108 50 108 Q62 108 62 92 L62 32'), P_('M32 30 Q50 24 68 30'),
    D_(P_('M38.5 76 Q50 80 61.5 76')), B_(P_('M43 40 L43 84'))] },
  { id: 'ic-balanza', n: 'Equilibrio', grp: 'icono', fig: [
    M_(P_('M50 34 L50 104')), M_(R_(30, 104, 40, 8, 2)), P_('M16 50 L84 50'),
    P_('M16 50 L6 74 A11 11 0 0 0 26 74 Z'), P_('M84 50 L74 74 A11 11 0 0 0 94 74 Z'),
    S_(C_(50, 40, 5))] },
  { id: 'ic-crecimiento', n: 'Crecimiento', grp: 'icono', fig: [
    P_('M18 34 L18 102 L86 102'),
    A_(P_('M26 92 L44 70 L60 80 L82 44')), A_(P_('M70 44 L82 44 L82 56')),
    S_(R_(28, 88, 10, 12, 2)), S_(R_(46, 76, 10, 24, 2)), S_(R_(64, 60, 10, 40, 2))] },
  { id: 'ic-tiempo', n: 'Cronología', grp: 'icono', fig: [
    P_('M12 74 L88 74'), S_(C_(26, 74, 8)), C_(26, 74, 8), S_(C_(50, 74, 8)), C_(50, 74, 8), S_(C_(74, 74, 8)), C_(74, 74, 8),
    D_(P_('M26 52 L26 62 M50 52 L50 62 M74 52 L74 62'))] },
  { id: 'ic-proceso', n: 'Proceso', grp: 'icono', fig: [
    S_(R_(10, 58, 26, 26, 4)), R_(10, 58, 26, 26, 4),
    S_(R_(64, 58, 26, 26, 4)), R_(64, 58, 26, 26, 4),
    A_(P_('M40 71 L60 71')), A_(P_('M53 65 L61 71 L53 77'))] },
  { id: 'ic-red', n: 'Red', grp: 'icono', fig: [
    P_('M50 46 L24 92 M50 46 L76 92 M24 92 L76 92'),
    S_(C_(50, 40, 10)), C_(50, 40, 10), S_(C_(22, 96, 10)), C_(22, 96, 10), S_(C_(78, 96, 10)), C_(78, 96, 10)] },
  { id: 'ic-jerarquia', n: 'Jerarquía', grp: 'icono', fig: [
    S_(R_(38, 32, 24, 18, 3)), R_(38, 32, 24, 18, 3),
    P_('M50 50 L50 62 M20 62 L80 62 M20 62 L20 76 M50 62 L50 76 M80 62 L80 76'),
    S_(R_(8, 76, 24, 18, 3)), R_(8, 76, 24, 18, 3),
    S_(R_(38, 76, 24, 18, 3)), R_(38, 76, 24, 18, 3),
    S_(R_(68, 76, 24, 18, 3)), R_(68, 76, 24, 18, 3)] },
  { id: 'ic-presentacion', n: 'Presentación', grp: 'icono', fig: [
    S_(R_(14, 34, 72, 50, 4)), R_(14, 34, 72, 50, 4),
    M_(P_('M50 84 L50 98')), M_(P_('M34 112 L50 98 L66 112')),
    D_(P_('M26 68 L36 56 L48 64 L68 44'))] },
  { id: 'ic-megafono', n: 'Difusión', grp: 'icono', fig: [
    S_(P_('M18 60 L18 84 L38 84 L74 106 L74 38 L38 60 Z')), P_('M18 60 L18 84 L38 84 L74 106 L74 38 L38 60 Z'),
    A_(P_('M82 60 A18 18 0 0 1 82 84')), A_(P_('M90 50 A30 30 0 0 1 90 94')),
    M_(P_('M28 84 L32 108 L44 108 L40 88'))] },
  { id: 'ic-chat', n: 'Conversación', grp: 'icono', fig: [
    S_(P_('M14 44 L74 44 L74 88 L38 88 L22 102 L22 88 L14 88 Z')),
    P_('M14 44 L74 44 L74 88 L38 88 L22 102 L22 88 L14 88 Z'),
    D_(P_('M26 58 L62 58 M26 72 L52 72'))] },
  { id: 'ic-tiempo-arena', n: 'Reloj de arena', grp: 'icono', fig: [
    M_(R_(26, 30, 48, 7, 2)), M_(R_(26, 104, 48, 7, 2)),
    V_(P_('M32 37 L68 37 L52 70 L68 104 L32 104 L48 70 Z')),
    LIQ(P_('M40 90 L60 90 L64 103 L36 103 Z')),
    P_('M32 37 L68 37 L52 70 L68 104 L32 104 L48 70 Z')] },
  { id: 'ic-medalla', n: 'Reconocimiento', grp: 'icono', fig: [
    M_(P_('M34 26 L46 62 M66 26 L54 62')),
    S_(C_(50, 84, 26)), C_(50, 84, 26), D_(C_(50, 84, 17)),
    D_(P_('M50 74 L53 82 L61 82 L55 87 L57 95 L50 90 L43 95 L45 87 L39 82 L47 82 Z'))] },
  { id: 'ic-nota', n: 'Nota', grp: 'icono', fig: [
    S_(P_('M20 32 L80 32 L80 92 L60 112 L20 112 Z')), P_('M20 32 L80 32 L80 92 L60 112 L20 112 Z'),
    P_('M80 92 L60 92 L60 112'), D_(P_('M32 54 L68 54 M32 68 L68 68 M32 82 L52 82'))] },
  { id: 'ic-buscar-doc', n: 'Revisión', grp: 'icono', fig: [
    S_(P_('M22 28 L58 28 L74 44 L74 84 L22 84 Z')), P_('M22 28 L58 28 L74 44 L74 84 L22 84 Z'),
    D_(P_('M32 50 L60 50 M32 62 L52 62')),
    C_(62, 88, 18), M_(P_('M75 101 L90 116'))] },
  { id: 'ic-dinero', n: 'Costo', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32),
    D_(P_('M50 46 L50 94')), D_(P_('M62 56 A12 10 0 0 0 40 62 Q40 70 50 71 Q60 72 60 80 A12 10 0 0 1 38 84'))] },
  { id: 'ic-tiempo-rapido', n: 'Rapidez', grp: 'icono', fig: [
    A_(P_('M54 30 L34 68 L48 68 L44 110 L66 66 L52 66 Z')),
    P_('M12 48 L30 48 M8 66 L26 66 M14 84 L28 84')] },
  { id: 'ic-piezas', n: 'Encaje', grp: 'icono', fig: [
    S_(P_('M18 40 L54 40 L54 52 A8 8 0 0 1 54 68 L54 80 L18 80 Z')),
    P_('M18 40 L54 40 L54 52 A8 8 0 0 1 54 68 L54 80 L18 80 Z'),
    S_(P_('M58 62 L94 62 L94 102 L58 102 L58 90 A8 8 0 0 0 58 74 Z')),
    P_('M58 62 L94 62 L94 102 L58 102 L58 90 A8 8 0 0 0 58 74 Z')] },
  { id: 'ic-lista', n: 'Lista de tareas', grp: 'icono', fig: [
    S_(R_(20, 34, 60, 76, 4)), R_(20, 34, 60, 76, 4),
    D_(P_('M30 52 L36 58 L46 46 M52 54 L70 54')),
    D_(P_('M30 74 L36 80 L46 68 M52 76 L70 76')),
    D_(P_('M30 96 L36 102 M52 98 L70 98'))] },
  { id: 'ic-candado-abierto', n: 'Acceso abierto', grp: 'icono', fig: [
    S_(R_(24, 66, 52, 42, 6)), R_(24, 66, 52, 42, 6),
    M_(P_('M34 66 L34 52 A16 16 0 0 1 66 52')),
    D_(C_(50, 84, 6)), D_(P_('M50 90 L50 98'))] },
  { id: 'ic-camara', n: 'Imagen', grp: 'icono', fig: [
    S_(R_(12, 48, 76, 52, 5)), R_(12, 48, 76, 52, 5),
    M_(P_('M36 48 L42 38 L58 38 L64 48')), D_(C_(50, 74, 15)), D_(C_(50, 74, 8)), M_(C_(76, 58, 3))] },
  { id: 'ic-video', n: 'Video', grp: 'icono', fig: [
    S_(R_(12, 48, 54, 44, 5)), R_(12, 48, 54, 44, 5),
    S_(P_('M66 62 L88 50 L88 90 L66 78 Z')), P_('M66 62 L88 50 L88 90 L66 78 Z'),
    D_(P_('M28 70 L44 70'))] },
  { id: 'ic-calculadora', n: 'Cálculo', grp: 'icono', fig: [
    S_(R_(22, 30, 56, 82, 5)), R_(22, 30, 56, 82, 5),
    D_(R_(30, 38, 40, 16, 2)),
    D_(C_(36, 66, 3.5)), D_(C_(50, 66, 3.5)), D_(C_(64, 66, 3.5)),
    D_(C_(36, 82, 3.5)), D_(C_(50, 82, 3.5)), D_(C_(64, 82, 3.5)),
    D_(C_(36, 98, 3.5)), D_(C_(50, 98, 3.5)), D_(C_(64, 98, 3.5))] },
  { id: 'ic-termometro', n: 'Temperatura', grp: 'icono', fig: [
    V_(P_('M42 34 A8 8 0 0 1 58 34 L58 82 A14 14 0 1 1 42 82 Z')),
    LIQ(P_('M46 66 L54 66 L54 84 A10 10 0 1 1 46 84 Z')),
    P_('M42 34 A8 8 0 0 1 58 34 L58 82 A14 14 0 1 1 42 82 Z'),
    D_(P_('M58 46 L66 46 M58 56 L64 56 M58 66 L66 66'))] },
  { id: 'ic-alerta-triangulo', n: 'Riesgo', grp: 'icono', fig: [
    S_(P_('M50 30 L90 106 L10 106 Z')), P_('M50 30 L90 106 L10 106 Z'),
    D_(P_('M50 56 L50 80')), D_(C_(50, 92, 4))] },
  { id: 'ic-mano', n: 'Aporte', grp: 'icono', fig: [
    S_(P_('M36 108 L36 66 A6 6 0 0 1 48 66 L48 40 A6 6 0 0 1 60 40 L60 66 L70 66 A8 8 0 0 1 78 74 L78 96 A14 14 0 0 1 64 110 L44 110 Z')),
    P_('M36 108 L36 66 A6 6 0 0 1 48 66 L48 40 A6 6 0 0 1 60 40 L60 66 L70 66 A8 8 0 0 1 78 74 L78 96 A14 14 0 0 1 64 110 L44 110 Z'),
    M_(P_('M28 96 L36 96'))] },
  { id: 'ic-avion', n: 'Viaje', grp: 'icono', fig: [
    S_(P_('M50 26 Q58 42 58 62 L88 82 L88 92 L58 82 L56 100 L68 110 L68 116 L50 110 L32 116 L32 110 L44 100 L42 82 L12 92 L12 82 L42 62 Q42 42 50 26 Z')),
    P_('M50 26 Q58 42 58 62 L88 82 L88 92 L58 82 L56 100 L68 110 L68 116 L50 110 L32 116 L32 110 L44 100 L42 82 L12 92 L12 82 L42 62 Q42 42 50 26 Z')] },
  { id: 'ic-camion', n: 'Envío', grp: 'icono', fig: [
    S_(R_(10, 52, 46, 38, 3)), R_(10, 52, 46, 38, 3),
    S_(P_('M56 62 L76 62 L88 76 L88 90 L56 90 Z')), P_('M56 62 L76 62 L88 76 L88 90 L56 90 Z'),
    M_(C_(28, 96, 9)), M_(C_(74, 96, 9)), D_(C_(28, 96, 3.5)), D_(C_(74, 96, 3.5))] },
  { id: 'ic-mensaje', n: 'Notificación', grp: 'icono', fig: [
    S_(P_('M50 28 A22 22 0 0 1 72 50 Q72 76 82 92 L18 92 Q28 76 28 50 A22 22 0 0 1 50 28 Z')),
    P_('M50 28 A22 22 0 0 1 72 50 Q72 76 82 92 L18 92 Q28 76 28 50 A22 22 0 0 1 50 28 Z'),
    M_(P_('M40 100 A10 10 0 0 0 60 100'))] },
  { id: 'ic-mas', n: 'Añadir', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M50 52 L50 88 M32 70 L68 70'))] },
  { id: 'ic-menos', n: 'Quitar', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M32 70 L68 70'))] },
  { id: 'ic-pausa', n: 'Pausa', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(R_(39, 54, 8, 32, 2)), D_(R_(53, 54, 8, 32, 2))] },
  { id: 'ic-play', n: 'Reproducir', grp: 'icono', fig: [
    S_(C_(50, 70, 32)), C_(50, 70, 32), D_(P_('M42 54 L70 70 L42 86 Z'))] },
  /* ---------- formas y llamadas ----------
     Se usan para señalar una zona de una figura o para poner una frase corta
     dentro. Admiten texto propio (el campo «texto dentro» del editor). */
  { id: 'fo-rect', n: 'Rectángulo', grp: 'forma', txt: 1, fig: [S_(R_(8, 40, 84, 60, 0)), R_(8, 40, 84, 60, 0)] },
  { id: 'fo-rect-r', n: 'Rectángulo suave', grp: 'forma', txt: 1, fig: [S_(R_(8, 40, 84, 60, 10)), R_(8, 40, 84, 60, 10)] },
  { id: 'fo-circulo', n: 'Círculo', grp: 'forma', txt: 1, fig: [S_(C_(50, 70, 40)), C_(50, 70, 40)] },
  { id: 'fo-ovalo', n: 'Óvalo', grp: 'forma', txt: 1, fig: [S_(E_(50, 70, 44, 30)), E_(50, 70, 44, 30)] },
  { id: 'fo-triangulo', n: 'Triángulo', grp: 'forma', txt: 1, fig: [S_(P_('M50 28 L92 108 L8 108 Z')), P_('M50 28 L92 108 L8 108 Z')] },
  { id: 'fo-rombo', n: 'Rombo', grp: 'forma', txt: 1, fig: [S_(P_('M50 26 L92 70 L50 114 L8 70 Z')), P_('M50 26 L92 70 L50 114 L8 70 Z')] },
  { id: 'fo-pentagono', n: 'Pentágono', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 26 L92 57 L76 108 L24 108 L8 57 Z')), P_('M50 26 L92 57 L76 108 L24 108 L8 57 Z')] },
  { id: 'fo-hexagono', n: 'Hexágono', grp: 'forma', txt: 1, fig: [
    S_(P_('M28 32 L72 32 L94 70 L72 108 L28 108 L6 70 Z')), P_('M28 32 L72 32 L94 70 L72 108 L28 108 L6 70 Z')] },
  { id: 'fo-estrella5', n: 'Estrella de cinco', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 24 L62 58 L98 58 L69 79 L80 114 L50 93 L20 114 L31 79 L2 58 L38 58 Z')),
    P_('M50 24 L62 58 L98 58 L69 79 L80 114 L50 93 L20 114 L31 79 L2 58 L38 58 Z')] },
  { id: 'fo-estrella6', n: 'Estrella de seis', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 24 L64 50 L92 50 L78 74 L92 98 L64 98 L50 124 L36 98 L8 98 L22 74 L8 50 L36 50 Z')),
    P_('M50 24 L64 50 L92 50 L78 74 L92 98 L64 98 L50 124 L36 98 L8 98 L22 74 L8 50 L36 50 Z')] },
  { id: 'fo-flecha', n: 'Flecha ancha', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 54 L60 54 L60 34 L96 70 L60 106 L60 86 L4 86 Z')),
    P_('M4 54 L60 54 L60 34 L96 70 L60 106 L60 86 L4 86 Z')] },
  { id: 'fo-flecha-doble', n: 'Flecha doble', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 70 L28 44 L28 58 L72 58 L72 44 L96 70 L72 96 L72 82 L28 82 L28 96 Z')),
    P_('M4 70 L28 44 L28 58 L72 58 L72 44 L96 70 L72 96 L72 82 L28 82 L28 96 Z')] },
  { id: 'fo-flecha-curva', n: 'Flecha curva', grp: 'forma', txt: 0, fig: [
    A_(P_('M12 100 Q12 42 74 42')), A_(P_('M62 30 L78 42 L62 54'))] },
  { id: 'fo-flecha-vuelta', n: 'Flecha de retorno', grp: 'forma', txt: 0, fig: [
    A_(P_('M14 56 Q50 20 86 56 Q50 96 20 74')), A_(P_('M20 62 L18 76 L32 76'))] },
  { id: 'fo-chevron', n: 'Galón', grp: 'forma', txt: 1, fig: [
    S_(P_('M6 40 L64 40 L94 70 L64 100 L6 100 L36 70 Z')), P_('M6 40 L64 40 L94 70 L64 100 L6 100 L36 70 Z')] },
  { id: 'fo-cinta', n: 'Cinta', grp: 'forma', txt: 1, fig: [
    S_(P_('M4 46 L96 46 L96 94 L4 94 Z')), P_('M4 46 L96 46 L96 94 L4 94 Z'),
    M_(P_('M4 46 L4 106 L20 92 L36 106 L36 94')), M_(P_('M96 46 L96 106 L80 92 L64 106 L64 94'))] },
  { id: 'fo-bocadillo', n: 'Bocadillo', grp: 'forma', txt: 1, fig: [
    S_(P_('M8 34 L92 34 L92 92 L44 92 L26 112 L28 92 L8 92 Z')),
    P_('M8 34 L92 34 L92 92 L44 92 L26 112 L28 92 L8 92 Z')] },
  { id: 'fo-bocadillo-r', n: 'Bocadillo redondo', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 32 A42 28 0 0 1 50 88 L34 88 L22 108 L26 87 A42 28 0 0 1 50 32 Z')),
    P_('M50 32 A42 28 0 0 1 50 88 L34 88 L22 108 L26 87 A42 28 0 0 1 50 32 Z')] },
  { id: 'fo-pensamiento', n: 'Nube de pensamiento', grp: 'forma', txt: 1, fig: [
    S_(P_('M28 88 A16 16 0 0 1 30 54 A22 22 0 0 1 70 50 A18 18 0 0 1 72 88 Z')),
    P_('M28 88 A16 16 0 0 1 30 54 A22 22 0 0 1 70 50 A18 18 0 0 1 72 88 Z'),
    S_(C_(30, 98, 6)), C_(30, 98, 6), S_(C_(20, 110, 4)), C_(20, 110, 4)] },
  { id: 'fo-marco', n: 'Marco para señalar', grp: 'forma', txt: 0, fig: [
    A_(P_('M14 40 L14 100 L86 100 L86 40 Z')),
    A_(P_('M14 52 L14 40 L26 40 M74 40 L86 40 L86 52 M86 88 L86 100 L74 100 M26 100 L14 100 L14 88'))] },
  { id: 'fo-marco-esq', n: 'Esquinas de encuadre', grp: 'forma', txt: 0, fig: [
    A_(P_('M10 54 L10 36 L28 36')), A_(P_('M72 36 L90 36 L90 54')),
    A_(P_('M90 86 L90 104 L72 104')), A_(P_('M28 104 L10 104 L10 86'))] },
  { id: 'fo-circulo-senal', n: 'Círculo de señalización', grp: 'forma', txt: 0, fig: [
    A_(C_(50, 70, 36)), A_(P_('M76 96 L94 114'))] },
  { id: 'fo-llave', n: 'Llave', grp: 'forma', txt: 0, fig: [
    P_('M64 30 Q46 30 46 46 L46 62 Q46 70 34 70 Q46 70 46 78 L46 94 Q46 110 64 110')] },
  { id: 'fo-corchete', n: 'Corchete', grp: 'forma', txt: 0, fig: [P_('M64 30 L44 30 L44 110 L64 110')] },
  { id: 'fo-parentesis', n: 'Paréntesis', grp: 'forma', txt: 0, fig: [
    P_('M62 30 Q40 70 62 110'), P_('M84 30 Q62 70 84 110')] },
  { id: 'fo-cruz', n: 'Cruz', grp: 'forma', txt: 0, fig: [
    S_(P_('M38 30 L62 30 L62 58 L90 58 L90 82 L62 82 L62 110 L38 110 L38 82 L10 82 L10 58 L38 58 Z')),
    P_('M38 30 L62 30 L62 58 L90 58 L90 82 L62 82 L62 110 L38 110 L38 82 L10 82 L10 58 L38 58 Z')] },
  { id: 'fo-explosion', n: 'Explosión', grp: 'forma', txt: 1, fig: [
    S_(P_('M50 22 L58 46 L78 32 L72 56 L96 58 L76 72 L94 90 L70 88 L72 112 L54 96 L44 118 L38 94 L16 104 L24 82 L4 74 L26 62 L12 42 L36 46 Z')),
    P_('M50 22 L58 46 L78 32 L72 56 L96 58 L76 72 L94 90 L70 88 L72 112 L54 96 L44 118 L38 94 L16 104 L24 82 L4 74 L26 62 L12 42 L36 46 Z')] },
  { id: 'fo-banda', n: 'Banda con título', grp: 'forma', txt: 1, fig: [
    S_(R_(2, 54, 96, 32, 0)), R_(2, 54, 96, 32, 0),
    A_(P_('M2 54 L98 54')), A_(P_('M2 86 L98 86'))] },
  { id: 'fo-nota-adhesiva', n: 'Nota adhesiva', grp: 'forma', txt: 1, fig: [
    S_(P_('M12 36 L88 36 L88 88 L66 110 L12 110 Z')), P_('M12 36 L88 36 L88 88 L66 110 L12 110 Z'),
    D_(P_('M88 88 L66 88 L66 110'))] },
  { id: 'fo-numero', n: 'Número en círculo', grp: 'forma', txt: 1, fig: [
    S_(C_(50, 70, 26)), C_(50, 70, 26)] }
];
const LABK = {}; LAB.forEach(x => LABK[x.id] = x);
const LAB_GRUPOS = { vidrio: 'Vidrio', montaje: 'Montaje y calor', equipo: 'Equipo', bio: 'Biología', circuito: 'Circuitos', fisica: 'Óptica y mecánica', icono: 'Iconos', forma: 'Formas y llamadas' };
/* Las formas admiten una frase corta dentro; las demás piezas, no. */
const formaConTexto = k => !!(LABK[k] && LABK[k].txt);
