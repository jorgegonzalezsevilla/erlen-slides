/* ==== 22-guias.js ==== */
'use strict';
/* ================= guías de alineación y ajuste de anchura =================
   Los bloques con anchura propia —figura, gráfica, video y diagrama— se
   pueden estirar arrastrando su borde. Mientras arrastras aparecen guías:
   los márgenes del cuerpo, el centro, las fracciones habituales y la anchura
   de los demás bloques de la diapositiva, para que queden iguales. */

const CON_ANCHO = { image: 70, chart: 78, func: 78, video: 70, smart: 84 };
const SEL_ANCHO = { image: '.imgwrap', chart: '.chart-holder', func: '.chart-holder', video: '.vid-wrap', smart: '.smart-box' };
const FRACCIONES = [[25, 'un cuarto'], [33.3, 'un tercio'], [50, 'la mitad'], [66.7, 'dos tercios'], [75, 'tres cuartos'], [100, 'todo el ancho']];
const IMAN = 1.8;   /* % de tolerancia del ajuste */

function anchoDe(b) { return b.w != null ? b.w : (CON_ANCHO[b.type] || 100); }

/* Candidatos a los que puede ajustarse, con su explicación. */
function imanes(idActual) {
  const out = FRACCIONES.map(([v, n]) => ({ v, n }));
  const sl = curSlide();
  zonas(sl).forEach(arr => arr.forEach(b => {
    if (b.id === idActual || !CON_ANCHO[b.type]) return;
    const nom = (BLOCK_DEFS.find(x => x.id === b.type) || {}).name || 'bloque';
    out.push({ v: anchoDe(b), n: 'igual que la ' + nom.toLowerCase() });
  }));
  return out;
}
function ajusta(v, lista) {
  let mejor = null;
  lista.forEach(c => { const d = Math.abs(c.v - v); if (d <= IMAN && (!mejor || d < Math.abs(mejor.v - v))) mejor = c; });
  return mejor;
}

/* Capa de guías sobre el lienzo, en coordenadas de la diapositiva. */
function capaGuias() {
  let capa = $('#stageInner .guias');
  if (!capa) {
    capa = h('div', { class: 'guias' });
    const sl = $('#stageInner .slide');
    if (!sl) return null;
    sl.append(capa);
  }
  return capa;
}
function quitaGuias() { const c = $('#stageInner .guias'); if (c) c.remove(); }

/* Dibuja las guías para una anchura dada dentro de un contenedor. */
function pintaGuias(cont, pct, etiqueta) {
  const capa = capaGuias(); if (!capa) return;
  capa.innerHTML = '';
  const slide = $('#stageInner .slide');
  const rs = slide.getBoundingClientRect(), rc = cont.getBoundingClientRect();
  const z = effZoom();
  const izq = (rc.left - rs.left) / z, ancho = rc.width / z;
  const cen = izq + ancho / 2;
  const medio = ancho * pct / 100;
  const a = cen - medio / 2, b = cen + medio / 2;
  const linea = (x, cls) => capa.append(h('i', { class: 'g-v ' + (cls || ''), style: `left:${x}px` }));
  linea(izq, 'g-margen'); linea(izq + ancho, 'g-margen');
  linea(cen, 'g-centro');
  linea(a, 'g-borde'); linea(b, 'g-borde');
  capa.append(h('span', { class: 'g-rotulo', style: `left:${cen}px` }, etiqueta));
}

/* Manijas de anchura sobre el bloque seleccionado: una a cada lado, como se
   espera de una figura, y la figura crece o encoge por su centro. */
function montaManija(el, b) {
  if (!CON_ANCHO[b.type]) return;
  const dentro = el.querySelector(SEL_ANCHO[b.type]);
  if (!dentro) return;
  manijaLado(el, b, dentro, 1);
  manijaLado(el, b, dentro, -1);
}
function manijaLado(el, b, dentro, lado) {
  const k = clamp(1 / effZoom(), 0.6, 2.4);
  const manija = h('button', { class: 'ancho-asa' + (lado < 0 ? ' asa-izq' : ''), title: 'Arrastra para cambiar la anchura',
    'aria-label': 'Cambiar la anchura', style: `transform:scale(${k})` });
  manija.addEventListener('click', e => e.stopPropagation());
  manija.addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation();
    try { manija.setPointerCapture(ev.pointerId); } catch (e) {}
    const cont = dentro.parentElement;
    const anchoCont = cont.getBoundingClientRect().width;
    const w0 = anchoDe(b), x0 = ev.clientX;
    const vectorial = b.type === 'chart' || b.type === 'func' || b.type === 'smart' || b.type === 'estruct' || b.type === 'montaje';
    const lista = imanes(b.id);
    document.body.classList.add('arrastra-ancho');
    const mueve = e => {
      const d = lado * (e.clientX - x0) / Math.max(1, anchoCont) * 200;   /* crece por los dos lados */
      let v = clamp(w0 + d, 15, 100);
      const im = ajusta(v, lista);
      if (im) v = im.v;
      b.w = Math.round(v * 10) / 10;
      if (vectorial) {
        /* Gráficas y diagramas se dibujan en píxeles: durante el arrastre se
           escalan enteros y se redibujan al soltar, que es más fluido. */
        dentro.style.transformOrigin = 'center top';
        dentro.style.transform = 'scale(' + (b.w / w0).toFixed(4) + ')';
      } else {
        dentro.style.width = b.w + '%';
      }
      pintaGuias(cont, b.w, b.w.toFixed(0) + ' %' + (im ? ' · ' + im.n : ''));
    };
    const suelta = () => {
      manija.removeEventListener('pointermove', mueve);
      manija.removeEventListener('pointerup', suelta);
      manija.removeEventListener('pointercancel', suelta);
      document.body.classList.remove('arrastra-ancho');
      quitaGuias();
      dentro.style.transform = '';
      commit({ skipInsp: true });
    };
    manija.addEventListener('pointermove', mueve);
    manija.addEventListener('pointerup', suelta);
    manija.addEventListener('pointercancel', suelta);
  });
  el.append(manija);
}


