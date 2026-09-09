/* ==== 12-chart.js ==== */
'use strict';
/* ================= gráficas en SVG vectorial =================
   Se dibujan en el mismo espacio de coordenadas de la diapositiva, así que
   salen nítidas en pantalla y vectoriales en el PDF. */

/* Paleta categórica validada (adyacente ≤6; en dispersión la forma del
   marcador acompaña al color como codificación secundaria). */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const SERIES_DARK  = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
const MARKERS = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'];

function chartPalette(deck) {
  const th = temaDe(deck);
  return {
    /* Paleta segura para daltonismo por omisión; la clásica sigue disponible. */
    series: (typeof paletaSegura === 'function' && paletaSegura()) ? (th.dark ? OKABE_ITO_OSCURO : OKABE_ITO) : (th.dark ? SERIES_DARK : SERIES_LIGHT),
    ink: th.fg, mut: th.dark ? '#9AAAB6' : '#5A6470',
    grid: th.dark ? '#39434D' : '#DFE3E8',
    axis: th.dark ? '#6C7A86' : '#9BA4AE',
    surface: th.bg,
    accent: th.acc || '#C0392B'
  };
}

/* ---------- números y ejes ---------- */
function niceTicks(min, max, want) {
  if (!isFinite(min) || !isFinite(max)) return { ticks: [0, 1], min: 0, max: 1 };
  if (min === max) { const d = Math.abs(min) || 1; min -= d * 0.1; max += d * 0.1; }
  const span = max - min;
  const raw = span / Math.max(2, want || 5);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepN = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = stepN * mag;
  const t0 = Math.ceil(min / step - 1e-9) * step;
  const ticks = [];
  for (let v = t0; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return { ticks, step };
}
function fmtTick(v, step) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || (a < 1e-3 && a > 0)) {
    const ex = Math.floor(Math.log10(a));
    const m = v / Math.pow(10, ex);
    const ms = (Math.abs(m - Math.round(m)) < 0.05) ? String(Math.round(m)) : m.toFixed(1);
    return (ms === '1' ? '' : ms + '×') + '10^' + ex;
  }
  const dec = step ? Math.max(0, Math.min(6, -Math.floor(Math.log10(step)) + (step < 1 ? 0 : 0))) : 2;
  let s = v.toFixed(Math.max(0, dec));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
/* Texto de tick como nodos SVG (soporta 10^n con superíndice) */
function tickText(v, step) {
  const s = fmtTick(v, step);
  const m = /^(.*)10\^(-?\d+)$/.exec(s);
  if (!m) return [{ t: s }];
  return [{ t: m[1] + '10' }, { t: m[2], sup: true }];
}

/* Texto para el interior del SVG: convierte lo básico de LaTeX a Unicode
   (los títulos de ejes sí usan KaTeX, fuera del SVG). */
const GREEK_UNI = { alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',
  kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',
  Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',
  times:'×',cdot:'·',pm:'±',approx:'≈',leq:'≤',geq:'≥',neq:'≠',infty:'∞',circ:'°',ell:'ℓ',AA:'Å',degree:'°' };
const SUB_UNI = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','a':'ₐ','e':'ₑ','i':'ᵢ','o':'ₒ','x':'ₓ','n':'ₙ','p':'ₚ','s':'ₛ','t':'ₜ' };
const SUP_UNI = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ','i':'ⁱ' };
function mathToUnicode(src) {
  let t = String(src == null ? '' : src);
  t = t.replace(/\\([A-Za-z]+)/g, (m, w) => GREEK_UNI[w] != null ? GREEK_UNI[w] : '');
  t = t.replace(/_\{([^{}]*)\}|_(\w)/g, (m, a, b) => (a != null ? a : b).split('').map(c => SUB_UNI[c] || c).join(''));
  t = t.replace(/\^\{([^{}]*)\}|\^(-?\w)/g, (m, a, b) => (a != null ? a : b).split('').map(c => SUP_UNI[c] || c).join(''));
  t = t.replace(/\\(?=[^A-Za-z])/g, '');
  return t.replace(/[${}]/g, '').replace(/\s+/g, ' ').trim();
}

