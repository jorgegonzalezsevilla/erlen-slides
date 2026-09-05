/* ==== 42-escala.js ==== */
'use strict';
/* ================= barra de escala para micrografías =================
   La tarea de figura más repetida en caracterización de materiales, y hoy
   obliga a salir a otro programa. Sacar a la persona de la app es justo lo
   que rompe la sesión. */

const ESC_UNIDADES = ['nm', 'µm', 'mm', 'Å'];
const ESC_POS = [['abajo-der', 'Abajo dcha.'], ['abajo-izq', 'Abajo izq.'], ['arriba-der', 'Arriba dcha.'], ['arriba-izq', 'Arriba izq.']];

/* Longitudes "de catálogo": las que se usan de verdad en un pie de figura. */
const ESC_BONITAS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
function largoBonito(porPx, anchoPx) {
  /* Se busca una barra que ocupe ~1/5 del ancho y sea un número redondo. */
  const ideal = porPx * anchoPx * 0.2;
  let mejor = ESC_BONITAS[0], dif = Infinity;
  ESC_BONITAS.forEach(v => { const d = Math.abs(Math.log(v / ideal)); if (d < dif) { dif = d; mejor = v; } });
  return mejor;
}

/* Dibuja la barra dentro de la figura. Va en el DOM, así que sale igual en el
   PDF impreso, en la imagen exportada y en el PowerPoint. */
function capaEscala(b) {
  const e = b.escala;
  if (!e || !e.porPx) return null;
  const largoPx = e.largo / e.porPx;             // en píxeles de la imagen
  const anchoPct = (largoPx / (e.anchoImg || 1)) * 100;
  if (!isFinite(anchoPct) || anchoPct <= 0 || anchoPct > 100) return null;
  return h('div', { class: 'esc-capa esc-' + (e.pos || 'abajo-der') + (e.fondo === false ? ' sin-fondo' : '') },
    h('div', { class: 'esc-barra', style: `width:${anchoPct.toFixed(3)}%` }),
    h('div', { class: 'esc-rot' }, e.largo + ' ' + (e.unidad || 'µm')));
}

