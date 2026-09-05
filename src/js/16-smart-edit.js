/* ==== 16-smart-edit.js ==== */
'use strict';
/* ================= editor de SmartArt ================= */

/* Ejemplos por tipo, pensados para trabajo de laboratorio */
const SMART_EJEMPLOS = {
  proceso:   [{t:'Precursores',d:'Sales metálicas en disolución'},{t:'Coprecipitación',d:'pH y temperatura controlados'},{t:'Envejecimiento',d:'18 h a 65 °C'},{t:'Lavado y secado',d:'Hasta pH neutro'}],
  flujo:     [{t:'Lotes sintetizados',d:'n = 96'},{t:'Sin fase única en el DRX',d:'n = 31',lvl:1},{t:'Lotes con fase pura',d:'n = 65'},{t:'Área superficial por debajo de 40 m$^2$ g$^{-1}$',d:'n = 27',lvl:1},{t:'Lotes caracterizados a fondo',d:'n = 38'},{t:'Ensayados en celda',d:'n = 38'}],
  lista:     [{t:'Pureza de fase',d:'Sin reflexiones ajenas en DRX'},{t:'Tamaño de cristalita',d:'Por debajo de 20 nm'},{t:'Área superficial',d:'Mayor a 60 m$^2$ g$^{-1}$'},{t:'Estabilidad térmica',d:'Sin colapso hasta 250 °C'}],
  ciclo:     [{t:'Síntesis'},{t:'Caracterización'},{t:'Análisis de datos'},{t:'Ajuste de condiciones'}],
  jerarquia: [{t:'Caracterización'},{t:'Estructura',d:'DRX'},{t:'Composición',d:'FTIR, XPS'},{t:'Morfología',d:'SEM'}],
  piramide:  [{t:'Aplicación'},{t:'Propiedades'},{t:'Estructura'},{t:'Composición'}],
  embudo:    [{t:'32 condiciones probadas'},{t:'8 con fase pura'},{t:'3 reproducibles'},{t:'1 óptima'}],
  radial:    [{t:'Material'},{t:'Cristalinidad'},{t:'Área superficial'},{t:'Estabilidad'},{t:'Capacidad'}],
  venn:      [{t:'Infrarrojo',d:'Cambio de dipolo'},{t:'Raman',d:'Cambio de polarizabilidad'},{t:'Ambas',d:'Moléculas sin centro de simetría'}],
  cronologia:[{t:'Mes 1',d:'Revisión y diseño'},{t:'Mes 3',d:'Síntesis'},{t:'Mes 6',d:'Caracterización'},{t:'Mes 9',d:'Escritura'}],
  matriz:    [{t:'Alta pureza · rápido',d:'Condición ideal'},{t:'Alta pureza · lento',d:'Aceptable'},{t:'Baja pureza · rápido',d:'Requiere ajuste'},{t:'Baja pureza · lento',d:'Descartar'}],
  espina:    [{t:'Fase secundaria en el DRX'},{t:'Precursores',d:'Pureza del PbI$_2$'},{t:'Disolvente',d:'Agua residual en el DMF'},{t:'Temperatura',d:'Rampa demasiado rápida'},{t:'Atmósfera',d:'Humedad de la caja seca'},{t:'Tiempo',d:'Recocido corto'}],
  capas:     [{t:'Contacto de oro',d:'80 nm'},{t:'Spiro-OMeTAD',d:'180 nm'},{t:'Perovskita',d:'450 nm'},{t:'TiO$_2$ mesoporoso',d:'200 nm'},{t:'FTO sobre vidrio',d:'500 nm'}],
  gantt:     [{t:'Revisión bibliográfica',d:'1–2'},{t:'Síntesis y optimización',d:'2–5'},{t:'Caracterización',d:'4–8'},{t:'Análisis de datos',d:'7–9'},{t:'Escritura de tesis',d:'8–12'}],
  mapa:      [{t:'Caracterización'},{t:'Estructura'},{t:'DRX y Rietveld',lvl:1},{t:'Raman',lvl:1},{t:'Morfología'},{t:'SEM y TEM',lvl:1},{t:'Propiedades'},{t:'UV-Vis y Tauc',lvl:1}],
  matriz3:   [{t:'80 °C · 1 h',d:'Amorfo'},{t:'80 °C · 4 h',d:'Fase mixta'},{t:'80 °C · 12 h',d:'Fase mixta'},{t:'100 °C · 1 h',d:'Fase mixta'},{t:'100 °C · 4 h',d:'Fase pura'},{t:'100 °C · 12 h',d:'Fase pura'},{t:'120 °C · 1 h',d:'Fase pura'},{t:'120 °C · 4 h',d:'Descomposición'},{t:'120 °C · 12 h',d:'Descomposición'}],
  contraste: [{t:'Ventajas'},{t:'Síntesis a baja temperatura',lvl:1},{t:'Banda prohibida ajustable',lvl:1},{t:'Procesable en disolución',lvl:1},{t:'Limitaciones'},{t:'Degradación con humedad',lvl:1},{t:'Plomo en la composición',lvl:1},{t:'Histéresis en el barrido',lvl:1}]
};

