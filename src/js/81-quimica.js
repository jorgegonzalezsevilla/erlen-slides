/* ==== 81-quimica.js ==== */
'use strict';
/* ================= formulación química =================
   Hasta ahora el editor de reacciones transcribía: pintaba bonito lo que se
   escribía y nada más. Aquí el programa además lo entiende. Un descenso
   recursivo corto lee Ca(OH)2, CuSO4*5H2O, [Cu(NH3)4]^2+ o ^{235}_{92}U, y de
   ese recuento de átomos salen la masa molar, la composición, los estados de
   oxidación y —lo que de verdad se agradece la víspera de un congreso— el aviso
   de que a la izquierda sobran dos oxígenos.
   Todo va sin dependencias: la tabla de masas, el ajustador por Gauss con
   fracciones exactas y el diccionario de nombres viven en este archivo. */

/* ---------------- tabla de elementos ----------------
   Símbolo, masa atómica estándar (IUPAC, redondeada a la que se usa al pesar) y
   nombre en español. El índice del array es Z-1, así que el número atómico no
   hace falta guardarlo. */
const QUIM_EL = [
  'H 1.008 hidrógeno', 'He 4.0026 helio', 'Li 6.94 litio', 'Be 9.0122 berilio', 'B 10.81 boro',
  'C 12.011 carbono', 'N 14.007 nitrógeno', 'O 15.999 oxígeno', 'F 18.998 flúor', 'Ne 20.180 neón',
  'Na 22.990 sodio', 'Mg 24.305 magnesio', 'Al 26.982 aluminio', 'Si 28.085 silicio', 'P 30.974 fósforo',
  'S 32.06 azufre', 'Cl 35.45 cloro', 'Ar 39.95 argón', 'K 39.098 potasio', 'Ca 40.078 calcio',
  'Sc 44.956 escandio', 'Ti 47.867 titanio', 'V 50.942 vanadio', 'Cr 51.996 cromo', 'Mn 54.938 manganeso',
  'Fe 55.845 hierro', 'Co 58.933 cobalto', 'Ni 58.693 níquel', 'Cu 63.546 cobre', 'Zn 65.38 cinc',
  'Ga 69.723 galio', 'Ge 72.630 germanio', 'As 74.922 arsénico', 'Se 78.971 selenio', 'Br 79.904 bromo',
  'Kr 83.798 criptón', 'Rb 85.468 rubidio', 'Sr 87.62 estroncio', 'Y 88.906 itrio', 'Zr 91.224 circonio',
  'Nb 92.906 niobio', 'Mo 95.95 molibdeno', 'Tc 98 tecnecio', 'Ru 101.07 rutenio', 'Rh 102.91 rodio',
  'Pd 106.42 paladio', 'Ag 107.87 plata', 'Cd 112.41 cadmio', 'In 114.82 indio', 'Sn 118.71 estaño',
  'Sb 121.76 antimonio', 'Te 127.60 teluro', 'I 126.90 yodo', 'Xe 131.29 xenón', 'Cs 132.91 cesio',
  'Ba 137.33 bario', 'La 138.91 lantano', 'Ce 140.12 cerio', 'Pr 140.91 praseodimio', 'Nd 144.24 neodimio',
  'Pm 145 prometio', 'Sm 150.36 samario', 'Eu 151.96 europio', 'Gd 157.25 gadolinio', 'Tb 158.93 terbio',
  'Dy 162.50 disprosio', 'Ho 164.93 holmio', 'Er 167.26 erbio', 'Tm 168.93 tulio', 'Yb 173.05 iterbio',
  'Lu 174.97 lutecio', 'Hf 178.49 hafnio', 'Ta 180.95 tantalio', 'W 183.84 wolframio', 'Re 186.21 renio',
  'Os 190.23 osmio', 'Ir 192.22 iridio', 'Pt 195.08 platino', 'Au 196.97 oro', 'Hg 200.59 mercurio',
  'Tl 204.38 talio', 'Pb 207.2 plomo', 'Bi 208.98 bismuto', 'Po 209 polonio', 'At 210 ástato',
  'Rn 222 radón', 'Fr 223 francio', 'Ra 226 radio', 'Ac 227 actinio', 'Th 232.04 torio',
  'Pa 231.04 protactinio', 'U 238.03 uranio', 'Np 237 neptunio', 'Pu 244 plutonio', 'Am 243 americio',
  'Cm 247 curio', 'Bk 247 berkelio', 'Cf 251 californio', 'Es 252 einstenio', 'Fm 257 fermio',
  'Md 258 mendelevio', 'No 259 nobelio', 'Lr 266 lawrencio', 'Rf 267 rutherfordio', 'Db 268 dubnio',
  'Sg 269 seaborgio', 'Bh 270 bohrio', 'Hs 269 hasio', 'Mt 278 meitnerio', 'Ds 281 darmstatio',
  'Rg 282 roentgenio', 'Cn 285 copernicio', 'Nh 286 nihonio', 'Fl 289 flerovio', 'Mc 290 moscovio',
  'Lv 293 livermorio', 'Ts 294 teneso', 'Og 294 oganesón'
].map((s, i) => { const p = s.split(' '); return { s: p[0], m: +p[1], n: p[2], z: i + 1 }; });

/* Masa del isótopo más abundante, para la masa exacta que pide un espectro de
   masas. Solo de los elementos que se miden así: mentir con el resto sería
   peor que decir que no la tenemos. */
const QUIM_EXACTA = {
  H: 1.007825, D: 2.014102, T: 3.016049, He: 4.002603, Li: 7.016004, Be: 9.012182, B: 11.009305,
  C: 12, N: 14.003074, O: 15.994915, F: 18.998403, Ne: 19.992440, Na: 22.989770, Mg: 23.985042,
  Al: 26.981538, Si: 27.976927, P: 30.973762, S: 31.972071, Cl: 34.968853, Ar: 39.962383,
  K: 38.963707, Ca: 39.962591, Sc: 44.955910, Ti: 47.947946, V: 50.943964, Cr: 51.940512,
  Mn: 54.938050, Fe: 55.934942, Co: 58.933200, Ni: 57.935348, Cu: 62.929601, Zn: 63.929147,
  Ga: 68.925581, Ge: 73.921178, As: 74.921596, Se: 79.916522, Br: 78.918338, Kr: 83.911507,
  Rb: 84.911789, Sr: 87.905614, Y: 88.905848, Zr: 89.904704, Nb: 92.906378, Mo: 97.905408,
  Ru: 101.904350, Rh: 102.905504, Pd: 105.903483, Ag: 106.905093, Cd: 113.903358, In: 114.903878,
  Sn: 119.902197, Sb: 120.903818, Te: 129.906223, I: 126.904468, Xe: 131.904154, Cs: 132.905447,
  Ba: 137.905241, La: 138.906348, Ce: 139.905434, Nd: 141.907719, Sm: 151.919729, Eu: 152.921230,
  Gd: 157.924101, Tb: 158.925343, Dy: 163.929171, Er: 165.930290, Yb: 173.938858, Lu: 174.940768,
  Hf: 179.946549, Ta: 180.947996, W: 183.950933, Re: 186.955751, Os: 191.961479, Ir: 192.962924,
  Pt: 194.964774, Au: 196.966552, Hg: 201.970626, Tl: 204.974412, Pb: 207.976636, Bi: 208.980383,
  Th: 232.038050, U: 238.050783
};

/* Índices por símbolo. El deuterio y el tritio entran como pseudoelementos: al
   escribir D2O lo que se quiere contar es deuterio, no hidrógeno cualquiera. */
const QUIM_M = {}, QUIM_NOM = {}, QUIM_Z = {};
QUIM_EL.forEach(e => { QUIM_M[e.s] = e.m; QUIM_NOM[e.s] = e.n; QUIM_Z[e.s] = e.z; });
QUIM_M.D = 2.014; QUIM_NOM.D = 'deuterio'; QUIM_Z.D = 1;
QUIM_M.T = 3.016; QUIM_NOM.T = 'tritio'; QUIM_Z.T = 1;

/* Símbolos que no son elementos pero que todo el mundo escribe: el R de un
   grupo cualquiera, el M de «un metal», el Ph de un fenilo. Se cuentan como si
   fueran átomos —así el ajuste sigue funcionando— pero sin masa. */
const QUIM_GEN = {
  R: 'grupo cualquiera', X: 'halógeno o grupo saliente', M: 'un metal', L: 'ligando',
  A: 'especie genérica', E: 'especie genérica', Q: 'especie genérica', Z: 'especie genérica',
  G: 'especie genérica', J: 'especie genérica', Ph: 'fenilo', Me: 'metilo', Et: 'etilo',
  Bu: 'butilo', Nu: 'nucleófilo', Ln: 'lantánido'
};

const quimNombreEl = s => QUIM_NOM[s] || QUIM_GEN[s] || s;
/* Plural español a mano: «argón» → «argones», «oxígeno» → «oxígenos». */
function quimPlural(n) {
  if (/ón$/.test(n)) return n.slice(0, -2) + 'ones';
  if (/[aeiou]$/.test(n)) return n + 's';
  if (/s$/.test(n)) return n;
  return n + 'es';
}
const quimNum = (v, d) => !isFinite(v) ? '—'
  : v.toLocaleString('es-ES', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });

/* ---------------- familias y posición en la tabla ----------------
   La posición se deduce de Z, que para eso la tabla periódica es periódica. */
