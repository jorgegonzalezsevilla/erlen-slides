/* ==== 32-tinta.js ==== */
'use strict';
/* ================= lápiz, puntero y salto al presentar ================= */

const TINTAS = ['off', 'lapiz', 'puntero'];

function capaTinta() {
  const stage = $('#pStage'); if (!stage) return null;
  let cv = $('#pTinta');
  if (!cv) {
    const [W, H] = slideDims(S.deck);
    cv = h('canvas', { id: 'pTinta', class: 'p-tinta', width: W, height: H, style: `width:${W}px;height:${H}px` });
    stage.append(cv);
    cv.addEventListener('pointerdown', ev => {
      if (P.tinta !== 'lapiz') return;
      ev.preventDefault(); ev.stopPropagation();
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      const trazo = { pts: [], color: (temaDe(S.deck) || {}).acc || '#EB811B' };
      (P.trazos[P.i] = P.trazos[P.i] || []).push(trazo);
      const punto = e => {
        const r = cv.getBoundingClientRect();
        const [W2, H2] = slideDims(S.deck);
        trazo.pts.push([(e.clientX - r.left) / r.width * W2, (e.clientY - r.top) / r.height * H2]);
        pintaTinta();
      };
      punto(ev);
      const mueve = e => { e.preventDefault(); punto(e); };
      const fin = () => { cv.removeEventListener('pointermove', mueve); cv.removeEventListener('pointerup', fin); cv.removeEventListener('pointercancel', fin); };
      cv.addEventListener('pointermove', mueve);
      cv.addEventListener('pointerup', fin);
      cv.addEventListener('pointercancel', fin);
    });
  }
  return cv;
}
function pintaTinta() {
  const cv = $('#pTinta'); if (!cv) return;
  const [W, H] = slideDims(S.deck);
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, W, H);
  cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = 5;
  (P.trazos[P.i] || []).forEach(t => {
    if (t.pts.length < 2) {
      if (!t.pts.length) return;
      cx.fillStyle = t.color; cx.beginPath(); cx.arc(t.pts[0][0], t.pts[0][1], 2.6, 0, 6.284); cx.fill(); return;
    }
    cx.strokeStyle = t.color;
    cx.beginPath(); cx.moveTo(t.pts[0][0], t.pts[0][1]);
    for (let k = 1; k < t.pts.length; k++) cx.lineTo(t.pts[k][0], t.pts[k][1]);
    cx.stroke();
  });
}
function ponTinta(modo) {
  P.tinta = modo;
  const cv = capaTinta();
  if (cv) { cv.classList.toggle('activo', modo === 'lapiz'); pintaTinta(); }
  const raiz = $('.present-root');
  if (raiz) raiz.classList.toggle('con-puntero', modo === 'puntero');
  let dot = $('#pPunto');
  if (modo === 'puntero') {
    if (!dot) { dot = h('div', { class: 'p-punto', id: 'pPunto' }); ($('.present-root') || document.body).append(dot); }
    if (!P.moverPunto) {
      P.moverPunto = e => { const d = $('#pPunto'); if (d) { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; } };
      window.addEventListener('pointermove', P.moverPunto);
    }
  } else if (dot) {
    dot.remove();
    if (P.moverPunto) { window.removeEventListener('pointermove', P.moverPunto); P.moverPunto = null; }
  }
  const av = { off: 'Puntero y lápiz apagados', lapiz: 'Lápiz: dibuja sobre la diapositiva · C borra', puntero: 'Puntero encendido' };
  toast(av[modo]);
}
function alternaTinta() { ponTinta(TINTAS[(TINTAS.indexOf(P.tinta || 'off') + 1) % 3]); }
function borraTinta() {
  if (P.trazos[P.i] && P.trazos[P.i].length) { P.trazos[P.i] = []; pintaTinta(); toast('Trazos borrados'); }
}

/* ---------- saltar a una diapositiva ---------- */
function abreSalto(inicial) {
  cierraSalto();
  const raiz = $('.present-root'); if (!raiz) return;
  const inp = h('input', { class: 'p-ir-inp', value: inicial || '', placeholder: 'número o parte del título', autocomplete: 'off' });
  const pista = h('div', { class: 'p-ir-pista' });
  const caja = h('div', { class: 'p-ir', id: 'pIr' }, h('span', { class: 'p-ir-lb' }, 'Ir a'), inp, pista);
  raiz.append(caja);
  const busca = () => {
    const q = inp.value.trim();
    pista.innerHTML = '';
    if (!q) return [];
    const num = /^\d+$/.test(q) ? clamp(parseInt(q, 10), 1, S.deck.slides.length) - 1 : -1;
    let cand = [];
    if (num >= 0) cand = [num];
    else S.deck.slides.forEach((sl, i) => { if (casa((sl.title || '') + ' ' + (LAY[sl.layout] || {}).name, q)) cand.push(i); });
    cand.slice(0, 4).forEach(i => pista.append(h('span', { class: 'p-ir-op' }, (i + 1) + ' · ' + ((S.deck.slides[i].title || '').trim() || (LAY[S.deck.slides[i].layout] || {}).name))));
    return cand;
  };
  let cand = busca();
  inp.addEventListener('input', () => { cand = busca(); });
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { cierraSalto(); return; }
    if (e.key === 'Enter') {
      if (cand.length) { P.i = cand[0]; P.step = 0; cierraSalto(); paintPresent(); }
      else cierraSalto();
    }
  });
  setTimeout(() => inp.focus(), 20);
}
function cierraSalto() { const c = $('#pIr'); if (c) c.remove(); }


