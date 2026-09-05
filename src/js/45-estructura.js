/* ==== 45-estructura.js ==== */
'use strict';
/* ================= estructuras químicas 2D, al modo ChemDraw =================
   Átomos y enlaces sobre una rejilla hexagonal: ángulos de 30°, longitud de
   enlace constante y carbonos implícitos, que es como se dibuja de verdad.
   Sale como SVG en pantalla y como TikZ exacto en el código Beamer. */

const EN_L = 40;                 // longitud de enlace, en unidades del dibujo
const VALENCIA = { C: 4, N: 3, O: 2, S: 2, P: 3, B: 3, F: 1, Cl: 1, Br: 1, I: 1, H: 1, Si: 4, Se: 2, Te: 2 };
/* Cómo mueve la carga a la valencia. No es un signo suelto: depende de la
   columna. Un catión con pares libres gana un enlace —el N⁺ del amonio tiene
   cuatro— y el anión lo pierde —el O⁻ de un alcóxido no lleva hidrógeno—.
   En el grupo del boro pasa justo al revés, porque le faltan electrones: el
   BH₄⁻ tiene cuatro enlaces. Y en el del carbono se pierde uno en los dos
   sentidos, porque queda un hueco (CH₃⁺) o un par sin compartir (CH₃⁻). */
const CARGA_VAL = {
  N: 1, P: 1, As: 1, Sb: 1, O: 1, S: 1, Se: 1, Te: 1, F: 1, Cl: 1, Br: 1, I: 1,
  B: -1, Al: -1, Ga: -1, In: -1,
  C: 0, Si: 0, Ge: 0, Sn: 0, H: 0
};
const ELEM_RAPIDOS = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'Si', 'H', 'B'];
/* El color de cada elemento, en sus dos versiones. Los tonos de siempre están
   pensados para papel blanco: sobre un tema nocturno el azul del N se quedaba
   en 2,6 de contraste y el morado del I en 1,9, o sea ilegibles a diez metros.
   La versión clara mantiene el mismo matiz subido de luz, y así el N sigue
   siendo azul y el O rojo, que es lo que el ojo del químico busca. */
const COLOR_ELEM = { N: '#2b58c4', O: '#c0392b', S: '#9a7d08', P: '#c1620b', F: '#1e8449', Cl: '#1e8449', Br: '#8e4b10', I: '#6c3483' };
const COLOR_ELEM_OSCURO = { N: '#8fb0f7', O: '#f58c7a', S: '#e3c24a', P: '#f0a45e', F: '#62cb93', Cl: '#62cb93', Br: '#d89a6a', I: '#c69be0' };
/* ¿Está el editor en oscuro? Con «auto» manda el sistema. */
function editorOscuro() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/* ---------- estilos de revista ----------
   La misma molécula se dibuja distinta según dónde se publique: cada editorial
   fija el grosor del trazo, la anchura de la cuña, el paso de las rayas, la
   separación del doble y el cuerpo del rótulo. Las cifras van en unidades del
   dibujo, donde el enlace mide 40, y salen de dividir la guía de estilo (en
   puntos) entre su longitud de enlace. Las cinco editoriales piden Arial o
   Helvetica para los rótulos; solo «Diapositiva» hereda la letra del tema. */
const ESTILOS_REVISTA = [
  { id: 'diapo',  n: 'Diapositiva', enlace: 40, grosor: 2.20, cuna: 12.0, paso: 6.7, doble: 0.16, triple: 5.0, recorte: 13.0, cuerpo: 19.0, fam: 'inherit', tex: 'rm' },
  { id: 'acs',    n: 'ACS',         enlace: 40, grosor: 1.67, cuna: 5.6,  paso: 6.9, doble: 0.18, triple: 5.6, recorte: 4.4,  cuerpo: 27.8, fam: 'Arial, Helvetica, sans-serif', tex: 'sf' },
  { id: 'nature', n: 'Nature',      enlace: 40, grosor: 2.22, cuna: 5.8,  paso: 6.3, doble: 0.18, triple: 5.6, recorte: 4.4,  cuerpo: 22.2, fam: 'Arial, Helvetica, sans-serif', tex: 'sf' },
  { id: 'rsc',    n: 'RSC',         enlace: 40, grosor: 1.64, cuna: 5.2,  paso: 5.9, doble: 0.20, triple: 6.2, recorte: 4.4,  cuerpo: 23.0, fam: 'Arial, Helvetica, sans-serif', tex: 'sf' },
  { id: 'cell',   n: 'Cell',        enlace: 40, grosor: 1.35, cuna: 4.5,  paso: 5.8, doble: 0.20, triple: 6.2, recorte: 4.4,  cuerpo: 22.0, fam: 'Arial, Helvetica, sans-serif', tex: 'sf' },
  { id: 'wiley',  n: 'Wiley',       enlace: 40, grosor: 2.00, cuna: 5.6,  paso: 6.0, doble: 0.18, triple: 5.6, recorte: 4.4,  cuerpo: 27.8, fam: 'Helvetica, Arial, sans-serif', tex: 'sf' }
];
/* El estilo viaja dentro de la estructura, para que el lienzo lo vea igual
   que la diapositiva. Si no hay ninguno, el de proyectar. */
