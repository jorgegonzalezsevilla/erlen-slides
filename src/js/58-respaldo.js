/* ==== 58-respaldo.js ==== */
'use strict';
/* ================= respaldo para preguntas =================
   El apéndice de toda charla científica: las diapositivas que no cuentas, pero
   que quieres tener a mano cuando alguien pregunte por el control, por el
   ajuste o por la muestra que no salió. No entran en la numeración, no suman
   al tiempo previsto y no se llega a ellas avanzando; se salta a la que hace
   falta desde un índice, en el momento de la pregunta. */

const esRespaldo = sl => !!(sl && sl.respaldo);
const slidesCharla = deck => (deck || S.deck).slides.filter(sl => !esRespaldo(sl));
const slidesRespaldo = deck => (deck || S.deck).slides.filter(esRespaldo);
/* Índice de la última diapositiva de la charla: hasta ahí se avanza. */
function finCharla(deck) {
  const d = deck || S.deck;
  for (let i = d.slides.length - 1; i >= 0; i--) if (!esRespaldo(d.slides[i])) return i;
  return d.slides.length - 1;
}
/* Numeración visible: las de respaldo se marcan con R1, R2… */
function rotuloDiapositiva(deck, i) {
  const d = deck || S.deck;
  const sl = d.slides[i];
  if (!sl) return '';
  if (esRespaldo(sl)) return 'R' + (slidesRespaldo(d).indexOf(sl) + 1);
  return String(slidesCharla(d).indexOf(sl) + 1);
}
const totalCharla = deck => slidesCharla(deck).length;

/* Marcar o desmarcar, moviendo la diapositiva al final para que el apéndice
   quede junto, que es como se arma en Beamer. */
function alternaRespaldo(i) {
  const d = S.deck;
  const sl = d.slides[i];
  if (!sl) return;
  if (sl.bibAuto) { toast('La bibliografía se coloca sola al final de la charla'); return; }
  if (sl.respaldo) {
    delete sl.respaldo;
    d.slides.splice(i, 1);
    const corte = finCharla(d) + 1;
    d.slides.splice(corte, 0, sl);
    S.cur = corte;
  } else {
    if (slidesCharla(d).length < 2) { toast('Tiene que quedar al menos una diapositiva en la charla'); return; }
    sl.respaldo = true;
    d.slides.splice(i, 1);
    d.slides.push(sl);
    S.cur = d.slides.length - 1;
  }
  S.selBlock = null;
  commit();
  toast(sl.respaldo ? 'Al respaldo: ya no cuenta en la numeración ni en el tiempo' : 'De vuelta a la charla',
    null, { t: 'Deshacer', fn: doUndo });
}

/* ---------- el índice de preguntas, al presentar ---------- */
let _idxPreg = null;
function alternaIndicePreguntas() { _idxPreg ? cierraIndicePreguntas() : abreIndicePreguntas(); }
function abreIndicePreguntas() {
  cierraIndicePreguntas();
  const d = S.deck;
  const resp = slidesRespaldo(d);
  const caja = h('div', { class: 'preg-caja' });
  caja.append(h('div', { class: 'preg-cab' },
    h('b', null, 'Respaldo para preguntas'),
    h('span', null, resp.length ? 'Toca la que responde, o escribe para filtrar' : 'Todavía no hay diapositivas de respaldo')));
  const campo = h('input', { class: 'field preg-busca', placeholder: 'Filtrar por título o contenido…', autocomplete: 'off' });
  const lista = h('div', { class: 'preg-lista' });
  const pinta = () => {
    const q = campo.value.trim();
    lista.innerHTML = '';
    resp.forEach(sl => {
      const i = d.slides.indexOf(sl);
      const txt = [sl.title, sl.subtitle, ...(sl.zt || []),
        ...zonas(sl).flat().map(b => [b.text, b.btitle, b.body, b.caption,
          (b.items || []).map(x => x.t || x).join(' ')].join(' '))].join(' ');
      if (q && !casa(rotuloDiapositiva(d, i) + ' ' + txt, q)) return;
      const [W, H] = slideDims(d);
      const tw = 168, k = tw / W;
      const clip = h('div', { class: 'preg-clip', style: `width:${tw}px;height:${Math.round(H * k)}px` });
      const mini = renderSlide(d, i, 'thumb');
      mini.style.transform = `scale(${k})`; mini.style.transformOrigin = 'top left';
      clip.append(mini);
      lista.append(h('button', { class: 'preg-item', onclick: () => { cierraIndicePreguntas(); saltaA(i); } },
        clip, h('span', { class: 'preg-t' },
          h('b', null, rotuloDiapositiva(d, i)),
          h('span', null, (sl.title || '').trim() || 'Sin título'))));
    });
    if (!lista.firstChild) lista.append(h('p', { class: 'preg-vacio' },
      resp.length ? 'Nada coincide con «' + q + '»' : 'Marca una diapositiva como respaldo desde el panel de Diapositiva.'));
  };
  campo.addEventListener('input', pinta);
  pinta();
  caja.append(campo, lista);
  caja.append(h('div', { class: 'preg-pie' }, 'Q cierra este índice · al saltar puedes volver con la tecla de retroceso'));
  _idxPreg = h('div', { class: 'preg-fondo', onclick: e => { if (e.target === _idxPreg) cierraIndicePreguntas(); } }, caja);
  ($('#presentRoot') || document.body).append(_idxPreg);
  setTimeout(() => campo.focus({ preventScroll: true }), 30);
}
function cierraIndicePreguntas() { if (_idxPreg) { _idxPreg.remove(); _idxPreg = null; } }
/* Salta a una diapositiva estando presentando; fuera de la presentación,
   simplemente la selecciona. */
function saltaA(i) {
  const j = clamp(i, 0, S.deck.slides.length - 1);
  if (typeof P === 'object' && P.on) {
    P.volver = P.i;                       /* para poder regresar de un salto */
    P.i = j; P.step = 0; paintPresent(0);
    return;
  }
  S.cur = j; S.selBlock = null; renderAll();
}


