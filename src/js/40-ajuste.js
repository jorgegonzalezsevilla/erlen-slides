/* ==== 40-ajuste.js ==== */
'use strict';
/* ================= ajustes con incertidumbre =================
   Un número sin su incertidumbre es lo que hace que el jurado pregunte.
   Calcularlo aparte es esfuerzo no recompensado: la paradoja del esfuerzo
   dice que ese es justo el que hay que quitar. */

/* Mínimos cuadrados con errores estándar de la pendiente y la ordenada. */
function linFitSE(pts) {
  const n = pts.length;
  if (n < 3) { const f = linFit(pts); return f ? Object.assign({ n, sm: null, sb: null, s: null }, f) : null; }
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const d = n * sxx - sx * sx;
  if (!d) return null;
  const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
  const yb = sy / n;
  let ssr = 0, sst = 0;
  for (const [x, y] of pts) { const f = m * x + b; ssr += (y - f) * (y - f); sst += (y - yb) * (y - yb); }
  const s2 = ssr / (n - 2);                       // varianza residual
  const sm = Math.sqrt(s2 * n / d);               // error estándar de la pendiente
  const sb = Math.sqrt(s2 * sxx / d);             // error estándar de la ordenada
  return { m, b, r2: sst ? 1 - ssr / sst : 1, n, sm, sb, s: Math.sqrt(s2) };
}
/* Residuales, para ver si el ajuste lineal era la forma correcta. */
function residuales(pts, f) { return pts.map(([x, y]) => [x, y - (f.m * x + f.b)]); }

/* Límite de detección de una curva de calibración: 3.3 σ / pendiente,
   el criterio de la ICH que piden casi todas las revistas. */
function limiteDeteccion(f) {
  if (!f || !f.s || !f.m) return null;
  return { ld: 3.3 * f.s / Math.abs(f.m), lc: 10 * f.s / Math.abs(f.m) };
}

/* Redondeo a la incertidumbre: 1.5479 ± 0.0231 → «1.548 ± 0.023». */
function conError(v, e) {
  if (e == null || !isFinite(e) || e === 0) return sigFig(v, 4);
  /* Con datos exactamente colineales la incertidumbre que sale del ajuste es
     ruido de coma flotante: escribir «± 1.6×10⁻¹⁸» aparenta una precisión que
     no existe, así que por debajo del millonésimo del valor no se reporta. */
  if (v !== 0 && Math.abs(e / v) < 1e-6) return sigFig(v, 4);
  const dec = Math.max(0, -Math.floor(Math.log10(Math.abs(e))) + 1);
  if (dec > 8) return sigFig(v, 4) + ' ± ' + sigFig(e, 2);
  return v.toFixed(dec) + ' ± ' + e.toFixed(dec);
}

/* ---------- anchura a media altura, medida sobre los datos ----------
   Sin suponer que el pico es gaussiano: se interpola el cruce por la mitad
   de la altura a cada lado, que es lo que se hace en la práctica. */