const estiloEstructura = e => ESTILOS_REVISTA.find(x => x.id === (e && e.estilo)) || ESTILOS_REVISTA[0];

function estructuraVacia() {
  return { atomos: [], enlaces: [], estilo: 'diapo' };
}
const atomoPorId = (e, id) => e.atomos.find(a => a.id === id);
const enlaceEntre = (e, a, b) => e.enlaces.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));

/* Valencia una vez contada la carga. Devuelve null para un metal o para
   cualquier elemento fuera de la tabla: ahí no sabemos contar y es mejor
   callarse que inventar hidrógenos o avisos. */
function valenciaEfectiva(a) {
  const v = VALENCIA[a.el];
  if (v == null) return null;
  const q = a.carga || 0;
  if (!q) return v;
  const s = CARGA_VAL[a.el];
  if (s == null) return v;
  return Math.max(0, s === 0 ? v - Math.abs(q) : v + s * q);
}
/* Suma de órdenes de los enlaces que llegan a un átomo. */
function ordenEnAtomo(e, a) {
  let usados = 0;
  e.enlaces.forEach(en => { if (en.a === a.id || en.b === a.id) usados += (en.orden || 1); });
  return usados;
}
/* Cuántos hidrógenos se sobreentienden en un átomo. */
function hImplicitos(e, a) {
  if (a.h != null) return a.h;
  const v = valenciaEfectiva(a);
  if (v == null) return 0;
  return Math.max(0, v - ordenEnAtomo(e, a));
}
/* Un átomo cargado con más enlaces de los que puede sostener. Solo se mira en
   los elementos con valencia conocida, nunca en un metal ni en algo escrito a
   mano en la casilla «Otro…», que darían falsos positivos a cada paso. */
function excesoValencia(e, a) {
  const v = valenciaEfectiva(a);
  if (v == null) return false;
  return ordenEnAtomo(e, a) + (a.h != null ? a.h : 0) > v;
}
const esCarbonoImplicito = (e, a) => a.el === 'C' && !a.carga && e.enlaces.some(en => en.a === a.id || en.b === a.id);

/* ---------- geometría ---------- */
function nuevoAtomo(e, x, y, el) {
  const a = { id: uid(), x, y, el: el || 'C', carga: 0 };
  e.atomos.push(a);
  return a;
}
function unir(e, a, b, orden, tipo) {
  if (a === b) return null;
  const ya = enlaceEntre(e, a, b);
  if (ya) { ya.orden = orden || 1; ya.tipo = tipo || 'normal'; return ya; }
  const en = { id: uid(), a, b, orden: orden || 1, tipo: tipo || 'normal' };
  e.enlaces.push(en);
  return en;
}
function borraAtomo(e, id) {
  e.atomos = e.atomos.filter(a => a.id !== id);
  e.enlaces = e.enlaces.filter(en => en.a !== id && en.b !== id);
}
/* Ángulo libre más natural para colgar un enlace nuevo. */
function anguloLibre(e, a) {
  const vecinos = [];
  e.enlaces.forEach(en => {
    const otro = en.a === a.id ? atomoPorId(e, en.b) : en.b === a.id ? atomoPorId(e, en.a) : null;
    if (otro) vecinos.push(Math.atan2(otro.y - a.y, otro.x - a.x));
  });
  if (!vecinos.length) return -Math.PI / 6;
  if (vecinos.length === 1) return vecinos[0] + 2 * Math.PI / 3;
  /* Con dos o más, el hueco angular más ancho. */
  const ord = vecinos.slice().sort((p, q) => p - q);
  let mejor = ord[0] + Math.PI, hueco = -1;
  for (let i = 0; i < ord.length; i++) {
    const a1 = ord[i], a2 = ord[(i + 1) % ord.length] + (i === ord.length - 1 ? 2 * Math.PI : 0);
    const d = a2 - a1;
    if (d > hueco) { hueco = d; mejor = a1 + d / 2; }
  }
  return mejor;
}
const ajustaAngulo = ang => Math.round(ang / (Math.PI / 6)) * (Math.PI / 6);
/* Vecinos de un átomo, saltándose uno. */
function vecinosDe(e, a, salvo) {
  const v = [];
  e.enlaces.forEach(en => {
    const otro = en.a === a.id ? atomoPorId(e, en.b) : en.b === a.id ? atomoPorId(e, en.a) : null;
    if (otro && otro.id !== salvo) v.push(otro);
  });
  return v;
}

