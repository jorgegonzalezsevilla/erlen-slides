/* ==== 49-teorema.js ==== */
'use strict';
/* ================= teoremas y demostraciones =================
   Los entornos de AMS que usa cualquier texto de matemáticas, con el mismo
   acabado en pantalla que en el PDF: en el .tex salen como \begin{theorem}
   de verdad, no como una caja de color imitando uno. */

const TEOREMAS = [
  { id: 'teorema', n: 'Teorema', env: 'theorem', propio: false, cursiva: true },
  { id: 'lema', n: 'Lema', env: 'lemma', propio: true, cursiva: true },
  { id: 'proposicion', n: 'Proposición', env: 'proposition', propio: true, cursiva: true },
  { id: 'corolario', n: 'Corolario', env: 'corollary', propio: false, cursiva: true },
  { id: 'definicion', n: 'Definición', env: 'definition', propio: false, cursiva: false },
  { id: 'ejemplo', n: 'Ejemplo', env: 'example', propio: false, cursiva: false },
  { id: 'observacion', n: 'Observación', env: 'remark', propio: true, cursiva: false },
  { id: 'demostracion', n: 'Demostración', env: 'proof', propio: false, cursiva: false, qed: true }
];
const TK = {}; TEOREMAS.forEach(x => TK[x.id] = x);
const teoDe = b => TK[b.kind] || TEOREMAS[0];

function renderTeorema(b, deck, mode, edit, ed, emptyCls) {
  const def = teoDe(b);
  const caja = h('div', { class: 'teo teo-' + def.id + (def.cursiva ? ' teo-it' : '') });
  const enc = h('div', { class: 'teo-cab' },
    h('b', null, def.n + (b.num ? ' ' + b.num : '')),
    b.titulo || edit
      ? h('span', Object.assign({ class: 'teo-tit' + emptyCls(b.titulo).trim(), html: b.titulo ? '(' + inlineRich(b.titulo) + ')' : '' },
          ed(`b:${b.id}:tt`, def.qed ? '(de qué, opcional)' : '(nombre, opcional)')))
      : null);
  caja.append(enc);
  caja.append(h('div', Object.assign({ class: 'teo-cuerpo' + emptyCls(b.body).trim(), html: blockRich(b.body || '') },
    ed(`b:${b.id}:body`, 'Enunciado…'))));
  if (def.qed) caja.append(h('span', { class: 'teo-qed' }, '□'));
  return caja;
}

function teoremaTex(b, p) {
  const def = teoDe(b);
  const tit = (b.titulo || '').trim() ? '[' + texInline(b.titulo) + ']' : '';
  const L = [];
  L.push(p + '\\begin{' + def.env + '}' + tit);
  texBlockText(b.body || '').split('\n').forEach(x => L.push(x ? p + '  ' + x : ''));
  L.push(p + '\\end{' + def.env + '}');
  return L.join('\n');
}
/* Beamer trae theorem, corollary, definition, example y proof; los demás hay
   que declararlos, y solo si se usan. */
function teoremasPreambulo(deck) {
  const usados = new Set();
  deck.slides.forEach(sl => zonas(sl).forEach(z => z.forEach(b => { if (b.type === 'teorema') usados.add(teoDe(b).id); })));
  if (!usados.size) return [];
  /* Los nombres de los entornos los pone «translator», que solo cambia a
     español si babel está en español. Se fija a mano para que el PDF diga
     Teorema aunque en Overleaf falte el paquete de idioma. */
  const L0 = ['\\uselanguage{spanish}', '\\languagepath{spanish}'];
  [['Theorem', 'Teorema'], ['Corollary', 'Corolario'], ['Definition', 'Definición'],
    ['Example', 'Ejemplo'], ['Proof', 'Demostración'], ['Lemma', 'Lema'],
    ['Fact', 'Hecho'], ['Problem', 'Problema'], ['Solution', 'Solución']]
    .forEach(([en, es]) => L0.push('\\deftranslation[to=spanish]{' + en + '}{' + es + '}'));
  /* «proof» no pasa por translator: su nombre sale de amsthm. */
  L0.push('\\renewcommand{\\proofname}{Demostración}');
  const faltan = TEOREMAS.filter(x => x.propio && usados.has(x.id));
  if (!faltan.length) return L0;
  /* Beamer ya define varios de estos entornos y redefinirlos rompe la
     compilación: se declaran solo los que de verdad no existen. */
  const L = L0.concat(['\\makeatletter']);
  faltan.forEach(x => L.push('\\@ifundefined{' + x.env + '}{\\newtheorem{' + x.env + '}{' + x.n + '}}{}'));
  L.push('\\makeatother');
  return L;
}

function openTeorema(b) {
  const cuerpo = h('div');
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' },
    'Cada tipo sale al código Beamer como su entorno de AMS. El enunciado se escribe haciendo clic sobre la diapositiva y admite $matemáticas$ en línea.'));
  const rej = h('div', { class: 'lay-grid', style: 'grid-template-columns:repeat(2,1fr)' });
  TEOREMAS.forEach(t => rej.append(h('button', {
    class: 'lay-opt' + (teoDe(b).id === t.id ? ' on' : ''),
    onclick: () => { b.kind = t.id; commit(); closeModal(); }
  }, h('span', { class: 'lb' }, t.n), h('span', { class: 'tec-ejes' }, '\\begin{' + t.env + '}'))));
  cuerpo.append(rej);
  const fila = h('div', { class: 'irow', style: 'margin-top:12px' },
    h('label', null, 'Número (opcional)'),
    h('input', { class: 'field', style: 'width:96px', value: b.num || '', placeholder: '1.2',
      onchange: e => { b.num = e.target.value.trim(); commit(); } }));
  cuerpo.append(fila);
  cuerpo.append(h('p', { class: 'hint' },
    'Si escribes un número aparece junto al nombre en pantalla. En LaTeX la numeración la lleva Beamer: actívala con \\setbeamertemplate{theorems}[numbered] si la quieres automática.'));
  openModal({ title: 'Tipo de enunciado', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
}


