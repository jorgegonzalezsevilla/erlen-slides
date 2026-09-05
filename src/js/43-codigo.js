/* ==== 43-codigo.js ==== */
'use strict';
/* ================= el código Beamer de esta diapositiva =================
   Conocimiento íntimo: la segunda ruta hacia sentir que algo es tuyo. Y de
   paso se aprende Beamer trabajando, sin un tutorial aparte —que es lo que
   nadie lee. */

function texDeSlide(deck, i) {
  const todo = toBeamer(deck || S.deck);
  const trozos = todo.split(MARCA_DIAPO);
  if (trozos.length < 2) return null;
  const t = trozos[i + 1];
  if (t == null) return null;
  return t.replace(/^\d+\s*---\n?/, '').replace(/\s+$/, '');
}

/* Coloreado mínimo y honesto: macros, entornos, comentarios y llaves. */
function pintaTex(src) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(src)
    .replace(/^(%.*)$/gm, '<i class="tx-com">$1</i>')
    .replace(/(\\(?:begin|end))(\{[a-zA-Z*]+\})/g, '<b class="tx-env">$1</b><span class="tx-arg">$2</span>')
    .replace(/(\\[a-zA-Z@]+)/g, '<b class="tx-mac">$1</b>');
}

let _codigoAbierto = false;
function alternaCodigo(on) {
  _codigoAbierto = on == null ? !_codigoAbierto : !!on;
  pintaCodigo();
  if (_codigoAbierto) toast('Código Beamer de esta diapositiva · F7 para cerrarlo');
}
function pintaCodigo() {
  const viejo = $('#codigoPanel'); if (viejo) viejo.remove();
  const wrap = $('.canvas-wrap');
  if (!_codigoAbierto || !wrap) { if (wrap) wrap.classList.remove('con-codigo'); return; }
  wrap.classList.add('con-codigo');
  let src = '';
  try { src = texDeSlide(S.deck, S.cur) || '% (esta diapositiva no genera código)'; }
  catch (e) { src = '% no se pudo generar el código: ' + e.message; }
  const pre = h('pre', { class: 'cod-pre', html: pintaTex(src) });
  const panel = h('div', { class: 'cod-panel', id: 'codigoPanel' },
    h('div', { class: 'cod-cab' },
      h('span', { class: 'panel-label' }, 'Código Beamer · diapositiva ' + (S.cur + 1)),
      h('button', { class: 'icon-btn', title: 'Copiar este fragmento', onclick: () => {
        navigator.clipboard.writeText(src).then(() => toast('Fragmento copiado'), () => toast('No se pudo copiar', 'warn'));
      } }, '⧉'),
      h('button', { class: 'icon-btn', title: 'Ver el documento entero', onclick: openTexView }, '∑'),
      h('button', { class: 'icon-btn', title: 'Cerrar (F7)', onclick: () => alternaCodigo(false) }, '✕')),
    pre,
    h('p', { class: 'cod-pie' }, 'Solo para verlo: se regenera de la diapositiva. Para llevarlo a Overleaf usa Exportar → Código Beamer.'));
  wrap.append(panel);
}