let _clipSeq = 0;
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
  }
  for (const k of kids.flat(9)) if (k) el.append(k);
  return el;
}
function markerPath(kind, cx, cy, r) {
  switch (kind) {
    case 'square': return `M${cx - r},${cy - r}h${2 * r}v${2 * r}h${-2 * r}z`;
    case 'triangle': return `M${cx},${cy - r * 1.15}L${cx + r * 1.05},${cy + r * 0.8}L${cx - r * 1.05},${cy + r * 0.8}z`;
    case 'diamond': return `M${cx},${cy - r * 1.25}L${cx + r * 1.15},${cy}L${cx},${cy + r * 1.25}L${cx - r * 1.15},${cy}z`;
    case 'cross': return `M${cx - r},${cy - r * .34}h${r * .66}v${-r * .66}h${r * .68}v${r * .66}h${r * .66}v${r * .68}h${-r * .66}v${r * .66}h${-r * .68}v${-r * .66}h${-r * .66}z`;
    case 'star': { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .5 : r * 1.2; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2); } return d + 'z'; }
    default: return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0z`;
  }
}

/* ---------- datos ---------- */
/* Convierte texto pegado de Excel/Origin en series. Detecta separador y coma decimal. */
function parseTable(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  const sample = lines.slice(0, 12).join('\n');
  const semi = (sample.match(/;/g) || []).length;
  const tab = (sample.match(/\t/g) || []).length;
  const com = (sample.match(/,/g) || []).length;
  let sep, decimalComma = false;
  if (tab > 0) sep = /\t/;
  else if (semi > 0) sep = /;/;
  else if (com > 0) sep = /,/;
  else sep = /\s+/;
  const num = s => {
    let t = String(s).trim().replace(/["']/g, '').replace(/−/g, '-');
    if (decimalComma) t = t.replace(/\./g, '').replace(',', '.');
    if (t === '' || t === '-' || t === '—') return NaN;
    const v = parseFloat(t.replace(/\s/g, ''));
    return isFinite(v) ? v : NaN;
  };
  const cells = lines.map(l => l.trim().split(sep).map(c => c.trim()));
  /* La coma decimal del Excel en español llega con tabuladores tan a menudo
     como con punto y coma: se decide por la forma de la celda («0,004»), no
     por el separador de columnas. Con la coma de separador no cabe la duda. */
  if (sep.source !== ',') {
    const ES_DECIMAL = /^[+-]?\d{1,3}(?:\.\d{3})*,\d+$|^[+-]?\d+,\d+$/;
    decimalComma = cells.some(r => r.some(c => ES_DECIMAL.test(c.replace(/["'\s]/g, ''))));
  }
  const ncol = Math.max(...cells.map(r => r.length));
  let headers = null, start = 0;
  const first = cells[0];
  if (first.some(c => c !== '' && isNaN(num(c)))) { headers = first.slice(); start = 1; }
  const rows = [];
  for (let i = start; i < cells.length; i++) {
    const r = [];
    for (let j = 0; j < ncol; j++) r.push(num(cells[i][j]));
    if (r.some(v => isFinite(v))) rows.push(r);
  }
  if (!headers) { headers = []; for (let j = 0; j < ncol; j++) headers.push(j === 0 ? 'x' : 'Serie ' + j); }
  while (headers.length < ncol) headers.push('Serie ' + headers.length);
  return { headers, rows };
}

function linFit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
  const d = n * sxx - sx * sx;
  if (!d) return null;
  const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
  const yb = sy / n;
  let ssr = 0, sst = 0;
  for (const [x, y] of pts) { const f = m * x + b; ssr += (y - f) * (y - f); sst += (y - yb) * (y - yb); }
  return { m, b, r2: sst ? 1 - ssr / sst : 1 };
}
const sigFig = (v, n) => {
  if (!isFinite(v) || v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) {
    const ex = Math.floor(Math.log10(a));
    return (v / Math.pow(10, ex)).toFixed(Math.max(0, (n || 3) - 1)) + '×10^' + ex;
  }
  const d = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(a)));
  let s = v.toFixed(Math.min(8, d));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
};

/* ---------- construcción de series ---------- */
function chartSeries(b) {
  if (b.type === 'func') {
    const params = {};
    (b.params || []).forEach(p => params[p.name] = p.value);
    const x0 = +b.xmin, x1 = +b.xmax;
    const N = 260;
    const out = [];
    (b.curves || []).forEach(cv => {
      const c = exprTry(cv.expr);
      if (!c || c.error) { out.push({ name: cv.name || cv.expr, pts: [], error: c ? c.error : 'fórmula vacía' }); return; }
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const x = x0 + (x1 - x0) * i / N;
        const v = Object.assign({ x }, params);
        let y;
        try { y = c.fn(v); } catch (e) { y = NaN; }
        pts.push([x, isFinite(y) ? y : NaN]);
      }
      out.push({ name: cv.name || cv.expr, pts });
    });
    return out;
  }
  const { headers, rows } = parseTable(b.data);
  const out = [];
  const ncol = headers.length;
  for (let j = 1; j < ncol; j++) {
    const pts = [];
    for (const r of rows) if (isFinite(r[0]) && isFinite(r[j])) pts.push([r[0], r[j]]);
    if (pts.length) out.push({ name: headers[j], pts });
  }
  return out;
}

/* ---------- render ---------- */
/* mode: 'edit' | 'thumb' | 'present' | 'export'  */
function chartAR(b) {
  if (isFinite(+b.ar) && +b.ar > 0) return +b.ar;
  if (b.hpx && b.wpx) return b.hpx / b.wpx;
  return 0.52;
}
/* availPx = ancho disponible en la diapositiva, en unidades de la propia
   diapositiva; así la gráfica se dibuja 1:1 y sus textos pesan igual que
   los del cuerpo. */
function renderChart(b, deck, mode, availPx) {
  const W = Math.round((availPx || 1188) * (b.w || 78) / 100);
  const H = Math.round(W * chartAR(b));
  const P = chartPalette(deck);
  const isFunc = b.type === 'func';
  const kind = isFunc ? 'linea' : (b.kind || 'linea');
  const interactive = mode === 'edit' || mode === 'present';
  const series = chartSeries(b);
  const err = series.find(s => s.error);

  const svg = sv('svg', {
    viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    xmlns: SVGNS, 'font-family': 'inherit', class: 'chart-svg',
    role: 'img', 'aria-label': b.title || 'Gráfica'
  });

  const FS = 19, FSL = 20;
  /* El margen izquierdo lo pide el rótulo de tick más largo; fijarlo en 72
     dejaba un pasillo vacío con «0,1» y apretaba el eje con «1,2×10⁻³». */
  let padL = 72;
  const padR = 26, padT = 16;
  const padB = 48 + (series.length > 1 && !(kind === 'linea' && b.offset) && b.legend !== false ? 34 : 0);
  let iw = W - padL - padR, ih = H - padT - padB;

  /* desplazamiento vertical entre series (apilar espectros) */
  const offsetMode = !isFunc && kind === 'linea' && !!b.offset;
  let allY = [], allX = [];
  series.forEach(s => s.pts.forEach(([x, y]) => { if (isFinite(x)) allX.push(x); if (isFinite(y)) allY.push(y); }));
  /* Con un «después», los ejes abarcan los dos estados: así la comparación es
     honesta y el marco no salta al cambiar. */
  if (b.despues && b.despues.data && !isFunc) {
    chartSeries(Object.assign({}, b, { data: b.despues.data, despues: null }))
      .forEach(s => s.pts.forEach(([x, y]) => { if (isFinite(x)) allX.push(x); if (isFinite(y)) allY.push(y); }));
  }
  if (!allX.length) { allX = [0, 1]; allY = [0, 1]; }
  let yMinRaw = Math.min(...allY), yMaxRaw = Math.max(...allY);
  const spanY = (yMaxRaw - yMinRaw) || 1;
  const offStep = offsetMode ? spanY * (b.offsetPct == null ? 55 : b.offsetPct) / 100 : 0;
  const draw = series.map((s, i) => ({
    name: s.name, i,
    pts: s.pts.map(([x, y]) => [x, y + offStep * (series.length - 1 - i)])
  }));
  let ys = [];
  draw.forEach(s => s.pts.forEach(([, y]) => { if (isFinite(y)) ys.push(y); }));
  if (b.despues && b.despues.data && !isFunc && !offsetMode) ys = ys.concat(allY);
  if (!ys.length) ys = [0, 1];

  let xmin = b.xminAuto === false && isFinite(+b.xmin0) ? +b.xmin0 : Math.min(...allX);
  let xmax = b.xminAuto === false && isFinite(+b.xmax0) ? +b.xmax0 : Math.max(...allX);
  if (isFunc) { xmin = +b.xmin; xmax = +b.xmax; }
  if (b.xrev) { const t = xmin; xmin = xmax; xmax = t; }
  let ymin = Math.min(...ys), ymax = Math.max(...ys), pasoY = 0;
  if (b.yminAuto === false) { if (isFinite(+b.ymin0)) ymin = +b.ymin0; if (isFinite(+b.ymax0)) ymax = +b.ymax0; }
  else {
    /* Con un margen ciego del 8 % el último tick se quedaba por debajo del dato
       más alto y el máximo de la serie no se podía leer en el eje. Se redondea
       el rango a la marca siguiente: el eje termina justo en un tick, que ya
       hace de margen, y el extremo de los datos queda rotulado. */
    pasoY = niceTicks(ymin, ymax, 5).step;
    const y0 = Math.floor(ymin / pasoY + 1e-9) * pasoY;
    const y1 = Math.ceil(ymax / pasoY - 1e-9) * pasoY;
    ymin = y0 === ymin && y0 !== 0 ? y0 - pasoY : y0;
    ymax = y1 === ymax ? y1 + (kind === 'barras' ? 0 : pasoY) : y1;
    if (kind === 'barras') ymin = Math.min(0, ymin);
  }
  /* Ejes fijados desde fuera: el antes/después y las capas necesitan que el
     marco no salte entre un estado y otro. */
  if (b._ejes) { if (isFinite(b._ejes.xmin)) xmin = b._ejes.xmin; if (isFinite(b._ejes.xmax)) xmax = b._ejes.xmax; if (isFinite(b._ejes.ymin)) ymin = b._ejes.ymin; if (isFinite(b._ejes.ymax)) ymax = b._ejes.ymax; }

  /* El FTIR se dibuja de mayor a menor número de onda: es la convención. */
  const invX = !!b.invertirX;
  const sx = v => invX
    ? padL + iw - (v - xmin) / ((xmax - xmin) || 1) * iw
    : padL + (v - xmin) / ((xmax - xmin) || 1) * iw;
  const sy = v => padT + ih - (v - ymin) / ((ymax - ymin) || 1) * ih;

  /* --- rejilla y ejes --- */
  const tx = niceTicks(Math.min(xmin, xmax), Math.max(xmin, xmax), 6);
  /* Con el rango ya redondeado se conserva el mismo paso: recalcularlo sobre
     el rango ensanchado dejaría la mitad de las marcas. */
  const ty = pasoY ? { step: pasoY, ticks: (() => {
    const t = []; for (let v = Math.ceil(ymin / pasoY - 1e-9) * pasoY; v <= ymax + pasoY * 1e-9; v += pasoY) t.push(Math.abs(v) < pasoY * 1e-9 ? 0 : v);
    return t; })() } : niceTicks(ymin, ymax, 5);
  {
    const anchoTick = ty.ticks.reduce((m, v) => Math.max(m, fmtTick(v, ty.step).replace(/10\^/, '10').length), 1);
    padL = Math.round(clamp(26 + anchoTick * FS * 0.55, 46, 118));
    iw = W - padL - padR;
  }
  const g = sv('g');
  if (b.grid !== false) {
    ty.ticks.forEach(v => g.append(sv('line', { x1: padL, x2: padL + iw, y1: sy(v).toFixed(1), y2: sy(v).toFixed(1), stroke: P.grid, 'stroke-width': 1 })));
    tx.ticks.forEach(v => g.append(sv('line', { x1: sx(v).toFixed(1), x2: sx(v).toFixed(1), y1: padT, y2: padT + ih, stroke: P.grid, 'stroke-width': 1 })));
  }
  g.append(sv('line', { x1: padL, x2: padL + iw, y1: padT + ih, y2: padT + ih, stroke: P.axis, 'stroke-width': 1.4 }));
  g.append(sv('line', { x1: padL, x2: padL, y1: padT, y2: padT + ih, stroke: P.axis, 'stroke-width': 1.4 }));
  svg.append(g);

  const txt = (x, y, s, opt) => {
    const o = opt || {};
    const t = sv('text', {
      x, y, fill: o.fill || P.mut, 'font-size': o.size || FS,
      'text-anchor': o.anchor || 'middle', 'font-weight': o.weight || 400,
      transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null,
      'dominant-baseline': o.base || null
    });
    if (Array.isArray(s)) s.forEach(part => t.append(sv('tspan', { text: part.t, 'font-size': part.sup ? (o.size || FS) * 0.72 : null, dy: part.sup ? -(o.size || FS) * 0.42 : null })));
    else t.textContent = s;
    return t;
  };
  const ticksG = sv('g');
  tx.ticks.forEach(v => {
    const X = sx(v);
    if (X < padL - 2 || X > padL + iw + 2) return;
    ticksG.append(sv('line', { x1: X.toFixed(1), x2: X.toFixed(1), y1: padT + ih, y2: padT + ih + 6, stroke: P.axis, 'stroke-width': 1.4 }));
    ticksG.append(txt(X, padT + ih + 6 + FS, tickText(v, tx.step)));
  });
  if (!offsetMode) ty.ticks.forEach(v => {
    const Y = sy(v);
    if (Y < padT - 2 || Y > padT + ih + 2) return;
    ticksG.append(sv('line', { x1: padL - 6, x2: padL, y1: Y.toFixed(1), y2: Y.toFixed(1), stroke: P.axis, 'stroke-width': 1.4 }));
    ticksG.append(txt(padL - 12, Y + FS * 0.34, tickText(v, ty.step), { anchor: 'end' }));
  });
  else ticksG.append(txt(padL - 12, padT + ih * 0.5, mathToUnicode(b.yunit || 'u. a.'), { anchor: 'middle', rot: -90 }));
  svg.append(ticksG);


  /* --- marcas --- */
  const clip = 'clip' + (b.id || 'c') + '_' + (++_clipSeq);
  svg.append(sv('defs', null, sv('clipPath', { id: clip }, sv('rect', { x: padL - 2, y: padT - 6, width: iw + 4, height: ih + 8 }))));
  const plot = sv('g', { 'clip-path': `url(#${clip})` });
  const fits = [];
  /* Lo que lee un lector de pantalla: el pie y los ejes. */
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', (b.caption || b.title || 'Gráfica') + (b.xlabel ? '. Eje x: ' + mathToUnicode(b.xlabel) : '') + (b.ylabel ? '. Eje y: ' + mathToUnicode(b.ylabel) : '') + '. ' + draw.length + (draw.length === 1 ? ' serie' : ' series') + '.');
  /* Por capas: cada serie en su grupo, el ajuste en el suyo y el punto que se
     destaca al final; en la presentación se revelan una a una. */
  const porCapas = !!b.capas;
  const capas = [];
  const capaG = (nombre) => { const g = sv('g', { class: 'capa', 'data-capa': String(capas.length + 1), 'data-nombre': nombre }); capas.push(g); return g; };
  let gAjuste = null;

  draw.forEach((s, i) => {
    const col = P.series[i % P.series.length];
    const mk = MARKERS[i % MARKERS.length];
    const pts = s.pts.filter(pt => isFinite(pt[1]));
    if (!pts.length) return;
    const destino = porCapas ? capaG(mathToUnicode(s.name)) : plot;
    if (porCapas && kind === 'ajuste' && !gAjuste) gAjuste = sv('g', { class: 'capa', 'data-nombre': 'el ajuste' });
    const plotFit = porCapas && gAjuste ? gAjuste : destino;

    if (kind === 'barras') {
      const n = draw.length, slot = iw / Math.max(1, pts.length);
      const bw = Math.min(24, (slot / n) - 2 - (n > 1 ? 2 : 0));
      pts.forEach(([x, y]) => {
        const cx = sx(x) - (n * (bw + 2)) / 2 + i * (bw + 2) + bw / 2;
        const y0 = sy(Math.max(0, ymin)), y1 = sy(y);
        const hh = Math.abs(y0 - y1), top = Math.min(y0, y1), r = Math.min(4, bw / 2, hh);
        destino.append(sv('path', {
          d: `M${cx - bw / 2},${top + hh}v${-(hh - r)}a${r},${r} 0 0,1 ${r},${-r}h${bw - 2 * r}a${r},${r} 0 0,1 ${r},${r}v${hh - r}z`,
          fill: col
        }));
      });
      return;
    }

    const d = [];
    let pen = false;
    s.pts.forEach(([x, y]) => {
      if (!isFinite(y)) { pen = false; return; }
      d.push((pen ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(y).toFixed(1));
      pen = true;
    });

    if (kind === 'linea') {
      const path = sv('path', { d: d.join(''), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      if (b.anim === 'draw' && (mode === 'present' || mode === 'edit')) path.classList.add('chart-draw');
      destino.append(path);
      /* Una curva sin puntos no deja ver dónde se midió. Con pocos datos son
         mediciones y se marcan; con muchos es un registro continuo y estorban.
         La casilla «Marcar los puntos» decide cuando el usuario quiere otra cosa. */
      if (b.puntos == null ? pts.length <= 30 : !!b.puntos) {
        pts.forEach(([x, y]) => destino.append(sv('path',
          { d: markerPath(mk, sx(x), sy(y), 5), fill: col, stroke: P.surface, 'stroke-width': 2 })));
      }
      if (b.area) {
        const base = sy(Math.max(ymin, Math.min(0, ymax)));
        destino.append(sv('path', { d: d.join('') + `L${sx(pts[pts.length - 1][0]).toFixed(1)},${base}L${sx(pts[0][0]).toFixed(1)},${base}z`, fill: col, opacity: 0.1 }));
      }
      if (offsetMode) {
        const last = pts[pts.length - 1];
        destino.append(txt(sx(last[0]) - 8, sy(last[1]) - 10, mathToUnicode(s.name), { anchor: 'end', fill: P.ink, size: FS }));
      }
    } else {
      if (kind === 'ajuste') {
        const f = (typeof linFitSE === 'function' ? linFitSE(pts) : null) || linFit(pts);
        if (f) {
          fits.push({ f, col, name: s.name });
          const xa = Math.min(xmin, xmax), xb = Math.max(xmin, xmax);
          plotFit.append(sv('line', {
            x1: sx(xa).toFixed(1), y1: sy(f.m * xa + f.b).toFixed(1),
            x2: sx(xb).toFixed(1), y2: sy(f.m * xb + f.b).toFixed(1),
            stroke: col, 'stroke-width': 2, opacity: .85
          }));
        }
      }
      pts.forEach(([x, y]) => {
        destino.append(sv('path', { d: markerPath(mk, sx(x), sy(y), 5.5), fill: col, stroke: P.surface, 'stroke-width': 2 }));
      });
    }
  });
  if (porCapas) {
    capas.forEach(g => plot.append(g));
    if (gAjuste) { gAjuste.dataset.capa = String(capas.length + 1); capas.push(gAjuste); plot.append(gAjuste); }
    /* el punto que importa: un anillo del color de acento y su etiqueta */
    const d = b.destaca;
    if (d && draw[d.serie] && draw[d.serie].pts[d.i] && isFinite(draw[d.serie].pts[d.i][1])) {
      const [x, y] = draw[d.serie].pts[d.i];
      const g = sv('g', { class: 'capa capa-destaca', 'data-capa': String(capas.length + 1), 'data-nombre': 'lo que importa' });
      g.append(sv('circle', { cx: sx(x).toFixed(1), cy: sy(y).toFixed(1), r: 11, fill: 'none', stroke: P.accent || '#C0392B', 'stroke-width': 3 }));
      /* el rótulo se pone del lado donde cabe */
      const derecha = sx(x) < padL + iw * 0.68;
      if (d.txt) g.append(txt(sx(x) + (derecha ? 16 : -16), sy(y) - 12, d.txt, { anchor: derecha ? 'start' : 'end', fill: P.accent || '#C0392B', size: FS, weight: 600 }));
      capas.push(g); plot.append(g);
    }
    svg.dataset.capas = String(capas.length);
  }
  svg.append(plot);


  /* leyenda */
  if (draw.length > 1 && !offsetMode && b.legend !== false) {
    const y = H - 16;
    const items = draw.map((s, i) => ({ n: mathToUnicode(s.name), c: P.series[i % P.series.length], m: MARKERS[i % MARKERS.length] }));
    const wEst = items.map(it => String(it.n).length * FS * 0.52 + 42);
    let total = wEst.reduce((a, c) => a + c, 0);
    let x = padL + Math.max(0, (iw - total) / 2);
    items.forEach((it, i) => {
      if (kind === 'linea' || kind === 'ajuste') svg.append(sv('line', { x1: x, x2: x + 24, y1: y - 6, y2: y - 6, stroke: it.c, 'stroke-width': 3, 'stroke-linecap': 'round' }));
      if (kind !== 'linea') svg.append(sv('path', { d: markerPath(it.m, x + 12, y - 6, 5.5), fill: it.c, stroke: P.surface, 'stroke-width': 2 }));
      if (kind === 'barras') svg.append(sv('rect', { x: x + 4, y: y - 13, width: 16, height: 14, rx: 3, fill: it.c }));
      svg.append(txt(x + 32, y, mathToUnicode(it.n), { anchor: 'start', fill: P.ink, size: FS }));
      x += wEst[i];
    });
  }

  /* capa de lectura: cruz + valor al pasar el cursor */
  if (interactive && kind !== 'barras' && draw.length) {
    const hov = sv('g', { opacity: 0, 'pointer-events': 'none' });
    const vline = sv('line', { y1: padT, y2: padT + ih, stroke: P.axis, 'stroke-width': 1 });
    const dot = sv('circle', { r: 6, fill: P.ink, stroke: P.surface, 'stroke-width': 2 });
    const lbl = sv('text', { 'font-size': FS, fill: P.ink, 'text-anchor': 'middle', 'font-weight': 600 });
    const bg = sv('rect', { rx: 6, fill: P.surface, opacity: .92 });
    hov.append(vline, bg, dot, lbl);
    svg.append(hov);
    svg.style.pointerEvents = 'all';
    svg.addEventListener('mousemove', ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * W;
      if (px < padL || px > padL + iw) { hov.setAttribute('opacity', 0); return; }
      const xv = xmin + (px - padL) / iw * (xmax - xmin);
      let best = null;
      draw.forEach((s, i) => s.pts.forEach(pt => {
        if (!isFinite(pt[1])) return;
        const dd = Math.abs(pt[0] - xv);
        if (!best || dd < best.d) best = { d: dd, pt, i, name: s.name };
      }));
      if (!best) return;
      const X = sx(best.pt[0]), Y = sy(best.pt[1]);
      vline.setAttribute('x1', X); vline.setAttribute('x2', X);
      dot.setAttribute('cx', X); dot.setAttribute('cy', Y);
      dot.setAttribute('fill', P.series[best.i % P.series.length]);
      const raw = offsetMode ? best.pt[1] - offStep * (draw.length - 1 - best.i) : best.pt[1];
      lbl.textContent = `${sigFig(best.pt[0], 4)} ; ${sigFig(raw, 4)}`;
      const ly = Math.max(padT + FS, Y - 18);
      lbl.setAttribute('x', clamp(X, padL + 60, padL + iw - 60)); lbl.setAttribute('y', ly);
      const bw = lbl.textContent.length * FS * 0.55 + 16;
      bg.setAttribute('x', clamp(X, padL + 60, padL + iw - 60) - bw / 2);
      bg.setAttribute('y', ly - FS);
      bg.setAttribute('width', bw); bg.setAttribute('height', FS + 10);
      hov.setAttribute('opacity', 1);
    });
    svg.addEventListener('mouseleave', () => hov.setAttribute('opacity', 0));
  }

  if (err) {
    svg.append(sv('rect', { x: padL, y: padT, width: iw, height: ih, fill: P.surface, opacity: .82 }));
    svg.append(txt(padL + iw / 2, padT + ih / 2, 'Revisa la fórmula: ' + err.error, { fill: '#C0392B', size: FS }));
  }
  svg.classList.add('ch-svg');

  /* Los títulos van en HTML para que las matemáticas se compongan con KaTeX. */
  const box = h('div', { class: 'chart-box' });
  if (b.title) box.append(h('div', { class: 'ch-title', html: inlineRich(b.title) }));
  if (kind === 'ajuste' && fits.length && b.showFit !== false) {
    box.append(h('div', { class: 'ch-fit' }, fits.slice(0, 3).map((ft, i) => h('div', {
      html: (fits.length > 1 ? esc(mathToUnicode(ft.name)) + ': ' : '') +
        inlineRich(`$y = ${sigFig(ft.f.m, 4)}\\,x ${ft.f.b < 0 ? '-' : '+'} ${sigFig(Math.abs(ft.f.b), 4)}$`) +
        ' &nbsp;·&nbsp; ' + inlineRich(`$R^2 = ${ft.f.r2.toFixed(4)}$`) +
        /* La pendiente con su error es lo que se reporta en un artículo. */
        (b.conError !== false && ft.f.sm != null
          ? '<span class="ch-err">' + inlineRich(`$m = ${conError(ft.f.m, ft.f.sm)}$`) + '</span>' : '')
    }))));
  }
  if (b.ylabel) box.append(h('div', { class: 'ch-ylab' }, h('span', { html: inlineRich(b.ylabel) })));
  else box.append(h('div', { class: 'ch-ylab' }));
  box.append(svg);
  box.append(h('div', { class: 'ch-xlab', html: b.xlabel ? inlineRich(b.xlabel) : '' }));
  return box;
}


/* ---------- deslizadores en vivo ---------- */
function buildSliders(b, holder, deck, mode, availPx) {
  const bar = h('div', { class: 'sliders' + (mode === 'present' ? ' pres' : '') });
  const redraw = deb(() => {
    holder.innerHTML = '';
    holder.append(renderChart(b, deck, mode, availPx));
  }, 16);
  (b.params || []).forEach(pr => {
    const val = h('span', { class: 'sl-val' }, fmtParam(pr.value));
    const inp = h('input', {
      type: 'range', min: pr.min, max: pr.max, step: pr.step, value: pr.value,
      'aria-label': pr.name,
      oninput: e => { pr.value = +e.target.value; val.textContent = fmtParam(pr.value); redraw(); }
    });
    bar.append(h('label', { class: 'sl' },
      h('span', { class: 'sl-name', html: inlineRich('$' + texParam(pr.name) + '$') }),
      inp, val));
  });
  if (mode === 'present') bar.addEventListener('click', e => e.stopPropagation());
  return bar;
}
function fmtParam(v) {
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e4 || a < 1e-3) { const ex = Math.floor(Math.log10(a)); return (v / Math.pow(10, ex)).toFixed(1) + '\u00d710' + supDigits(ex); }
  return String(Math.round(v * 1e4) / 1e4);
}
function supDigits(n) {
  const map = { '-': '\u207b', 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079' };
  return String(n).split('').map(c => map[c] || c).join('');
}
/* nombres tipo Ea, x0, C0 se ven mejor con subíndice */
function texParam(name) {
  const m = /^([A-Za-z]+)([A-Za-z0-9]*)$/.exec(name);
  if (!m) return name;
  if (m[2]) return m[1] + '_{' + m[2] + '}';
  if (m[1].length > 1) return '\\mathrm{' + m[1] + '}';
  return m[1];
}