/* ---------- anillos ---------- */
const ANILLOS = [
  { id: 'benceno', n: 'Benceno', lados: 6, aromatico: true },
  { id: 'ciclohexano', n: 'Ciclohexano', lados: 6 },
  { id: 'ciclopentano', n: 'Ciclopentano', lados: 5 },
  { id: 'ciclobutano', n: 'Ciclobutano', lados: 4 },
  { id: 'ciclopropano', n: 'Ciclopropano', lados: 3 },
  { id: 'piridina', n: 'Piridina', lados: 6, aromatico: true, hetero: { 0: 'N' } },
  { id: 'furano', n: 'Furano', lados: 5, aromatico: true, hetero: { 0: 'O' } },
  { id: 'naftaleno', n: 'Naftaleno', lados: 6, aromatico: true, fusion: true }
];
/* Los vértices que le faltan a un anillo regular apoyado en un enlace: se gira
   desde a1 alrededor del centro, en el sentido que marca el propio enlace. */
function verticesAnillo(c, a1, a2, n) {
  const R = Math.hypot(a1.x - c.x, a1.y - c.y);
  const ang1 = Math.atan2(a1.y - c.y, a1.x - c.x);
  const ang2 = Math.atan2(a2.y - c.y, a2.x - c.x);
  let paso = (ang2 - ang1); while (paso > Math.PI) paso -= 2 * Math.PI; while (paso < -Math.PI) paso += 2 * Math.PI;
  const dir = paso > 0 ? 1 : -1;
  const pts = [];
  for (let k = 2; k < n; k++) {
    const ang = ang1 + dir * k * (2 * Math.PI / n);
    pts.push({ x: c.x + R * Math.cos(ang), y: c.y + R * Math.sin(ang) });
  }
  return pts;
}
/* Coloca un anillo suelto o fusionado al enlace marcado. */
function ponAnillo(e, def, cx, cy, enlaceBase) {
  const n = def.lados;
  const R = EN_L / (2 * Math.sin(Math.PI / n));
  const nuevos = [];
  if (enlaceBase) {
    const a1 = atomoPorId(e, enlaceBase.a), a2 = atomoPorId(e, enlaceBase.b);
    const mx = (a1.x + a2.x) / 2, my = (a1.y + a2.y) / 2;
    const dx = a2.x - a1.x, dy = a2.y - a1.y;
    const len = Math.hypot(dx, dy) || 1;
    /* Centro del anillo al otro lado del enlace, según la apotema. */
    const ap = Math.sqrt(Math.max(0.0001, R * R - (len / 2) * (len / 2)));
    const nx = -dy / len, ny = dx / len;
    /* De los dos lados del enlace, el que no machaque lo que ya hay dibujado.
       Preguntar si el centro está ocupado no vale, porque el hueco de un anillo
       siempre está vacío: hay que mirar dónde caerían los vértices. Sin esto el
       segundo anillo del naftaleno salía justo encima del primero. */
    const lado = s => {
      const c = { x: mx + nx * ap * s, y: my + ny * ap * s };
      const pts = verticesAnillo(c, a1, a2, n);
      return { pts, choques: pts.filter(p => e.atomos.some(a =>
        a !== a1 && a !== a2 && Math.hypot(a.x - p.x, a.y - p.y) < EN_L * 0.5)).length };
    };
    const izq = lado(1), der = lado(-1);
    const seq = [a1.id, a2.id];
    (der.choques < izq.choques ? der : izq).pts.forEach(p => {
      /* Si en ese vértice ya hay un átomo se aprovecha: así los anillos se
         fusionan de verdad —antraceno, esteroides— en vez de amontonarse. */
      const ya = e.atomos.find(a => Math.hypot(a.x - p.x, a.y - p.y) < EN_L * 0.35);
      const a = ya || nuevoAtomo(e, p.x, p.y, 'C');
      if (!ya) nuevos.push(a);
      seq.push(a.id);
    });
    for (let k = 0; k < n; k++) unir(e, seq[k], seq[(k + 1) % n], 1);
    if (def.aromatico) marcaAromatico(e, seq);
    return nuevos;
  }
  const seq = [];
  for (let k = 0; k < n; k++) {
    const ang = -Math.PI / 2 + k * (2 * Math.PI / n);
    const el = def.hetero && def.hetero[k] ? def.hetero[k] : 'C';
    const a = nuevoAtomo(e, cx + R * Math.cos(ang), cy + R * Math.sin(ang), el);
    nuevos.push(a); seq.push(a.id);
  }
  for (let k = 0; k < n; k++) unir(e, seq[k], seq[(k + 1) % n], 1);
  if (def.aromatico) marcaAromatico(e, seq);
  if (def.fusion) {   /* naftaleno: un segundo anillo fusionado */
    const en = enlaceEntre(e, seq[1], seq[2]);
    if (en) ponAnillo(e, { lados: 6, aromatico: true }, 0, 0, en);
  }
  return nuevos;
}
/* Kekulé alterno, que es como se dibuja un aromático en un artículo.
   No vale ir de dos en dos por la secuencia: en un anillo de cinco sobra un
   átomo —y el que sobra es el heteroátomo, que presta su par al sexteto en vez
   de compartir un doble— y en una fusión los dos carbonos comunes ya traen el
   suyo del anillo anterior. Se prueban todos los emparejamientos del ciclo, que
   son pocos, y gana el que más dobles pone; a igualdad, el que deja libre al
   heteroátomo. Así salen bien benceno, piridina, furano y naftaleno con la
   misma regla. */
