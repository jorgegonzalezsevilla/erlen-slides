/* ==== 15-smart.js ==== */
'use strict';
/* ================= SmartArt: diagramas vectoriales =================
   Cada tipo calcula una disposición en un lienzo de 1000 unidades de ancho.
   De esa misma disposición salen el SVG de la pantalla, el PDF y el TikZ. */

const SMART_KINDS = [
  { id:'proceso',    n:'Proceso',      d:'Etapas encadenadas con punta de flecha. Para una metodología o una ruta de síntesis.', min:2, max:6, def:4 },
  { id:'flujo',      n:'Flujo',        d:'Un tronco de nodos con su recuento y las bajas saliendo por el lado con su motivo. Para CONSORT, PRISMA o una criba de muestras.', min:3, max:14, def:6, ph:'Recuento, p. ej. «n = 96»' },
  { id:'lista',      n:'Lista',        d:'Puntos numerados en cajas. Cuando el orden importa pero no hay flujo.', min:2, max:6, def:4 },
  { id:'ciclo',      n:'Ciclo',        d:'Etapas que vuelven al inicio. Para procesos iterativos o de reciclado.', min:3, max:7, def:4 },
  { id:'jerarquia',  n:'Jerarquía',    d:'Un concepto que se abre en varias ramas. Para clasificaciones.', min:2, max:6, def:4 },
  { id:'piramide',   n:'Pirámide',     d:'Niveles apilados, del más específico arriba al más amplio abajo.', min:2, max:5, def:4 },
  { id:'embudo',     n:'Embudo',       d:'Un conjunto que se va reduciendo hasta un resultado.', min:2, max:5, def:4 },
  { id:'radial',     n:'Radial',       d:'Un centro con elementos alrededor. Para un material y sus propiedades.', min:2, max:7, def:5 },
  { id:'venn',       n:'Venn',         d:'Conjuntos que se traslapan. Para lo que comparten dos o tres cosas.', min:2, max:3, def:3 },
  { id:'cronologia', n:'Cronología',   d:'Hitos sobre una línea de tiempo.', min:2, max:6, def:4 },
  { id:'matriz',     n:'Matriz 2×2',   d:'Cuatro cuadrantes para cruzar dos criterios. El orden es arriba-izquierda, arriba-derecha, abajo-izquierda y abajo-derecha.', min:4, max:4, def:4 },
  { id:'espina',     n:'Espina',       d:'Ishikawa: el efecto a la derecha y las causas como espinas. Para cuando algo no sale y hay que ordenar por qué.', min:3, max:9, def:5 },
  { id:'capas',      n:'Pila de capas', d:'Capas apiladas con su espesor al lado. Para un dispositivo, una película o un perfil.', min:2, max:7, def:5, ph:'Espesor, p. ej. «80 nm»' },
  { id:'gantt',      n:'Cronograma',   d:'Barras sobre una escala de tiempo. Escribe el periodo en el detalle («1–3») y la barra se coloca sola.', min:2, max:8, def:5, ph:'Periodo, p. ej. «2–5»' },
  { id:'mapa',       n:'Mapa lateral', d:'Un centro a la izquierda y ramas a la derecha; los elementos marcados como «sub» cuelgan de la rama anterior.', min:3, max:10, def:6 },
  { id:'matriz3',    n:'Matriz 3×3',   d:'Nueve celdas. Para cruzar tres condiciones con tres respuestas.', min:9, max:9, def:9 },
  { id:'contraste',  n:'Contraste',    d:'Dos columnas enfrentadas. Los elementos sin marcar son los encabezados; los marcados como «sub» caen bajo el último.', min:4, max:12, def:7 }
];
const SK = {}; SMART_KINDS.forEach(k => SK[k.id] = k);

/* ---------- acabados ----------
   El mismo diagrama con cuatro pieles, como los montajes de laboratorio. El
   acabado se resuelve aquí, en la disposición, no al pintar: así la pantalla,
   el PDF y el PowerPoint dicen exactamente lo mismo. */
const SMART_ACABADOS = [
  { id:'relleno',   n:'Relleno',   d:'Cajas macizas con la rampa del acento. Contundente y legible desde el fondo del salón.' },
  { id:'contorno',  n:'Contorno',  d:'Solo el borde y el texto en color; el fondo respira. Va bien junto a una figura.' },
  { id:'editorial', n:'Editorial', d:'Sin cajas: una barra fina de color y la tipografía haciendo la jerarquía. Muy limpio en papel.' },
  { id:'relieve',   n:'Relieve',   d:'Relleno suave con una sombra corta debajo. Da profundidad sin ensuciar.' }
];
const SA = {}; SMART_ACABADOS.forEach(x => SA[x.id] = x);
const acabadoDe = b => (b && SA[b.acab]) ? b.acab : 'relleno';

/* ---------- la escala de espaciado ----------
   Los mismos múltiplos de cuatro que gobiernan la interfaz. En este lienzo de
   1000 unidades, una unidad vale casi un píxel proyectado: un hueco de 16 aquí
   se ve tan holgado como un hueco de 16 en el panel, y todo el programa acaba
   respirando al mismo ritmo. Nada de números sueltos. */
const E1 = 4, E2 = 8, E3 = 12, E4 = 16, E5 = 24, E6 = 32, E7 = 48;
/* Dos aires distintos, y los dos importan. El de dentro crece con la caja:
   apretar 24 en una ficha de 140 la deja sin texto, y dejar 12 en una banda de
   900 la deja desnuda. */
const aireInt = w => w < 200 ? E3 : w < 440 ? E4 : E5;
/* Lo que se aparta una flecha del borde al que apunta: una punta clavada en el
   canto se lee como un error de dibujo. */
const HOLG = E2;
/* El cuerpo de la diapositiva, en píxeles. No es el mismo en todos los temas
   —Plenaria escribe a 28 y Proyector a 27, está en los bloques .th-* de
   02-slides.css—, y si no se cuenta, ahí los rótulos piden más sitio del que
   se les reserva y se salen de su caja. */
const CUERPO_TEMA = { plenaria: 28, proyector: 27, catedra: 26, banda: 26, bloque: 24, carbon: 25, ciruela: 25, marino: 25, acuarela: 25 };
const cuerpoTema = deck => CUERPO_TEMA[(deck && deck.meta && deck.meta.theme)] || 25;
/* Lo que mide un rótulo en píxeles de diapositiva: .smart-rot va a .74 del
   cuerpo. De aquí sale, en smartLayout, cuántas unidades del lienzo ocupa una
   letra, que es lo que decide cuánto tienen que crecer las cajas: en la
   diapositiva la letra NO encoge con el diagrama, así que un diagrama estrecho
   gasta más unidades en la misma palabra. */
const cuerpoPx = deck => 0.74 * cuerpoTema(deck);
/* Lo que la diapositiva deja libre bajo el título. Por encima de esto el
   diagrama se sale del marco, así que las disposiciones redondas se estiran a
   lo ancho —que es lo que sobra— en vez de crecer a lo alto. */
const H_UTIL = 540;
/* El mismo tope, pero contado en unidades del lienzo: en un diagrama estrecho
   cada unidad vale menos píxeles y caben más unidades de alto; en uno a toda
   anchura, al revés. Poner el suelo en H_UTIL —como si el lienzo midiera
   siempre mil píxeles— dejaba crecer un octavo de más a los que van anchos. */
const hUtil = P => Math.round(clamp(H_UTIL * P.uT / P.cpx, 400, 1400));

/* ---------- color ---------- */
function hex2rgb(x) { const s = String(x).replace('#', ''); return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)]; }
function rgb2hex(a) { return '#' + a.map(v => Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join(''); }
function mezcla(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([0,1,2].map(i => A[i] + (B[i]-A[i])*t)); }
function lumin(x) { const [r,g,b] = hex2rgb(x).map(v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }); return .2126*r + .7152*g + .0722*b; }
/* La tinta que más contraste da sobre ese fondo. Un umbral fijo falla con los
   acentos saturados: sobre un naranja fuerte, el blanco se lee peor que el negro. */
function tintaSobre(x) {
  const l = lumin(x);
  const cb = (Math.max(l, lumin('#FFFFFF')) + .05) / (Math.min(l, lumin('#FFFFFF')) + .05);
  const cn = (Math.max(l, lumin('#15181C')) + .05) / (Math.min(l, lumin('#15181C')) + .05);
  return cb >= cn ? '#FFFFFF' : '#15181C';
}

