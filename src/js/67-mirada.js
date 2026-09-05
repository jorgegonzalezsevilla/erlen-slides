/* ==== 67-mirada.js ==== */
'use strict';
/* ================= el recorrido del ojo =================
   Una estimación de dónde cae primero la mirada: tamaño, contraste, posición,
   color y tipo de elemento. Es heurística —lo dice la propia capa— pero
   convierte «jerarquía visual» de idea abstracta en algo que se ve: si tu
   resultado clave es lo cuarto que se mira, lo ves tú antes que el público. */

const MIRADA = { on: false };
const PESO_TIPO = [
  ['.b-image', 1.65, 'la figura'], ['.b-chart', 1.6, 'la gráfica'], ['.b-func', 1.6, 'la gráfica'],
  ['.b-galeria', 1.55, 'la galería'], ['.b-video', 1.6, 'el video'], ['.b-montaje', 1.45, 'el montaje'],
  ['.b-estruct', 1.4, 'la estructura'], ['.b-geo', 1.4, 'la figura'], ['.b-smart', 1.4, 'el diagrama'],
  ['.ft-t', 1.45, 'el título'], ['.b-math', 1.3, 'la ecuación'], ['.b-chem', 1.3, 'la reacción'],
  ['.b-bblock', 1.25, 'la caja'], ['.b-teorema', 1.25, 'el teorema'], ['.b-table', 1.15, 'la tabla'],
  ['.b-bullets', 1.0, 'las viñetas'], ['.b-text', 1.0, 'el texto'], ['.b-quote', 1.05, 'la cita'],
  ['.b-code', 0.9, 'el código'], ['.b-refs', 0.6, 'las referencias']
];
function tipoMirada(el) {
  for (const [sel, w, n] of PESO_TIPO) if (el.matches(sel)) return { w, n };
  return { w: 1, n: 'el bloque' };
}
const lumDe = c => { const v = leeColor(c); if (!v) return 0.5; const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(v.r) + 0.7152 * f(v.g) + 0.0722 * f(v.b); };
const satDe = c => { const v = leeColor(c); if (!v) return 0; const mx = Math.max(v.r, v.g, v.b), mn = Math.min(v.r, v.g, v.b); return mx ? (mx - mn) / mx : 0; };

function recorridoMirada(raiz) {
  const R = raiz.getBoundingClientRect();
  if (!R.width || !R.height) return [];
  const fondo = getComputedStyle(raiz).backgroundColor;
  const cand = Array.from(raiz.querySelectorAll('.ft-t, .blk')).filter(el => {
    if (el.closest('.blk') !== el && !el.matches('.ft-t')) return false;     /* bloques anidados no */
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && (el.textContent || '').trim().length + el.querySelectorAll('img,svg,canvas,video').length > 0;
  });
  const out = cand.map(el => {
    const r = el.getBoundingClientRect();
    const x = (r.left - R.left + r.width / 2) / R.width, y = (r.top - R.top + r.height / 2) / R.height;
    const area = Math.sqrt((r.width * r.height) / (R.width * R.height));
    const pos = 0.35 + 0.45 * (1 - y) + 0.2 * (1 - x);                     /* arriba y a la izquierda pesan más */
    const cs = getComputedStyle(el);
    const col = cs.color;
    /* contra el fondo que de verdad tiene detrás: el título va sobre su barra */
    const lfEl = lumDe(typeof fondoEfectivo === 'function' ? fondoEfectivo(el, raiz) : fondo);
    const contraste = Math.min(1.25, 0.55 + Math.abs(lumDe(col) - lfEl) * 1.1);
    const sat = satDe(col) > 0.35 ? 1.12 : 1;
    const { w, n } = tipoMirada(el);
    const negritas = el.querySelector('b, strong') ? 1.08 : 1;
    const grande = el.matches('.sz-l, .sz-xl') ? 1.1 : 1;
    const s = (0.25 + area) * pos * contraste * sat * w * negritas * grande;
    return { el, s, x, y, n, cx: r.left - R.left + r.width / 2, cy: r.top - R.top + r.height / 2, w: r.width, h: r.height };
  });
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, 5);
}
/* Lo que debería mirarse primero: la evidencia (figura, gráfica…) o el bloque marcado como clave. */
function loQueImporta(sl) {
  const bs = zonas(sl).flat();
  return bs.find(b => b.clave) || bs.find(b => ['chart', 'func', 'image', 'galeria', 'math', 'table'].includes(b.type)) || null;
}
function pintaMirada() {
  $$('#stageInner .mirada-capa').forEach(e => e.remove());
  if (!MIRADA.on) return;
  const raiz = $('#stageInner .slide');
  if (!raiz) return;
  const z = effZoom();
  const camino = recorridoMirada(raiz);
  if (!camino.length) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const capa = document.createElementNS(svgNS, 'svg');
  capa.setAttribute('class', 'mirada-capa');
  const [W, H] = slideDims(S.deck);
  capa.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  capa.setAttribute('width', W); capa.setAttribute('height', H);
  const pts = camino.map(c => [c.cx / z, c.cy / z]);
  const poli = document.createElementNS(svgNS, 'polyline');
  poli.setAttribute('points', pts.map(p => p.join(',')).join(' '));
  poli.setAttribute('class', 'mirada-linea');
  capa.append(poli);
  camino.forEach((c, i) => {
    const g = document.createElementNS(svgNS, 'g');
    const ci = document.createElementNS(svgNS, 'circle');
    ci.setAttribute('cx', pts[i][0]); ci.setAttribute('cy', pts[i][1]); ci.setAttribute('r', i === 0 ? 26 : 20);
    ci.setAttribute('class', 'mirada-p' + (i === 0 ? ' primero' : ''));
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', pts[i][0]); t.setAttribute('y', pts[i][1] + 7); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'mirada-n'); t.textContent = String(i + 1);
    g.append(ci, t); capa.append(g);
  });
  raiz.append(capa);
  /* el resumen en palabras */
  const sl = curSlide();
  const imp = loQueImporta(sl);
  let aviso = '';
  if (imp) {
    const pos = camino.findIndex(c => c.el.dataset && c.el.dataset.bid === imp.id);
    if (pos > 1) aviso = 'Lo que importa se mira ' + ['', '', 'de tercero', 'de cuarto', 'de quinto'][pos] + '. Hazlo más grande, súbelo o quita lo que compite.';
    else if (pos < 0) aviso = 'Lo que importa no aparece entre lo primero que se mira.';
  }
  const leyenda = h('div', { class: 'mirada-ley' },
    h('b', null, '◉ Recorrido estimado: '),
    camino.map((c, i) => (i + 1) + 'º ' + c.n).join(' · '),
    aviso ? h('span', { class: 'mirada-av' }, ' ' + aviso) : '',
    h('small', null, ' Es una estimación por tamaño, contraste, posición y color; no una medición.'));
  leyenda.classList.add('mirada-capa');
  raiz.append(leyenda);
}
function alternaMirada() {
  MIRADA.on = !MIRADA.on;
  pintaMirada();
  toast(MIRADA.on ? 'Recorrido del ojo: encendido' : 'Recorrido del ojo: apagado');
}


