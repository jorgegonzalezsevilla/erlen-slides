/* ==== 73-subtitulos.js ==== */
'use strict';
/* ================= subtítulos desde las notas =================
   Tu guion se muestra como subtítulos en la parte baja de la diapositiva,
   sincronizados por diapositiva y por paso: para congresos bilingües y para
   público con discapacidad auditiva. Cada diapositiva puede llevar el texto en
   otro idioma (sl.subt2); si no, se usan las notas. Todo local: no hay ningún
   servicio de traducción detrás, el texto lo escribes tú. */

const SUBT = { modo: 'off' };            /* off | notas | otro */
/* Párrafo que toca en este paso: si hay tantos párrafos como pasos, uno por
   paso; si no, el texto completo. */
function textoSubtitulo(sl, step) {
  const fuente = SUBT.modo === 'otro' ? (sl.subt2 || '') : (sl.notes || '');
  const parrafos = String(fuente).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  if (!parrafos.length) return '';
  const pasos = typeof stepCount === 'function' ? stepCount(S.deck, P.i) : 0;
  if (pasos > 0 && parrafos.length >= pasos + 1) return parrafos[Math.min(step, parrafos.length - 1)];
  if (pasos > 0 && parrafos.length === pasos) return parrafos[Math.min(Math.max(0, step - 1), parrafos.length - 1)];
  return parrafos.join(' ');
}
function pintaSubtitulos() {
  const raiz = $('.present-root'); if (!raiz) return;
  let caja = $('#pSubt');
  if (SUBT.modo === 'off') { if (caja) caja.remove(); return; }
  if (!caja) { caja = h('div', { id: 'pSubt', class: 'p-subt', 'aria-live': 'polite' }); raiz.append(caja); }
  const sl = S.deck.slides[P.i] || {};
  const t = textoSubtitulo(sl, P.step);
  caja.textContent = t.replace(/^[-•*]\s*/gm, '').replace(/\*\*/g, '');
  caja.hidden = !t;
}
function alternaSubtitulos() {
  SUBT.modo = SUBT.modo === 'off' ? 'notas' : SUBT.modo === 'notas' ? 'otro' : 'off';
  pintaSubtitulos();
  const sl = S.deck.slides[P.i] || {};
  if (SUBT.modo === 'otro' && !S.deck.slides.some(s => (s.subt2 || '').trim())) toast('Subtítulos en otro idioma: escribe el texto en el panel de Diapositiva → Subtítulos');
  else toast(SUBT.modo === 'off' ? 'Subtítulos apagados' : SUBT.modo === 'notas' ? 'Subtítulos: tus notas' : 'Subtítulos: el otro idioma');
}
/* El campo del otro idioma, en el panel de la diapositiva. */
function panelSubtitulos(sl) {
  const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'Subtítulos'));
  g.append(h('p', { class: 'hint', style: 'margin:0 0 6px' }, 'Al presentar, la tecla S muestra tus notas como subtítulos; una segunda vez, este texto en otro idioma. Un párrafo por paso si quieres que cambien con las viñetas.'));
  g.append(h('textarea', { class: 'field', rows: 3, placeholder: 'El mismo guion en inglés (u otro idioma), para un congreso bilingüe',
    oninput: e => { sl.subt2 = e.target.value; }, onchange: () => commit({ skipInsp: true }) }, sl.subt2 || ''));
  return g;
}


