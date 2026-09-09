/* ==== 45b-estructura-dibujo.js ==== */
'use strict';
/* ================= de la estructura al dibujo =================
   Entra una estructura saneada {atomos, enlaces, estilo} y un tema; sale un
   dibujo — nodos SVG para la pantalla, coordenadas de TikZ para el PDF—. Aquí
   no se pregunta por el estado de la app ni por el editor: lo que hace falta
   saber del tema entra por el argumento.
   Las dos salidas leen la MISMA tabla de tintas (`tintasEstructura`) y la misma
   geometría (`trazosEnlace`): sin eso, un rótulo de nitrógeno sale azul en
   pantalla y negro en el papel, que es justo lo que pasaba aquí. */

/* El color de cada elemento, en sus dos versiones. Los tonos de siempre están
   pensados para papel blanco: sobre un tema nocturno el azul del N se quedaba
   en 2,6 de contraste y el morado del I en 1,9, o sea ilegibles a diez metros.
   La versión clara mantiene el mismo matiz subido de luz, y así el N sigue
   siendo azul y el O rojo, que es lo que el ojo del químico busca. */
const COLOR_ELEM = { N: '#2b58c4', O: '#c0392b', S: '#9a7d08', P: '#c1620b', F: '#1e8449', Cl: '#1e8449', Br: '#8e4b10', I: '#6c3483' };
const COLOR_ELEM_OSCURO = { N: '#8fb0f7', O: '#f58c7a', S: '#e3c24a', P: '#f0a45e', F: '#62cb93', Cl: '#62cb93', Br: '#d89a6a', I: '#c69be0' };

/* La única decisión de color de la figura, y la leen las dos salidas: qué
   paleta de elementos toca y contra qué fondo se recorta el rótulo. `oscuro`
   solo se pasa desde el lienzo del editor, que va con el tema de la app y no
   con el de la diapositiva; en la diapositiva manda el tema del mazo. */
function tintasEstructura(deck, oscuro) {
  const th = temaDe(deck) || {};
  const osc = oscuro == null ? !!th.dark : !!oscuro;
  return { oscuro: osc, paleta: osc ? COLOR_ELEM_OSCURO : COLOR_ELEM, fondo: th.bg || (osc ? '#1B2127' : '#FFFFFF') };
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
   las valencias imposibles. `oscuro` lo trae quien llama —el lienzo va con el
   tema de la app— y, si no viene, manda el tema del mazo. */
function svgEstructura(b, deck, colorTinta, enEditor, oscuro) {
  const e = b.est || estructuraVacia();
  const m = estiloEstructura(e);
  const caja = cajaEstructura(e);
  const tinta = colorTinta || 'currentColor';
  const T = tintasEstructura(deck, oscuro);
  const paleta = T.paleta;
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
    g.append(sv('circle', { cx: a.x, cy: a.y, r: (m.cuerpo * 0.66).toFixed(1), fill: `var(--sbg, ${T.fondo})`, opacity: .96 }));
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
function estructuraTikz(b, p, deck) {
  const e = b.est || estructuraVacia();
  if (!e.atomos.length) return p + '% (estructura vacía)';
  const m = estiloEstructura(e);
  const T = tintasEstructura(deck);
  const reg = registroColores();
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
    /* El rótulo se recorta contra el fondo del tema —«white» dejaba un parche
       blanco en los temas oscuros— y lleva el color del elemento, el mismo que
       la pantalla: hasta ahora el N salía azul en el lienzo y negro en el PDF. */
    const col = T.paleta[et.el];
    const colTx = col ? `, text=${reg.n(col)}` : '';
    L.push(p + `  \\node[fill=${reg.n(T.fondo, 'white')}, inner sep=1pt${colTx}, font=\\fontsize{${fs.toFixed(1)}}{${(fs * 1.2).toFixed(1)}}\\selectfont] at (${X(a.x)},${Y(a.y)}) {$\\${mate}{${cuerpo}}$};`);
  });
  L.push(p + '\\end{tikzpicture}');
  /* Las declaraciones de color van antes del dibujo. */
  if (reg.defs.length) L.unshift(...reg.defs.map(d => p + d));
  return L.join('\n');
}
