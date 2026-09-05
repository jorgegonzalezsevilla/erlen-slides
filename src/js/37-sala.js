/* ==== 37-sala.js ==== */
'use strict';
/* ================= simulacro de sala =================
   La condición dura del efecto IKEA: el trabajo lleva al cariño solo cuando
   ese trabajo tiene éxito. La mayoría de los desastres de una defensa —el gris
   sobre gris, la leyenda de 8 pt, las dos series rojo y verde— se ven aquí y
   no en la pantalla de la laptop. */

/* Una diapositiva de 16:9 mide 7.5 pulgadas de alto: 540 pt. De ahí sale el
   tamaño en puntos de cualquier texto medido en píxeles del lienzo. */
function ptEquivalente(px, deck) {
  const [, H] = slideDims(deck || S.deck);
  return px / H * 540;
}
/* Dos umbrales, porque no todo el texto hace lo mismo. El cuerpo tiene que
   leerse desde el fondo; los pies de figura y las etiquetas de eje son
   secundarios y en LaTeX siempre van más pequeños. */
const PT_MINIMO = 18;   // recomendado para el cuerpo
const PT_BAJO = 14;     // por debajo de esto es un problema, no una sugerencia
const PT_MINIMO_SEC = 11;
const SEC_SEL = 'figcaption, .tab-caption, .cap-label, .sublabel, text, .leyenda, .chart-leg,\n  .tp-meta, .tp-date, .tp-inst, .sec-kicker, .bblock-tit, .quote-by';

/* Recorre el texto realmente pintado y devuelve el más pequeño. */
function textoMasPequeno(i) {
  const wb = $('#workbench'); const antes = wb.innerHTML;
  wb.innerHTML = '';
  const raiz = renderSlide(S.deck, i, 'export', 99);
  wb.append(raiz);
  let min = null, donde = '', minSec = null, dondeSec = '';
  $$('*', raiz).forEach(el => {
    if (!el.childNodes.length) return;
    let propio = '';
    el.childNodes.forEach(n => { if (n.nodeType === 3) propio += n.textContent; });
    if (!propio.trim()) return;
    /* El pie y el número de página son pequeños a propósito: nadie los lee
       desde el fondo y no deben disparar el aviso. */
    if (el.closest('.notas-pdf, .footline, .pagenum, .fl-cell')) return;
    /* KaTeX arma la fórmula con decenas de capas internas de tamaño diminuto
       y con una copia en MathML que no se ve: la que cuenta es la raíz. */
    if (el.closest('.katex-mathml')) return;
    const kat = el.closest('.katex');
    if (kat && kat !== el) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    const px = parseFloat(cs.fontSize) || 0;
    if (px < 3) return;
    const sec = el.matches(SEC_SEL) || !!el.closest(SEC_SEL);
    if (sec) { if (minSec == null || px < minSec) { minSec = px; dondeSec = propio.trim().slice(0, 40); } }
    else if (min == null || px < min) { min = px; donde = propio.trim().slice(0, 40); }
  });
  wb.innerHTML = antes;
  if (min == null && minSec == null) return null;
  return {
    pt: min == null ? null : ptEquivalente(min), texto: donde,
    ptSec: minSec == null ? null : ptEquivalente(minSec), textoSec: dondeSec
  };
}

const SALA = { modo: 'proyector', vision: 'normal', lejos: false, i: 0 };
const SALA_MODOS = [
  { id: 'normal', n: 'Tal cual', d: 'Como se ve en tu pantalla.' },
  { id: 'proyector', n: 'Proyector', d: 'Contraste bajo y negros lavados: lo que hace un cañón de aula con años de uso.' },
  { id: 'luz', n: 'Sala con luz', d: 'Cortinas abiertas o luces encendidas: todo se aclara y el contraste se hunde.' }
];
const SALA_VISION = [
  { id: 'normal', n: 'Visión típica' },
  { id: 'deuter', n: 'Deuteranopía', d: 'La más común: rojo y verde se confunden. Afecta a uno de cada doce hombres.' },
  { id: 'protan', n: 'Protanopía', d: 'Los rojos pierden brillo y se acercan al gris.' }
];

