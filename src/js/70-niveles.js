/* ==== 70-niveles.js ==== */
'use strict';
/* ================= tres niveles de la misma charla =================
   Comité, congreso y divulgación no son tres archivos: son la misma charla con
   distinta profundidad. Dos mecanismos:
     · glosas: un término marcado como {{perovskita}} lleva su explicación en
       una frase; en divulgación aparece al pie, en congreso solo al pasar el
       cursor y para el comité no estorba;
     · bloques por nivel: un bloque marcado «solo comité» (el detalle técnico)
       o «solo divulgación» (la analogía) se muestra solo en su nivel.
   Un interruptor cambia toda la presentación y el PDF sale del nivel elegido. */

const NIVELES = [
  { id: 'comite', n: 'Comité', d: 'Todo el detalle técnico; las glosas no aparecen.' },
  { id: 'congreso', n: 'Congreso', d: 'Los especialistas de otros grupos: las glosas solo al pasar el cursor.' },
  { id: 'divulgacion', n: 'Divulgación', d: 'Público general: cada término marcado lleva su frase al pie.' }
];
const NK = {}; NIVELES.forEach(x => { NK[x.id] = x; });
const nivelDe = deck => { const n = ((deck || S.deck).meta || {}).nivel; return NK[n] ? n : 'congreso'; };
const bloqueVisible = (b, deck) => !b || !b.nivel || b.nivel === 'todos' || b.nivel === nivelDe(deck);

/* ---------- glosas ---------- */
const glosasDe = deck => { const d = deck || S.deck; if (!Array.isArray(d.meta.glosas)) d.meta.glosas = []; return d.meta.glosas; };
const llano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function glosaDe(termino, deck) {
  const t = llano(termino);
  return glosasDe(deck).find(g => llano(g.termino) === t || (g.alias || '').split(/\s*,\s*/).some(a => a && llano(a) === t)) || null;
}
const RE_GLOSA = /\{\{([^{}]{1,60})\}\}/g;
/* En el HTML ya escapado: {{término}} pasa intacto por esc() y aquí se resuelve. */
function glosasEnHtml(html, deck) {
  if (html.indexOf('{{') < 0) return html;
  const d = deck || S.deck;
  const nivel = nivelDe(d);
  return html.replace(RE_GLOSA, (m, t) => {
    const g = glosaDe(t, d);
    if (nivel === 'comite' || !g) return esc(t);
    return '<span class="glosa" title="' + esc(g.breve || '') + '">' + esc(t) + '</span>';
  });
}
function glosasEnTex(s, deck) {
  if (s.indexOf('{{') < 0) return s;
  const d = deck || S.deck;
  const nivel = nivelDe(d);
  return s.replace(RE_GLOSA, (m, t) => {
    const g = glosaDe(t, d);
    if (nivel === 'divulgacion' && g && g.breve) return t + '\\footnote{' + texEscape(g.breve) + '}';
    return t;
  });
}
const terminosEn = s => { const out = []; String(s == null ? '' : s).replace(RE_GLOSA, (m, t) => { out.push(t); return m; }); return out; };
/* Las glosas que usa una diapositiva, para el pie de divulgación. */
function glosasDeDiapositiva(sl, deck) {
  const d = deck || S.deck;
  const vistos = new Set(), out = [];
  const mira = s => terminosEn(s).forEach(t => { const g = glosaDe(t, d); if (g && !vistos.has(g.termino)) { vistos.add(g.termino); out.push(g); } });
  mira(sl.title); mira(sl.subtitle);
  zonas(sl).flat().filter(b => bloqueVisible(b, d)).forEach(b => (typeof textosCitables === 'function' ? textosCitables(b) : []).forEach(mira));
  return out;
}
function pieGlosas(sl, deck) {
  if (nivelDe(deck) !== 'divulgacion') return null;
  const gl = glosasDeDiapositiva(sl, deck);
  if (!gl.length) return null;
  const caja = h('div', { class: 'slide-glosas' });
  gl.forEach(g => caja.append(h('span', { class: 'sg-item' }, h('b', null, g.termino + ': '), g.breve || '')));
  return caja;
}
/* Los términos marcados que todavía no tienen explicación. */
function glosasFaltantes(deck) {
  const d = deck || S.deck, falta = new Set();
  d.slides.forEach(sl => {
    terminosEn(sl.title).concat(terminosEn(sl.subtitle)).forEach(t => { if (!glosaDe(t, d)) falta.add(t); });
    zonas(sl).flat().forEach(b => (typeof textosCitables === 'function' ? textosCitables(b) : []).forEach(s => terminosEn(s).forEach(t => { if (!glosaDe(t, d)) falta.add(t); })));
  });
  return Array.from(falta);
}
function ponNivel(n) {
  if (!NK[n]) return;
  S.deck.meta.nivel = n;
  commit();
  toast('Nivel: ' + NK[n].n + ' · ' + NK[n].d);
}

