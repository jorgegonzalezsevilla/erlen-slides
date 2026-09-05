/* ==== 65-tutor.js ==== */
'use strict';
/* ================= el tutor que se desvanece =================
   Cada vez que la app acomoda algo por ti, te dice en una línea la razón.
   Cuando la aplicas tú solo tres veces seguidas, deja de explicártelo: es el
   andamiaje que se retira (Vygotsky, Wood y Bruner). La meta es que dentro
   de seis meses no necesites al tutor, no que dependas de él. */

const LECCIONES = [
  { id: 'afirmacion', n: 'El título dice la conclusión',
    por: 'Del título es de lo que se acuerda el público. «Resultados» no deja nada; «La banda prohibida baja con el yodo» sí. Escribe en el título lo que pasa.',
    aplica: sl => sl.layout !== 'title' && sl.layout !== 'toc' && sl.layout !== 'section' && !sl.bibAuto,
    cumple: sl => esCierre(sl.title) || esAfirmacion(sl.title) },
  { id: 'pie', n: 'Toda figura con pie',
    por: 'El pie dice qué hay que mirar; sin él, cada quien mira otra cosa. Además numera la figura para poder referirse a ella.',
    aplica: sl => zonas(sl).flat().some(b => ['image', 'chart', 'func', 'galeria', 'video', 'montaje'].includes(b.type)),
    cumple: sl => zonas(sl).flat().filter(b => ['image', 'chart', 'func', 'galeria', 'video', 'montaje'].includes(b.type)).every(b => (b.caption || '').trim()) },
  { id: 'una-figura', n: 'Una figura por diapositiva',
    por: 'Dos figuras compiten por la mirada y el público no sabe cuál importa. Si hay que comparar, van como antes y después, o cada una en su diapositiva.',
    aplica: sl => zonas(sl).flat().some(b => ['image', 'chart', 'func', 'galeria'].includes(b.type)),
    cumple: sl => zonas(sl).flat().filter(b => ['image', 'chart', 'func', 'galeria'].includes(b.type)).length <= 1 },
  { id: 'poco-texto', n: 'Poco texto junto a una figura',
    por: 'Leer y mirar a la vez no se puede: si hay una figura, el texto de al lado se queda en pocas palabras y la explicación la das tú (Mayer: redundancia y atención dividida).',
    aplica: sl => zonas(sl).flat().some(b => ['image', 'chart', 'func', 'galeria', 'montaje'].includes(b.type)),
    cumple: sl => palabrasEnPantalla(sl) <= 35 },
  { id: 'vinetas', n: 'Seis viñetas o menos',
    por: 'Más de seis viñetas ya es un documento: el público lee en vez de escucharte. Parte la lista o quédate con lo que vas a decir de verdad.',
    aplica: sl => zonas(sl).flat().some(b => b.type === 'bullets'),
    cumple: sl => zonas(sl).flat().filter(b => b.type === 'bullets').every(b => (b.items || []).length <= 6) },
  { id: 'notas', n: 'Lo que dices va en las notas',
    por: 'Lo que vas a decir no tiene que estar en pantalla. En las notas cabe la explicación completa, y la vista de presentador te la enseña a ti nada más.',
    aplica: sl => sl.layout !== 'title' && sl.layout !== 'toc' && sl.layout !== 'section' && !sl.bibAuto,
    cumple: sl => String(sl.notes || '').trim().length >= 40 }
];
const LEC_K = {};
LECCIONES.forEach(l => { LEC_K[l.id] = l; });
const APRENDIDA_EN = 3;

function palabrasEnPantalla(sl) {
  let n = cuentaPalabras(sl.title);
  zonas(sl).flat().forEach(b => {
    if (b.type === 'code') return;
    if (typeof b.text === 'string') n += cuentaPalabras(b.text);
    if (typeof b.body === 'string') n += cuentaPalabras(b.body);
    if (typeof b.caption === 'string') n += cuentaPalabras(b.caption);
    if (Array.isArray(b.items)) b.items.forEach(i => { n += cuentaPalabras(i && i.t); });
  });
  return n;
}

/* ---------- lo que sabe de ti ---------- */
function tutorEstado() {
  if (!S.prefs.tutor || typeof S.prefs.tutor !== 'object') S.prefs.tutor = {};
  return S.prefs.tutor;
}
function tutorDe(id) {
  const t = tutorEstado();
  if (!t[id]) t[id] = { aplicadas: 0, mostradas: 0, silencio: false, ultima: 0 };
  return t[id];
}
const leccionAprendida = id => { const e = tutorDe(id); return e.silencio || e.aplicadas >= APRENDIDA_EN; };
const tutorApagado = () => !!S.prefs.sinTutor;

