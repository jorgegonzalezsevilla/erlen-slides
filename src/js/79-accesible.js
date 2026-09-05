/* ==== 79-accesible.js ==== */
'use strict';
/* ================= accesibilidad sin pedirla =================
   No una opción escondida: el estado normal del archivo. Paleta segura para
   daltonismo en las gráficas (Okabe-Ito) por omisión, texto alterno derivado
   del pie, ecuaciones con MathML para lectores de pantalla (KaTeX lo emite
   siempre), y una revisión que dice qué falta y lo arregla en un clic. */

/* Okabe & Ito (2008): distinguible con protanopia, deuteranopia y tritanopia. */
const OKABE_ITO = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9', '#F0E442', '#000000'];
const OKABE_ITO_OSCURO = ['#56B4E9', '#E69F00', '#00C795', '#FF7F3F', '#E19BC8', '#0072B2', '#F0E442', '#FFFFFF'];
const paletaSegura = () => !(S.prefs && S.prefs.paletaSegura === false);

function revisaAccesibilidad(deck) {
  const d = deck || S.deck;
  const hallazgos = [];
  let sinAlt = 0, figuras = 0, sinPie = 0;
  d.slides.forEach((sl, i) => zonas(sl).flat().forEach(b => {
    if (['image', 'galeria', 'video'].includes(b.type) && (b.src || (b.gal && b.gal.imgs && b.gal.imgs.length))) {
      figuras++;
      if (!(b.alt || '').trim() && !(b.caption || '').trim()) { sinAlt++; hallazgos.push({ i, qué: 'Figura sin texto alterno ni pie', cómo: 'Escribe el pie: el texto alterno sale de él.' }); }
    }
    if (['chart', 'func'].includes(b.type) && !(b.caption || '').trim()) { sinPie++; hallazgos.push({ i, qué: 'Gráfica sin pie', cómo: 'El pie es lo que lee un lector de pantalla y lo que dice qué mirar.' }); }
    if (b.type === 'table' && !b.header) hallazgos.push({ i, qué: 'Tabla sin fila de encabezado', cómo: 'Marca la primera fila como encabezado: el lector de pantalla la anuncia por columna.' });
  }));
  /* contraste: lo que ya sabe la revisión general */
  let contraste = 0;
  try { ((revisaMazo() || {}).fallos || []).forEach(f => { if (/contraste/i.test(f.qué)) { contraste++; hallazgos.push({ i: f.i, qué: f.qué, cómo: f.cómo }); } }); } catch (e) {}
  return { hallazgos, figuras, sinAlt, sinPie, contraste, paleta: paletaSegura() };
}
function openAccesibilidad() {
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const r = revisaAccesibilidad(S.deck);
    const fila = (ok, txt, fix) => h('div', { class: 'ac-fila' + (ok ? ' ok' : ' mal') }, h('span', { class: 'ac-dot' }, ok ? '●' : '○'), h('div', null, h('b', null, txt), fix || null));
    cuerpo.append(h('p', { class: 'hint', style: 'margin:0 0 10px' }, 'En el comité y en la sala hay de todo. Esto es lo que el archivo ya cumple y lo que le falta.'));
    cuerpo.append(fila(r.paleta, 'Paleta de gráficas segura para daltonismo (Okabe-Ito)',
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: r.paleta, onchange: e => { S.prefs.paletaSegura = e.target.checked; guardaPrefs(); commit(); pinta(); } }), 'Usarla por omisión en todas las gráficas (pantalla, PDF y PowerPoint)')));
    cuerpo.append(fila(!r.sinAlt, r.figuras ? (r.figuras - r.sinAlt) + ' de ' + r.figuras + ' figuras con texto alterno' : 'Sin figuras que describir',
      r.sinAlt ? h('button', { class: 'btn btn-sm', onclick: () => { let n = 0; S.deck.slides.forEach(sl => zonas(sl).flat().forEach(b => { if (['image', 'galeria', 'video'].includes(b.type) && !(b.alt || '').trim() && (b.caption || '').trim()) { b.alt = b.caption; n++; } })); commit(); toast(n ? n + ' textos alternos puestos desde el pie' : 'A las que faltan también les falta el pie: escríbelo'); pinta(); } }, 'Poner el alt desde el pie') : null));
    cuerpo.append(fila(!r.sinPie, r.sinPie ? r.sinPie + (r.sinPie === 1 ? ' gráfica sin pie' : ' gráficas sin pie') : 'Todas las gráficas con pie'));
    cuerpo.append(fila(!r.contraste, r.contraste ? r.contraste + ' textos con poco contraste' : 'Contraste suficiente en todos los textos', r.contraste ? h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); openRevision(); } }, 'Ver dónde') : null));
    cuerpo.append(fila(true, 'Ecuaciones con MathML para lectores de pantalla', h('span', { class: 'hint' }, 'KaTeX lo emite siempre junto al dibujo; en el PDF de LaTeX las fórmulas van como texto.')));
    cuerpo.append(fila(true, 'Subtítulos al presentar (tecla S) y notas como guion', null));
    cuerpo.append(h('div', { style: 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); openSala(); } }, '▣ Ver como daltónico (simulacro de sala)'),
      h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); openRevision(); } }, '✓ Revisión completa')));
    if (r.hallazgos.length) {
      cuerpo.append(h('div', { class: 'panel-label', style: 'margin-top:12px' }, 'Dónde'));
      r.hallazgos.slice(0, 20).forEach(f => cuerpo.append(h('div', { class: 'ac-hall' }, h('button', { class: 'btn btn-sm', onclick: () => { closeModal(); S.cur = f.i; S.selBlock = null; renderAll(); } }, String(f.i + 1)), h('span', null, f.qué + (f.cómo ? ' → ' + f.cómo : '')))));
    }
  };
  pinta();
  openModal({ title: 'Accesibilidad', size: 'modal-lg', body: cuerpo, foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}