function openSala() {
  SALA.i = S.cur;
  const cuerpo = h('div');
  const escena = h('div', { class: 'sala-escena' });
  const aviso = h('div', { class: 'sala-avisos' });
  const pie = h('p', { class: 'hint', style: 'margin-bottom:0' });

  const dibuja = () => {
    const [W, H] = slideDims(S.deck);
    const ancho = SALA.lejos ? 300 : 720;
    const k = ancho / W;
    escena.innerHTML = '';
    escena.className = 'sala-escena mod-' + SALA.modo + (SALA.lejos ? ' lejos' : '');
    const clip = h('div', { class: 'sala-clip', style: `width:${ancho}px;height:${Math.round(H * k)}px` });
    const sl = renderSlide(S.deck, SALA.i, 'export', 99);
    sl.style.transform = `scale(${k})`; sl.style.transformOrigin = 'top left';
    if (SALA.vision !== 'normal') sl.style.filter = 'url(#daltonismo-' + SALA.vision + ')';
    clip.append(sl);
    escena.append(clip);

    /* Comprobación de tamaño de letra, que es objetiva y no depende del ojo. */
    aviso.innerHTML = '';
    const chico = textoMasPequeno(SALA.i);
    if (chico && chico.pt != null) {
      const pt = Math.round(chico.pt);
      const clase = pt < PT_BAJO ? 'mal' : pt < PT_MINIMO ? 'medio' : 'bien';
      aviso.append(h('div', { class: 'sala-aviso ' + clase },
        h('b', null, pt + ' pt'),
        h('span', null, clase === 'mal'
          ? 'El cuerpo más pequeño de esta diapositiva no se va a leer desde el fondo. Súbelo en Diapositiva → Tamaño del texto, o quita contenido.'
          : clase === 'medio'
          ? 'El cuerpo más pequeño está en el límite. Lo cómodo desde el fondo de un aula son ' + PT_MINIMO + ' pt o más.'
          : 'El cuerpo se lee bien desde el fondo. El mínimo recomendado son ' + PT_MINIMO + ' pt.')));
    }
    if (chico && chico.ptSec != null && chico.ptSec < PT_MINIMO_SEC) {
      aviso.append(h('div', { class: 'sala-aviso mal' },
        h('b', null, Math.round(chico.ptSec) + ' pt'),
        h('span', null, 'Un pie de figura o una etiqueta de eje queda por debajo de ' + PT_MINIMO_SEC + ' pt: en la proyección desaparece.')));
    }
    const tit = (S.deck.slides[SALA.i].title || '').trim() || (LAY[S.deck.slides[SALA.i].layout] || {}).name || '';
    pie.textContent = 'Diapositiva ' + (SALA.i + 1) + ' de ' + S.deck.slides.length + (tit ? ' · ' + tit : '')
      + ' · ' + (SALA_MODOS.find(x => x.id === SALA.modo) || {}).d;
  };

  const barra = h('div', { class: 'sala-barra' });
  const segM = h('div', { class: 'seg' });
  SALA_MODOS.forEach(m => segM.append(h('button', { class: SALA.modo === m.id ? 'on' : '', title: m.d,
    onclick: e => { SALA.modo = m.id; $$('button', segM).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); dibuja(); } }, m.n)));
  const segV = h('div', { class: 'seg' });
  SALA_VISION.forEach(v => segV.append(h('button', { class: SALA.vision === v.id ? 'on' : '', title: v.d || '',
    onclick: e => { SALA.vision = v.id; $$('button', segV).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); dibuja(); } }, v.n)));
  const btnLejos = h('button', { class: 'btn btn-sm' + (SALA.lejos ? ' btn-pri' : ''),
    title: 'Reduce la diapositiva al tamaño angular de verla desde el fondo del aula',
    onclick: e => { SALA.lejos = !SALA.lejos; e.target.classList.toggle('btn-pri', SALA.lejos); dibuja(); } }, '⤡ Desde el fondo');
  barra.append(segM, segV, btnLejos);

  const nav = h('div', { class: 'sala-nav' },
    h('button', { class: 'btn btn-sm', onclick: () => { SALA.i = Math.max(0, SALA.i - 1); dibuja(); } }, '←'),
    h('button', { class: 'btn btn-sm', onclick: () => { SALA.i = Math.min(S.deck.slides.length - 1, SALA.i + 1); dibuja(); } }, '→'),
    h('button', { class: 'btn btn-sm', title: 'Revisa el tamaño de letra de todas', onclick: () => revisaLetraTodas() }, '⤓ Revisar todas'));

  cuerpo.append(barra, escena, aviso, nav, pie);
  dibuja();
  openModal({ title: 'Simulacro de sala', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
}

/* Lista de las diapositivas cuyo texto no se leería desde atrás. */
function revisaLetraTodas() {
  const malas = [], justas = [];
  S.deck.slides.forEach((sl, i) => {
    const c = textoMasPequeno(i);
    if (!c) return;
    if (c.pt != null && c.pt < PT_BAJO) malas.push({ i, pt: Math.round(c.pt), texto: c.texto, grado: 'mal' });
    else if (c.ptSec != null && c.ptSec < PT_MINIMO_SEC) malas.push({ i, pt: Math.round(c.ptSec), texto: c.textoSec, grado: 'mal' });
    else if (c.pt != null && c.pt < PT_MINIMO) justas.push(i);
  });
  const cuerpo = h('div');
  if (!malas.length) {
    cuerpo.append(h('div', { class: 'vacio-caja' },
      h('span', { class: 'vc-ic' }, '✓'),
      h('b', null, 'Nada queda ilegible'),
      h('p', null, 'Ninguna diapositiva baja de ' + PT_BAJO + ' pt equivalentes.'
        + (justas.length ? ' ' + justas.length + (justas.length === 1 ? ' está' : ' están') + ' entre ' + PT_BAJO + ' y ' + PT_MINIMO + ' pt: se leen, pero justo.' : ''))));
  } else {
    cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
      malas.length + (malas.length === 1 ? ' diapositiva no se leería' : ' diapositivas no se leerían') +
      ' desde el fondo (menos de ' + PT_BAJO + ' pt). Súbelo en Diapositiva → Tamaño del texto, o quita contenido.'
      + (justas.length ? ' Otras ' + justas.length + ' quedan entre ' + PT_BAJO + ' y ' + PT_MINIMO + ' pt.' : '')));
    malas.forEach(m => cuerpo.append(h('button', { class: 'rv-fila g-aviso',
      onclick: () => { S.cur = m.i; SALA.i = m.i; renderAll(); closeModal(); openSala(); } },
      h('span', { class: 'rv-i' }, String(m.i + 1)),
      h('span', { class: 'rv-tx' }, h('b', null, m.pt + ' pt · ' + ((S.deck.slides[m.i].title || '').trim() || 'Sin título')),
        h('span', null, '«' + m.texto + '…»')))));
  }
  openModal({ title: 'Tamaño de letra', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); openSala(); } }, 'Volver al simulacro')] });
}