const contrasteHex = (a, b) => { const l1 = lumin(a), l2 = lumin(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
/* La tinta de una pieza rellena. Casi siempre vale la de siempre, pero las
   rampas tienen un tramo intermedio —el pardo del tema Nocturno, el azul medio
   del Índigo— en el que ni el blanco ni el gris de tinta llegan a 4,5. Ahí no
   vale conformarse: se va al negro puro, que sí llega. */
function tintaPieza(fondo) {
  const t = tintaSobre(fondo);
  if (contrasteHex(t, fondo) >= 4.5) return t;
  return contrasteHex('#000000', fondo) > contrasteHex('#FFFFFF', fondo) ? '#000000' : '#FFFFFF';
}
/* Empuja un color hacia la tinta hasta que se lea sobre el fondo. */
function legible(col, fondo, fg) {
  let c = col;
  for (let i = 0; i < 14 && contrasteHex(c, fondo) < 4.5; i++) c = mezcla(c, fg, 0.12);
  return c;
}
function smartPal(deck, acab) {
  const th = temaDe(deck);
  const base = th.dark ? '#1B2127' : '#FFFFFF';
  const ac = SA[acab] ? acab : 'relleno';
  /* La misma paleta categórica que las gráficas: si el usuario pidió la segura
     para daltonismo, el diagrama la respeta en lugar de ir por libre. */
  const seg = (typeof paletaSegura === 'function' && paletaSegura());
  const P = {
    acab: ac, dark: !!th.dark,
    acc: th.acc, fg: th.fg, bg: th.bg, base,
    linea: th.dark ? '#4A5A66' : '#B9C2C8',
    suave: mezcla(base, th.acc, th.dark ? 0.22 : 0.14),
    serie: seg ? (th.dark ? OKABE_ITO_OSCURO : OKABE_ITO) : (th.dark ? SERIES_DARK : SERIES_LIGHT),
    /* rampa ordinal de un solo tono: clara → acento */
    rampa: (i, n) => mezcla(base, th.acc, n <= 1 ? 0.75 : 0.22 + 0.68 * i / (n - 1))
  };
  /* Cómo se ve una pieza de este tono con el acabado elegido. */
  P.pieza = (tono, forma, sec) => {
    const t = tono || th.acc;
    if (ac === 'contorno') {
      const c = legible(t, base, th.fg);
      return { fill: base, stroke: c, grosor: sec ? 2 : 3, texto: c };
    }
    if (ac === 'editorial') {
      const f = mezcla(base, t, (forma === 'rect' ? 0.07 : 0.11) * (sec ? 0.6 : 1));
      return { fill: f, stroke: forma === 'rect' ? null : legible(t, base, th.fg), grosor: forma === 'circle' ? 3 : 2.2,
        texto: legible(t, f, th.fg), barra: forma === 'rect' ? legible(t, base, th.fg) : null };
    }
    if (ac === 'relieve') {
      const f = mezcla(base, t, sec ? 0.3 : 0.58);
      return { fill: f, stroke: null, texto: tintaPieza(f), sombra: true };
    }
    const f = sec ? mezcla(base, t, 0.26) : t;
    return { fill: f, stroke: null, texto: tintaPieza(f) };
  };
  return P;
}

/* ---------- aplicar el acabado a una disposición ---------- */
/* Mueve una trayectoria «M x,y H x L x,y Z» sin tocar su forma. */
function mueveD(d, dx, dy) {
  return String(d).replace(/([MLHV])\s*(-?[\d.]+)(?:,(-?[\d.]+))?/g, (m, c, a, b2) => {
    if (c === 'H') return 'H' + (parseFloat(a) + dx).toFixed(2);
    if (c === 'V') return 'V' + (parseFloat(a) + dy).toFixed(2);
    return c + (parseFloat(a) + dx).toFixed(2) + ',' + (parseFloat(b2) + dy).toFixed(2);
  });
}
function desplazada(f, dx, dy) {
  const g = Object.assign({}, f);
  if (g.t === 'rect') { g.x += dx; g.y += dy; }
  else if (g.t === 'circle') { g.cx += dx; g.cy += dy; }
  else if (g.t === 'path') g.d = mueveD(g.d, dx, dy);
  return g;
}
/* La barra de color del acabado editorial, pegada al canto izquierdo. */
function barraDe(f, col) {
  if (f.t !== 'rect') return null;
  const w = Math.min(E2, Math.max(E1 + 1, f.h * 0.075));
  return { t: 'rect', x: f.x, y: f.y, w, h: f.h, rx: Math.min(w / 2, f.rx || 0), fill: col, rol: 'marca' };
}
function aplicaAcabado(disp, P) {
  const sombraCol = P.dark ? '#000000' : '#0F1720';
  const out = [];
  disp.formas.forEach(f => {
    const rol = f.rol || 'conector';
    if (rol !== 'pieza') { out.push(f); return; }
    const v = P.pieza(f.tono, f.t, f.sec);
    if (v.sombra) out.push(Object.assign(desplazada(f, 0, E2),
      { fill: sombraCol, stroke: null, op: P.dark ? 0.5 : 0.14, rol: 'marca' }));
    out.push(Object.assign({}, f, { fill: v.fill, stroke: v.stroke || null, grosor: v.grosor || null }));
    if (v.barra) { const b = barraDe(f, v.barra); if (b) out.push(b); }
  });
  disp.formas = out;
  disp.rotulos.forEach(r => {
    if (r.col) return;                       /* la disposición ya lo fijó */
    r.col = r.fuera ? P.fg : P.pieza(r.tono, r.forma, r.sec).texto;
  });
  return disp;
}

/* ---------- métrica de texto ----------
   Dentro de la disposición todavía no hay nada que medir, así que se estima:
   en Fira Sans una letra ocupa de media 0.52 del cuerpo. Con eso se sabe
   cuántas líneas hará el rótulo y cuánto tiene que crecer su caja. Es el trato
   al revés del habitual: manda el texto y la caja obedece, porque encoger la
   letra hasta que quepa es justo lo que deja un diagrama ilegible desde la
   quinta fila. */
const ANCHO_LETRA = 0.52;
const INTERLINEA = 1.24;                     /* el mismo de la hoja de estilo */
const FS_MIN = 0.82;                         /* por debajo de esto no se baja: crece la caja */
const fsOk = v => Math.max(FS_MIN, v || 1);

function lineasDe(txt, ancho, cuerpo) {
  const s = String(txt == null ? '' : txt).replace(/\$[^$]*\$/g, 'XXXX').trim();
  if (!s) return 0;
  const cabe = Math.max(3, Math.floor(ancho / (cuerpo * ANCHO_LETRA)));
  let n = 1, act = 0;
  s.split(/\s+/).forEach(p => {
    const l = p.length;
    if (act && act + 1 + l > cabe) { n++; act = 0; }
    act += (act ? 1 : 0) + l;
    while (act > cabe) { n++; act -= cabe; }  /* una palabra que ni partida cabe */
  });
  return n;
}
/* Alto que pide un rótulo con su detalle debajo, con la jerarquía ya contada:
   el detalle va a 0.78 del cuerpo y separado del rótulo. */
function altoRotulo(it, ancho, uT, fs) {
  const ct = uT * fsOk(fs), cd = ct * 0.78;
  const lt = lineasDe(it && it.t, ancho, ct);
  const ld = (it && it.d) ? lineasDe(it.d, ancho, cd) : 0;
  return (lt || 1) * ct * INTERLINEA + (ld ? ld * cd * INTERLINEA + ct * 0.16 : 0);
}
const altoMax = (items, ancho, uT, fs) => items.reduce((m, it) => Math.max(m, altoRotulo(it, ancho, uT, fs)), 0);

/* La palabra más larga decide cuánto hay que agrandar los círculos:
   una palabra que no se puede partir necesita su espacio. */
function palabraLarga(items) {
  let m = 0;
  items.forEach(it => String(it.t || '').split(/\s+/).forEach(w => { if (w.length > m) m = w.length; }));
  return m;
}
const holgura = items => 1 + clamp((palabraLarga(items) - 9) / 26, 0, 0.55);

/* ---------- disposiciones ----------
   Devuelven { H, formas:[], rotulos:[] } en unidades de 0..1000 en x. */
const W = 1000;

/* Reparte n puntos por una elipse midiendo el arco recorrido, no el ángulo.
   Repartiendo por ángulo, en una elipse achatada los nodos se amontonan en los
   extremos y hay que encogerlos para que no se toquen; por arco quedan a la
   misma distancia unos de otros. `off` gira medio paso, para que en un número
   par de nodos ninguno caiga justo encima ni debajo del centro. */
function reparto(n, Rx, Ry, off) {
  const M = 720, base = -Math.PI/2, paso = 2*Math.PI/M, acum = [0];
  for (let i = 1; i <= M; i++) {
    const a0 = base + (i-1)*paso, a1 = base + i*paso;
    acum.push(acum[i-1] + Math.hypot(Rx*(Math.cos(a1)-Math.cos(a0)), Ry*(Math.sin(a1)-Math.sin(a0))));
  }
  const total = acum[M] || 1, out = [];
  for (let k = 0, j = 0; k < n; k++) {
    const meta = total * (k + (off || 0)) / n;
    while (j < M && acum[j+1] < meta) j++;
    out.push(base + j*paso);
  }
  return out;
}

function dispProceso(items, P) {
  const n = items.length, g = E3;
  const w = (W - g * (n - 1)) / n;
  const p = Math.round(clamp(w * 0.15, E3 + 2, E6 - 4));   /* la punta se acorta si hay muchas etapas */
  const ai = aireInt(w);
  const wTx = Math.max(72, w - p * 1.5 - ai * 2);
  /* El suelo no es el que pide el texto sino el que pide la figura: una tira de
     galones de doscientas unidades en una diapositiva de setecientas se lee
     como una cinta y no como las etapas de un método. */
  const H = Math.round(Math.max(E7 * 5, altoMax(items, wTx, P.uT) + E6 * 2));
  const formas = [], rotulos = [];
  items.forEach((it, i) => {
    const x = i * (w + g), f = P.rampa(i, n);
    const d = i === 0
      ? `M${x},0 H${x + w - p} L${x + w},${H/2} L${x + w - p},${H} H${x} Z`
      : `M${x},0 H${x + w - p} L${x + w},${H/2} L${x + w - p},${H} H${x} L${x + p},${H/2} Z`;
    formas.push({ t:'path', d, tono:f, rol:'pieza' });
    /* El galón no es un rectángulo: con muesca a la izquierda el centro óptico
       se corre un poco hacia la punta. */
    rotulos.push({ x: x + w / 2 + (i ? p / 4 : -p / 2), y: H/2, w: wTx, t: it.t, s: it.d, tono:f, forma:'path', al:'center' });
  });
  return { H, formas, rotulos };
}

/* ---------- flujo con bajas ----------
   El tronco baja recto con su recuento en cada nodo y lo que se pierde sale por
   la derecha con el motivo. Es la forma de un CONSORT, un PRISMA o la criba de
   un lote de muestras: sin esto no había manera de contar por qué de noventa y
   seis síntesis solo se caracterizan treinta y ocho. */
function dispFlujo(items, P) {
  const wB = E7 * 7, xB = W - E5 - wB;          /* la columna de las bajas, a la derecha */
  const xT = E7, wT = xB - E7 - xT;             /* el tronco se queda con lo que sobra */
  const aiT = aireInt(wT), aiB = aireInt(wB);
  const wTxT = wT - aiT * 2, wTxB = wB - aiB * 2;
  /* Los elementos marcados como «sub» son bajas del paso que tienen encima. */
  const pasos = [];
  items.forEach(it => {
    if (!(+it.lvl > 0) || !pasos.length) pasos.push({ it, bajas: [] });
    else pasos[pasos.length - 1].bajas.push(it);
  });
  const n = pasos.length;
  const xEje = xT + wT / 2;
  /* Una criba larga no cabe bajo el título por mucho que se mida bien, así que
     hay dos raseros de aire: el holgado y, si con él se sale del marco, uno
     apretado. Se recorta el aire antes que la letra, que es lo que de verdad
     hay que leer desde el fondo de la sala. Cada rasero dice cuánto aire va
     dentro del nodo, dentro de la baja, entre dos bajas y en el salto mínimo
     del tronco. */
  const arma = r => {
    const formas = [], rotulos = [];
    let y = 0;
    pasos.forEach((pa, i) => {
      const f = P.rampa(i, n);
      const hN = Math.round(Math.max(E7 + r[0], altoRotulo(pa.it, wTxT, P.uT) + r[0] * 2));
      formas.push({ t:'rect', x:xT, y, w:wT, h:hN, rx:E3, tono:f, rol:'pieza' });
      rotulos.push({ x:xT + wT / 2, y:y + hN / 2, w:wTxT, t:pa.it.t, s:pa.it.d, tono:f, forma:'rect', al:'center' });
      y += hN;
      const ultimo = i === n - 1;
      if (ultimo && !pa.bajas.length) return;
      /* El salto tiene que dar de sí para alojar las bajas de este paso. */
      const altos = pa.bajas.map(ex => Math.round(Math.max(E7, altoRotulo(ex, wTxB, P.uT, 0.9) + r[1] * 2)));
      const hBajas = altos.reduce((a, v) => a + v, 0) + Math.max(0, altos.length - 1) * r[2];
      const salto = Math.max(r[3], hBajas + E4);
      let yb = y + (salto - hBajas) / 2, cyUlt = y + salto, fondo = y + salto;
      altos.forEach((hb, j) => {
        const cy = yb + hb / 2;
        formas.push({ t:'rect', x:xB, y:yb, w:wB, h:hb, rx:E3, tono:P.acc, sec:true, rol:'pieza' });
        rotulos.push({ x:xB + wB / 2, y:cy, w:wTxB, t:pa.bajas[j].t, s:pa.bajas[j].d,
          tono:P.acc, sec:true, forma:'rect', al:'left', fs:0.9 });
        formas.push({ t:'line', x1:xEje, y1:cy, x2:xB - HOLG, y2:cy, stroke:P.linea, flecha:true });
        cyUlt = cy; fondo = yb + hb;
        yb += hb + r[2];
      });
      /* El tronco sigue bajando y la punta se para antes de tocar el nodo. En el
         último paso muere en su última baja: una flecha al vacío no dice nada. */
      formas.push({ t:'line', x1:xEje, y1:y, x2:xEje, y2:ultimo ? cyUlt : y + salto - HOLG,
        stroke:P.linea, gruesa:true, flecha:!ultimo });
      y = ultimo ? fondo + E4 : y + salto;
    });
    return { H: Math.round(y), formas, rotulos };
  };
  const holgado = arma([E4, E3, E3, E6 + E2]);
  return holgado.H <= hUtil(P) ? holgado : arma([E3, E2, E2, E6]);
}

function dispLista(items, P) {
  const n = items.length, g = E4;
  const rNum = E5 + E2;                        /* el disco del número */
  const xNum = E7 + E3;
  const xTx = xNum + rNum + E5, wTx = W - xTx - E5;
  const hb = Math.round(Math.max(rNum * 2 + E5, altoMax(items, wTx, P.uT) + E5 * 2));
  const H = n * hb + (n - 1) * g;
  /* Con contorno y editorial la caja es casi del color del fondo: el disco del
     número necesita entonces su propio tinte para no desaparecer. */
  const claro = P.acab === 'contorno' || P.acab === 'editorial';
  const discoCol = claro ? mezcla(P.base, P.acc, P.dark ? 0.26 : 0.14) : P.base;
  const numCol = legible(P.acc, discoCol, P.fg);
  const formas = [], rotulos = [];
  items.forEach((it, i) => {
    const y = i * (hb + g), f = P.rampa(i, n);
    formas.push({ t:'rect', x:0, y, w:W, h:hb, rx:E4, tono:f, rol:'pieza' });
    formas.push({ t:'circle', cx:xNum, cy:y + hb/2, r:rNum, fill:discoCol, rol:'marca' });
    rotulos.push({ x:xNum, y:y + hb/2, w:rNum * 2, t:String(i + 1), col:numCol, al:'center', num:true });
    rotulos.push({ x:xTx + wTx/2, y:y + hb/2, w:wTx, t:it.t, s:it.d, tono:f, forma:'rect', al:'left' });
  });
  return { H, formas, rotulos };
}

function dispCiclo(items, P) {
  const n = items.length, cx = W / 2;
  const hol = holgura(items);
  let r = Math.round(clamp((n > 5 ? 80 : 94) * hol, 58, 168));
  /* El anillo se estira a lo ancho, que es lo que sobra en una diapositiva: un
     círculo perfecto de este tamaño se sale del marco por arriba y por abajo. */
  const Rx = Math.round(W / 2 - r - E5);
  const Ry = Math.floor(clamp(Math.min(Rx * 0.62, hUtil(P) / 2 - r - E4), r * 0.62, 340));
  const angs = reparto(n, Rx, Ry, 0);
  const rel = a => [Rx * Math.cos(a), Ry * Math.sin(a)];
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  /* Antes que apretar el anillo, encoge el nodo: dos círculos que se tocan se
     leen peor que dos círculos algo más pequeños con aire entre medias. */
  for (let i = 0; i < n; i++) r = Math.min(r, Math.floor((dist(rel(angs[i]), rel(angs[(i + 1) % n])) - E5) / 2));
  r = Math.max(r, 44);
  const H = Math.round(2 * (Ry + r) + E4 * 2), cy = H / 2;
  const pt = a => [cx + Rx * Math.cos(a), cy + Ry * Math.sin(a)];
  const formas = [], rotulos = [];
  /* El arco nace y muere con holgura respecto a los dos nodos que enlaza. */
  const lim = r + E4;
  for (let i = 0; i < n; i++) {
    const a0 = angs[i], a1 = angs[(i + 1) % n] + (i === n - 1 ? 2 * Math.PI : 0);
    const tramo = a1 - a0, salto = tramo / 40;
    const c0 = pt(a0), c1 = pt(a1);
    let t1 = salto, t2 = tramo - salto;
    while (t1 < tramo * 0.45 && dist(pt(a0 + t1), c0) < lim) t1 += salto;
    while (t2 > tramo * 0.55 && dist(pt(a0 + t2), c1) < lim) t2 -= salto;
    if (t2 - t1 < tramo * 0.1) continue;
    const p1 = pt(a0 + t1), p2 = pt(a0 + t2);
    formas.push({ t:'arc', x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1], r:Rx, ry:Ry, stroke:P.linea, flecha:true });
  }
  items.forEach((it, i) => {
    const [x, y] = pt(angs[i]), f = P.rampa(i, n);
    formas.push({ t:'circle', cx:x, cy:y, r, tono:f, rol:'pieza' });
    rotulos.push({ x, y, w: r * 1.6, t:it.t, s:it.d, tono:f, forma:'circle', al:'center', fs:0.9 });
  });
  return { H, formas, rotulos };
}

function dispJerarquia(items, P) {
  const raiz = items[0], hijos = items.slice(1);
  const n = Math.max(1, hijos.length);
  const g = E5, wh = (W - g * (n - 1)) / n;
  const wr = clamp(Math.round(W * 0.38), 300, 420), xr = (W - wr) / 2;
  const wTxR = wr - aireInt(wr) * 2, wTxH = wh - aireInt(wh) * 2;
  const hr = Math.round(Math.max(96, altoRotulo(raiz, wTxR, P.uT) + E5 * 2));
  const hh = Math.round(Math.max(112, altoMax(hijos, wTxH, P.uT) + E5 * 2));
  const salto = E6 + E5;                        /* del padre al reparto, y de ahí al hijo */
  const yBus = hr + salto, yh = yBus + salto, H = yh + hh;
  const formas = [{ t:'rect', x:xr, y:0, w:wr, h:hr, rx:E4, tono:P.acc, rol:'pieza' }];
  const rotulos = [{ x:W/2, y:hr/2, w:wTxR, t:raiz.t, s:raiz.d, tono:P.acc, forma:'rect', al:'center' }];
  formas.push({ t:'line', x1:W/2, y1:hr, x2:W/2, y2:yBus, stroke:P.linea });
  if (n > 1) formas.push({ t:'line', x1:wh/2, y1:yBus, x2:W - wh/2, y2:yBus, stroke:P.linea });
  hijos.forEach((it, i) => {
    const x = i * (wh + g);
    formas.push({ t:'line', x1:x + wh/2, y1:yBus, x2:x + wh/2, y2:yh, stroke:P.linea });
    formas.push({ t:'rect', x, y:yh, w:wh, h:hh, rx:E4, tono:P.acc, sec:true, rol:'pieza' });
    rotulos.push({ x:x + wh/2, y:yh + hh/2, w:wTxH, t:it.t, s:it.d, tono:P.acc, sec:true, forma:'rect', al:'center' });
  });
  return { H, formas, rotulos };
}

function dispPiramide(items, P) {
  const n = items.length, g = E2;
  /* La punta va ligeramente truncada: en un vértice de verdad no cabe ni una
     palabra, y lo que se hacía antes era meterla igual y que se saliera. */
  const anchoEn = k => W * (k + 0.45) / (n + 0.45);
  /* El rótulo se mide donde la banda todavía es estrecha, no en su parte ancha:
     así la primera línea tampoco se sale. */
  const wTx = items.map((it, i) => {
    const a = anchoEn(i) + (anchoEn(i + 1) - anchoEn(i)) * 0.28;
    return Math.max(130, Math.round(Math.min(a - aireInt(a) * 2, anchoEn(i + 1) * 0.86)));
  });
  const hb = Math.round(Math.max(100,
    items.reduce((m, it, i) => Math.max(m, altoRotulo(it, wTx[i], P.uT, i === 0 ? 0.88 : 1)), 0) + E5 * 2));
  const H = n * hb + (n - 1) * g;
  const formas = [], rotulos = [];
  items.forEach((it, i) => {
    const y = i * (hb + g), wt = anchoEn(i), wb = anchoEn(i + 1);
    const x1 = (W - wt)/2, x2 = (W - wb)/2, f = P.rampa(n - 1 - i, n);
    formas.push({ t:'path', d:`M${x1},${y} H${x1 + wt} L${x2 + wb},${y + hb} H${x2} Z`, tono:f, rol:'pieza' });
    rotulos.push({ x:W/2, y:y + hb * 0.56, w:wTx[i], t:it.t, s:it.d, tono:f, forma:'path', al:'center',
      fs: i === 0 ? 0.88 : 1 });
  });
  return { H, formas, rotulos };
}

function dispEmbudo(items, P) {
  const n = items.length, g = E2;
  const anchoEn = k => W * (1 - 0.62 * k / n);
  const wTx = items.map((it, i) => {
    const wb = anchoEn(i + 1);
    return Math.max(150, Math.round(wb - aireInt(wb) * 2));
  });
  const hb = Math.round(Math.max(96,
    items.reduce((m, it, i) => Math.max(m, altoRotulo(it, wTx[i], P.uT)), 0) + E5 * 2));
  const H = n * hb + (n - 1) * g;
  const formas = [], rotulos = [];
  items.forEach((it, i) => {
    const y = i * (hb + g), wt = anchoEn(i), wb = anchoEn(i + 1);
    const x1 = (W - wt)/2, x2 = (W - wb)/2, f = P.rampa(i, n);
    formas.push({ t:'path', d:`M${x1},${y} H${x1 + wt} L${x2 + wb},${y + hb} H${x2} Z`, tono:f, rol:'pieza' });
    rotulos.push({ x:W/2, y:y + hb/2, w:wTx[i], t:it.t, s:it.d, tono:f, forma:'path', al:'center' });
  });
  return { H, formas, rotulos };
}

function dispRadial(items, P) {
  const centro = items[0], sat = items.slice(1);
  const n = Math.max(1, sat.length), cx = W / 2;
  const hol = holgura(items);
  let rs = Math.round(clamp((n > 5 ? 78 : 90) * hol, 56, 150));
  let rc = Math.round(clamp(122 * hol, 78, 190));
  /* Con un número par de satélites el reparto se gira medio paso: así ninguno
     cae justo encima ni justo debajo del centro, que es donde menos sitio hay,
     y el conjunto cabe sin encoger a nadie. */
  const hMax = hUtil(P);
  let Rx = 0, Ry = 0, angs = [];
  for (let paso = 0; paso < 8; paso++) {
    Rx = Math.round(W / 2 - rs - E5);
    Ry = Math.floor(Math.min(Rx * 0.55, hMax / 2 - rs - E4));
    angs = reparto(n, Rx, Ry, n % 2 === 0 ? 0.5 : 0);
    /* El radio vertical mínimo es el que despega cada satélite del centro. La
       separación es de 48 y no de 16 a propósito: con menos, el radio que los
       une queda tan corto que no se ve, y el diagrama pierde justo lo que
       cuenta, que es que todo eso sale del centro. */
    const D = rc + rs + E7;
    let ryMin = rs * 0.5;
    angs.forEach(a => {
      const ex = Math.abs(Rx * Math.cos(a)), sa = Math.abs(Math.sin(a));
      if (ex >= D || sa < 1e-6) return;
      ryMin = Math.max(ryMin, Math.sqrt(D * D - ex * ex) / sa);
    });
    Ry = Math.ceil(Math.max(ryMin, Ry));
    if (2 * (Ry + rs) + E4 * 2 <= hMax || paso === 7) break;
    rs = Math.round(rs * 0.92); rc = Math.round(rc * 0.92);
  }
  const ang = i => angs[i];
  /* Dos satélites que se tocan se leen peor que dos algo más pequeños. */
  for (let i = 0; i < n && n > 1; i++) {
    const a = ang(i), b2 = ang((i + 1) % n);
    const d = Math.hypot(Rx * (Math.cos(a) - Math.cos(b2)), Ry * (Math.sin(a) - Math.sin(b2)));
    rs = Math.min(rs, Math.floor((d - E4) / 2));
  }
  rs = Math.max(rs, 40);
  const H = Math.round(2 * (Ry + rs) + E4 * 2), cy = H / 2;
  const formas = [], rotulos = [];
  /* El radio nace fuera del centro y muere antes del satélite. */
  sat.forEach((it, i) => {
    const a = ang(i), x = cx + Rx*Math.cos(a), y = cy + Ry*Math.sin(a);
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
    formas.push({ t:'line', x1:cx + dx * (rc + HOLG) / d, y1:cy + dy * (rc + HOLG) / d,
      x2:cx + dx * (d - rs - HOLG) / d, y2:cy + dy * (d - rs - HOLG) / d, stroke:P.linea });
  });
  formas.push({ t:'circle', cx, cy, r:rc, tono:P.acc, rol:'pieza' });
  rotulos.push({ x:cx, y:cy, w:rc * 1.6, t:centro.t, s:centro.d, tono:P.acc, forma:'circle', al:'center', fs:0.95 });
  sat.forEach((it, i) => {
    const a = ang(i), x = cx + Rx*Math.cos(a), y = cy + Ry*Math.sin(a);
    formas.push({ t:'circle', cx:x, cy:y, r:rs, tono:P.acc, sec:true, rol:'pieza' });
    rotulos.push({ x, y, w:rs * 1.6, t:it.t, s:it.d, tono:P.acc, sec:true, forma:'circle', al:'center', fs:0.88 });
  });
  return { H, formas, rotulos };
}

function dispVenn(items, P) {
  const n = clamp(items.length, 2, 3);
  const formas = [], rotulos = [];
  const cols = P.serie;
  /* La tinta se calcula sobre el color ya mezclado con el fondo: sobre un
     amarillo al 50 % el blanco no se lee. */
  const tinta = (i, op) => tintaPieza(mezcla(P.base, cols[i], op));
  const hMax = hUtil(P);
  /* El círculo se hace a la medida de su rótulo. Si el diagrama va estrecho la
     letra pesa más en el lienzo, y entonces crece el círculo: encoger el texto
     hasta que quepa es justo lo que no queremos. */
  const crece = (r0, tope, wDe, hDe) => {
    let r = r0;
    for (let i = 0; i < 3; i++) r = Math.round(clamp(Math.max(r, hDe(altoMax(items, wDe(r), P.uT))), r0, tope));
    return r;
  };
  if (n === 2) {
    const r = crece(196, Math.min(299, (hMax - E5 * 2) / 2), rr => rr * 1.18 - E5, a => a * 1.5);
    const sep = Math.round(r * 1.18);            /* separación entre centros */
    const H = 2 * r + E5 * 2, cy = H / 2;
    const c1 = W/2 - sep/2, c2 = W/2 + sep/2;
    formas.push({ t:'circle', cx:c1, cy, r, fill:cols[0], op:.5, rol:'fondo' });
    formas.push({ t:'circle', cx:c2, cy, r, fill:cols[1], op:.5, rol:'fondo' });
    /* Cada rótulo va centrado en su luna, la parte que no comparte con nadie. */
    rotulos.push({ x:W/2 - r, y:cy, w:sep - E5, t:items[0].t, s:items[0].d, col:tinta(0, .5), al:'center' });
    rotulos.push({ x:W/2 + r, y:cy, w:sep - E5, t:items[1].t, s:items[1].d, col:tinta(1, .5), al:'center' });
    return { H, formas, rotulos };
  }
  /* Tres círculos, cada rótulo dentro de su propia luna. Colgados por fuera se
     salían del lienzo por arriba y el navegador los recortaba; dentro, además,
     la figura ocupa solo lo que ocupan los círculos. */
  /* Tres círculos escalonados ocupan algo más de tres radios de alto —de ahí el
     3.05—, y con el tres pelado el conjunto asomaba por debajo del marco. */
  const r = crece(164, Math.min(303, (hMax - E5 * 2) / 3.05), rr => rr * 0.9, a => a / 0.62);
  const d = Math.round(r * 0.62);
  const cx = W/2, cy = E5 + d + r;
  const H = Math.round(cy + d * 0.62 + r + E5);
  const pts = [[cx, cy - d], [cx - d*0.92, cy + d*0.62], [cx + d*0.92, cy + d*0.62]];
  pts.forEach((p, i) => formas.push({ t:'circle', cx:p[0], cy:p[1], r, fill:cols[i], op:.45, rol:'fondo' }));
  const gx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, gy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
  pts.forEach((p, i) => {
    const a = Math.atan2(p[1] - gy, p[0] - gx);
    rotulos.push({ x: p[0] + r * 0.40 * Math.cos(a), y: p[1] + r * 0.40 * Math.sin(a),
      w: Math.round(r * 0.9), t: items[i].t, s: items[i].d, col: tinta(i, .45), al: 'center' });
  });
  return { H, formas, rotulos };
}

function dispCronologia(items, P) {
  const n = items.length;
  const x0 = E7 + E3, wUtil = W - x0 * 2;
  const wTx = Math.round(Math.max(150, wUtil / Math.max(1, n - 0.35)));
  const alto = altoMax(items, wTx, P.uT, 0.92);
  const rama = E7 + E4;                          /* del eje al pie del rótulo */
  const H = Math.round(2 * (rama + E3 + alto + E4));
  const ejeY = H / 2;
  const rN = E4 + E2;
  const formas = [{ t:'line', x1:E4, y1:ejeY, x2:W - E4, y2:ejeY, stroke:P.linea, gruesa:true, flecha:true }];
  const rotulos = [];
  items.forEach((it, i) => {
    const x = x0 + wUtil * (n === 1 ? 0.5 : i / (n - 1));
    const arriba = i % 2 === 0, f = P.rampa(i, n), dy = arriba ? -1 : 1;
    formas.push({ t:'circle', cx:x, cy:ejeY, r:rN + E1, fill:P.base, rol:'marca' });
    formas.push({ t:'circle', cx:x, cy:ejeY, r:rN, tono:f, rol:'pieza' });
    formas.push({ t:'line', x1:x, y1:ejeY + dy * (rN + E1), x2:x, y2:ejeY + dy * rama, stroke:P.linea });
    /* El primero y el último se recogen hacia dentro: centrados sobre su hito
       se salían del lienzo y el navegador los recortaba. */
    rotulos.push({ x: clamp(x, wTx/2 + E3, W - wTx/2 - E3), y: ejeY + dy * (rama + E3 + alto / 2),
      w: wTx, t:it.t, s:it.d, fuera:true, al:'center', fs:0.92 });
  });
  return { H, formas, rotulos };
}

function dispMatriz(items, P) {
  const g = E5, w = (W - g)/2;
  const wTx = w - aireInt(w) * 2;
  /* El suelo lo marca el ancho de la celda: un cuadrante casi tres veces más
     ancho que alto deja de leerse como un cuadrante y pasa a ser una franja. */
  const hb = Math.round(clamp(altoMax(items, wTx, P.uT) + E6 * 2, w * 0.46, (hUtil(P) - g) / 2));
  const H = hb * 2 + g;
  const formas = [], rotulos = [];
  [[0,0],[1,0],[0,1],[1,1]].forEach((q, i) => {
    const it = items[i] || { t:'' };
    const x = q[0] * (w + g), y = q[1] * (hb + g);
    const f = P.serie[i];
    formas.push({ t:'rect', x, y, w, h:hb, rx:E4, tono:f, sec:true, rol:'pieza' });
    rotulos.push({ x:x + w/2, y:y + hb/2, w:wTx, t:it.t, s:it.d, tono:f, sec:true, forma:'rect', al:'center' });
  });
  return { H, formas, rotulos };
}

/* ---------- espina de pescado (Ishikawa) ----------
   El efecto a la derecha, las causas colgando del eje. Cuando algo no sale,
   ordena el porqué en lugar de dejarlo en una lista suelta. */
function dispEspina(items, P) {
  const efecto = items[0], causas = items.slice(1);
  const n = Math.max(1, causas.length);
  const wCab = 250, xCab = W - wCab;
  const wTxCab = wCab - aireInt(wCab) * 2;
  const hCab = Math.round(Math.max(116, altoRotulo(efecto, wTxCab, P.uT) + E5 * 2));
  const arr = Math.ceil(n / 2), aba = n - arr;
  const x1 = E7, xN = xCab - E7;
  const paso = (xN - x1) / Math.max(1, Math.max(arr, aba));
  const wc = Math.round(clamp(paso * 0.86, 130, 250));
  const wTx = wc - aireInt(wc) * 2;
  /* La caja crece con su texto: antes tenía 62 fijos y tres líneas se salían
     por debajo, que era lo primero que se veía mal en este diagrama. */
  const hc = Math.round(Math.max(60, altoMax(causas, wTx, P.uT, 0.9) + E3 * 2));
  const sep = Math.round(Math.max(hc / 2 + E7, hCab / 2 + E5, 116));
  const H = Math.round(2 * (sep + hc / 2 + E4));
  const ejeY = H / 2;
  const formas = [], rotulos = [];
  formas.push({ t:'line', x1:E2, y1:ejeY, x2:xCab - HOLG, y2:ejeY, stroke:P.linea, gruesa:true, flecha:true });
  formas.push({ t:'rect', x:xCab, y:ejeY - hCab/2, w:wCab, h:hCab, rx:E4, tono:P.acc, rol:'pieza' });
  rotulos.push({ x:xCab + wCab/2, y:ejeY, w:wTxCab, t:efecto.t, s:efecto.d, tono:P.acc, forma:'rect', al:'center' });
  causas.forEach((it, i) => {
    const arriba = i % 2 === 0, k = Math.floor(i / 2), dy = arriba ? -1 : 1;
    /* La espina sale del eje en diagonal y muere en el borde de su caja. */
    const xPie = x1 + paso * 0.62 + k * paso + (arriba ? 0 : paso * 0.5);
    const cxCaja = xPie - paso * 0.34, cyCaja = ejeY + dy * sep;
    const f = P.rampa(k, Math.max(2, Math.max(arr, aba)));
    formas.push({ t:'line', x1:xPie, y1:ejeY, x2:cxCaja, y2:cyCaja - dy * (hc / 2 + HOLG / 2), stroke:P.linea });
    formas.push({ t:'rect', x:cxCaja - wc/2, y:cyCaja - hc/2, w:wc, h:hc, rx:E3, tono:f, sec:true, rol:'pieza' });
    rotulos.push({ x:cxCaja, y:cyCaja, w:wTx, t:it.t, s:it.d, tono:f, sec:true, forma:'rect', al:'center', fs:0.9 });
  });
  return { H, formas, rotulos };
}

/* ---------- pila de capas ----------
   Un dispositivo o una película vistos de canto: la primera capa arriba. */
function dispCapas(items, P) {
  const n = items.length, g = E1;
  const x0 = E7, wB = 604;
  const xD = x0 + wB + E3 + E5 + E3;             /* donde empieza el espesor */
  const wD = W - xD - E5;
  const wTx = wB - aireInt(wB) * 2;
  const soloT = items.map(it => ({ t: it.t }));
  const hb = Math.round(clamp(Math.max(altoMax(soloT, wTx, P.uT) + E4 * 2,
    altoMax(items.map(it => ({ t: it.d })), wD, P.uT, 0.86) + E3 * 2), 54, 96));
  const H = n * hb + (n - 1) * g;
  const formas = [], rotulos = [];
  items.forEach((it, i) => {
    const y = i * (hb + g), f = P.rampa(n - 1 - i, n);
    formas.push({ t:'rect', x:x0, y, w:wB, h:hb, rx:E1, tono:f, rol:'pieza' });
    rotulos.push({ x:x0 + wB/2, y:y + hb/2, w:wTx, t:it.t, tono:f, forma:'rect', al:'center' });
    if (it.d) {
      formas.push({ t:'line', x1:x0 + wB + E3, y1:y + hb/2, x2:xD - E3, y2:y + hb/2, stroke:P.linea });
      rotulos.push({ x:xD + wD/2, y:y + hb/2, w:wD, t:it.d, fuera:true, al:'left', fs:0.86 });
    }
  });
  return { H, formas, rotulos };
}

/* ---------- cronograma de barras ----------
   El periodo se lee del detalle: «1–3», «mes 2 a 5». Si no hay números, las
   tareas se ponen una tras otra. */
function tramoDe(txt, i, n) {
  const nums = (String(txt || '').match(/\d+(?:[.,]\d+)?/g) || []).map(Number).filter(v => isFinite(v) && v >= 0);
  if (nums.length >= 2) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [i + 1, i + 1];
}
function dispGantt(items, P) {
  const n = items.length, g = E4;
  const xLab = 340, wLab = xLab - E5 - E3;
  const x0 = xLab + E4, ancho = W - x0 - E3;
  const tramos = items.map((it, i) => tramoDe(it.d, i, n));
  const tope = Math.max(n, ...tramos.map(t => t[1]));
  const hb = Math.round(clamp(altoMax(items.map(it => ({ t: it.t })), wLab, P.uT, 0.88) + E4 * 2, 58, 92));
  const pie = Math.round(E5 + P.uT * 1.1);        /* la banda de la escala crece con la letra */
  const H = n * (hb + g) - g + pie;
  const yEje = H - pie + E3;
  const formas = [], rotulos = [];
  const px = v => x0 + (v / tope) * ancho;
  /* La rejilla marca el compás sin hacerse notar; la única línea con peso es la
     del eje, que es la que de verdad delimita. */
  for (let k = 0; k <= tope; k++) formas.push({ t:'line', x1:px(k), y1:0, x2:px(k), y2:yEje, stroke:P.linea, tenue:true });
  formas.push({ t:'line', x1:x0, y1:yEje, x2:W - E3, y2:yEje, stroke:P.linea });
  for (let k = 1; k <= tope; k++)
    rotulos.push({ x:(px(k - 1) + px(k)) / 2, y:yEje + E2 + P.uT * 0.5, w:ancho / tope, t:String(k), fuera:true, al:'center', fs:0.72 });
  items.forEach((it, i) => {
    const y = i * (hb + g), [a, b2] = tramos[i], f = P.rampa(i, n);
    const bx = px(a - 1), bw = Math.max(E5, px(b2) - px(a - 1));
    formas.push({ t:'rect', x:bx, y, w:bw, h:hb, rx:E3, tono:f, rol:'pieza' });
    rotulos.push({ x:xLab / 2, y:y + hb/2, w:wLab, t:it.t, fuera:true, al:'left', fs:0.88 });
    /* El periodo solo se escribe dentro si le cabe entero y de una línea; si
       no, se pone justo detrás de la barra en vez de salirse por los cantos. */
    if (!it.d) return;
    const dentro = bw - E5, cuerpo = P.uT * 0.82;
    if (dentro > cuerpo * 2.4 && lineasDe(it.d, dentro, cuerpo) === 1)
      rotulos.push({ x:bx + bw/2, y:y + hb/2, w:dentro, t:it.d, tono:f, forma:'rect', al:'center', fs:0.82 });
    else {
      const xd = bx + bw + E3, wd = W - xd - E3;
      if (wd > 90) rotulos.push({ x:xd + wd/2, y:y + hb/2, w:wd, t:it.d, fuera:true, al:'left', fs:0.82 });
    }
  });
  return { H, formas, rotulos };
}

/* ---------- mapa lateral ----------
   El centro a la izquierda y las ramas a la derecha; lo marcado como «sub»
   cuelga de la rama anterior. */
function dispMapa(items, P) {
  const raiz = items[0];
  const resto = items.slice(1);
  const xR = E5, wR = 252, xB = xR + wR + E7, wB = 300;
  const xS = xB + wB + E7, wS = W - xS - E5;
  const wTxR = wR - aireInt(wR) * 2, wTxB = wB - aireInt(wB) * 2, wTxS = wS - aireInt(wS) * 2;
  const filas = resto.length || 1;
  const altoFila = altoMax(resto, Math.min(wTxB, wTxS), P.uT, 0.9);
  const hRaiz = Math.round(Math.max(112, altoRotulo(raiz, wTxR, P.uT) + E5 * 2));
  /* Dos raseros de aire, como en el flujo: el holgado y, si con él las ramas no
     caben bajo el título, uno apretado. Se recorta el aire antes que la letra.
     Cada rasero es [alto mínimo de fila, aire dentro, hueco entre filas]. */
  const mide = r => {
    const hf = Math.round(Math.max(r[0], altoFila + r[1] * 2));
    return { hFila: hf, paso: hf + r[2], bloque: filas * hf + (filas - 1) * r[2] };
  };
  const total = x => Math.max(240, hRaiz + E4 * 2, x.bloque + E4 * 2);
  let m = mide([E7 + E2, E3, E4]);
  if (total(m) > hUtil(P)) m = mide([E7, E2, E3]);
  const hFila = m.hFila, paso = m.paso, H = total(m);
  const formas = [], rotulos = [];
  /* Las ramas van centradas con la raíz: si el bloque es más corto que el
     lienzo, el desnivel se reparte arriba y abajo. */
  const yDe = i => (H - m.bloque) / 2 + i * paso + hFila / 2;
  formas.push({ t:'rect', x:xR, y:H/2 - hRaiz/2, w:wR, h:hRaiz, rx:E4, tono:P.acc, rol:'pieza' });
  rotulos.push({ x:xR + wR/2, y:H/2, w:wTxR, t:raiz.t, s:raiz.d, tono:P.acc, forma:'rect', al:'center' });
  let ramaY = null, nRama = 0;
  resto.forEach((it, i) => {
    const y = yDe(i), sub = +it.lvl > 0 && ramaY !== null;
    const x = sub ? xS : xB, ww = sub ? wS : wB, wtx = sub ? wTxS : wTxB;
    const f = P.rampa(sub ? nRama : ++nRama, Math.max(2, resto.length));
    if (sub) {
      const codo = xB + wB / 2;
      formas.push({ t:'line', x1:codo, y1:ramaY + hFila/2, x2:codo, y2:y, stroke:P.linea });
      formas.push({ t:'line', x1:codo, y1:y, x2:x - HOLG, y2:y, stroke:P.linea });
    } else {
      const codo = (xR + wR + x) / 2;
      formas.push({ t:'line', x1:xR + wR, y1:H/2, x2:codo, y2:H/2, stroke:P.linea });
      formas.push({ t:'line', x1:codo, y1:H/2, x2:codo, y2:y, stroke:P.linea });
      formas.push({ t:'line', x1:codo, y1:y, x2:x - HOLG, y2:y, stroke:P.linea });
      ramaY = y;
    }
    formas.push({ t:'rect', x, y:y - hFila/2, w:ww, h:hFila, rx:E3, tono:f, sec:sub, rol:'pieza' });
    rotulos.push({ x:x + ww/2, y, w:wtx, t:it.t, s:it.d, tono:f, sec:sub, forma:'rect', al:'left',
      fs: sub ? 0.88 : 0.95 });
  });
  return { H, formas, rotulos };
}

/* ---------- matriz 3×3 ---------- */
function dispMatriz3(items, P) {
  const g = E3, w = (W - g * 2) / 3;
  const wTx = w - aireInt(w) * 2;
  /* El mismo suelo por proporción que en la matriz de dos por dos. */
  const hb = Math.round(clamp(altoMax(items, wTx, P.uT, 0.9) + E5 * 2, w * 0.46, (hUtil(P) - g * 2) / 3));
  const H = hb * 3 + g * 2;
  const formas = [], rotulos = [];
  for (let i = 0; i < 9; i++) {
    const it = items[i] || { t:'' };
    const c = i % 3, r = Math.floor(i / 3);
    const x = c * (w + g), y = r * (hb + g), f = P.rampa(r, 3);
    formas.push({ t:'rect', x, y, w, h:hb, rx:E4, tono:f, sec:true, rol:'pieza' });
    rotulos.push({ x:x + w/2, y:y + hb/2, w:wTx, t:it.t, s:it.d, tono:f, sec:true, forma:'rect', al:'center', fs:0.9 });
  }
  return { H, formas, rotulos };
}

/* ---------- contraste a dos columnas ----------
   Los elementos sin marcar son los encabezados; los marcados como «sub» caen
   bajo el último. Para ventajas contra limitaciones. */
function dispContraste(items, P) {
  const cabs = [], col = [[], []];
  let cur = -1;
  items.forEach(it => {
    if (!(+it.lvl > 0) && cabs.length < 2) { cabs.push(it); cur = cabs.length - 1; }
    else if (cur >= 0) col[cur].push(it);
    else col[0].push(it);
  });
  while (cabs.length < 2) cabs.push({ t: cabs.length ? 'Limitaciones' : 'Ventajas' });
  const g2 = E6, w = (W - g2) / 2, wTx = w - aireInt(w) * 2;
  const filas = Math.max(col[0].length, col[1].length, 1);
  const hCab = Math.round(Math.max(88, altoMax(cabs, wTx, P.uT) + E5 * 2));
  const todas = col[0].concat(col[1]);
  const hf = Math.round(Math.max(56, altoMax(todas.length ? todas : cabs, wTx, P.uT, 0.9) + E3 * 2));
  const g = E2, hueco = E5;
  const H = hCab + hueco + filas * (hf + g) - g;
  const formas = [], rotulos = [];
  const tonos = [P.serie[0], P.serie[1]];
  [0, 1].forEach(k => {
    const x = k * (w + g2);
    formas.push({ t:'rect', x, y:0, w, h:hCab, rx:E4, tono:tonos[k], rol:'pieza' });
    rotulos.push({ x:x + w/2, y:hCab/2, w:wTx, t:cabs[k].t, s:cabs[k].d, tono:tonos[k], forma:'rect', al:'center' });
    col[k].forEach((it, i) => {
      const y = hCab + hueco + i * (hf + g);
      formas.push({ t:'rect', x, y, w, h:hf, rx:E3, tono:tonos[k], sec:true, rol:'pieza' });
      rotulos.push({ x:x + w/2, y:y + hf/2, w:wTx, t:it.t, s:it.d, tono:tonos[k], sec:true, forma:'rect', al:'left', fs:0.9 });
    });
  });
  /* Antes había una línea en la mitad; con un canal de 32 no hace falta, y una
     raya menos es una cosa menos que mirar. */
  return { H, formas, rotulos };
}

const DISPOSICIONES = { proceso:dispProceso, flujo:dispFlujo, lista:dispLista, ciclo:dispCiclo, jerarquia:dispJerarquia,
  piramide:dispPiramide, embudo:dispEmbudo, radial:dispRadial, venn:dispVenn, cronologia:dispCronologia, matriz:dispMatriz,
  espina:dispEspina, capas:dispCapas, gantt:dispGantt, mapa:dispMapa, matriz3:dispMatriz3, contraste:dispContraste };

function smartLayout(b, deck, anchoPx) {
  const P = smartPal(deck, acabadoDe(b));
  /* El cuerpo de letra, medido en unidades del lienzo, es lo que decide cuánto
     tienen que crecer las cajas. Sin ancho conocido —el exportador a TikZ no lo
     tiene— se supone el diagrama a lo ancho del cuerpo de la diapositiva. */
  P.cpx = cuerpoPx(deck);
  const px = anchoPx || 1188 * clamp((b && b.w || 84) / 100, 0.4, 1);
  P.uT = clamp(P.cpx * 1000 / Math.max(240, px), 15, 42);
  const k = SK[b.kind] ? b.kind : 'proceso';
  const lim = SK[k];
  let items = (b.items || []).filter(x => x && (x.t || x.d));
  if (!items.length) items = [{ t:'Elemento' }];
  if (items.length > lim.max) items = items.slice(0, lim.max);
  while (items.length < lim.min) items = items.concat([{ t:'Elemento ' + (items.length + 1) }]);
  return Object.assign(aplicaAcabado(DISPOSICIONES[k](items, P), P), { P, k, items });
}

/* ---------- render ---------- */
function renderSmart(b, deck, mode, availPx) {
  const anchoPx = Math.round((availPx || 1188) * (b.w || 84) / 100);
  const L = smartLayout(b, deck, anchoPx);
  const k = anchoPx / W;                      /* unidades → px de diapositiva */
  const cont = h('div', { class: 'smart-box sa-' + L.P.acab, style: `width:${anchoPx}px;height:${Math.round(L.H * k)}px` });

  const svg = sv('svg', { viewBox: `0 0 ${W} ${L.H}`, width: anchoPx, height: Math.round(L.H * k),
    class: 'smart-svg ac-' + L.P.acab, role: 'img', 'aria-label': b.caption || SK[L.k].n });
  const defs = sv('defs');
  const mid = 'fl' + (b.id || 'x');
  defs.append(sv('marker', { id: mid, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
    sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: L.P.linea })));
  svg.append(defs);

  const gr = f => f.stroke ? (f.grosor || 2.5) : 0;
  L.formas.forEach(f => {
    if (f.t === 'rect') svg.append(sv('rect', { x:f.x, y:f.y, width:f.w, height:f.h, rx:f.rx || 0,
      fill:f.fill || 'none', stroke:f.stroke || 'none', 'stroke-width':gr(f), opacity:f.op == null ? 1 : f.op }));
    else if (f.t === 'circle') svg.append(sv('circle', { cx:f.cx, cy:f.cy, r:f.r,
      fill:f.fill || 'none', stroke:f.stroke || 'none', 'stroke-width':gr(f), opacity:f.op == null ? 1 : f.op }));
    else if (f.t === 'path') svg.append(sv('path', { d:f.d, fill:f.fill || 'none', stroke:f.stroke || 'none',
      'stroke-width':gr(f), 'stroke-linejoin':'round', opacity:f.op == null ? 1 : f.op }));
    /* Los gruesos están calibrados contra los del TikZ: en el lienzo de 1000
       una unidad vale 0.31 pt, así que 2.5 aquí son los 0.8 pt de allí. Si se
       tocan, la pantalla y el PDF dejan de decir lo mismo. */
    else if (f.t === 'line') svg.append(sv('line', { x1:f.x1, y1:f.y1, x2:f.x2, y2:f.y2,
      stroke:f.stroke, 'stroke-width':f.gruesa ? 3.6 : f.tenue ? 1.4 : 2.5, 'stroke-linecap':'round',
      opacity: f.tenue ? .5 : 1,
      'marker-end': f.flecha ? `url(#${mid})` : null }));
    else if (f.t === 'arc') svg.append(sv('path', { d:`M${f.x1.toFixed(1)},${f.y1.toFixed(1)} A${(f.r).toFixed(1)},${(f.ry || f.r).toFixed(1)} 0 0,1 ${f.x2.toFixed(1)},${f.y2.toFixed(1)}`,
      fill:'none', stroke:f.stroke, 'stroke-width':2.5, 'marker-end': f.flecha ? `url(#${mid})` : null }));
  });
  cont.append(svg);

  /* Rótulos en HTML: se ajustan solos y admiten $matemáticas$. Con lang="es" y
     guionado el navegador parte «caracterización» por sílabas en vez de dejarla
     salirse de su caja, que es lo mismo que hace babel-spanish en el PDF. */
  L.rotulos.forEach(r => {
    const el = h('div', { lang: 'es',
      class: 'smart-rot' + (r.num ? ' es-num' : '') + (r.al === 'left' ? ' al-izq' : ''),
      style: `left:${(r.x / W) * 100}%;top:${(r.y / L.H) * 100}%;width:${(r.w / W) * 100}%;color:${r.col}` +
        ';hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word' +
        (r.fs && r.fs !== 1 ? `;font-size:${(0.74 * fsOk(r.fs)).toFixed(3)}em` : '') });
    /* text-wrap:balance reparte las líneas del rótulo en vez de dejar una
       palabra suelta abajo; donde no exista, se ajusta como siempre. */
    el.append(h('span', { class: 'sr-t', style: 'text-wrap:balance', html: inlineRich(r.t || '') }));
    if (r.s) el.append(h('span', { class: 'sr-d', style: 'text-wrap:pretty', html: inlineRich(r.s) }));
    cont.append(el);
  });
  return cont;
}