function marcaAromatico(e, seq) {
  const n = seq.length;
  if (n < 4 || n > 12) return;
  const at = seq.map(id => atomoPorId(e, id));
  if (at.some(a => !a)) return;
  /* Un átomo admite el doble si no arrastra ya otro y le queda valencia. */
  const admite = at.map(a => {
    if (e.enlaces.some(x => (x.a === a.id || x.b === a.id) && (x.orden || 1) > 1)) return false;
    const v = valenciaEfectiva(a);
    return v != null && v - ordenEnAtomo(e, a) >= 1;
  });
  const lados = [];
  for (let k = 0; k < n; k++) lados.push(enlaceEntre(e, seq[k], seq[(k + 1) % n]) || null);
  let mejor = null, punt = -1;
  for (let m = 0; m < (1 << n); m++) {
    let ok = true, dobles = 0, tomados = 0;
    for (let k = 0; k < n; k++) {
      if (!(m & (1 << k))) continue;
      const j = (k + 1) % n;
      if (!lados[k] || !admite[k] || !admite[j] || (tomados & (1 << k)) || (tomados & (1 << j))) { ok = false; break; }
      tomados |= (1 << k) | (1 << j); dobles++;
    }
    if (!ok) continue;
    let sueltos = 0;
    for (let k = 0; k < n; k++) if (at[k].el !== 'C' && !(tomados & (1 << k))) sueltos++;
    const p = dobles * 10 + sueltos;
    if (p > punt) { punt = p; mejor = m; }
  }
  if (mejor == null) return;
  for (let k = 0; k < n; k++) if (mejor & (1 << k)) lados[k].orden = 2;
}

/* ---------- cadena en zigzag ---------- */
function ponCadena(e, n, x0, y0, desde) {
  let prev = desde || nuevoAtomo(e, x0, y0, 'C');
  let ang = desde ? ajustaAngulo(anguloLibre(e, prev)) : -Math.PI / 6;
  const hechos = [prev];
  for (let k = 1; k < n; k++) {
    const a = nuevoAtomo(e, prev.x + EN_L * Math.cos(ang), prev.y + EN_L * Math.sin(ang), 'C');
    unir(e, prev.id, a.id, 1);
    prev = a; hechos.push(a);
    ang = -ang;                        // zigzag
  }
  return hechos;
}

