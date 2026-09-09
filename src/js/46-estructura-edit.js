/* ==== 46-estructura-edit.js ==== */
'use strict';
/* ================= el lienzo donde se dibuja la estructura =================
   El lienzo va con el tema de la aplicación, no con el de la diapositiva: es
   el editor —y no el motor de dibujo— quien mira cómo está puesta la app. */

/* ¿Está el editor en oscuro? Con «auto» manda el sistema. */
function editorOscuro() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

const HERR = [
  { id: 'enlace', n: 'Enlace', ic: '／', d: 'Arrastra desde un átomo para sacar un enlace. Clic en el vacío para empezar uno nuevo.' },
  { id: 'doble', n: 'Doble', ic: '＝', d: 'Clic en un enlace para volverlo doble; otra vez, triple; otra, simple.' },
  { id: 'cuna', n: 'Cuña', ic: '◤', d: 'Estereoquímica: clic en un enlace para ponerlo hacia delante, otra vez hacia atrás.' },
  { id: 'elemento', n: 'Elemento', ic: 'N', d: 'Clic en un átomo para cambiarlo por el elemento elegido abajo.' },
  { id: 'carga', n: 'Carga', ic: '±', d: 'Clic en un átomo para subir su carga; con Alt, bajarla. Los hidrógenos se recuentan solos: el N⁺ admite cuatro enlaces y el O⁻ solo uno.' },
  { id: 'borrar', n: 'Borrar', ic: '✕', d: 'Clic en un átomo o en un enlace para quitarlo.' }
];

const EE = { herr: 'enlace', el: 'C', anillo: null, sel: null, arrastra: null };

