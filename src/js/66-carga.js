/* ==== 66-carga.js ==== */
'use strict';
/* ================= carga cognitiva, con diagnóstico =================
   No una calificación, sino tres cosas medibles por diapositiva con el arreglo
   al lado. Vienen de los principios con más evidencia en Mayer y Sweller:
   redundancia (lo que dirás ya está escrito), atención dividida (el ojo tiene
   que ir y venir) y señalización (nada indica qué mirar). */

const raicesDe = txt => new Set((String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .match(/[a-z0-9]{4,}/g) || []).map(w => w.slice(0, 5)));
function solape(a, b) {
  const A = raicesDe(a), B = raicesDe(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(x => { if (B.has(x)) n++; });
  return n / Math.min(A.size, B.size);
}
function textoEnPantalla(sl) {
  const t = [sl.title || ''];
  zonas(sl).flat().forEach(b => {
    if (b.type === 'code') return;
    if (typeof b.text === 'string') t.push(b.text);
    if (typeof b.body === 'string') t.push(b.body);
    if (Array.isArray(b.items)) b.items.forEach(i => t.push(i && i.t || ''));
  });
  return t.join('\n');
}
const ES_FIG = b => ['image', 'chart', 'func', 'galeria', 'video', 'montaje', 'estruct', 'geo', 'smart'].includes(b.type);
const GRADO_N = { baja: 0, media: 1, alta: 2 };

function cargaDe(sl, deck) {
  const d = deck || S.deck;
  const bloques = zonas(sl).flat();
  const W = palabrasEnPantalla(sl);
  const notas = String(sl.notes || '');
  const figs = bloques.filter(ES_FIG);
  const out = {};

  /* --- redundancia --- */
  {
    const s = notas.trim().length >= 40 ? solape(textoEnPantalla(sl), notas) : 0;
    let g = 'baja', txt = 'El texto en pantalla y lo que dirás se complementan.', fix = '';
    if (W > 90) { g = 'alta'; txt = W + ' palabras en pantalla: el público las lee y deja de escucharte.'; fix = 'Deja las cinco o seis palabras clave y pasa el resto a las notas.'; }
    else if (W > 45 && s > 0.5) { g = 'alta'; txt = 'Lo que vas a decir ya está escrito (' + Math.round(s * 100) + '% de coincidencia con tus notas).'; fix = 'Quita de la diapositiva lo que vas a decir de viva voz; en pantalla solo lo que ayuda a seguirte.'; }
    else if (W > 40 && s > 0.35) { g = 'media'; txt = 'Buena parte de lo que dirás está escrito (' + Math.round(s * 100) + '%).'; fix = 'Recorta el texto a lo esencial y deja la explicación en las notas.'; }
    else if (W > 60) { g = 'media'; txt = W + ' palabras: bastante para una diapositiva hablada.'; fix = 'Parte el contenido en dos diapositivas o resume.'; }
    out.redundancia = { g, txt, fix, W, s };
  }
  /* --- atención dividida --- */
  {
    let g = 'baja', txt = 'Lo que hay que ver y lo que hay que leer están juntos.', fix = '';
    const zs = zonas(sl);
    let textoLejos = 0;
    if (figs.length) {
      zs.forEach(z => {
        if (z.some(ES_FIG)) return;
        z.forEach(b => { if (typeof b.text === 'string') textoLejos += cuentaPalabras(b.text); if (Array.isArray(b.items)) b.items.forEach(i => { textoLejos += cuentaPalabras(i && i.t); }); });
      });
    }
    const tablasGrandes = bloques.filter(b => b.type === 'table' && b.rows && (b.rows[0] || []).length > 6 || b.type === 'table' && b.rows && b.rows.length > 8);
    const sinPie = figs.filter(b => !(b.caption || '').trim());
    if (figs.length >= 2) { g = 'media'; txt = figs.length + ' figuras a la vez: la mirada va y viene y no sabe cuál importa.'; fix = 'Una figura por diapositiva; si hay que comparar, usa antes/después o una galería con letras.'; }
    if (textoLejos > 60) { g = 'alta'; txt = 'Una figura de un lado y ' + textoLejos + ' palabras del otro: hay que leer y mirar a la vez.'; fix = 'Deja junto a la figura solo las palabras que dicen qué mirar; lo demás lo dices tú.'; }
    else if (textoLejos > 35 && g !== 'alta') { g = 'media'; txt = 'Figura en una columna y ' + textoLejos + ' palabras en la otra.'; fix = 'Acorta el texto o pon el mensaje como pie de la figura.'; }
    if (tablasGrandes.length && g === 'baja') { g = 'media'; txt = 'Una tabla grande: el ojo tiene que buscar la celda que importa.'; fix = 'Resalta la fila o columna clave, o muestra solo las que vas a comentar.'; }
    if (sinPie.length && figs.length && g === 'baja') { g = 'media'; txt = 'La figura no tiene pie: cada quien mira algo distinto.'; fix = 'Un pie de una línea que diga qué hay que ver.'; }
    out.atencion = { g, txt, fix };
  }
  /* --- señalización --- */
  {
    let g = 'baja', txt = 'Se sabe qué mirar y qué es lo importante.', fix = '';
    const vin = bloques.filter(b => b.type === 'bullets').reduce((n, b) => n + (b.items || []).length, 0);
    const enfasis = /\*\*[^*]+\*\*/.test(textoEnPantalla(sl)) || bloques.some(b => b.type === 'bblock' || b.type === 'teorema') || !!sl.clave;
    const gen = sl.layout !== 'title' && sl.layout !== 'section' && sl.layout !== 'toc' && !sl.bibAuto && !esCierre(sl.title) && !esAfirmacion(sl.title);
    if (vin > 6) { g = 'alta'; txt = vin + ' viñetas: es un documento, no una diapositiva.'; fix = 'Seis o menos, y que cada una sea una idea completa.'; }
    else if (gen && (W > 25 || figs.length)) { g = 'media'; txt = 'El título no dice qué pasa, así que nada anuncia qué buscar en la diapositiva.'; fix = 'Escribe en el título la conclusión: es la señal más fuerte que tienes.'; }
    else if (W > 40 && !enfasis && !figs.length) { g = 'media'; txt = 'Todo el texto pesa igual: nada destaca.'; fix = 'Pon en negritas la frase clave o mételo en una caja.'; }
    out.senal = { g, txt, fix };
  }
  const peor = ['redundancia', 'atencion', 'senal'].reduce((m, k) => Math.max(m, GRADO_N[out[k].g]), 0);
  out.nivel = ['baja', 'media', 'alta'][peor];
  return out;
}
function cargaMazo(deck) {
  const d = deck || S.deck;
  return d.slides.map((sl, i) => ({ i, sl, c: (sl.layout === 'title' || sl.layout === 'section' || sl.layout === 'toc') ? null : cargaDe(sl, d) }));
}

/* ---------- la ventana ---------- */
const NOMBRE_CARGA = { redundancia: 'Redundancia', atencion: 'Atención dividida', senal: 'Señalización' };
const PORQUE_CARGA = {
  redundancia: 'Leer y escuchar el mismo texto a la vez sobrecarga: el público hace las dos cosas peor (principio de redundancia).',
  atencion: 'Cuando la palabra y la imagen están separadas, hay que sostener una en la memoria mientras se busca la otra (atención dividida).',
  senal: 'Marcar qué es lo importante —en el título, en negritas, en una caja— guía la atención y libera memoria de trabajo (señalización).'
};
function openCarga() {
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const todo = cargaMazo(S.deck);
    /* tira del mazo */
    const tira = h('div', { class: 'cg-tira' });
    todo.forEach(x => tira.append(h('button', { class: 'cg-celda' + (x.c ? ' g-' + x.c.nivel : ' g-nada') + (x.i === S.cur ? ' on' : ''),
      title: (x.i + 1) + '. ' + (x.sl.title || '(sin título)') + (x.c ? ' · carga ' + x.c.nivel : ''),
      onclick: () => { S.cur = x.i; S.selBlock = null; renderAll(); pinta(); } }, String(x.i + 1))));
    const altas = todo.filter(x => x.c && x.c.nivel === 'alta').length, medias = todo.filter(x => x.c && x.c.nivel === 'media').length;
    cuerpo.append(h('div', { class: 'panel-label' }, 'Toda la charla'), tira,
      h('p', { class: 'hint', style: 'margin:4px 0 12px' }, altas + (altas === 1 ? ' diapositiva con carga alta' : ' con carga alta') + ' · ' + medias + ' con carga media. Haz clic en una para verla.'));
    const sl = curSlide();
    const c = todo[S.cur].c;
    cuerpo.append(h('div', { class: 'panel-label' }, 'Diapositiva ' + (S.cur + 1) + ' · ' + (sl.title || '(sin título)')));
    if (!c) { cuerpo.append(h('p', { class: 'hint' }, 'Portada, sección o índice: aquí no aplica.')); return; }
    ['redundancia', 'atencion', 'senal'].forEach(k => {
      const r = c[k];
      cuerpo.append(h('div', { class: 'cg-fila g-' + r.g },
        h('div', { class: 'cg-medidor' }, ...[0, 1, 2].map(n => h('span', { class: 'cg-p' + (n <= GRADO_N[r.g] ? ' on' : '') }))),
        h('div', { class: 'cg-txt' },
          h('b', null, NOMBRE_CARGA[k] + ' · ' + r.g),
          h('span', null, r.txt),
          r.fix ? h('em', null, '→ ' + r.fix) : '',
          h('small', null, PORQUE_CARGA[k]))));
    });
  };
  pinta();
  openModal({ title: 'Carga cognitiva', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