/* Icono de cada acabado: la misma pieza con las cuatro pieles. */
function acabadoIcon(id) {
  const s = sv('svg', { width: 46, height: 26, viewBox: '0 0 46 26' });
  const c = 'currentColor';
  const caja = (x, at) => s.append(sv('rect', Object.assign({ x, y: 5, width: 17, height: 16, rx: 3.5 }, at)));
  if (id === 'relleno') { caja(4, { fill: c, opacity: .9 }); caja(25, { fill: c, opacity: .5 }); }
  else if (id === 'contorno') { caja(4, { fill: 'none', stroke: c, 'stroke-width': 2 }); caja(25, { fill: 'none', stroke: c, 'stroke-width': 2, opacity: .55 }); }
  else if (id === 'editorial') {
    caja(4, { fill: c, opacity: .1 }); caja(25, { fill: c, opacity: .1 });
    s.append(sv('rect', { x: 4, y: 5, width: 3, height: 16, rx: 1.5, fill: c }));
    s.append(sv('rect', { x: 25, y: 5, width: 3, height: 16, rx: 1.5, fill: c, opacity: .55 }));
  } else {
    s.append(sv('rect', { x: 6, y: 8, width: 17, height: 16, rx: 3.5, fill: c, opacity: .18 }));
    s.append(sv('rect', { x: 27, y: 8, width: 17, height: 16, rx: 3.5, fill: c, opacity: .12 }));
    caja(4, { fill: c, opacity: .62 }); caja(25, { fill: c, opacity: .38 });
  }
  return s;
}