/* Disposiciones donde un elemento puede marcarse como «sub», con lo que
   significa allí: el botón ⤷ no dice lo mismo en un mapa que en un flujo. */
const CON_SUB = {
  mapa: 'Es un subnivel: cuelga de la rama anterior',
  contraste: 'Cae bajo el encabezado anterior',
  flujo: 'Es una baja: sale por el lado con su motivo'
};

function openSmartEditor(b) {
  const prev = h('div', { class: 'smart-prev' });
  const itemsBox = h('div');
  const aviso = h('p', { class: 'hint' });

  const dibujar = deb(() => {
    /* La vista previa dibuja el diagrama al tamaño que tendrá en la diapositiva
       —con el cuerpo de letra que fija su tema— y luego encoge el conjunto
       entero. Así lo que se ve aquí es lo que sale: si a media anchura una
       palabra se parte, se parte también en el panel, y no se descubre en el
       proyector. */
    const disp = Math.max(280, (prev.clientWidth || 620) - 26);
    const real = Math.round(1188 * clamp((b.w || 84) / 100, 0.4, 1));
    const k = Math.min(1, disp / real);
    prev.innerHTML = '';
    prev.style.fontSize = cuerpoTema(S.deck) + 'px';
    const caja = renderSmart(Object.assign({}, b, { w: 100 }), S.deck, 'thumb', real);
    const lupa = h('div', { style: `transform:scale(${k.toFixed(4)});transform-origin:top left;width:${real}px` }, caja);
    prev.append(h('div', { style: `flex:none;width:${Math.round(real * k)}px;height:${Math.round((parseFloat(caja.style.height) || 300) * k)}px` }, lupa));
    const lim = SK[b.kind];
    const n = (b.items || []).length;
    aviso.textContent = lim.min === lim.max
      ? `Este diagrama usa exactamente ${lim.max} elementos.`
      : `Entre ${lim.min} y ${lim.max} elementos. Ahora tienes ${n}.`;
  }, 110);

  const tipos = h('div', { class: 'sk-grid' });
  const descTipo = h('p', { class: 'hint', style: 'margin:-6px 0 10px' });
  const acabados = h('div', { class: 'sa-grid' });
  const descAcab = h('p', { class: 'hint', style: 'margin:-4px 0 12px' });
  function pintarAcabados() {
    acabados.innerHTML = '';
    descAcab.textContent = SA[acabadoDe(b)].d;
    SMART_ACABADOS.forEach(x => acabados.append(h('button', {
      class: 'sa-opt' + (acabadoDe(b) === x.id ? ' on' : ''), title: x.d,
      onclick: () => { b.acab = x.id; pintarAcabados(); dibujar(); }
    }, acabadoIcon(x.id), h('span', { class: 'lb' }, x.n))));
  }
  function pintarTipos() {
    tipos.innerHTML = '';
    descTipo.textContent = SK[b.kind].d;
    SMART_KINDS.forEach(k => tipos.append(h('button', {
      class: 'sk-opt' + (b.kind === k.id ? ' on' : ''), title: k.d,
      onclick: () => {
        b.kind = k.id;
        const lim = SK[k.id];
        b.items = b.items || [];
        while (b.items.length > lim.max) b.items.pop();
        while (b.items.length < lim.min) b.items.push({ t: 'Elemento ' + (b.items.length + 1) });
        pintarTipos(); pintarItems(); dibujar();
      }
    }, smartIcon(k.id), h('span', { class: 'lb' }, k.n))));
  }

  function pintarItems() {
    itemsBox.innerHTML = '';
    const lim = SK[b.kind];
    (b.items || []).forEach((it, i) => {
      const fila = h('div', { class: 'item-row' },
        h('span', { class: 'ir-n' }, String(i + 1)),
        h('div', { class: 'ir-campos' },
          h('input', { class: 'field ir-t', value: it.t || '', placeholder: 'Texto principal',
            oninput: e => { it.t = e.target.value; dibujar(); } }),
          h('input', { class: 'field ir-d', value: it.d || '', placeholder: SK[b.kind].ph || 'Detalle (opcional)',
            oninput: e => { it.d = e.target.value; dibujar(); } })),
        h('div', { class: 'ir-btns' },
          CON_SUB[b.kind] ? h('button', {
            class: 'icon-btn' + (+it.lvl > 0 ? ' on' : ''),
            title: +it.lvl > 0 ? CON_SUB[b.kind] : 'Marcarlo como sub',
            onclick: () => { it.lvl = +it.lvl > 0 ? 0 : 1; pintarItems(); dibujar(); } }, '⤷') : null,
          h('button', { class: 'icon-btn', title: 'Subir', disabled: i === 0,
            onclick: () => { const [x] = b.items.splice(i, 1); b.items.splice(i - 1, 0, x); pintarItems(); dibujar(); } }, '↑'),
          h('button', { class: 'icon-btn', title: 'Quitar', disabled: b.items.length <= lim.min,
            onclick: () => { b.items.splice(i, 1); pintarItems(); dibujar(); } }, '✕')));
      itemsBox.append(fila);
    });
    if ((b.items || []).length < lim.max) {
      itemsBox.append(h('button', { class: 'btn btn-sm', onclick: () => {
        b.items.push({ t: 'Elemento ' + (b.items.length + 1) }); pintarItems(); dibujar();
      } }, '+ Otro elemento'));
    }
  }

  const ejemplo = h('button', { class: 'btn btn-sm', onclick: () => {
    b.items = deepCopy(SMART_EJEMPLOS[b.kind] || []);
    pintarItems(); dibujar();
  } }, 'Rellenar con un ejemplo');

  const labAncho = h('label', null, `Anchura · ${b.w || 84} %`);
  const ancho = h('input', { type: 'range', min: 40, max: 100, step: 2, value: b.w || 84,
    oninput: e => { b.w = +e.target.value; labAncho.textContent = `Anchura · ${b.w} %`; dibujar(); } });

  pintarTipos(); pintarAcabados(); pintarItems();

  openModal({
    title: 'Diagrama SmartArt', size: 'modal-lg',
    onclose: () => commit(),
    body: h('div', null,
      tipos, descTipo,
      h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Acabado'),
      acabados, descAcab,
      h('div', { class: 'data-grid' },
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Elementos'),
          itemsBox, aviso,
          h('p', { class: 'hint' }, 'El texto admite $matemáticas$ entre signos de pesos, igual que en el resto de la app.'),
          h('div', { style: 'margin-top:8px' }, ejemplo)),
        h('div', null,
          h('span', { class: 'panel-label', style: 'display:block;margin-bottom:6px' }, 'Vista previa'),
          prev,
          h('div', { style: 'margin-top:12px' },
            h('div', { class: 'irow' }, labAncho), ancho,
            h('input', { class: 'field', style: 'margin-top:8px', value: b.caption || '',
              placeholder: 'Pie del diagrama (opcional)',
              oninput: e => { b.caption = e.target.value; } }))))),
    foot: [
      h('span', { class: 'foot-note' }, 'Se dibuja en vectorial: nítido en el PDF y exportable a TikZ.'),
      h('button', { class: 'btn btn-pri', onclick: () => { closeModal(); commit(); } }, 'Listo')
    ]
  });
  dibujar();
}


