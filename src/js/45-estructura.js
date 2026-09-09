/* ==== 45-estructura.js ==== */
'use strict';
/* ================= estructuras químicas 2D, al modo ChemDraw =================
   Átomos y enlaces sobre una rejilla hexagonal: ángulos de 30°, longitud de
   enlace constante y carbonos implícitos, que es como se dibuja de verdad.
   Aquí vive solo el modelo —qué átomos hay, cómo se unen, cuántos hidrógenos
   se sobreentienden y dónde cae cada vértice—, sin una sola decisión de
   apariencia: cómo se ve eso en pantalla y en el PDF es cosa de
   45b-estructura-dibujo.js, y la interfaz para dibujarlo, de 46. */

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