/* ---------- calibración ---------- */
function openEscala(b) {
  if (!b.src) { toast('Primero elige una imagen'); return; }
  const cuerpo = h('div');
  const e = b.escala || {};
  let anchoImg = e.anchoImg || 0, altoImg = 0;
  let porPx = e.porPx || 0;                       // unidades por píxel de imagen
  let unidad = e.unidad || 'µm';
  let largo = e.largo || 0;
  let pos = e.pos || 'abajo-der';
  let fondo = e.fondo !== false;

  const lienzo = h('div', { class: 'esc-lienzo' });
  const img = h('img', { src: b.src, alt: '' });
  const marca = h('div', { class: 'esc-marca', hidden: true });
  lienzo.append(img, marca);
  const info = h('p', { class: 'hint' });
  const salida = h('div');

  /* Arrastrar sobre la barra que trae la propia micrografía. */
  let x0 = null, x1 = null;
  const pinta = () => {
    if (x0 == null || x1 == null) { marca.hidden = true; return; }
    const a = Math.min(x0, x1), b2 = Math.max(x0, x1);
    marca.hidden = false;
    marca.style.left = a + 'px';
    marca.style.width = (b2 - a) + 'px';
  };
  lienzo.addEventListener('pointerdown', ev => {
    const r = lienzo.getBoundingClientRect();
    x0 = ev.clientX - r.left; x1 = x0; pinta();
    const mueve = e2 => { x1 = e2.clientX - r.left; pinta(); };
    const fin = () => { window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', fin); calcula(); };
    window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', fin);
  });

  const campoLargo = h('input', { class: 'field', type: 'number', min: '0', step: 'any', style: 'width:110px', value: largo || '' });
  const segU = h('div', { class: 'seg' });
  ESC_UNIDADES.forEach(u => segU.append(h('button', { class: unidad === u ? 'on' : '',
    onclick: ev => { unidad = u; $$('button', segU).forEach(x => x.classList.remove('on')); ev.target.classList.add('on'); calcula(); } }, u)));
  const campoMed = h('input', { class: 'field', type: 'number', min: '0', step: 'any', style: 'width:110px', placeholder: '—' });

  function calcula() {
    salida.innerHTML = '';
    const escalaPantalla = anchoImg / (lienzo.clientWidth || 1);   // px de imagen por px en pantalla
    const arrastrePx = (x0 != null && x1 != null) ? Math.abs(x1 - x0) * escalaPantalla : 0;
    const medida = +campoMed.value;
    if (arrastrePx > 2 && medida > 0) porPx = medida / arrastrePx;
    if (!porPx) { info.textContent = 'Arrastra sobre la barra de escala que trae la imagen y escribe cuánto mide.'; return; }
    if (!largo) largo = largoBonito(porPx, anchoImg);
    campoLargo.value = largo;
    salida.append(h('div', { class: 'an-fila' }, h('span', { class: 'an-et' }, 'Escala'),
      h('b', { class: 'an-val' }, sigFig(porPx, 4) + ' ' + unidad + '/px')));
    salida.append(h('div', { class: 'an-fila' }, h('span', { class: 'an-et' }, 'Ancho de la imagen'),
      h('b', { class: 'an-val' }, sigFig(porPx * anchoImg, 4) + ' ' + unidad)));
    info.textContent = 'La barra se queda correcta aunque después recortes o cambies el tamaño de la figura.';
  }
  campoMed.addEventListener('input', calcula);
  campoLargo.addEventListener('input', () => { largo = +campoLargo.value || 0; });

  img.addEventListener('load', () => {
    anchoImg = img.naturalWidth; altoImg = img.naturalHeight;
    calcula();
  });

  const segP = h('div', { class: 'seg seg-4 seg-wrap' });
  ESC_POS.forEach(([v, n]) => segP.append(h('button', { class: pos === v ? 'on' : '',
    onclick: ev => { pos = v; $$('button', segP).forEach(x => x.classList.remove('on')); ev.target.classList.add('on'); } }, n)));

  cuerpo.append(
    h('p', { class: 'hint', style: 'margin-top:0' },
      'Arrastra sobre la barra que ya trae la micrografía —la del SEM o el TEM— y escribe cuánto mide. Con eso la app calcula la escala y dibuja una barra limpia.'),
    lienzo,
    h('div', { class: 'irow' }, h('label', null, 'Lo que arrastraste mide'), campoMed, h('span', { class: 'an-et' }, unidad)),
    h('div', { class: 'irow' }, h('label', null, 'Unidad')), segU,
    salida,
    h('div', { class: 'irow' }, h('label', null, 'Largo de la barra'), campoLargo, h('span', { class: 'an-et' }, unidad)),
    h('div', { class: 'irow' }, h('label', null, 'Esquina')), segP,
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: fondo, onchange: ev => fondo = ev.target.checked }),
      'Fondo semitransparente detrás de la barra'),
    info);

  openModal({
    title: 'Barra de escala', size: 'modal-sm', body: cuerpo,
    foot: [
      b.escala ? h('button', { class: 'btn btn-danger', onclick: () => { delete b.escala; commit(); closeModal(); toast('Barra de escala quitada'); } }, 'Quitar') : null,
      h('button', { class: 'btn btn-pri', onclick: () => {
        if (!porPx || !largo) { toast('Falta calibrar: arrastra sobre la barra y escribe cuánto mide', 'warn'); return; }
        b.escala = { porPx, unidad, largo: +largo, pos, fondo, anchoImg };
        commit(); closeModal(); toast('Barra de escala de ' + largo + ' ' + unidad);
      } }, 'Poner la barra')
    ].filter(Boolean)
  });
}