/* ---------- la tarjeta ---------- */
let TUTOR_CARD = null;
function ensena(id, motivo) {
  const l = LEC_K[id];
  if (!l || tutorApagado() || leccionAprendida(id)) return false;
  const e = tutorDe(id);
  if (Date.now() - e.ultima < 90000) return false;         /* no repetir en un minuto y medio */
  e.ultima = Date.now(); e.mostradas++;
  guardaPrefs();
  if (TUTOR_CARD) TUTOR_CARD.remove();
  const card = h('div', { class: 'tutor-card', role: 'status' },
    h('div', { class: 'tutor-cab' }, h('span', { class: 'tutor-ic' }, '◔'), h('b', null, motivo || l.n)),
    h('p', null, l.por),
    h('div', { class: 'tutor-pie' },
      h('span', { class: 'tutor-prog' }, e.aplicadas ? 'Lo has aplicado tú ' + e.aplicadas + ' de ' + APRENDIDA_EN + ' veces' : 'Cuando lo apliques tú tres veces, dejo de decírtelo'),
      h('button', { class: 'btn btn-sm', onclick: () => cierra() }, 'Entendido'),
      h('button', { class: 'btn btn-sm btn-ghost', title: 'No volver a explicar esta regla', onclick: () => { e.silencio = true; guardaPrefs(); cierra(); } }, 'Ya lo sé')));
  const cierra = () => { card.classList.add('fuera'); setTimeout(() => card.remove(), 260); if (TUTOR_CARD === card) TUTOR_CARD = null; };
  document.body.append(card);
  TUTOR_CARD = card;
  setTimeout(() => { if (TUTOR_CARD === card) cierra(); }, 14000);
  return true;
}

/* ---------- contar lo que aplicas tú solo ----------
   Antes de cada cambio se toma foto de qué reglas cumple la diapositiva; si
   después de tu edición cumple una que antes no, y no fue la app quien la
   arregló, cuenta como aplicada por ti. */
let TUTOR_FOTO = null, TUTOR_AUTO = 0;
function tutorFoto() {
  const sl = curSlide();
  if (!sl) { TUTOR_FOTO = null; return; }
  const c = {};
  LECCIONES.forEach(l => { c[l.id] = l.aplica(sl) ? l.cumple(sl) : null; });
  TUTOR_FOTO = { id: sl.id, c };
}
function tutorObserva() {
  const sl = curSlide();
  if (!sl || !TUTOR_FOTO || TUTOR_FOTO.id !== sl.id || TUTOR_AUTO > 0 || tutorApagado()) { tutorFoto(); return; }
  LECCIONES.forEach(l => {
    const antes = TUTOR_FOTO.c[l.id];
    const ahora = l.aplica(sl) ? l.cumple(sl) : null;
    if (antes === false && ahora === true) {
      const e = tutorDe(l.id);
      e.aplicadas++;
      guardaPrefs();
      if (e.aplicadas === APRENDIDA_EN && !e.silencio) toast('◔ «' + l.n + '»: ya lo haces solo. No te lo vuelvo a explicar.');
    }
  });
  tutorFoto();
}
/* Para que lo que arregla la app no cuente como tuyo. */
function conTutorEnSilencio(fn) { TUTOR_AUTO++; try { return fn(); } finally { TUTOR_AUTO--; } }

/* Lo que enseñaría ahora mismo en esta diapositiva, si hiciera falta. */
function leccionPendiente(sl) {
  return LECCIONES.find(l => !leccionAprendida(l.id) && l.aplica(sl) && !l.cumple(sl)) || null;
}

/* ---------- el panel del tutor ---------- */
function openTutor() {
  const pinta = () => {
    cuerpo.innerHTML = '';
    const t = tutorEstado();
    const aprendidas = LECCIONES.filter(l => leccionAprendida(l.id)).length;
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' },
      'Seis reglas con evidencia detrás. Cada vez que la app acomoda algo te dice el porqué; cuando una regla la aplicas tú solo tres veces, deja de explicártela. ' +
      aprendidas + ' de ' + LECCIONES.length + ' ya son tuyas.'));
    cuerpo.append(h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !tutorApagado(), onchange: e => { S.prefs.sinTutor = !e.target.checked; guardaPrefs(); pinta(); } }),
      'Explicarme las razones mientras trabajo'));
    LECCIONES.forEach(l => {
      const e = t[l.id] || { aplicadas: 0, silencio: false };
      const listo = leccionAprendida(l.id);
      const fila = h('div', { class: 'tutor-fila' + (listo ? ' lista' : '') },
        h('div', { class: 'tutor-prog-b' }, ...[0, 1, 2].map(k => h('span', { class: 'tp-d' + (k < Math.min(e.aplicadas, 3) || e.silencio ? ' on' : '') }))),
        h('div', { class: 'tutor-txt' }, h('b', null, l.n), h('em', null, l.por)),
        h('button', { class: 'btn btn-sm', onclick: () => { e.silencio = !e.silencio; tutorDe(l.id).silencio = e.silencio; guardaPrefs(); pinta(); } },
          e.silencio ? 'Volver a explicarla' : listo ? '✓ Ya es tuya' : 'Ya la sé'));
      cuerpo.append(fila);
    });
    cuerpo.append(h('p', { class: 'hint', style: 'margin-top:10px' },
      'Cuenta solo lo que arreglas tú: lo que acomoda el Diseñador o «Ajustar texto» no suma.'));
  };
  const cuerpo = h('div');
  pinta();
  openModal({ title: 'Tutor de diseño', size: '', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