/* ---------- el editor de glosas ---------- */
function openGlosas() {
  const cuerpo = h('div');
  const pinta = () => {
    cuerpo.innerHTML = '';
    const sel = h('div', { class: 'seg', style: 'margin-bottom:8px' });
    NIVELES.forEach(x => sel.append(h('button', { class: nivelDe(S.deck) === x.id ? 'on' : '', title: x.d, onclick: () => { S.deck.meta.nivel = x.id; commit(); pinta(); } }, x.n)));
    cuerpo.append(h('div', { class: 'panel-label' }, 'Para quién es la charla'), sel,
      h('p', { class: 'hint', style: 'margin:0 0 12px' }, NK[nivelDe(S.deck)].d + ' Los bloques marcados «solo comité» o «solo divulgación» aparecen únicamente en su nivel; se marcan en el panel del bloque.'));
    const faltan = glosasFaltantes(S.deck);
    if (faltan.length) cuerpo.append(h('p', { class: 'hint err', style: 'margin:0 0 8px' }, 'Marcados sin explicación: ' + faltan.map(t => '{{' + t + '}}').join(', ') + '. Añádelos abajo.'));
    cuerpo.append(h('div', { class: 'panel-label' }, 'Glosario en una frase'),
      h('p', { class: 'hint', style: 'margin:0 0 8px' }, 'Marca un término en cualquier texto como {{perovskita}} y aquí dile qué es en una frase. En divulgación sale al pie; en congreso, al pasar el cursor.'));
    const lista = h('div', { class: 'glo-lista' });
    glosasDe(S.deck).forEach((g, i) => lista.append(h('div', { class: 'glo-fila' },
      h('input', { class: 'field', value: g.termino, placeholder: 'término', oninput: e => { g.termino = e.target.value; }, onchange: () => commit() }),
      h('input', { class: 'field', value: g.breve || '', placeholder: 'en una frase, como se lo dirías a tu familia', style: 'flex:2', oninput: e => { g.breve = e.target.value; }, onchange: () => commit() }),
      h('button', { class: 'icon-btn', title: 'Quitar', onclick: () => { glosasDe(S.deck).splice(i, 1); commit(); pinta(); } }, '✕'))));
    cuerpo.append(lista, h('div', { style: 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap' },
      h('button', { class: 'btn btn-sm btn-pri', onclick: () => { glosasDe(S.deck).push({ termino: faltan[0] || '', breve: '' }); commit(); pinta(); } }, '+ Término'),
      faltan.length ? h('button', { class: 'btn btn-sm', onclick: () => { faltan.forEach(t => glosasDe(S.deck).push({ termino: t, breve: '' })); commit(); pinta(); } }, '+ Los ' + faltan.length + ' que faltan') : null));
  };
  pinta();
  openModal({ title: 'Niveles y glosario', size: 'modal-lg', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: () => closeModal() }, 'Listo')] });
}
/* Control del bloque: en qué nivel se ve. */
function panelNivelBloque(b) {
  const g = h('div', { class: 'igroup' }, h('span', { class: 'panel-label' }, 'En qué nivel se ve'));
  const seg = h('div', { class: 'seg' });
  [['todos', 'Siempre'], ['comite', 'Solo comité'], ['divulgacion', 'Solo divulgación']].forEach(([v, n]) => seg.append(h('button', {
    class: ((b.nivel || 'todos') === v ? 'on' : ''), onclick: () => { if (v === 'todos') delete b.nivel; else b.nivel = v; commit(); renderInspector(); } }, n)));
  g.append(seg, h('p', { class: 'hint' }, 'El detalle técnico va «solo comité»; la analogía, «solo divulgación». El nivel actual es ' + NK[nivelDe(S.deck)].n + '.'));
  return g;
}


