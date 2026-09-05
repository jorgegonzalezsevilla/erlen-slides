/* ==== 78-tiempo.js ==== */
'use strict';
/* ================= la charla como línea de tiempo =================
   Toda la presentación en una tira horizontal donde el ancho de cada
   diapositiva es su tiempo previsto, con el guion debajo. Arrastras el borde
   para reequilibrar, ves de un vistazo dónde se te va el tiempo, y si ya
   ensayaste, lo medido se pinta encima de lo previsto. El ritmo se vuelve
   algo que se toca. */

const TL = { on: false, keyh: null, objetivo: null };
const tlRoot = () => $('#argRoot');
const PX_POR_MIN = 120, MIN_ANCHO = 54;

function abreLineaTiempo() {
  if (TL.on) return;
  if (typeof AR !== 'undefined' && AR.on) cierraArgumento();
  if (typeof CL !== 'undefined' && CL.on) cierraClasificador();
  TL.on = true;
  const raiz = tlRoot(); raiz.innerHTML = '';
  const tira = h('div', { class: 'tl-tira', id: 'tlTira' });
  const resumen = h('span', { class: 'cl-cuenta' });
  const objetivo = h('input', { class: 'field', type: 'number', min: 1, max: 240, step: 1, style: 'width:76px', placeholder: 'min', value: TL.objetivo || '',
    oninput: e => { TL.objetivo = +e.target.value || null; pinta(); } });
  const wrap = h('div', { class: 'cl-root tl-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Línea de tiempo' },
    h('div', { class: 'cl-barra' },
      h('span', { class: 'cl-tit' }, 'La charla en el tiempo'), resumen,
      h('div', { class: 'cl-acc' },
        h('label', { class: 'check', title: 'El tiempo que te dan' }, 'Objetivo ', objetivo, ' min'),
        h('button', { class: 'btn btn-sm', onclick: () => { cierraLineaTiempo(); openAjustarTiempo(); } }, '◷ Cuadrar al objetivo'),
        h('button', { class: 'btn btn-sm', onclick: () => { cierraLineaTiempo(); presentaEnsayo(); } }, '⏱ Ensayar')),
      h('button', { class: 'btn', onclick: cierraLineaTiempo }, 'Cerrar')),
    h('div', { class: 'tl-cuerpo' },
      h('p', { class: 'ar-intro' }, 'Cada diapositiva es tan ancha como el tiempo que le tienes previsto. Arrastra el borde derecho para darle más o menos; el guion va debajo. La barra azul de abajo es lo medido en tu último ensayo.'),
      tira));
  raiz.append(wrap);
  document.body.classList.add('con-clasificador');
  TL.keyh = e => { if (e.key === 'Escape') { e.preventDefault(); cierraLineaTiempo(); } };
  window.addEventListener('keydown', TL.keyh, true);

  function pinta() {
    tira.innerHTML = '';
    const [W, H] = slideDims(S.deck);
    const ens = (S.deck.meta.ensayo && S.deck.meta.ensayo.tiempos) || {};
    let total = 0, medidoTot = 0;
    S.deck.slides.forEach((sl, i) => {
      if (esRespaldo(sl) || sl.bibAuto || (typeof fueraDeRama === 'function' && fueraDeRama(sl))) return;
      const min = minutosDe(sl) || 0;
      total += min;
      const ancho = Math.max(MIN_ANCHO, Math.round(min * PX_POR_MIN));
      const esc = (ancho - 8) / W;
      const med = ens[sl.id] ? ens[sl.id] / 60 : 0;
      medidoTot += med;
      const celda = h('div', { class: 'tl-celda' + (i === S.cur ? ' on' : '') + (sl.layout === 'section' ? ' sec' : ''), style: 'width:' + ancho + 'px', 'data-i': String(i) });
      celda.append(h('div', { class: 'tl-mini', style: `height:${Math.round(H * esc)}px` },
        h('div', { style: `transform:scale(${esc});transform-origin:0 0;width:${W}px;height:${H}px;pointer-events:none` }, renderSlide(S.deck, i, 'thumb', 99))));
      celda.append(h('div', { class: 'tl-min' }, h('b', null, String(i + 1)), ' ', min ? mmss(min) : '—'));
      if (med) celda.append(h('div', { class: 'tl-med', title: 'Medido en el ensayo: ' + mmss(med) }, h('span', { style: 'width:' + Math.min(100, Math.round(med / Math.max(min || med, 0.01) * 100)) + '%' })));
      celda.append(h('div', { class: 'tl-tit' }, sl.title || '(sin título)'));
      celda.append(h('div', { class: 'tl-guion' }, String(sl.notes || '').slice(0, 180) || '—'));
      /* asa para estirar */
      const asa = h('div', { class: 'tl-asa', title: 'Arrastra para cambiar los minutos' });
      asa.addEventListener('pointerdown', e => {
        e.preventDefault(); asa.setPointerCapture(e.pointerId);
        const x0 = e.clientX, m0 = min;
        const mueve = ev => { const m = Math.max(0.25, Math.round((m0 + (ev.clientX - x0) / PX_POR_MIN) * 4) / 4); sl.min = m; celda.style.width = Math.max(MIN_ANCHO, Math.round(m * PX_POR_MIN)) + 'px'; celda.querySelector('.tl-min').lastChild.textContent = mmss(m); ponResumen(); };
        const suelta = () => { asa.removeEventListener('pointermove', mueve); asa.removeEventListener('pointerup', suelta); commit({ skipInsp: true }); pinta(); };
        asa.addEventListener('pointermove', mueve); asa.addEventListener('pointerup', suelta);
      });
      celda.append(asa);
      celda.addEventListener('dblclick', () => { S.cur = i; cierraLineaTiempo(); renderAll(); });
      tira.append(celda);
    });
    TL.total = total; TL.medido = medidoTot;
    ponResumen();
  }
  function ponResumen() {
    const total = S.deck.slides.reduce((a, sl) => a + ((esRespaldo(sl) || sl.bibAuto || (typeof fueraDeRama === 'function' && fueraDeRama(sl))) ? 0 : (minutosDe(sl) || 0)), 0);
    const obj = TL.objetivo;
    resumen.textContent = mmss(total) + ' previstos' + (TL.medido ? ' · ' + mmss(TL.medido) + ' medidos' : '') +
      (obj ? (total > obj ? ' · te pasas ' + mmss(total - obj) : ' · te sobran ' + mmss(obj - total)) : '');
    resumen.style.color = obj && total > obj ? 'var(--danger)' : '';
  }
  pinta();
}
function cierraLineaTiempo() {
  if (!TL.on) return;
  TL.on = false;
  tlRoot().innerHTML = '';
  if (TL.keyh) window.removeEventListener('keydown', TL.keyh, true);
  document.body.classList.remove('con-clasificador');
  renderAll();
}
function alternaLineaTiempo() { TL.on ? cierraLineaTiempo() : abreLineaTiempo(); }