/* ---------- dibujo ---------- */
function cajaEstructura(e, margen) {
  const m = margen == null ? 34 : margen;
  if (!e.atomos.length) return { x: 0, y: 0, w: 200, h: 140 };
  const xs = e.atomos.map(a => a.x), ys = e.atomos.map(a => a.y);
  const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m;
  const y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
  return { x: x0, y: y0, w: Math.max(60, x1 - x0), h: Math.max(50, y1 - y0) };
}
/* Etiqueta que se pinta en un átomo, con sus hidrógenos y su carga. */
function etiquetaAtomo(e, a) {
  if (esCarbonoImplicito(e, a)) return null;
  const nh = hImplicitos(e, a);
  const carga = a.carga ? (Math.abs(a.carga) > 1 ? Math.abs(a.carga) : '') + (a.carga > 0 ? '+' : '−') : '';
  return { el: a.el, nh, carga };
}
/* Subíndices para cualquier número, no solo del 1 al 6. */
const SUB_DIG = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const subN = n => n === 1 ? '' : String(n).split('').map(c => SUB_DIG[+c] || c).join('');

/* ---------- trazos de un enlace, comunes al SVG y al TikZ ----------
   Un doble no son dos rectas simétricas respecto al eje: la principal va sobre
   el eje y la segunda se desplaza hacia donde se acumulan los vecinos —el
   interior del anillo— y se recorta por los dos extremos contra la bisectriz de
   cada vértice. Solo cuando no hay lado preferido —los dos extremos terminales, un
   carbonilo, un doble trans— vuelven a dibujarse simétricas. Lo calcula una
   sola función para que la pantalla y el PDF no puedan discrepar. */
function ladoDoble(e, a, c, px, py) {
  let s = 0;
  [[a, c.id], [c, a.id]].forEach(par => {
    vecinosDe(e, par[0], par[1]).forEach(o => {
      const d = Math.hypot(o.x - par[0].x, o.y - par[0].y) || 1;
      s += ((o.x - par[0].x) * px + (o.y - par[0].y) * py) / d;
    });
  });
  return Math.abs(s) < 0.25 ? 0 : (s > 0 ? 1 : -1);
}
/* Cuánto se recorta la recta desplazada por un extremo: hasta la bisectriz del
   ángulo que el enlace forma con el vecino de ese mismo lado, que es donde se
   encuentra con la recta desplazada del enlace de al lado. En un hexágono deja
   el hueco justo en cada vértice; sin vecinos por ese lado no recorta nada. */
function recorteDoble(e, o, salvo, ux, uy, qx, qy, sep, L, ya) {
  let t = 0;
  vecinosDe(e, o, salvo).forEach(v => {
    const d = Math.hypot(v.x - o.x, v.y - o.y) || 1;
    const wx = (v.x - o.x) / d, wy = (v.y - o.y) / d;
    const bx = ux + wx, by = uy + wy, bl = Math.hypot(bx, by);
    if (bl < 1e-6) return;                       // vecino en la misma recta
    const lat = (bx * qx + by * qy) / bl;
    if (lat < 1e-6) return;                      // vecino del otro lado
    const tt = Math.min(sep * ((bx * ux + by * uy) / bl) / lat, L * 0.45);
    if (tt > t) t = tt;
  });
  return Math.max(0, t - ya);
}
function trazosEnlace(e, en, m) {
  const a = atomoPorId(e, en.a), c = atomoPorId(e, en.b);
  if (!a || !c) return null;
  const dx = c.x - a.x, dy = c.y - a.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, px = -uy, py = ux;
  /* recorte junto a los átomos con etiqueta, para que no la toque la línea */
  const r1 = etiquetaAtomo(e, a) ? m.recorte : 0, r2 = etiquetaAtomo(e, c) ? m.recorte : 0;
  const x1 = a.x + ux * r1, y1 = a.y + uy * r1, x2 = c.x - ux * r2, y2 = c.y - uy * r2;
  const seg = (off, d1, d2) => ({
    x1: x1 + px * off + ux * (d1 || 0), y1: y1 + py * off + uy * (d1 || 0),
    x2: x2 + px * off - ux * (d2 || 0), y2: y2 + py * off - uy * (d2 || 0)
  });
  if (en.tipo === 'cuna') {
    const w = m.cuna / 2;
    return { tipo: 'cuna', grosor: m.grosor,
      relleno: [[x1, y1], [x2 + px * w, y2 + py * w], [x2 - px * w, y2 - py * w]] };
  }
  if (en.tipo === 'raya') {
    /* El escalonado de rayas perpendiculares, cada vez más largas. */
    const n = Math.max(3, Math.round(L / m.paso)), w = m.cuna / 2, lineas = [];
    for (let k = 1; k <= n; k++) {
      const t = k / n, ww = w * t;
      const bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t;
      lineas.push({ x1: bx + px * ww, y1: by + py * ww, x2: bx - px * ww, y2: by - py * ww });
    }
    return { tipo: 'raya', grosor: m.grosor * 0.77, lineas };
  }
  if (en.orden === 3) return { tipo: 'linea', grosor: m.grosor, lineas: [seg(0), seg(m.triple), seg(-m.triple)] };
  if (en.orden !== 2) return { tipo: 'linea', grosor: m.grosor, lineas: [seg(0)] };
  const sep = m.doble * m.enlace;
  const lado = ladoDoble(e, a, c, px, py);
  if (!lado) return { tipo: 'linea', grosor: m.grosor, lineas: [seg(sep / 2), seg(-sep / 2)] };
  const qx = px * lado, qy = py * lado;
  const d1 = recorteDoble(e, a, c.id, ux, uy, qx, qy, sep, L, r1);
  const d2 = recorteDoble(e, c, a.id, -ux, -uy, qx, qy, sep, L, r2);
  return { tipo: 'linea', grosor: m.grosor, lineas: [seg(0), seg(sep * lado, d1, d2)] };
}