function fwhm(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  if (p.length < 5) return null;
  const base = Math.min(...p.map(q => q[1]));
  let iMax = 0;
  p.forEach((q, i) => { if (q[1] > p[iMax][1]) iMax = i; });
  const alto = p[iMax][1] - base;
  if (alto <= 0) return null;
  const mitad = base + alto / 2;
  const cruce = (a, b) => a[1] === b[1] ? a[0] : a[0] + (mitad - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
  let xi = null, xd = null;
  for (let i = iMax; i > 0; i--) if (p[i - 1][1] <= mitad && p[i][1] >= mitad) { xi = cruce(p[i - 1], p[i]); break; }
  for (let i = iMax; i < p.length - 1; i++) if (p[i + 1][1] <= mitad && p[i][1] >= mitad) { xd = cruce(p[i + 1], p[i]); break; }
  if (xi == null || xd == null) return null;
  return { centro: p[iMax][0], alto, fwhm: Math.abs(xd - xi), izq: xi, der: xd, base };
}

/* Scherrer: tamaño de cristalita a partir de la anchura del pico.
   beta y theta en grados; devuelve nm con K = 0.9 y Cu Kα por omisión. */
function scherrer(fwhmGrados, dosThetaGrados, K, lambdaNm) {
  const k = K || 0.9, lam = lambdaNm || 0.15406;
  const beta = fwhmGrados * Math.PI / 180;
  const th = (dosThetaGrados / 2) * Math.PI / 180;
  const cos = Math.cos(th);
  if (!beta || !cos) return null;
  return { nm: k * lam / (beta * cos), K: k, lambda: lam, theta: dosThetaGrados / 2 };
}

/* Tauc: (αhν)^n frente a hν; el corte de la recta con el eje da Eg. */
function tauc(pts, directa) {
  const n = directa === false ? 0.5 : 2;
  const t = pts.map(([hv, a]) => [hv, Math.pow(a * hv, n)]).filter(p => isFinite(p[1]));
  if (t.length < 5) return null;
  /* Se ajusta el tramo más recto: el de mayor pendiente sostenida. */
  const ven = Math.max(4, Math.round(t.length * 0.25));
  let mejor = null;
  for (let i = 0; i + ven <= t.length; i++) {
    const f = linFitSE(t.slice(i, i + ven));
    if (f && f.m > 0 && (!mejor || f.r2 > mejor.f.r2)) mejor = { f, i };
  }
  if (!mejor) return null;
  const eg = -mejor.f.b / mejor.f.m;
  const sEg = mejor.f.sm && mejor.f.sb
    ? Math.abs(eg) * Math.sqrt(Math.pow(mejor.f.sb / mejor.f.b, 2) + Math.pow(mejor.f.sm / mejor.f.m, 2)) : null;
  return { eg, sEg, r2: mejor.f.r2, n, puntos: ven };
}

/* ---------- panel de análisis del bloque de gráfica ---------- */
function analisisDe(b) {
  const series = chartSeries(b);
  if (!series.length) return null;
  const s = series[0];
  const pts = (s.pts || []).filter(p => isFinite(p[0]) && isFinite(p[1]));
  if (pts.length < 3) return null;
  return { pts, nombre: s.name || 'serie' };
}

function openAnalisis(b) {
  const cuerpo = h('div');
  const a = analisisDe(b);
  if (!a) {
    cuerpo.append(h('p', { class: 'hint' }, 'Hacen falta al menos tres puntos con números para analizar la serie.'));
    openModal({ title: 'Análisis', size: 'modal-sm', body: cuerpo, foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Cerrar')] });
    return;
  }
  const seg = h('div', { class: 'seg seg-4 seg-wrap', style: 'margin-bottom:14px' });
  const panel = h('div');
  const MODOS = [
    { id: 'lineal', n: 'Ajuste lineal' },
    { id: 'pico', n: 'Pico y anchura' },
    { id: 'scherrer', n: 'Scherrer' },
    { id: 'tauc', n: 'Tauc' }
  ];
  let modo = b.analisis || 'lineal';
  const fila = (et, val, nota) => h('div', { class: 'an-fila' },
    h('span', { class: 'an-et' }, et), h('b', { class: 'an-val' }, val),
    nota ? h('span', { class: 'an-nota' }, nota) : null);

  const dibuja = () => {
    panel.innerHTML = '';
    if (modo === 'lineal') {
      const f = linFitSE(a.pts);
      if (!f) { panel.append(h('p', { class: 'hint' }, 'No se pudo ajustar.')); return; }
      panel.append(fila('Pendiente', conError(f.m, f.sm), f.sm ? 'error estándar del ajuste' : 'con 3 puntos o más se calcula el error'));
      panel.append(fila('Ordenada al origen', conError(f.b, f.sb)));
      panel.append(fila('R²', f.r2.toFixed(5)));
      panel.append(fila('Puntos', String(f.n)));
      if (f.s != null) panel.append(fila('Desviación residual', sigFig(f.s, 3)));
      const ld = limiteDeteccion(f);
      if (ld) {
        panel.append(h('div', { class: 'an-sep' }, 'Si es una curva de calibración'));
        panel.append(fila('Límite de detección', sigFig(ld.ld, 3), '3.3 σ/m, criterio ICH'));
        panel.append(fila('Límite de cuantificación', sigFig(ld.lc, 3), '10 σ/m'));
      }
      panel.append(residualesSVG(a.pts, f));
      panel.append(h('p', { class: 'hint' }, 'Si los residuales dibujan una curva en vez de una nube, la relación no es lineal en todo el intervalo.'));
      panel.append(h('button', { class: 'btn btn-sm', onclick: () => {
        b.title = (b.title ? b.title + ' · ' : '') + 'm = ' + conError(f.m, f.sm) + ', R² = ' + f.r2.toFixed(4);
        commit(); closeModal(); toast('Resultado puesto en el título de la gráfica');
      } }, 'Poner el resultado en el título'));
    } else if (modo === 'pico') {
      const w = fwhm(a.pts);
      if (!w) { panel.append(h('p', { class: 'hint' }, 'No se encontró un pico con dos cruces por la media altura. Recorta los datos al pico.')); return; }
      panel.append(fila('Centro del pico', sigFig(w.centro, 5)));
      panel.append(fila('Altura', sigFig(w.alto, 4), 'sobre la línea base'));
      panel.append(fila('FWHM', sigFig(w.fwhm, 4), 'anchura a media altura, medida sobre los datos'));
      panel.append(fila('Cruces', sigFig(w.izq, 5) + '  y  ' + sigFig(w.der, 5)));
      panel.append(h('p', { class: 'hint' }, 'Medida directa por interpolación, sin suponer que el pico es gaussiano. Si el fondo no es plano, réstalo antes.'));
    } else if (modo === 'scherrer') {
      const w = fwhm(a.pts);
      const cajaK = h('input', { class: 'field', type: 'number', step: '0.01', value: b.scherrerK || 0.9, style: 'width:90px' });
      const cajaL = h('input', { class: 'field', type: 'number', step: '0.00001', value: b.lambda || 0.15406, style: 'width:110px' });
      const salida = h('div');
      const calcula = () => {
        salida.innerHTML = '';
        if (!w) { salida.append(h('p', { class: 'hint' }, 'Primero hay que poder medir la anchura: recorta los datos a un solo pico.')); return; }
        const r = scherrer(w.fwhm, w.centro, +cajaK.value, +cajaL.value);
        if (!r) { salida.append(h('p', { class: 'hint' }, 'Datos insuficientes.')); return; }
        salida.append(fila('FWHM medida', sigFig(w.fwhm, 4) + '°'));
        salida.append(fila('2θ del pico', sigFig(w.centro, 5) + '°'));
        salida.append(fila('Tamaño de cristalita', sigFig(r.nm, 3) + ' nm', 'D = Kλ / (β cos θ)'));
        salida.append(h('p', { class: 'hint' }, 'La anchura instrumental no está descontada: el valor es un límite inferior del tamaño real.'));
      };
      cajaK.addEventListener('input', calcula); cajaL.addEventListener('input', calcula);
      panel.append(h('div', { class: 'irow' }, h('label', null, 'K (factor de forma)'), cajaK));
      panel.append(h('div', { class: 'irow' }, h('label', null, 'λ (nm)'), cajaL));
      panel.append(h('p', { class: 'hint', style: 'margin-top:0' }, 'Cu Kα = 0.15406 nm · Mo Kα = 0.07107 nm · Co Kα = 0.17902 nm'));
      panel.append(salida);
      calcula();
    } else {
      const segT = h('div', { class: 'seg', style: 'margin-bottom:10px' });
      let directa = b.taucDirecta !== false;
      const salida = h('div');
      const calcula = () => {
        salida.innerHTML = '';
        const r = tauc(a.pts, directa);
        if (!r) { salida.append(h('p', { class: 'hint' }, 'No se pudo ajustar. La serie debe ser energía (eV) frente a absorbancia o α.')); return; }
        salida.append(fila('Banda prohibida', (r.sEg ? conError(r.eg, r.sEg) : sigFig(r.eg, 4)) + ' eV'));
        salida.append(fila('R² del tramo recto', r.r2.toFixed(4)));
        salida.append(fila('Transición', directa ? 'directa · (αhν)²' : 'indirecta · (αhν)^½'));
        salida.append(h('p', { class: 'hint' }, 'El eje x tiene que ser energía en eV. Si tienes longitud de onda, conviértela con E = 1239.8/λ(nm).'));
      };
      [['directa', true], ['indirecta', false]].forEach(([n, v]) =>
        segT.append(h('button', { class: directa === v ? 'on' : '', onclick: e => { directa = v; $$('button', segT).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); calcula(); } }, n)));
      panel.append(h('div', { class: 'irow' }, h('label', null, 'Tipo de transición')), segT, salida);
      calcula();
    }
  };
  MODOS.forEach(m => seg.append(h('button', { class: modo === m.id ? 'on' : '',
    onclick: e => { modo = m.id; b.analisis = m.id; $$('button', seg).forEach(x => x.classList.remove('on')); e.target.classList.add('on'); dibuja(); } }, m.n)));
  cuerpo.append(h('p', { class: 'hint', style: 'margin-top:0' }, 'Serie analizada: ' + a.nombre + ' · ' + a.pts.length + ' puntos.'), seg, panel);
  dibuja();
  openModal({ title: 'Análisis de la serie', size: 'modal-sm', body: cuerpo,
    foot: [h('button', { class: 'btn btn-pri', onclick: closeModal }, 'Listo')] });
}

/* Gráfica pequeña de residuales, en SVG y sin dependencias. */
function residualesSVG(pts, f) {
  const res = residuales(pts, f);
  const W = 320, H = 92, m = 22;
  const xs = res.map(p => p[0]), ys = res.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const yMax = Math.max(...ys.map(Math.abs)) || 1;
  const sx = v => m + (v - x0) / ((x1 - x0) || 1) * (W - m - 8);
  const sy = v => H / 2 - v / yMax * (H / 2 - 12);
  const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'an-res' });
  svg.append(sv('line', { x1: m, x2: W - 8, y1: H / 2, y2: H / 2, stroke: 'currentColor', opacity: .35 }));
  res.forEach(([x, y]) => svg.append(sv('circle', { cx: sx(x).toFixed(1), cy: sy(y).toFixed(1), r: 3, fill: 'currentColor', opacity: .75 })));
  return h('div', { class: 'an-resbox' }, h('span', { class: 'an-et' }, 'Residuales'), svg);
}