function openEstructura(b) {
  if (!b.est) b.est = estructuraVacia();
  const est = deepCopy(b.est);
  const W = 720, H = 420;
  let vista = { x: -W / 2, y: -H / 2, w: W, h: H };

  const lienzo = h('div', { class: 'ee-lienzo' });
  const capa = sv('svg', { class: 'ee-svg', viewBox: `${vista.x} ${vista.y} ${vista.w} ${vista.h}` });
  lienzo.append(capa);
  const pista = h('p', { class: 'hint', style: 'min-height:2.6em' });

  /* --- conversión pantalla → dibujo --- */
  const aDibujo = ev => {
    const r = capa.getBoundingClientRect();
    return {
      x: vista.x + (ev.clientX - r.left) / r.width * vista.w,
      y: vista.y + (ev.clientY - r.top) / r.height * vista.h
    };
  };
  const atomoCerca = (p, rad) => {
    let mejor = null, d0 = rad || 18;
    est.atomos.forEach(a => { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < d0) { d0 = d; mejor = a; } });
    return mejor;
  };
  const enlaceCerca = p => {
    let mejor = null, d0 = 12;
    est.enlaces.forEach(en => {
      const a = atomoPorId(est, en.a), c = atomoPorId(est, en.b);
      if (!a || !c) return;
      const dx = c.x - a.x, dy = c.y - a.y, L2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
      if (d < d0) { d0 = d; mejor = en; }
    });
    return mejor;
  };

  /* --- pintado --- */
  const pinta = () => {
    capa.innerHTML = '';
    const caja = cajaEstructura(est, 60);
    if (est.atomos.length) {
      /* Una molécula pequeña también tiene que llenar el lienzo. */
      const escala = clamp(Math.min(W / caja.w, H / caja.h), 0.2, 1.9);
      vista = { x: caja.x + caja.w / 2 - W / (2 * escala), y: caja.y + caja.h / 2 - H / (2 * escala), w: W / escala, h: H / escala };
    }
    capa.setAttribute('viewBox', `${vista.x.toFixed(1)} ${vista.y.toFixed(1)} ${vista.w.toFixed(1)} ${vista.h.toFixed(1)}`);
    const g = svgEstructura({ est }, S.deck, 'currentColor', true, editorOscuro());
    Array.from(g.childNodes).forEach(n => capa.append(n));
    /* puntos de agarre */
    est.atomos.forEach(a => {
      const c = sv('circle', { cx: a.x, cy: a.y, r: 9, class: 'ee-punto' + (EE.sel === a.id ? ' sel' : '') });
      capa.append(c);
    });
    if (EE.arrastra && EE.arrastra.hasta) {
      const d = EE.arrastra;
      capa.append(sv('line', { x1: d.desde.x, y1: d.desde.y, x2: d.hasta.x, y2: d.hasta.y, class: 'ee-guia' }));
    }
    const malos = est.atomos.filter(a => excesoValencia(est, a)).length;
    resumen.textContent = est.atomos.length + (est.atomos.length === 1 ? ' átomo · ' : ' átomos · ') +
      est.enlaces.length + (est.enlaces.length === 1 ? ' enlace' : ' enlaces') +
      (est.atomos.length ? ' · ' + formulaMolecular(est) : '') +
      (malos ? ' · ' + malos + (malos === 1 ? ' valencia imposible' : ' valencias imposibles') : '');
  };

  /* --- interacción --- */
  lienzo.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    const p = aDibujo(ev);
    const a = atomoCerca(p), en = a ? null : enlaceCerca(p);
    if (EE.herr === 'borrar') {
      if (a) borraAtomo(est, a.id); else if (en) est.enlaces = est.enlaces.filter(x => x !== en);
      pinta(); return;
    }
    if (EE.herr === 'doble' && en) { en.orden = (en.orden || 1) % 3 + 1; en.tipo = 'normal'; pinta(); return; }
    if (EE.herr === 'cuna' && en) { en.tipo = en.tipo === 'cuna' ? 'raya' : en.tipo === 'raya' ? 'normal' : 'cuna'; en.orden = 1; pinta(); return; }
    if (EE.herr === 'elemento' && a) { a.el = EE.el; pinta(); return; }
    if (EE.herr === 'carga' && a) { a.carga = clamp((a.carga || 0) + (ev.altKey ? -1 : 1), -3, 3); pinta(); return; }
    if (EE.anillo) {
      const def = ANILLOS.find(x => x.id === EE.anillo);
      ponAnillo(est, def, p.x, p.y, en || null);
      EE.anillo = null; pintaAnillos(); pinta(); return;
    }
    if (EE.herr !== 'enlace') return;
    /* arrastrar desde un átomo (o desde el vacío) para sacar un enlace */
    const origen = a || nuevoAtomo(est, Math.round(p.x / 10) * 10, Math.round(p.y / 10) * 10, EE.el === 'C' ? 'C' : EE.el);
    EE.arrastra = { desde: origen, hasta: null, movido: false };
    const mueve = e2 => {
      const q = aDibujo(e2);
      const ang = ajustaAngulo(Math.atan2(q.y - origen.y, q.x - origen.x));
      const dist = Math.max(EN_L, Math.min(EN_L * 2.4, Math.hypot(q.x - origen.x, q.y - origen.y)));
      const n = Math.max(1, Math.round(dist / EN_L));
      EE.arrastra.hasta = { x: origen.x + EN_L * n * Math.cos(ang), y: origen.y + EN_L * n * Math.sin(ang) };
      EE.arrastra.movido = Math.hypot(q.x - origen.x, q.y - origen.y) > 10;
      pinta();
    };
    const fin = e2 => {
      window.removeEventListener('pointermove', mueve); window.removeEventListener('pointerup', fin);
      const d = EE.arrastra; EE.arrastra = null;
      if (d && d.movido && d.hasta) {
        const destino = atomoCerca(d.hasta, 22) || nuevoAtomo(est, d.hasta.x, d.hasta.y, 'C');
        unir(est, origen.id, destino.id, 1);
      } else if (!a) {
        /* un clic seco en el vacío deja el átomo suelto y le cuelga un enlace */
        const ang = -Math.PI / 6;
        const c = nuevoAtomo(est, origen.x + EN_L * Math.cos(ang), origen.y + EN_L * Math.sin(ang), 'C');
        unir(est, origen.id, c.id, 1);
      } else {
        const ang = ajustaAngulo(anguloLibre(est, origen));
        const c = nuevoAtomo(est, origen.x + EN_L * Math.cos(ang), origen.y + EN_L * Math.sin(ang), 'C');
        unir(est, origen.id, c.id, 1);
      }
      pinta();
    };
    window.addEventListener('pointermove', mueve); window.addEventListener('pointerup', fin);
  });

  /* --- barras --- */
  const barra = h('div', { class: 'ee-barra' });
  HERR.forEach(x => barra.append(h('button', { class: 'ee-h' + (EE.herr === x.id ? ' on' : ''), title: x.d,
    onclick: ev => { EE.herr = x.id; EE.anillo = null; $$('button', barra).forEach(y => y.classList.remove('on')); ev.currentTarget.classList.add('on'); pista.textContent = x.d; pintaAnillos(); } },
    h('span', { class: 'ee-ic' }, x.ic), h('span', null, x.n))));

  const barraEl = h('div', { class: 'ee-elem' });
  /* Los botones llevan el color del elemento, el mismo que se verá en el
     dibujo; con el editor en oscuro toca la versión clara de la paleta. */
  const paletaEl = editorOscuro() ? COLOR_ELEM_OSCURO : COLOR_ELEM;
  ELEM_RAPIDOS.forEach(el => barraEl.append(h('button', { class: 'ee-el' + (EE.el === el ? ' on' : ''),
    style: paletaEl[el] ? `color:${paletaEl[el]}` : '',
    onclick: ev => { EE.el = el; EE.herr = 'elemento'; $$('button', barraEl).forEach(y => y.classList.remove('on')); ev.currentTarget.classList.add('on'); $$('button', barra).forEach(y => y.classList.toggle('on', y.title === HERR[3].d)); pista.textContent = 'Elemento ' + el + ': haz clic en un átomo para cambiarlo.'; } }, el)));
  const otro = h('input', { class: 'field', placeholder: 'Otro…', style: 'width:74px;padding:4px 7px',
    onchange: ev => { const v = ev.target.value.trim(); if (v) { EE.el = v.charAt(0).toUpperCase() + v.slice(1); EE.herr = 'elemento'; pista.textContent = 'Elemento ' + EE.el; } } });
  barraEl.append(otro);

  const barraAn = h('div', { class: 'ee-anillos' });
  const pintaAnillos = () => {
    barraAn.innerHTML = '';
    ANILLOS.forEach(an => barraAn.append(h('button', { class: 'ee-an' + (EE.anillo === an.id ? ' on' : ''),
      title: 'Clic en un enlace para fusionarlo ahí, o en el vacío para dejarlo suelto',
      onclick: () => { EE.anillo = EE.anillo === an.id ? null : an.id; pintaAnillos(); pista.textContent = EE.anillo ? an.n + ': haz clic en un enlace para fusionarlo, o en el vacío.' : ''; } },
      miniAnillo(an), h('span', null, an.n))));
  };
  pintaAnillos();

  const resumen = h('span', { class: 'ee-resumen' });
  /* La métrica de la editorial: la misma molécula, dibujada como la pide cada
     revista. Va dentro de la estructura, así que el lienzo y la diapositiva
     enseñan lo mismo. */
  const selEstilo = h('select', { class: 'field', id: 'ee-estilo',
    style: 'width:auto;min-height:calc(var(--h-ctl) - 8px);padding:0 var(--e2);font-size:var(--t1)',
    title: 'Grosor del trazo, anchura de la cuña, separación del doble y cuerpo del rótulo, según la guía de estilo de cada editorial.',
    onchange: ev => { est.estilo = ev.target.value; pinta(); } });
  ESTILOS_REVISTA.forEach(x => selEstilo.append(h('option', { value: x.id, selected: (est.estilo || 'diapo') === x.id }, x.n)));
  const acciones = h('div', { class: 'ee-acc' },
    h('button', { class: 'btn btn-sm', onclick: () => { const n = +prompt('¿Cuántos carbonos?', '6'); if (n > 1) { ponCadena(est, Math.min(30, n), 0, 0, EE.sel ? atomoPorId(est, EE.sel) : null); pinta(); } } }, '⋯ Cadena'),
    h('button', { class: 'btn btn-sm', onclick: () => { est.atomos = []; est.enlaces = []; pinta(); } }, '⌫ Vaciar'),
    /* El rótulo pegado a su desplegable, más cerca entre sí que del resto de
       la fila: así se lee como una sola cosa sin necesidad de una raya. */
    h('div', { style: 'display:flex;align-items:center;gap:var(--e1)' },
      h('label', { class: 'panel-label', for: 'ee-estilo' }, 'Estilo'), selEstilo),
    resumen);

  const cuerpo = h('div', { class: 'ee-caja' }, barra, barraEl, barraAn, lienzo, acciones, pista);
  pinta();
  pista.textContent = HERR[0].d;

  openModal({
    title: 'Estructura química', size: 'modal-lg', body: cuerpo,
    foot: [
      h('button', { class: 'btn', onclick: () => { EJEMPLOS_EST(est); pinta(); } }, 'Ejemplo'),
      h('button', { class: 'btn btn-pri', onclick: () => { b.est = est; commit(); closeModal(); } }, 'Listo')
    ]
  });
}