/* `enEditor` distingue el lienzo de dibujo de la diapositiva: allí se avisa de
   las valencias imposibles y el fondo es el de la app, no el del tema. */
function svgEstructura(b, deck, colorTinta, enEditor) {
  const e = b.est || estructuraVacia();
  const m = estiloEstructura(e);
  const caja = cajaEstructura(e);
  const tinta = colorTinta || 'currentColor';
  const oscuro = enEditor ? editorOscuro() : !!(temaDe(deck) || {}).dark;
  const paleta = oscuro ? COLOR_ELEM_OSCURO : COLOR_ELEM;
  const g = sv('g');
  /* Aviso de valencia imposible: un halo tenue, por debajo de todo. Toma el
     rojo del tema —en oscuro, el bermellón de catálogo se apagaba— y no pasa
     de dos quintos del enlace, para no tapar a los vecinos con los rótulos
     grandes de las revistas. */
  if (enEditor) e.atomos.forEach(a => {
    if (!excesoValencia(e, a)) return;
    g.append(sv('circle', { cx: a.x, cy: a.y, r: Math.min(m.cuerpo * 0.9, EN_L * 0.4).toFixed(1),
      class: 'est-aviso', fill: 'var(--danger, #c0392b)', opacity: .18 }));
  });
  /* enlaces */
  e.enlaces.forEach(en => {
    const tz = trazosEnlace(e, en, m);
    if (!tz) return;
    if (tz.relleno) {
      g.append(sv('path', { d: 'M ' + tz.relleno.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L ') + ' Z', fill: tinta }));
      return;
    }
    tz.lineas.forEach(l => g.append(sv('line', {
      x1: l.x1.toFixed(2), y1: l.y1.toFixed(2), x2: l.x2.toFixed(2), y2: l.y2.toFixed(2),
      stroke: tinta, 'stroke-width': tz.grosor.toFixed(2), 'stroke-linecap': 'round'
    })));
  });
  /* átomos */
  e.atomos.forEach(a => {
    const et = etiquetaAtomo(e, a);
    if (!et) return;
    /* los hidrógenos van al lado contrario de donde salen los enlaces */
    let sx = 0;
    vecinosDe(e, a).forEach(o => { sx += o.x - a.x; });
    const hDer = sx <= 0;
    const txt = et.el + (et.nh ? 'H' + subN(et.nh) : '');
    const completo = hDer ? txt : (et.nh ? 'H' + subN(et.nh) + et.el : txt);
    const col = paleta[et.el] || tinta;
    g.append(sv('circle', { cx: a.x, cy: a.y, r: (m.cuerpo * 0.66).toFixed(1), fill: 'var(--sbg, #fff)', opacity: .96 }));
    const t = sv('text', { x: a.x, y: a.y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': m.cuerpo, 'font-family': m.fam, fill: col });
    t.textContent = completo;
    /* La carga va volada y más menuda, como en el papel: el TikZ ya la escribía
       así y la pantalla la ponía a tamaño de elemento, en la misma línea. */
    if (et.carga) {
      const vol = sv('tspan', { dy: (-m.cuerpo * 0.36).toFixed(1), 'font-size': (m.cuerpo * 0.7).toFixed(1) });
      vol.textContent = et.carga;
      t.append(vol);
    }
    g.append(t);
  });
  const svg = sv('svg', {
    viewBox: `${caja.x.toFixed(1)} ${caja.y.toFixed(1)} ${caja.w.toFixed(1)} ${caja.h.toFixed(1)}`,
    class: 'est-svg', preserveAspectRatio: 'xMidYMid meet'
  });
  svg.append(g);
  return svg;
}

function renderEstructura(b, deck, mode) {
  const wrap = h('div', { class: 'est-wrap', style: `width:${b.w || 60}%` });
  const e = b.est || estructuraVacia();
  if (!e.atomos.length) {
    wrap.append(h('div', { class: 'est-vacia' }, mode === 'edit' ? 'Estructura vacía · usa ⬡ en la barra del bloque para dibujarla' : ' '));
    return wrap;
  }
  const caja = cajaEstructura(e);
  const svg = svgEstructura(b, deck);
  svg.setAttribute('style', `aspect-ratio:${(caja.w / caja.h).toFixed(3)}`);
  wrap.append(svg);
  return wrap;
}

/* ---------- exportación a TikZ ----------
   Coordenadas exactas: lo que se ve es lo que se compila. Las rectas, la cuña y
   el escalonado de rayas vienen ya calculados de `trazosEnlace`, así que el PDF
   no puede salir distinto de la pantalla. */
function estructuraTikz(b, p) {
  const e = b.est || estructuraVacia();
  if (!e.atomos.length) return p + '% (estructura vacía)';
  const m = estiloEstructura(e);
  const caja = cajaEstructura(e, 30);
  const k = 0.026;   /* del dibujo a centímetros */
  const PT = 28.4527;  /* puntos por centímetro, para grosores y cuerpos */
  const X = v => ((v - caja.x - caja.w / 2) * k).toFixed(3);
  const Y = v => (-(v - caja.y - caja.h / 2) * k).toFixed(3);
  const gr = v => (v * k * PT).toFixed(2);
  const L = [];
  L.push(p + `\\begin{tikzpicture}[x=1cm, y=1cm, line width=${gr(m.grosor)}pt, line cap=round, line join=round]`);
  e.enlaces.forEach(en => {
    const tz = trazosEnlace(e, en, m);
    if (!tz) return;
    if (tz.relleno) {
      L.push(p + '  \\fill ' + tz.relleno.map(q => `(${X(q[0])},${Y(q[1])})`).join(' -- ') + ' -- cycle;');
      return;
    }
    const opt = tz.grosor === m.grosor ? '' : `[line width=${gr(tz.grosor)}pt]`;
    tz.lineas.forEach(l => L.push(p + `  \\draw${opt} (${X(l.x1)},${Y(l.y1)}) -- (${X(l.x2)},${Y(l.y2)});`));
  });
  e.atomos.forEach(a => {
    const et = etiquetaAtomo(e, a);
    if (!et) return;
    let sx = 0;
    vecinosDe(e, a).forEach(o => { sx += o.x - a.x; });
    const hDer = sx <= 0;
    let cuerpo = et.el + (et.nh ? 'H' + (et.nh > 1 ? '_{' + et.nh + '}' : '') : '');
    if (!hDer && et.nh) cuerpo = 'H' + (et.nh > 1 ? '_{' + et.nh + '}' : '') + et.el;
    if (et.carga) cuerpo += '^{' + (Math.abs(a.carga) > 1 ? Math.abs(a.carga) : '') + (a.carga > 0 ? '+' : '-') + '}';
    /* Las editoriales piden Arial o Helvetica: en LaTeX, la sans del tema. */
    const mate = m.tex === 'sf' ? 'mathsf' : 'mathrm';
    const fs = +gr(m.cuerpo);
    L.push(p + `  \\node[fill=white, inner sep=1pt, font=\\fontsize{${fs.toFixed(1)}}{${(fs * 1.2).toFixed(1)}}\\selectfont] at (${X(a.x)},${Y(a.y)}) {$\\${mate}{${cuerpo}}$};`);
  });
  L.push(p + '\\end{tikzpicture}');
  return L.join('\n');
}