/* icono para el selector */
function smartIcon(id) {
  const s = sv('svg', { width: 52, height: 34, viewBox: '0 0 52 34' });
  const c = 'currentColor';
  const R = (x, y, w, hh, o) => s.append(sv('rect', { x, y, width:w, height:hh, rx:2.5, fill:c, opacity:o || 1 }));
  const C = (x, y, r, o) => s.append(sv('circle', { cx:x, cy:y, r, fill:c, opacity:o || 1 }));
  const P2 = (d, o) => s.append(sv('path', { d, fill:c, opacity:o || 1 }));
  const Ln = d => s.append(sv('path', { d, fill:'none', stroke:c, 'stroke-width':1.6, opacity:.55 }));
  switch (id) {
    case 'proceso': [2,19,36].forEach((x,i)=>P2(`M${x},9 h11 l4,4 l-4,4 h-11 l4,-4 z`, .45+i*.2)); break;
    case 'flujo': R(6,2,22,7,.9); R(6,13,22,7,.7); R(6,24,22,7,.5);
      Ln('M17,9 v4 M17,20 v4 M17,11 h16 M17,22 h16'); R(35,8,15,5,.4); R(35,19,15,5,.32); break;
    case 'lista': [4,14,24].forEach((y,i)=>{R(2,y,48,7,.35+i*.2);}); break;
    case 'ciclo': Ln('M26,4 a13,13 0 1,1 -0.1,0'); C(26,5,4.5); C(37,17,4.5,.8); C(31,29,4.5,.6); C(15,29,4.5,.5); C(15,17,4.5,.4); break;
    case 'jerarquia': R(19,2,14,7); Ln('M26,9 v6 M8,15 h36 M8,15 v5 M26,15 v5 M44,15 v5'); R(3,20,10,7,.5); R(21,20,10,7,.5); R(39,20,10,7,.5); break;
    case 'piramide': P2('M26,2 l7,8 h-14 z'); P2('M18,11 l16,0 l5,7 h-26 z',.7); P2('M12,19 l28,0 l5,8 h-38 z',.45); break;
    case 'embudo': P2('M2,3 h48 l-8,7 h-32 z'); P2('M11,11 h30 l-6,7 h-18 z',.7); P2('M18,19 h16 l-5,8 h-6 z',.45); break;
    case 'radial': Ln('M26,17 L26,6 M26,17 L38,12 M26,17 L38,24 M26,17 L14,24 M26,17 L14,12'); C(26,17,7); C(26,5,4,.6); C(40,11,4,.6); C(40,25,4,.6); C(12,25,4,.6); C(12,11,4,.6); break;
    case 'venn': C(20,17,11,.5); C(32,17,11,.5); break;
    case 'espina': Ln('M3,17 h40'); R(42,12,8,10,.9); Ln('M12,17 L20,6 M22,17 L30,6 M17,17 L25,28 M27,17 L35,28');
      R(16,3,10,4,.55); R(26,3,10,4,.5); R(21,27,10,4,.45); R(31,27,10,4,.4); break;
    case 'capas': [3,10,17,24].forEach((y,i)=>R(6,y,32,5,.35+i*.18)); Ln('M41,4 v27'); break;
    case 'gantt': R(2,4,12,5,.8); R(16,12,20,5,.6); R(10,20,16,5,.45); R(26,27,20,5,.35); break;
    case 'mapa': R(2,13,13,8,.9); Ln('M15,17 h6 M21,7 v20 M21,7 h6 M21,17 h6 M21,27 h6'); R(27,4,14,5,.6); R(27,14,14,5,.5); R(27,24,14,5,.4); break;
    case 'matriz3': for(let r=0;r<3;r++)for(let c2=0;c2<3;c2++)R(2+c2*17,2+r*11,15,9,.3+((r*3+c2)/9)*.6); break;
    case 'contraste': R(2,2,22,6,.9); R(28,2,22,6,.7); [11,19,27].forEach((y,i)=>{R(2,y,22,6,.4+i*.06); R(28,y,22,6,.3+i*.06);}); break;
    case 'cronologia': Ln('M2,17 h48'); [8,20,32,44].forEach((x,i)=>{C(x,17,3.5,.5+i*.12); R(x-5,i%2?22:6,10,5,.3);}); break;
    default: R(2,2,23,13,.45); R(27,2,23,13,.6); R(2,19,23,13,.75); R(27,19,23,13,.9);
  }
  return s;
}