/* Miniatura del anillo para el botón. */
function miniAnillo(an) {
  const R = 9, n = an.lados;
  const pts = [];
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / n; pts.push([12 + R * Math.cos(a), 12 + R * Math.sin(a)]); }
  const svg = sv('svg', { width: 24, height: 24, viewBox: '0 0 24 24' });
  svg.append(sv('polygon', { points: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }));
  if (an.aromatico) svg.append(sv('circle', { cx: 12, cy: 12, r: R * 0.55, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, opacity: .7 }));
  return svg;
}

/* Fórmula molecular, en orden de Hill. */
function formulaMolecular(e) {
  const cuenta = {};
  e.atomos.forEach(a => {
    cuenta[a.el] = (cuenta[a.el] || 0) + 1;
    const nh = hImplicitos(e, a);
    if (nh) cuenta.H = (cuenta.H || 0) + nh;
  });
  const orden = Object.keys(cuenta).sort((a, b) => {
    if (a === 'C') return -1; if (b === 'C') return 1;
    if (a === 'H') return -1; if (b === 'H') return 1;
    return a.localeCompare(b);
  });
  return orden.map(k => k + subN(cuenta[k])).join('');
}

/* Un ejemplo con el que jugar: paracetamol. */
function EJEMPLOS_EST(est) {
  est.atomos = []; est.enlaces = [];
  ponAnillo(est, ANILLOS.find(x => x.id === 'benceno'), 0, 0, null);
  const anillo = est.atomos.slice();
  const oh = nuevoAtomo(est, anillo[0].x, anillo[0].y - EN_L, 'O');
  unir(est, anillo[0].id, oh.id, 1);
  const n = nuevoAtomo(est, anillo[3].x, anillo[3].y + EN_L, 'N');
  unir(est, anillo[3].id, n.id, 1);
  const c1 = nuevoAtomo(est, n.x + EN_L * Math.cos(Math.PI / 6), n.y + EN_L * Math.sin(Math.PI / 6), 'C');
  unir(est, n.id, c1.id, 1);
  const o2 = nuevoAtomo(est, c1.x, c1.y + EN_L, 'O');
  unir(est, c1.id, o2.id, 2);
  const c2 = nuevoAtomo(est, c1.x + EN_L * Math.cos(-Math.PI / 6), c1.y + EN_L * Math.sin(-Math.PI / 6), 'C');
  unir(est, c1.id, c2.id, 1);
}