function quimFamilia(z) {
  if ([3, 11, 19, 37, 55, 87].indexOf(z) >= 0) return 'alc';
  if ([4, 12, 20, 38, 56, 88].indexOf(z) >= 0) return 'alt';
  if (z >= 57 && z <= 71) return 'lan';
  if (z >= 89 && z <= 103) return 'act';
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return 'tra';
  if ([9, 17, 35, 53, 85, 117].indexOf(z) >= 0) return 'hal';
  if ([2, 10, 18, 36, 54, 86, 118].indexOf(z) >= 0) return 'nob';
  if ([5, 14, 32, 33, 51, 52].indexOf(z) >= 0) return 'mtl';
  if ([1, 6, 7, 8, 15, 16, 34].indexOf(z) >= 0) return 'nom';
  return 'pos';
}
const QUIM_FAM = [
  ['alc', 'Alcalinos'], ['alt', 'Alcalinotérreos'], ['tra', 'Transición'], ['pos', 'Metales del bloque p'],
  ['mtl', 'Metaloides'], ['nom', 'No metales'], ['hal', 'Halógenos'], ['nob', 'Gases nobles'],
  ['lan', 'Lantánidos'], ['act', 'Actínidos']
];
/* Devuelve { p: periodo (fila), g: grupo (columna), f: 1|2 si va en el bloque f }. */
function quimPos(z) {
  if (z === 1) return { p: 1, g: 1 };
  if (z === 2) return { p: 1, g: 18 };
  if (z <= 4) return { p: 2, g: z - 2 };
  if (z <= 10) return { p: 2, g: z + 8 };
  if (z <= 12) return { p: 3, g: z - 10 };
  if (z <= 18) return { p: 3, g: z };
  if (z <= 36) return { p: 4, g: z - 18 };
  if (z <= 54) return { p: 5, g: z - 36 };
  if (z <= 56) return { p: 6, g: z - 54 };
  if (z <= 71) return { p: 6, g: z - 56, f: 1 };
  if (z <= 86) return { p: 6, g: z - 68 };
  if (z <= 88) return { p: 7, g: z - 86 };
  if (z <= 103) return { p: 7, g: z - 88, f: 2 };
  return { p: 7, g: z - 100 };
}

/* ---------------- analizador de fórmulas ----------------
   Descenso recursivo sobre el texto en notación mhchem. Lo que no entiende no
   lo inventa: lo apunta en `avisos` y sigue, que media fórmula leída sirve más
   que un error seco. */

/* Quita el envoltorio \ce{…} y los adornos de LaTeX que no dicen nada químico. */
function _qLimpia(t) {
  let s = String(t == null ? '' : t);
  const m = s.match(/^\s*\\ce\s*\{([\s\S]*)\}\s*$/);
  if (m) s = m[1];
  s = s.replace(/\\cdot/g, '*').replace(/\\left|\\right/g, ' ')
    .replace(/\\[,;!:]/g, ' ').replace(/\\q?quad/g, ' ')
    .replace(/[   ]/g, ' ');
  return s.trim();
}
/* Fórmula sin espacios ni etiquetas de estado: la forma canónica con la que se
   buscan las excepciones (peróxidos) y los nombres del diccionario. */
function _qPlano(t) {
  return _qLimpia(t).replace(/\((s|l|g|aq|ac|dis|sln|sol)\)/gi, '')
    .replace(/\s+/g, '').replace(/·/g, '*');
}

const _QNUM = /^[0-9]+/;
function _qEntero(st) { const m = st.s.slice(st.i).match(_QNUM); if (!m) return 1; st.i += m[0].length; return +m[0]; }
function _qEnteroLibre(st) {
  while (st.s[st.i] === ' ') st.i++;
  const m = st.s.slice(st.i).match(_QNUM);
  if (!m) return 1;
  st.i += m[0].length;
  while (st.s[st.i] === ' ') st.i++;
  return +m[0];
}
function _qSuma(dest, src, n) { for (const k in src) dest[k] = (dest[k] || 0) + src[k] * n; }

/* El corazón: lee una secuencia hasta `cierre` (o hasta el final) y devuelve el
   recuento de átomos y la carga acumulada. */
function _qLee(st, cierre) {
  const at = Object.create(null);
  let carga = 0, isoPend = null, zPend = null;
  while (st.i < st.s.length) {
    const antes = st.i, c = st.s[st.i];
    if (cierre && c === cierre) break;
    if (c === ' ' || c === '\t' || c === '\n') { st.i++; continue; }

    /* (s), (aq)… son etiquetas de estado, no grupos: se miran antes que nada. */
    if (c === '(') {
      const e = st.s.slice(st.i).match(/^\((s|l|g|aq|ac|dis|sln|sol)\)/i);
      if (e) { st.i += e[0].length; continue; }
      st.i++;
      const d = _qLee(st, ')');
      if (st.s[st.i] === ')') st.i++; else st.av.push('Falta un paréntesis de cierre.');
      const n = _qEntero(st);
      _qSuma(at, d.at, n); carga += d.carga * n;
      continue;
    }
    if (c === '[') {
      st.i++;
      const d = _qLee(st, ']');
      if (st.s[st.i] === ']') st.i++; else st.av.push('Falta un corchete de cierre.');
      const n = _qEntero(st);
      _qSuma(at, d.at, n); carga += d.carga * n;
      continue;
    }
    if (c === ')' || c === ']') { st.av.push('Sobra un «' + c + '».'); st.i++; continue; }

    /* Punto de hidrato: lo que sigue se multiplica y se suma. CuSO4 * 5 H2O. */
    if (c === '*' || c === '·') {
      st.i++;
      const n = _qEnteroLibre(st);
      const d = _qLee(st, cierre);
      _qSuma(at, d.at, n); carga += d.carga * n;
      st.hid = true;
      break;
    }

    /* Exponente: carga (^2+), número másico (^{235}) o punto de radical (^.).
       Un ^ suelto al final es la flecha de gas de mhchem. */
    if (c === '^') {
      st.i++;
      if (st.s[st.i] === '.') { st.i++; st.rad = true; continue; }
      let cu = '';
      if (st.s[st.i] === '{') {
        const j = st.s.indexOf('}', st.i);
        cu = j < 0 ? st.s.slice(st.i + 1) : st.s.slice(st.i + 1, j);
        st.i = j < 0 ? st.s.length : j + 1;
      } else {
        const m = st.s.slice(st.i).match(/^[0-9]*[+-]?/);
        cu = m[0]; st.i += m[0].length;
      }
      cu = cu.trim();
      if (/^[0-9]*[+-]$/.test(cu)) {
        const n = parseInt(cu, 10);
        carga += (cu.slice(-1) === '+' ? 1 : -1) * (isNaN(n) ? 1 : n);
      } else if (/^[0-9]+m?$/.test(cu)) {
        isoPend = parseInt(cu, 10);
      } else if (cu !== '') {
        st.av.push('No entiendo el exponente «' + cu + '».');
      }
      continue;
    }
    /* Subíndice: el número atómico de un isótopo. Se guarda, porque es lo que
       permite comprobar una reacción nuclear. */
    if (c === '_') {
      st.i++;
      let cu = '';
      if (st.s[st.i] === '{') { const j = st.s.indexOf('}', st.i); cu = j < 0 ? st.s.slice(st.i + 1) : st.s.slice(st.i + 1, j); st.i = j < 0 ? st.s.length : j + 1; }
      else { const m = st.s.slice(st.i).match(/^[+-]?[0-9]*/); cu = m[0]; st.i += m[0].length; }
      if (/^[+-]?[0-9]+$/.test(cu.trim())) zPend = parseInt(cu.trim(), 10);
      continue;
    }

    /* Partícula nuclear sin símbolo de elemento: el n de un neutrón, el e de un
       electrón. Ya trae su número másico y su número atómico delante. */
    if (isoPend != null && /[a-z\\]/.test(c)) {
      const mp = st.s.slice(st.i).match(/^(\\[A-Za-z]+|[a-z]+)/);
      st.i += mp ? mp[0].length : 1;
      st.iso.push({ s: mp ? mp[0] : '?', a: isoPend, z: zPend == null ? 0 : zPend, n: 1, part: true });
      isoPend = null; zPend = null;
      continue;
    }

    /* Electrón suelto: e-, e^- */
    if (c === 'e' && (st.s[st.i + 1] === '-' || (st.s[st.i + 1] === '^' && st.s[st.i + 2] === '-'))) {
      carga -= 1; st.i += st.s[st.i + 1] === '-' ? 2 : 3; continue;
    }
    /* Flecha de precipitado de mhchem: una v suelta. */
    if (c === 'v' && !/[A-Za-z0-9]/.test(st.s[st.i + 1] || '')) { st.i++; continue; }

    if (c === '+') { carga += 1; st.i++; continue; }
    if (c === '-') {
      /* Un guion es carga si cierra la especie; si va entre átomos es un enlace. */
      const sig = st.s[st.i + 1];
      const estado = /^\((s|l|g|aq|ac|dis|sln|sol)\)/i.test(st.s.slice(st.i + 1));
      if (sig === undefined || sig === ' ' || sig === ')' || sig === ']' || sig === cierre || estado) carga -= 1;
      st.i++; continue;
    }
    if (c === '=' || c === '#' || c === '~') { st.i++; continue; }   /* enlaces */
    if (c === '$') { const j = st.s.indexOf('$', st.i + 1); st.i = j < 0 ? st.s.length : j + 1; continue; }
    if (c === '\\') {
      const m = st.s.slice(st.i).match(/^\\[A-Za-z]+\s*(\{[^}]*\})?/);
      st.i += m ? m[0].length : 1;
      continue;
    }
    if (c === '{' || c === '}') { st.i++; continue; }

    /* Símbolo de elemento (o marcador genérico), con su subíndice. */
    const m = st.s.slice(st.i).match(/^[A-Z][a-z]{0,2}/);
    if (m) {
      let sim = null;
      for (let L = m[0].length; L >= 1 && !sim; L--) {
        const cand = m[0].slice(0, L);
        if (QUIM_M[cand] != null || QUIM_GEN[cand]) sim = cand;
      }
      if (!sim) { sim = m[0]; if (st.desc.indexOf(sim) < 0) st.desc.push(sim); }
      st.i += sim.length;
      const n = _qEntero(st);
      at[sim] = (at[sim] || 0) + n;
      if (isoPend != null) {
        st.iso.push({ s: sim, a: isoPend, z: zPend == null ? (QUIM_Z[sim] || 0) : zPend, n: n });
        isoPend = null; zPend = null;
      }
      continue;
    }
    if (/[0-9]/.test(c)) { st.av.push('Hay un número suelto que no sé a qué átomo pertenece.'); st.i++; continue; }
    if (/[a-z]/.test(c)) { st.i++; continue; }
    st.i++;
    if (st.i === antes) st.i++;   /* red de seguridad: el bucle siempre avanza */
  }
  if (isoPend != null) st.iso.push({ s: '?', a: isoPend, z: zPend == null ? 0 : zPend, n: 1, part: true });
  return { at: at, carga: carga };
}

/* Analiza una especie. Devuelve el recuento de átomos, la carga, el coeficiente
   estequiométrico que llevaba delante y lo que no se ha entendido. */
function quimAnaliza(txt) {
  const bruto = _qLimpia(txt);
  let coef = 1, s = bruto;
  const mc = s.match(/^(\d+)(?:\s+|(?=[A-Z(\[]))/);
  if (mc) { coef = +mc[1]; s = s.slice(mc[0].length); }
  const st = { s: s, i: 0, av: [], iso: [], desc: [] };
  const r = _qLee(st, null);
  return {
    texto: bruto, formula: s.trim(), coef: coef,
    atomos: r.at, carga: r.carga,
    iso: st.iso, desc: st.desc, avisos: st.av,
    hidrato: !!st.hid, radical: !!st.rad,
    vacio: !Object.keys(r.at).length
  };
}

/* ---------------- masa molar y composición ---------------- */
function quimMasa(an) {
  const at = an.atomos, falta = [], comp = [];
  let m = 0, ex = 0, exOk = true, aprox = false;
  const isoDe = {};
  (an.iso || []).forEach(i => { isoDe[i.s] = i.a; });
  for (const el in at) {
    const n = at[el];
    if (isoDe[el] != null) { m += isoDe[el] * n; ex += isoDe[el] * n; aprox = true; comp.push({ el: el, n: n, m: isoDe[el] * n }); continue; }
    const ma = QUIM_M[el];
    if (ma == null) { falta.push(el); comp.push({ el: el, n: n, m: null }); exOk = false; continue; }
    m += ma * n;
    comp.push({ el: el, n: n, m: ma * n });
    if (QUIM_EXACTA[el] != null) ex += QUIM_EXACTA[el] * n; else exOk = false;
  }
  if (falta.length) return { ok: false, falta: falta, comp: comp, m: null };
  comp.forEach(c => { c.pct = m > 0 ? c.m / m * 100 : 0; });
  comp.sort((a, b) => b.pct - a.pct);
  return { ok: true, m: m, exacta: exOk ? ex : null, aprox: aprox, comp: comp, falta: [] };
}

/* ---------------- ecuaciones ---------------- */
const QUIM_FLECHAS = ['<=>>', '<<=>', '<=>', '<-->', '<->', '->', '<-', '⇌', '→', '⟶', '←'];
/* Busca la flecha principal fuera de paréntesis y se come su rótulo ->[…][…]. */
function _qFlecha(s) {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') { d++; continue; }
    if (c === ')' || c === ']' || c === '}') { d--; continue; }
    if (d !== 0) continue;
    for (const f of QUIM_FLECHAS) {
      if (s.startsWith(f, i)) {
        let j = i + f.length;
        for (let k = 0; k < 2; k++) {
          if (s[j] !== '[') break;
          let p = 1, q = j + 1;
          while (q < s.length && p) { if (s[q] === '[') p++; else if (s[q] === ']') p--; q++; }
          j = q;
        }
        return { i: i, fin: j, sim: f, txt: s.slice(i, j) };
      }
    }
  }
  return null;
}
/* Parte un lado en especies. El «+» que separa lleva espacio delante; el de una
   carga (Na+) nunca lo lleva. Si nadie usó espacios, se acepta el «+» que va
   seguido de mayúscula. */
function _qEspecies(lado) {
  const cortes = [];
  let d = 0;
  for (let i = 0; i < lado.length; i++) {
    const c = lado[i];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === '+' && d === 0 && i > 0 && /\s/.test(lado[i - 1])) cortes.push(i);
  }
  if (!cortes.length) {
    for (let i = 1; i < lado.length; i++) {
      if (lado[i] === '+' && /[A-Z(\[]/.test(lado[i + 1] || '')) cortes.push(i);
    }
  }
  const out = []; let a = 0;
  cortes.forEach(i => { out.push(lado.slice(a, i)); a = i + 1; });
  out.push(lado.slice(a));
  return out.map(x => x.trim()).filter(x => x !== '');
}

/* Lee una reacción entera: especies, coeficientes y el balance de cada elemento.
   Hay tres casos que NO se comprueban contando átomos, y decirlo vale más que
   dar un veredicto falso: la que lleva símbolos genéricos (A, M, R), la que
   encadena dos flechas y la nuclear, donde lo que se conserva no son los
   átomos sino el número másico y el atómico. */
function quimEcuacion(txt) {
  const s = _qLimpia(txt);
  const fl = _qFlecha(s);
  if (!fl) return { esEc: false, texto: s };
  const izq = _qEspecies(s.slice(0, fl.i)).map(t => quimAnaliza(t));
  const der = _qEspecies(s.slice(fl.fin)).map(t => quimAnaliza(t));
  const todas = izq.concat(der);
  const r = {
    esEc: true, texto: s, flecha: fl, izq: izq, der: der,
    multi: !!_qFlecha(s.slice(fl.fin)),
    generica: todas.some(e => Object.keys(e.atomos).some(k => QUIM_GEN[k])),
    nuclear: todas.length > 0 && todas.every(e => e.iso.length &&
      _qTot(e.atomos) === e.iso.reduce((a, x) => a + (x.part ? 0 : x.n), 0)),
    mensajes: [], avisos: [], desc: [], dif: Object.create(null)
  };
  todas.forEach(e => {
    e.avisos.forEach(a => { if (r.avisos.indexOf(a) < 0) r.avisos.push(a); });
    e.desc.forEach(a => { if (r.desc.indexOf(a) < 0) r.desc.push(a); });
  });
  izq.forEach(e => { for (const k in e.atomos) r.dif[k] = (r.dif[k] || 0) + e.atomos[k] * e.coef; });
  der.forEach(e => { for (const k in e.atomos) r.dif[k] = (r.dif[k] || 0) - e.atomos[k] * e.coef; });
  r.cargaIzq = izq.reduce((a, e) => a + e.carga * e.coef, 0);
  r.cargaDer = der.reduce((a, e) => a + e.carga * e.coef, 0);

  if (r.multi) { r.comprobable = false; r.nota = 'Hay más de una flecha: el ajuste se comprueba de una en una.'; return r; }
  if (r.generica) { r.comprobable = false; r.nota = 'Con símbolos genéricos no hay nada que contar; sustitúyelos por especies reales para comprobar el ajuste.'; return r; }
  r.comprobable = true;

  if (r.nuclear) {
    const suma = (lado, campo) => lado.reduce((a, e) =>
      a + e.coef * e.iso.reduce((b, x) => b + x[campo] * x.n, 0), 0);
    r.aIzq = suma(izq, 'a'); r.aDer = suma(der, 'a');
    r.zIzq = suma(izq, 'z'); r.zDer = suma(der, 'z');
    if (r.aIzq !== r.aDer) r.mensajes.push('El número másico no cuadra: ' + r.aIzq + ' a la izquierda y ' + r.aDer + ' a la derecha.');
    if (r.zIzq !== r.zDer) r.mensajes.push('El número atómico no cuadra: ' + r.zIzq + ' a la izquierda y ' + r.zDer + ' a la derecha.');
    r.ajustada = !r.mensajes.length;
    if (r.ajustada) r.nota = 'Reacción nuclear: se conservan el número másico y el atómico.';
    return r;
  }

  Object.keys(r.dif).sort().forEach(el => {
    const d = r.dif[el];
    if (!d) return;
    const n = Math.abs(d), pr = QUIM_NOM[el], nom = pr ? (n === 1 ? pr : quimPlural(pr)) : el;
    r.mensajes.push('Sobra' + (n === 1 ? '' : 'n') + ' ' + n + ' ' + nom +
      ' a la ' + (d > 0 ? 'izquierda' : 'derecha') + '.');
  });
  if (r.cargaIzq !== r.cargaDer) {
    r.mensajes.push('La carga no cuadra: ' + _qSigno(r.cargaIzq) + ' a la izquierda y ' + _qSigno(r.cargaDer) + ' a la derecha.');
  }
  r.ajustada = !r.mensajes.length;
  return r;
}
const _qTot = at => { let n = 0; for (const k in at) n += at[k]; return n; };
const _qSigno = q => q === 0 ? '0' : (q > 0 ? '+' : '−') + Math.abs(q);

/* ---------------- ajuste automático ----------------
   Eliminación de Gauss sobre la matriz de coeficientes. Con fracciones exactas
   (BigInt) y no en coma flotante: un 1/3 redondeado se convierte, tres pasos
   más allá, en un coeficiente que no es entero y en una diapositiva mal. */
function _mcdB(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) { const t = a % b; a = b; b = t; } return a; }
function _fr(n, d) {
  n = BigInt(n); d = BigInt(d === undefined ? 1 : d);
  if (d < 0n) { n = -n; d = -d; }
  const g = _mcdB(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const _frSum = (a, b) => _fr(a.n * b.d + b.n * a.d, a.d * b.d);
const _frRes = (a, b) => _fr(a.n * b.d - b.n * a.d, a.d * b.d);
const _frMul = (a, b) => _fr(a.n * b.n, a.d * b.d);
const _frDiv = (a, b) => _fr(a.n * b.d, a.d * b.n);

/* Forma escalonada reducida; devuelve las columnas pivote. */
function _rref(M) {
  const m = M.length, n = M[0].length, piv = [];
  let r = 0;
  for (let c = 0; c < n && r < m; c++) {
    let p = -1;
    for (let i = r; i < m; i++) if (M[i][c].n !== 0n) { p = i; break; }
    if (p < 0) continue;
    const t = M[r]; M[r] = M[p]; M[p] = t;
    const inv = M[r][c];
    for (let j = 0; j < n; j++) M[r][j] = _frDiv(M[r][j], inv);
    for (let i = 0; i < m; i++) {
      if (i === r || M[i][c].n === 0n) continue;
      const f = M[i][c];
      for (let j = 0; j < n; j++) M[i][j] = _frRes(M[i][j], _frMul(f, M[r][j]));
    }
    piv.push(c); r++;
  }
  return piv;
}

/* Ajusta la reacción y devuelve los coeficientes enteros mínimos. Cuando el
   sistema no tiene una única solución lo dice con todas las letras: inventar
   números sería lo peor que podría hacer aquí. */
function quimAjusta(txt) {
  const ec = quimEcuacion(txt);
  if (!ec.esEc) return { ok: false, motivo: 'Para ajustar hace falta una reacción con flecha (->, <=>).' };
  if (ec.multi) return { ok: false, motivo: 'Hay más de una flecha: ajusta cada etapa por separado.' };
  if (ec.generica) return { ok: false, motivo: 'Con símbolos genéricos (A, M, R…) no hay coeficientes que calcular.' };
  if (ec.nuclear) return { ok: false, motivo: 'En una reacción nuclear los coeficientes se deducen del número másico y del atómico, no de una matriz de átomos.' };
  const esp = ec.izq.concat(ec.der), nI = ec.izq.length;
  if (esp.length < 2) return { ok: false, motivo: 'Hacen falta al menos dos especies.' };
  if (esp.length > 26) return { ok: false, motivo: 'Son demasiadas especies para ajustarlas de una vez.' };
  const els = [];
  esp.forEach(e => { for (const k in e.atomos) if (els.indexOf(k) < 0) els.push(k); });
  const M = els.map(el => esp.map((e, j) => _fr((j < nI ? 1 : -1) * (e.atomos[el] || 0))));
  M.push(esp.map((e, j) => _fr((j < nI ? 1 : -1) * e.carga)));
  const piv = _rref(M);
  const libres = [];
  for (let c = 0; c < esp.length; c++) if (piv.indexOf(c) < 0) libres.push(c);
  if (!libres.length) return { ok: false, motivo: 'Esta reacción no se puede ajustar tal como está: revisa las fórmulas o si falta alguna especie.' };
  if (libres.length > 1) return { ok: false, motivo: 'Hay ' + libres.length + ' formas independientes de ajustarla: parece que se han juntado varias reacciones en una. Sepáralas y ajusta cada una.' };

  const libre = libres[0], x = esp.map(() => _fr(0));
  x[libre] = _fr(1);
  piv.forEach((c, r) => { x[c] = _fr(-M[r][libre].n, M[r][libre].d); });
  /* De fracciones a enteros: se multiplica por el mínimo común múltiplo de los
     denominadores y se divide por el máximo común divisor de lo que salga. */
  let L = 1n;
  x.forEach(f => { L = L / _mcdB(L, f.d) * f.d; });
  const ent = x.map(f => f.n * (L / f.d));
  let G = 0n;
  ent.forEach(v => { G = _mcdB(G, v); });
  if (G === 0n) return { ok: false, motivo: 'No hay solución con coeficientes positivos.' };
  const co = ent.map(v => Number(v / G));
  if (co.some(v => v < 0)) {
    const mal = co.map((v, j) => v < 0 ? esp[j].formula : null).filter(Boolean);
    return { ok: false, motivo: 'Solo se ajusta con coeficientes negativos: ' + mal.join(', ') + ' parece' + (mal.length > 1 ? 'n' : '') + ' estar en el lado equivocado.' };
  }
  if (co.some(v => v === 0)) return { ok: false, motivo: 'El ajuste deja alguna especie con coeficiente cero: sobra en la reacción.' };
  if (co.some(v => v > 999)) return { ok: false, motivo: 'Los coeficientes salen desmesurados; comprueba las fórmulas.' };
  /* Se reescribe conservando el texto de cada especie y la flecha tal cual. */
  const lado = (a, b) => esp.slice(a, b).map((e, k) => (co[a + k] === 1 ? '' : co[a + k] + ' ') + e.formula).join(' + ');
  const texto = lado(0, nI) + ' ' + ec.flecha.txt + ' ' + lado(nI, esp.length);
  return { ok: true, coef: co, texto: texto, yaEstaba: ec.ajustada };
}

/* ---------------- estados de oxidación ----------------
   Las reglas de siempre y sus excepciones. Cuando quedan dos incógnitas no se
   adivina: se dice cuáles son. */
const _QALC = ['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'];
const _QALT = ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'];
const _QPEROX = ['H2O2', 'Na2O2', 'K2O2', 'Li2O2', 'Rb2O2', 'Cs2O2', 'BaO2', 'CaO2', 'SrO2', 'MgO2', 'ZnO2'];
const _QSUPER = ['KO2', 'RbO2', 'CsO2', 'NaO2'];
/* Fracción legible a partir de un decimal: +8/3 dice mucho más que +2,667. */
function _qFrac(v) {
  if (!v) return '0';
  const sg = v < 0 ? '−' : '+', a = Math.abs(v);
  if (Math.abs(a - Math.round(a)) < 1e-9) return sg + Math.round(a);
  for (let d = 2; d <= 12; d++) {
    const n = a * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return sg + Math.round(n) + '/' + d;
  }
  return sg + quimNum(a, 2);
}
/* Oxoaniones que se reconocen al vuelo. El orden importa: primero el que más
   oxígenos lleva, porque la coincidencia se exige exacta. */
const QUIM_ANIONES = [
  { c: 'S', cn: 1, o: 4, q: -2, n: 'sulfato' }, { c: 'S', cn: 1, o: 3, q: -2, n: 'sulfito' },
  { c: 'N', cn: 1, o: 3, q: -1, n: 'nitrato' }, { c: 'N', cn: 1, o: 2, q: -1, n: 'nitrito' },
  { c: 'C', cn: 1, o: 3, q: -2, n: 'carbonato' }, { c: 'C', cn: 2, o: 4, q: -2, n: 'oxalato' },
  { c: 'P', cn: 1, o: 4, q: -3, n: 'fosfato' }, { c: 'Cr', cn: 2, o: 7, q: -2, n: 'dicromato' },
  { c: 'Cr', cn: 1, o: 4, q: -2, n: 'cromato' }, { c: 'Mn', cn: 1, o: 4, q: -1, n: 'permanganato' },
  { c: 'Cl', cn: 1, o: 4, q: -1, n: 'perclorato' }, { c: 'Cl', cn: 1, o: 3, q: -1, n: 'clorato' },
  { c: 'Br', cn: 1, o: 3, q: -1, n: 'bromato' }, { c: 'I', cn: 1, o: 3, q: -1, n: 'yodato' },
  { c: 'Si', cn: 1, o: 4, q: -4, n: 'silicato' }, { c: 'B', cn: 1, o: 3, q: -3, n: 'borato' },
  { c: 'As', cn: 1, o: 4, q: -3, n: 'arseniato' }, { c: 'Se', cn: 1, o: 4, q: -2, n: 'selenato' },
  { c: 'Mo', cn: 1, o: 4, q: -2, n: 'molibdato' }, { c: 'W', cn: 1, o: 4, q: -2, n: 'wolframato' },
  { c: 'V', cn: 1, o: 3, q: -1, n: 'vanadato' }
];
function quimOxidacion(txt) {
  const an = quimAnaliza(txt);
  const els = Object.keys(an.atomos);
  if (!els.length) return { ok: false, motivo: '' };
  if (an.desc.length) return { ok: false, motivo: 'No reconozco ' + an.desc.join(', ') + ', así que no puedo repartir la carga.' };
  if (els.some(e => QUIM_GEN[e])) return { ok: false, motivo: 'La fórmula lleva símbolos genéricos; los estados de oxidación dependen de qué sean.' };
  const n = an.atomos, carga = an.carga, plano = _qPlano(an.formula);
  if (els.length === 1) {
    return { ok: true, est: [{ el: els[0], n: n[els[0]], eo: _qFrac(carga / n[els[0]]) }],
      nota: carga === 0 ? 'Elemento en estado libre: por convenio, 0.' : '' };
  }
  const fija = Object.create(null), notas = [];
  if (n.F) fija.F = -1;
  els.forEach(e => {
    if (_QALC.indexOf(e) >= 0) fija[e] = 1;
    else if (_QALT.indexOf(e) >= 0) fija[e] = 2;
    else if (e === 'Al' || e === 'Sc' || e === 'Y' || e === 'Ga') fija[e] = 3;
    else if (e === 'Zn' || e === 'Cd') fija[e] = 2;
    else if (e === 'Ag') fija[e] = 1;
  });
  /* Hidrógeno: +1 salvo en los hidruros, donde el otro elemento es menos
     electronegativo que él. */
  if (n.H || n.D || n.T) {
    const otros = els.filter(e => e !== 'H' && e !== 'D' && e !== 'T');
    const menos = otros.length > 0 && otros.every(e => _QALC.indexOf(e) >= 0 || _QALT.indexOf(e) >= 0 || e === 'Al' || e === 'B');
    ['H', 'D', 'T'].forEach(e => { if (n[e]) fija[e] = menos ? -1 : 1; });
    if (menos) notas.push('Hidruro: aquí el hidrógeno va como −1.');
  }
  /* Oxígeno: −2 salvo peróxidos, superóxidos y los fluoruros de oxígeno. */
  if (n.O) {
    if (n.F) { fija.O = n.F / n.O; notas.push('Con flúor, el oxígeno queda positivo.'); }
    else if (_QPEROX.indexOf(plano) >= 0) { fija.O = -1; notas.push('Peróxido: el oxígeno va como −1.'); }
    else if (_QSUPER.indexOf(plano) >= 0) { fija.O = -0.5; notas.push('Superóxido: el oxígeno va como −1/2.'); }
    else fija.O = -2;
  }
  /* Halógenos: el más electronegativo de los presentes vale −1 mientras no haya
     oxígeno ni flúor por encima de él. */
  if (!n.O) {
    const orden = ['F', 'Cl', 'Br', 'I'];
    const hay = orden.filter(e => n[e]);
    if (hay.length && els.length > hay.length) fija[hay[0]] = -1;
  }
  /* Calcógenos en sulfuros y análogos. */
  if (!n.O && !n.F && !n.Cl && !n.Br && !n.I) {
    ['S', 'Se', 'Te'].forEach(e => { if (n[e] && fija[e] == null && els.length > 1) fija[e] = -2; });
  }
  /* Con dos incógnitas —el metal y el átomo central— la suma no basta. Lo que
     hace cualquiera es reconocer el oxoanión: en CuSO4 el sulfato vale −2, y de
     ahí salen el azufre y el cobre. Solo se aplica si las cuentas de oxígeno
     encajan exactamente; si no, mejor no responder. */
  let inc = els.filter(e => fija[e] == null);
  if (inc.length > 1) {
    const agua = (n.H && fija.H === 1) ? Math.floor(n.H / 2) : 0;
    const oLibre = (n.O || 0) - agua;
    for (const an of QUIM_ANIONES) {
      if (fija[an.c] != null || !n[an.c] || n[an.c] % an.cn) continue;
      const k = n[an.c] / an.cn;
      if (oLibre !== k * an.o) continue;
      fija[an.c] = (an.q - (-2) * an.o) / an.cn;
      notas.push('Se ha reconocido el ' + an.n + ' (' + _qSigno(an.q) + ').');
      break;
    }
    inc = els.filter(e => fija[e] == null);
  }
  if (inc.length > 1) {
    return { ok: false, motivo: 'No se puede determinar: quedan ' + inc.length + ' incógnitas (' +
      inc.map(quimNombreEl).join(', ') + ') y una sola ecuación.' };
  }
  let suma = 0;
  els.forEach(e => { if (fija[e] != null) suma += fija[e] * n[e]; });
  if (inc.length === 1) fija[inc[0]] = (carga - suma) / n[inc[0]];
  else if (Math.abs(suma - carga) > 1e-9) notas.push('Ojo: con las reglas habituales la suma no llega a la carga; la fórmula puede tener algo raro.');
  const est = els.map(e => ({ el: e, n: n[e], eo: _qFrac(fija[e]) }));
  const prom = inc.length === 1 && n[inc[0]] > 1 && Math.abs(fija[inc[0]] - Math.round(fija[inc[0]])) > 1e-9;
  if (prom) notas.push('El valor fraccionario es el promedio: no todos los átomos de ese elemento están igual.');
  return { ok: true, est: est, nota: notas.join(' ') };
}

/* ---------------- nomenclatura ----------------
   Un diccionario, no un nombrador: sabe lo que hay en la lista y nada más. Es
   honesto decirlo, porque nombrar de verdad exige reglas que no caben aquí.
   Cada línea es «fórmula | nombre | sinónimos separados por comas». */
const QUIM_NOMBRES = [
  /* ácidos */
  'HCl|ácido clorhídrico|salfumán,ácido muriático', 'H2SO4|ácido sulfúrico', 'HNO3|ácido nítrico',
  'H3PO4|ácido fosfórico', 'CH3COOH|ácido acético|ácido etanoico,vinagre', 'HF|ácido fluorhídrico',
  'HBr|ácido bromhídrico', 'HI|ácido yodhídrico', 'HClO4|ácido perclórico', 'HClO3|ácido clórico',
  'HClO2|ácido cloroso', 'HClO|ácido hipocloroso', 'H2CO3|ácido carbónico', 'H2SO3|ácido sulfuroso',
  'HNO2|ácido nitroso', 'H2S|sulfuro de hidrógeno|ácido sulfhídrico', 'HCN|cianuro de hidrógeno|ácido cianhídrico',
  'H2C2O4|ácido oxálico', 'HCOOH|ácido fórmico|ácido metanoico', 'C6H5COOH|ácido benzoico',
  'C6H8O7|ácido cítrico', 'H2CrO4|ácido crómico', 'HMnO4|ácido permangánico', 'H3BO3|ácido bórico',
  'HSCN|ácido tiociánico', 'CF3COOH|ácido trifluoroacético|TFA',
  /* bases */
  'NaOH|hidróxido de sodio|sosa cáustica,hidróxido sódico', 'KOH|hidróxido de potasio|potasa cáustica',
  'Ca(OH)2|hidróxido de calcio|cal apagada', 'Mg(OH)2|hidróxido de magnesio', 'Ba(OH)2|hidróxido de bario',
  'Al(OH)3|hidróxido de aluminio', 'Fe(OH)3|hidróxido de hierro(III)', 'Fe(OH)2|hidróxido de hierro(II)',
  'Cu(OH)2|hidróxido de cobre(II)', 'NH3|amoniaco|amoníaco', 'NH4OH|hidróxido de amonio',
  'LiOH|hidróxido de litio', 'Zn(OH)2|hidróxido de cinc',
  /* óxidos y afines */
  'H2O|agua', 'D2O|agua pesada', 'H2O2|peróxido de hidrógeno|agua oxigenada', 'CO2|dióxido de carbono',
  'CO|monóxido de carbono', 'SO2|dióxido de azufre', 'SO3|trióxido de azufre', 'NO|monóxido de nitrógeno',
  'NO2|dióxido de nitrógeno', 'N2O|óxido nitroso|gas de la risa', 'N2O4|tetróxido de dinitrógeno',
  'CaO|óxido de calcio|cal viva', 'MgO|óxido de magnesio', 'Al2O3|óxido de aluminio|alúmina',
  'SiO2|dióxido de silicio|sílice,cuarzo', 'TiO2|dióxido de titanio', 'ZnO|óxido de cinc',
  'Fe2O3|óxido de hierro(III)|hematita', 'Fe3O4|óxido de hierro(II,III)|magnetita', 'CuO|óxido de cobre(II)',
  'Cu2O|óxido de cobre(I)', 'MnO2|dióxido de manganeso', 'P2O5|pentóxido de difósforo', 'Na2O|óxido de sodio',
  'K2O|óxido de potasio', 'PbO2|dióxido de plomo', 'Cr2O3|óxido de cromo(III)', 'CeO2|dióxido de cerio',
  'ZrO2|dióxido de circonio|circona', 'WO3|trióxido de wolframio', 'V2O5|pentóxido de divanadio',
  /* sales */
  'NaCl|cloruro de sodio|sal común,sal de mesa', 'KCl|cloruro de potasio', 'CaCl2|cloruro de calcio',
  'MgCl2|cloruro de magnesio', 'NH4Cl|cloruro de amonio', 'AgCl|cloruro de plata', 'BaCl2|cloruro de bario',
  'FeCl3|cloruro de hierro(III)', 'CuCl2|cloruro de cobre(II)', 'LiCl|cloruro de litio',
  'AgNO3|nitrato de plata', 'NaNO3|nitrato de sodio', 'KNO3|nitrato de potasio|salitre',
  'Ca(NO3)2|nitrato de calcio', 'Cu(NO3)2|nitrato de cobre(II)', 'Pb(NO3)2|nitrato de plomo(II)',
  'Na2CO3|carbonato de sodio|sosa,carbonato sódico', 'NaHCO3|hidrogenocarbonato de sodio|bicarbonato de sodio,bicarbonato',
  'CaCO3|carbonato de calcio|caliza,calcita,mármol', 'K2CO3|carbonato de potasio', 'Li2CO3|carbonato de litio',
  'Na2SO4|sulfato de sodio', 'CuSO4|sulfato de cobre(II)', 'CuSO4*5H2O|sulfato de cobre(II) pentahidratado|vitriolo azul',
  'FeSO4|sulfato de hierro(II)', 'ZnSO4|sulfato de cinc', 'MgSO4|sulfato de magnesio|sal de Epsom',
  'BaSO4|sulfato de bario', 'CaSO4|sulfato de calcio', 'CaSO4*2H2O|sulfato de calcio dihidratado|yeso',
  '(NH4)2SO4|sulfato de amonio', 'Al2(SO4)3|sulfato de aluminio', 'K2SO4|sulfato de potasio',
  'KMnO4|permanganato de potasio', 'K2Cr2O7|dicromato de potasio', 'K2CrO4|cromato de potasio',
  'NaClO|hipoclorito de sodio|lejía', 'KI|yoduro de potasio', 'NaI|yoduro de sodio', 'NaBr|bromuro de sodio',
  'PbI2|yoduro de plomo(II)', 'NaF|fluoruro de sodio', 'Na3PO4|fosfato de sodio', 'NaH2PO4|dihidrogenofosfato de sodio',
  'Na2HPO4|hidrogenofosfato de sodio', 'Na2S2O3|tiosulfato de sodio|hiposulfito', 'Na2S|sulfuro de sodio',
  'ZnS|sulfuro de cinc|blenda', 'FeS2|disulfuro de hierro|pirita', 'CH3COONa|acetato de sodio',
  'K3[Fe(CN)6]|hexacianoferrato(III) de potasio|ferricianuro de potasio',
  'K4[Fe(CN)6]|hexacianoferrato(II) de potasio|ferrocianuro de potasio',
  'NaBH4|borohidruro de sodio|tetrahidroborato de sodio', 'LiAlH4|tetrahidroaluminato de litio',
  'NaN3|azida de sodio', 'KSCN|tiocianato de potasio', 'NH4NO3|nitrato de amonio',
  /* elementos y gases habituales */
  'O2|oxígeno molecular|oxígeno,dioxígeno', 'N2|nitrógeno molecular|nitrógeno,dinitrógeno',
  'H2|hidrógeno molecular|hidrógeno,dihidrógeno', 'Cl2|cloro molecular|cloro', 'F2|flúor molecular',
  'Br2|bromo molecular', 'I2|yodo molecular', 'O3|ozono', 'P4|fósforo blanco', 'S8|azufre elemental',
  /* orgánicos */
  'CH4|metano', 'C2H6|etano', 'C3H8|propano', 'C4H10|butano', 'C2H4|eteno|etileno', 'C2H2|etino|acetileno',
  'C6H6|benceno', 'C7H8|tolueno', 'CH3OH|metanol|alcohol metílico', 'C2H5OH|etanol|alcohol etílico,alcohol',
  'C3H8O|propanol|isopropanol', 'C3H6O|acetona|propanona', 'CHCl3|cloroformo|triclorometano',
  'CH2Cl2|diclorometano', 'CCl4|tetracloruro de carbono', 'C6H12O6|glucosa', 'C12H22O11|sacarosa|azúcar',
  'CH3CN|acetonitrilo', 'C4H8O2|acetato de etilo', 'C5H5N|piridina', 'CH2O|formaldehído|metanal',
  'C2H6O2|etilenglicol', 'C6H5OH|fenol', 'C6H5NH2|anilina', 'CO(NH2)2|urea', 'C8H10N4O2|cafeína',
  'C9H8O4|ácido acetilsalicílico|aspirina', 'C4H10O|dietil éter|éter etílico', 'C6H14|hexano',
  'C4H8O|tetrahidrofurano|THF', 'C2H6OS|dimetilsulfóxido|DMSO', 'C3H7NO|dimetilformamida|DMF',
  'C6H5CH3|tolueno', 'C10H8|naftaleno', 'CH3COCH3|acetona'
].map(l => { const p = l.split('|'); return { f: p[0], n: p[1], al: p[2] ? p[2].split(',') : [] }; });

/* Índices. Las claves se normalizan sin tildes ni mayúsculas para que «ACIDO
   SULFURICO» escrito con prisa también encuentre su fórmula. */
const _qNorm = t => String(t == null ? '' : t).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const _QPORF = Object.create(null), _QPORN = Object.create(null);
QUIM_NOMBRES.forEach(e => {
  _QPORF[_qPlano(e.f)] = e;
  _QPORN[_qNorm(e.n)] = e;
  e.al.forEach(a => { if (!_QPORN[_qNorm(a)]) _QPORN[_qNorm(a)] = e; });
});
QUIM_EL.forEach(e => { if (!_QPORN[_qNorm(e.n)]) _QPORN[_qNorm(e.n)] = { f: e.s, n: e.n, al: [] }; });

/* De fórmula a nombre. Si no está en la lista, calla: prefiero un hueco a un
   nombre inventado. */
function quimNombre(formula) {
  const k = _qPlano(formula);
  if (_QPORF[k]) return _QPORF[k].n;
  if (QUIM_NOM[k]) return QUIM_NOM[k];
  return null;
}
/* De nombre a fórmula. Acepta el nombre completo o cualquiera de sus sinónimos. */
function quimFormula(nombre) {
  const e = _QPORN[_qNorm(nombre)];
  return e ? e.f : null;
}
/* Búsqueda suelta para el campo del diálogo: nombre o fórmula, por trozos. */
function quimBusca(q, tope) {
  const t = _qNorm(q);
  if (t.length < 2) return [];
  const tp = _qPlano(q).toLowerCase(), out = [], vistos = Object.create(null);
  const mete = (e, peso) => {
    if (vistos[e.f]) return;
    vistos[e.f] = 1; out.push({ e: e, p: peso });
  };
  QUIM_NOMBRES.forEach(e => {
    const n = _qNorm(e.n), f = e.f.toLowerCase();
    if (n.startsWith(t)) mete(e, 0);
    else if (f === tp) mete(e, 1);
    else if (e.al.some(a => _qNorm(a).startsWith(t))) mete(e, 2);
    else if (n.indexOf(t) >= 0) mete(e, 3);
    else if (tp.length > 1 && f.indexOf(tp) === 0) mete(e, 4);
  });
  QUIM_EL.forEach(e => {
    const n = _qNorm(e.n);
    if (n.startsWith(t) || e.s.toLowerCase() === tp) mete({ f: e.s, n: e.n, al: [] }, n.startsWith(t) ? 2 : 5);
  });
  out.sort((a, b) => a.p - b.p || a.e.n.localeCompare(b.e.n, 'es'));
  return out.slice(0, tope || 8).map(x => x.e);
}

/* ---------------- plantillas ----------------
   Agrupadas por familia. Una lista plana de once obligaba a leerlas todas para
   encontrar la que uno quería; por familias se llega en dos clics. */
const QUIM_PLANTILLAS = [
  { id: 'ab', n: 'Ácido–base', items: [
    { n: 'Neutralización', t: 'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)' },
    { n: 'Ácido diprótico', t: 'H2SO4 + 2 NaOH -> Na2SO4 + 2 H2O' },
    { n: 'Autoionización', t: '2 H2O <=> H3O+ + OH-' },
    { n: 'Ácido débil', t: 'CH3COOH + H2O <=> CH3COO- + H3O+' },
    { n: 'Base débil', t: 'NH3 + H2O <=> NH4+ + OH-' },
    { n: 'Efecto tampón', t: 'CH3COO- + H3O+ -> CH3COOH + H2O' },
    { n: 'Hidrólisis de sal', t: 'CO3^2- + H2O <=> HCO3- + OH-' },
    { n: 'Poliprótico (1.ª)', t: 'H3PO4 + H2O <=> H2PO4- + H3O+' },
    { n: 'Anfótero', t: 'Al(OH)3 + OH- -> [Al(OH)4]-' },
    { n: 'Carbonato con ácido', t: 'CaCO3(s) + 2 HCl(aq) -> CaCl2(aq) + H2O(l) + CO2 ^' },
    { n: 'Aducto de Lewis', t: 'BF3 + NH3 -> H3N-BF3' }
  ] },
  { id: 'redox', n: 'Redox', items: [
    { n: 'Par redox', t: 'Fe^3+ + e- -> Fe^2+' },
    { n: 'Permanganato (ácido)', t: 'MnO4- + 8 H+ + 5 e- -> Mn^2+ + 4 H2O' },
    { n: 'Dicromato', t: 'Cr2O7^2- + 14 H+ + 6 e- -> 2 Cr^3+ + 7 H2O' },
    { n: 'Oxidación del hierro', t: '4 Fe + 3 O2 -> 2 Fe2O3' },
    { n: 'Desplazamiento', t: 'Zn(s) + Cu^2+(aq) -> Zn^2+(aq) + Cu(s)' },
    { n: 'Combustión completa', t: 'C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O' },
    { n: 'Dismutación', t: '3 Cl2 + 6 OH- -> 5 Cl- + ClO3- + 3 H2O' },
    { n: 'Descomposición catalítica', t: '2 H2O2 ->[MnO2] 2 H2O + O2 ^' },
    { n: 'Termita', t: 'Fe2O3 + 2 Al -> 2 Fe + Al2O3' },
    { n: 'Medio básico', t: '2 NO3- + 6 H2O + 10 e- -> N2 + 12 OH-' }
  ] },
  { id: 'prec', n: 'Precipitación', items: [
    { n: 'Cloruro de plata', t: 'AgNO3(aq) + NaCl(aq) -> AgCl v + NaNO3(aq)' },
    { n: 'Yoduro de plomo', t: 'Pb(NO3)2(aq) + 2 KI(aq) -> PbI2 v + 2 KNO3(aq)' },
    { n: 'Sulfato de bario', t: 'BaCl2(aq) + Na2SO4(aq) -> BaSO4 v + 2 NaCl(aq)' },
    { n: 'Ecuación iónica neta', t: 'Ag+(aq) + Cl-(aq) -> AgCl(s)' },
    { n: 'Producto de solubilidad', t: 'CaF2(s) <=> Ca^2+(aq) + 2 F-(aq)' },
    { n: 'Hidróxido metálico', t: 'M^2+ + 2 OH- -> M(OH)2 v' },
    { n: 'Carbonato', t: 'Ca^2+(aq) + CO3^2-(aq) -> CaCO3 v' },
    { n: 'Sulfuro', t: 'Zn^2+ + H2S -> ZnS v + 2 H+' },
    { n: 'Redisolución', t: 'AgCl(s) + 2 NH3(aq) -> [Ag(NH3)2]+ + Cl-' }
  ] },
  { id: 'coord', n: 'Coordinación', items: [
    { n: 'Sustitución de ligando', t: '[Cu(H2O)6]^2+ + 4 NH3 <=> [Cu(NH3)4(H2O)2]^2+ + 4 H2O' },
    { n: 'Formación del complejo', t: 'Cu^2+ + 4 NH3 <=> [Cu(NH3)4]^2+' },
    { n: 'Hexacianoferrato', t: 'Fe^3+ + 6 CN- -> [Fe(CN)6]^3-' },
    { n: 'Complejo de EDTA', t: 'Ca^2+ + Y^4- -> [CaY]^2-' },
    { n: 'Hexaamina de cobalto', t: 'Co^3+ + 6 NH3 -> [Co(NH3)6]^3+' },
    { n: 'Cisplatino', t: '[PtCl4]^2- + 2 NH3 -> [Pt(NH3)2Cl2] + 2 Cl-' },
    { n: 'Tiosulfato (fijador)', t: 'AgCl(s) + 2 S2O3^2- -> [Ag(S2O3)2]^3- + Cl-' },
    { n: 'Hidrólisis del acuoion', t: '[Cr(H2O)6]^3+ <=> [Cr(H2O)5(OH)]^2+ + H+' },
    { n: 'Quelato genérico', t: 'M^2+ + 2 L- <=> [ML2]' }
  ] },
  { id: 'org', n: 'Orgánica', items: [
    { n: 'Esterificación', t: 'CH3COOH + C2H5OH <=>[H+] CH3COOC2H5 + H2O' },
    { n: 'Saponificación', t: 'CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH' },
    { n: 'Combustión de alcano', t: 'C3H8 + 5 O2 -> 3 CO2 + 4 H2O' },
    { n: 'Adición al doble enlace', t: 'CH2=CH2 + Br2 -> CH2BrCH2Br' },
    { n: 'Hidrogenación', t: 'CH2=CH2 + H2 ->[Pd/C] CH3CH3' },
    { n: 'Sustitución nucleófila', t: 'CH3Br + OH- -> CH3OH + Br-' },
    { n: 'Oxidación de alcohol', t: 'CH3CH2OH + O2 ->[\\text{cat.}] CH3COOH + H2O' },
    { n: 'Grignard', t: 'CH3MgBr + CH2O + H2O -> CH3CH2OH + Mg(OH)Br' },
    { n: 'Nitración del benceno', t: 'C6H6 + HNO3 ->[H2SO4] C6H5NO2 + H2O' },
    { n: 'Fermentación', t: 'C6H12O6 ->[\\text{levadura}] 2 C2H5OH + 2 CO2 ^' },
    { n: 'Descarboxilación', t: 'CH3COONa + NaOH ->[\\Delta] CH4 ^ + Na2CO3' }
  ] },
  { id: 'rad', n: 'Radioquímica', items: [
    { n: 'Desintegración α', t: '^{238}_{92}U -> ^{234}_{90}Th + ^{4}_{2}He' },
    { n: 'Desintegración β⁻', t: '^{14}_{6}C -> ^{14}_{7}N + ^{0}_{-1}e' },
    { n: 'Desintegración β⁺', t: '^{22}_{11}Na -> ^{22}_{10}Ne + ^{0}_{+1}e' },
    { n: 'Captura electrónica', t: '^{40}_{19}K + ^{0}_{-1}e -> ^{40}_{18}Ar' },
    { n: 'Fisión inducida', t: '^{235}_{92}U + ^{1}_{0}n -> ^{141}_{56}Ba + ^{92}_{36}Kr + 3 ^{1}_{0}n' },
    { n: 'Fusión deuterio–tritio', t: '^{2}_{1}H + ^{3}_{1}H -> ^{4}_{2}He + ^{1}_{0}n' },
    { n: 'Activación neutrónica', t: '^{59}_{27}Co + ^{1}_{0}n -> ^{60}_{27}Co' },
    { n: 'Generador de tecnecio', t: '^{99}_{42}Mo -> ^{99}_{43}Tc + ^{0}_{-1}e' }
  ] },
  { id: 'elec', n: 'Electroquímica', items: [
    { n: 'Semirreacción de ánodo', t: 'Zn(s) -> Zn^2+(aq) + 2 e-' },
    { n: 'Semirreacción de cátodo', t: 'Cu^2+(aq) + 2 e- -> Cu(s)' },
    { n: 'Pila Daniell', t: 'Zn(s) + Cu^2+(aq) -> Zn^2+(aq) + Cu(s)' },
    { n: 'Electrodo de hidrógeno', t: '2 H+(aq) + 2 e- <=> H2(g)' },
    { n: 'Electrólisis del agua', t: '2 H2O(l) ->[\\text{electrólisis}] 2 H2 ^ + O2 ^' },
    { n: 'Sal fundida', t: '2 NaCl(l) ->[\\text{electrólisis}] 2 Na(l) + Cl2 ^' },
    { n: 'Corrosión', t: '2 Fe(s) + O2(g) + 2 H2O(l) -> 2 Fe(OH)2(s)' },
    { n: 'Batería de plomo', t: 'Pb(s) + PbO2(s) + 2 H2SO4 -> 2 PbSO4(s) + 2 H2O' },
    { n: 'Electrodeposición', t: 'Ag+(aq) + e- -> Ag(s)' }
  ] },
  { id: 'cin', n: 'Cinética', items: [
    { n: 'Etapa elemental', t: 'A -> Z' },
    { n: 'Segundo orden', t: '2 A -> Z' },
    { n: 'Equilibrio previo', t: 'A + M <=>[k_1][k_{-1}] AM ->[k_2] Z' },
    { n: 'Michaelis–Menten', t: 'E + S <=>[k_1][k_{-1}] ES ->[k_2] E + P' },
    { n: 'Catálisis', t: 'A ->[\\text{cat.}] Z' },
    { n: 'Iniciación radicalaria', t: 'Cl2 ->[h\\nu] 2 Cl^.' },
    { n: 'Propagación', t: 'Cl^. + CH4 -> HCl + CH3^.' },
    { n: 'Terminación', t: '2 CH3^. -> C2H6' },
    { n: 'Adsorción', t: 'A(g) + M <=> AM' }
  ] },
  { id: 'mat', n: 'Materiales', items: [
    { n: 'Síntesis sol-gel', t: 'Ti(OC3H7)4 + 2 H2O -> TiO2 v + 4 C3H7OH' },
    { n: 'Perovskita híbrida', t: 'PbI2 + CH3NH3I -> CH3NH3PbI3' },
    { n: 'Calcinación', t: 'CaCO3(s) ->[\\Delta] CaO(s) + CO2 ^' },
    { n: 'Vía hidrotermal', t: 'Zn(NO3)2 + 2 NaOH ->[\\text{170 °C}] ZnO + 2 NaNO3 + H2O' },
    { n: 'Reducción carbotérmica', t: 'SiO2 + 2 C ->[\\Delta] Si + 2 CO ^' },
    { n: 'CVD de grafeno', t: 'CH4 ->[\\text{Cu, 1000 °C}] C(s) + 2 H2' },
    { n: 'Estado sólido', t: 'ZnO + Fe2O3 ->[\\Delta] ZnFe2O4' },
    { n: 'Deshidratación del hidrato', t: 'CuSO4 * 5 H2O ->[\\Delta] CuSO4 + 5 H2O' },
    { n: 'Disolución iónica', t: 'NaCl ->[\\text{H2O}] Na+ + Cl-' }
  ] }
];

/* ---------------- atajos de teclado del diálogo ----------------
   Los mismos de siempre más los que faltaban, ahora en grupos: buscar una
   flecha entre trece fichas sueltas costaba más que escribirla. */
const QUIM_ATAJOS = [
  { n: 'Flechas', k: [
    { l: '→', t: ' -> ' }, { l: '⇌', t: ' <=> ' }, { l: '↔', t: ' <-> ' },
    { l: 'Δ', t: ' ->[\\Delta] ' }, { l: 'rótulo', t: ' ->[\\text{}] ', off: 10 },
    { l: 'k₁ / k₋₁', t: ' <=>[k_1][k_{-1}] ' }
  ] },
  { n: 'Estado', k: [
    { l: '(s)', t: '(s)' }, { l: '(l)', t: '(l)' }, { l: '(g)', t: '(g)' }, { l: '(aq)', t: '(aq)' },
    { l: '↑ gas', t: ' ^' }, { l: '↓ precipita', t: ' v' }
  ] },
  { n: 'Carga', k: [
    { l: '+', t: '+' }, { l: '−', t: '-' }, { l: '²⁺', t: '^2+' }, { l: '³⁺', t: '^3+' },
    { l: '²⁻', t: '^2-' }, { l: 'e⁻', t: 'e-' }
  ] },
  { n: 'Otros', k: [
    { l: '· hidrato', t: ' * 5 H2O' }, { l: 'isótopo', t: '^{235}_{92}U' },
    { l: 'radical', t: '^.' }, { l: 'doble enlace', t: '=' }, { l: 'triple enlace', t: '#' },
    { l: '[ ]', t: '[]', off: 1 }
  ] }
];

/* ================= interfaz =================
   Todo lo que sigue arma trozos de DOM para el diálogo de reacciones. Vive
   aquí, y no en el diálogo, porque es química: si mañana el análisis aprende
   algo nuevo, se ve en el panel sin tocar el modal. */

/* Sección con su rótulo en versalitas y su línea de ayuda. El aire lo pone el
   CSS con la escala de espaciado; aquí solo se marca la jerarquía. */
function quimSeccion(titulo, ayuda, ...kids) {
  return h('section', { class: 'qz-sec' },
    h('div', { class: 'qz-sec-cab' },
      h('span', { class: 'panel-label' }, titulo),
      ayuda ? h('span', { class: 'qz-ayuda' }, ayuda) : null),
    kids);
}

/* Barra de una composición: la longitud es el porcentaje en masa y el color, la
   familia del elemento, para que case con la tabla periódica de abajo. */
function _qFilaComp(c) {
  const fam = QUIM_Z[c.el] ? quimFamilia(QUIM_Z[c.el]) : 'des';
  return h('div', { class: 'qz-comp-fila qz-f-' + fam },
    h('b', null, c.el),
    h('span', { class: 'qz-comp-n' }, c.n > 1 ? '×' + c.n : ''),
    h('span', { class: 'qz-barra' }, h('i', { style: 'width:' + Math.max(1, c.pct).toFixed(2) + '%' })),
    h('span', { class: 'qz-pct' }, quimNum(c.pct, 1) + ' %'));
}

/* Panel vivo bajo la vista previa. Se rehace en cada tecleo, pero solo dice lo
   que tiene que decir: con H2O basta una línea, y el detalle se abre si se
   quiere. Quien solo venga a escribir una fórmula no se topa con un informe. */
function quimPanelAnalisis(insertar) {
  let abierto = false, txtAct = '';
  const cinta = h('div', { class: 'qz-cinta' });
  const det = h('div', { class: 'qz-det' });
  const caja = h('div', { class: 'qz-an' }, cinta, det);

  const dato = (rot, val, cls) => h('span', { class: 'qz-dato' + (cls ? ' ' + cls : '') },
    h('b', null, rot), h('span', null, val));
  const botDetalle = () => h('button', {
    class: 'qz-mas' + (abierto ? ' on' : ''), type: 'button',
    'aria-expanded': abierto ? 'true' : 'false',
    onclick: () => { abierto = !abierto; pinta(); }
  }, abierto ? 'Menos detalle' : 'Ver detalle');

  function pintaFormula(an) {
    const m = quimMasa(an), nom = quimNombre(an.formula);
    if (m.ok) cinta.append(dato('M', quimNum(m.m, 2) + ' g/mol'));
    else cinta.append(dato('M', 'sin calcular (' + m.falta.join(', ') + ')', 'qz-flojo'));
    if (an.carga) cinta.append(dato('carga', _qSigno(an.carga)));
    if (nom) cinta.append(dato('', nom, 'qz-nombre'));
    if (an.iso.length) cinta.append(dato('isótopo', an.iso.map(i => i.a + ' ' + i.s).join(', ')));
    cinta.append(botDetalle());
    if (!abierto) return;
    if (m.ok) {
      det.append(quimSeccion('Composición elemental', an.hidrato ? 'El agua de hidratación cuenta en la masa.' : '',
        h('div', { class: 'qz-comp' }, m.comp.map(_qFilaComp))));
      const filas = [];
      if (m.exacta != null) filas.push(dato('Masa exacta', quimNum(m.exacta, 4) + ' Da'));
      if (m.aprox) filas.push(dato('', 'Con isótopos: la masa usa el número másico indicado.', 'qz-flojo'));
      if (filas.length) det.append(h('div', { class: 'qz-cinta qz-cinta-2' }, filas));
    }
    const ox = quimOxidacion(an.formula);
    const cuerpoOx = ox.ok
      ? h('div', { class: 'qz-eos' }, ox.est.map(e => h('span', { class: 'qz-eo' }, h('b', null, e.el), e.eo)))
      : h('p', { class: 'hint' }, ox.motivo || 'No hay nada que repartir.');
    det.append(quimSeccion('Estados de oxidación', ox.ok ? ox.nota : '', cuerpoOx));
  }

  function pintaEcuacion(ec) {
    if (!ec.comprobable) cinta.append(dato('', ec.nota, 'qz-flojo'));
    else if (ec.ajustada) cinta.append(dato('', ec.nota || 'La reacción está ajustada', 'qz-bien'));
    else {
      cinta.append(h('div', { class: 'qz-mal' }, ec.mensajes.map(m => h('span', null, m))));
      cinta.append(h('button', {
        class: 'btn btn-sm btn-pri qz-ajustar', type: 'button',
        onclick: () => {
          const r = quimAjusta(txtAct);
          if (r.ok) { insertar(r.texto); toast('Reacción ajustada'); }
          else toast(r.motivo, 'warn');
        }
      }, 'Ajustar'));
    }
    cinta.append(botDetalle());
    if (!abierto) return;
    /* Cada línea lleva ya multiplicado su coeficiente. Una columna de sumandos
       bajo una raya tiene que sumar el total que hay debajo; si cada línea
       diera la masa molar suelta, la raya estaría mintiendo. La masa molar de
       la especie se queda en el título, a un palmo del ratón. */
    const lado = (nom, esp) => {
      let total = 0, cierto = true;
      const filas = esp.map(e => {
        const m = quimMasa(e);
        const suma = m.ok ? m.m * e.coef : null;
        if (m.ok) total += suma; else cierto = false;
        return h('div', { class: 'qz-esp' },
          h('span', { class: 'qz-esp-c' }, e.coef > 1 ? e.coef + ' ×' : ''),
          h('span', { class: 'qz-esp-f', html: kStr('\\ce{' + e.formula + '}', false) }),
          h('span', {
            class: 'qz-esp-m',
            title: m.ok && e.coef > 1 ? 'M = ' + quimNum(m.m, 2) + ' g/mol' : null
          }, suma == null ? '—' : quimNum(suma, 2)));
      });
      return h('div', { class: 'qz-lado' },
        h('span', { class: 'panel-label' }, nom), filas,
        h('div', { class: 'qz-esp qz-esp-tot' },
          h('span', { class: 'qz-esp-c' }), h('span', { class: 'qz-esp-f' }, 'Masa total'),
          h('span', { class: 'qz-esp-m' }, cierto ? quimNum(total, 2) : '—')));
    };
    det.append(quimSeccion('Especies y masas', 'Cada línea lleva su coeficiente; los dos totales tienen que coincidir.',
      h('div', { class: 'qz-lados' }, lado('Reactivos', ec.izq), lado('Productos', ec.der))));
    if (ec.comprobable && !ec.nuclear) {
      const q = [];
      if (ec.cargaIzq || ec.cargaDer) q.push(dato('Carga', _qSigno(ec.cargaIzq) + ' → ' + _qSigno(ec.cargaDer)));
      if (q.length) det.append(h('div', { class: 'qz-cinta qz-cinta-2' }, q));
    }
  }

  function pinta() {
    cinta.innerHTML = ''; det.innerHTML = '';
    const t = txtAct.trim();
    caja.style.display = t ? '' : 'none';
    if (!t) return;
    const ec = quimEcuacion(t);
    let avisos = [], desc = [];
    if (ec.esEc) { pintaEcuacion(ec); avisos = ec.avisos; desc = ec.desc; }
    else {
      const an = quimAnaliza(t);
      if (an.vacio) { caja.style.display = 'none'; return; }
      pintaFormula(an); avisos = an.avisos; desc = an.desc;
    }
    if (desc.length) det.append(h('p', { class: 'hint err' }, 'No conozco estos símbolos: ' + desc.join(', ') + '. Si son grupos genéricos escríbelos como R, X o M.'));
    avisos.forEach(a => det.append(h('p', { class: 'hint err' }, a)));
  }

  return {
    el: caja,
    refresca: t => { txtAct = String(t == null ? '' : t); pinta(); }
  };
}

/* Tabla periódica desplegable. Es lo que más se echa de menos al formular con
   el teclado: el símbolo del wolframio se recuerda mejor viéndolo. */
function quimTablaPeriodica(pick) {
  const rej = h('div', { class: 'qz-rej' });
  const bloqueF = h('div', { class: 'qz-rej qz-rej-f' });
  QUIM_EL.forEach(e => {
    const p = quimPos(e.z), fam = quimFamilia(e.z);
    const col = p.f ? p.g + 3 : p.g, fila = p.f ? p.f : p.p;
    const b = h('button', {
      class: 'qz-el qz-f-' + fam, type: 'button',
      title: e.n + ' · Z ' + e.z + ' · ' + quimNum(e.m, 3) + ' g/mol',
      'aria-label': e.n,
      style: 'grid-column:' + col + ';grid-row:' + fila,
      onclick: () => pick(e.s)
    }, h('i', null, String(e.z)), h('b', null, e.s));
    (p.f ? bloqueF : rej).append(b);
  });
  /* Los huecos del bloque f en su sitio, para que la tabla se lea como la de la pared. */
  rej.append(h('span', { class: 'qz-el qz-hueco', style: 'grid-column:3;grid-row:6' }, '57–71'));
  rej.append(h('span', { class: 'qz-el qz-hueco', style: 'grid-column:3;grid-row:7' }, '89–103'));
  const leyenda = h('div', { class: 'qz-ley' },
    QUIM_FAM.map(([id, nom]) => h('span', { class: 'qz-ley-i qz-f-' + id }, nom)));
  return h('div', { class: 'qz-tp' }, rej, bloqueF, leyenda);
}

/* Buscador del diccionario: se escribe «ácido sulfúrico» y sale H2SO4. */
function quimBuscadorNombres(pick) {
  const res = h('div', { class: 'qz-res' });
  const inp = h('input', {
    class: 'field', type: 'text', autocomplete: 'off',
    placeholder: 'ácido sulfúrico, bicarbonato, permanganato de potasio…'
  });
  const pinta = () => {
    res.innerHTML = '';
    const q = inp.value.trim();
    if (q.length < 2) return;
    const hits = quimBusca(q, 10);
    if (!hits.length) { res.append(h('span', { class: 'hint' }, 'No está en el diccionario. Es una lista de especies de laboratorio, no un nombrador completo.')); return; }
    hits.forEach(e => res.append(h('button', { class: 'chip qz-hit', type: 'button', title: 'Insertar ' + e.f, onclick: () => pick(e.f) },
      h('span', { class: 'qz-hit-n' }, e.n), h('span', { class: 'qz-hit-f', html: kStr('\\ce{' + e.f + '}', false) }))));
  };
  inp.addEventListener('input', deb(pinta, 130));
  inp.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const b = res.querySelector('.qz-hit');
    if (b) b.click();
  });
  return h('div', { class: 'qz-busca' }, inp, res);
}
