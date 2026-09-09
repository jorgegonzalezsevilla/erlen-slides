import test from 'node:test';import assert from 'node:assert/strict';import {editor} from '../herramientas/test-browser.mjs';

/* El montaje es el primer editor de figura que se separa en tres piezas con
   una frontera declarada: el catálogo (datos), el motor (dibujo) y el editor
   (interfaz). Lo que estas pruebas sostienen es la frontera, no el dibujo:
   que el catálogo es inerte, que el motor dibuja con lo que se le pasa y que
   las dos salidas —pantalla y PDF— leen la misma tabla y no pueden divergir. */

const COLORES = { traza: '#23373B', liq: '#2B7B9C', vidrio: '#6E8FA8', fondo: '#FAF9F5' };
const PAPELES = ['sombra', 'brillo', 'liq', 'vidrio', 'solido', 'metal', 'acento', 'fina', 'detalle', 'traza'];
const ESTILOS = ['tecnico', 'linea', 'solido', 'suave'];

test('The catalogue is inert data, with no engine and no app inside',async()=>{const{dom,run,errors}=await editor();try{
 const info=JSON.parse(run(`JSON.stringify((()=>{
   const malos=LAB.filter(p=>!p.id||!p.n||!p.grp||!Array.isArray(p.fig)||!p.fig.length);
   const grupos=[...new Set(LAB.map(p=>p.grp))].filter(g=>!LAB_GRUPOS[g]);
   const conFuncion=LAB.filter(p=>Object.values(p).some(v=>typeof v==='function')
     ||p.fig.some(f=>Object.values(f).some(v=>typeof v==='function')));
   return {n:LAB.length,malos:malos.map(p=>p.id||'(sin id)'),grupos,
     conFuncion:conFuncion.map(p=>p.id),
     tiposFigura:[...new Set(LAB.flatMap(p=>p.fig.map(f=>f.t)))]};})())`));
 assert.equal(info.malos.length,0,'toda pieza necesita id, nombre, grupo y dibujo');
 assert.deepEqual(info.grupos,[],'ningún grupo fuera del índice');
 assert.ok(info.n>150,'el catálogo entero sigue ahí: '+info.n+' piezas');
 assert.deepEqual(info.conFuncion,[],'una pieza que ejecuta código ya no es catálogo');
 assert.deepEqual(info.tiposFigura.filter(t=>!['p','l','c','r','e'].includes(t)),[],
   'las piezas solo describen figuras, no dibujan');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The engine draws from what it is given, not from the app state',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 /* Un mazo que no es el abierto: si el motor mirara S.deck, saldría otra cosa. */
 const n=+run(`(()=>{const otro=deckDe({title:'Otro',theme:'nocturno'},[]);
   const svg=svgMontaje(montajeEjemplo(),otro);
   return svg.querySelectorAll('path,line,circle,rect,ellipse').length})()`);
 assert.ok(n>20,'el montaje de ejemplo se dibuja entero: '+n+' figuras');
 const claros=run(`(()=>{const svg=svgMontaje(montajeEjemplo(),deckDe({title:'x',theme:'metropolis'},[]));
   return svg.outerHTML.includes('#E9EDF2')})()`);
 assert.equal(claros,false,'con un tema claro no se cuela la tinta del oscuro');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Screen and PDF read the same paint table and cannot drift apart',async()=>{const{dom,run,errors}=await editor();try{
 const filas=JSON.parse(run(`JSON.stringify((()=>{
   const C=${JSON.stringify(COLORES)};
   const reg={n:h=>String(h).toUpperCase()};
   const out=[];
   for(const p of ${JSON.stringify(PAPELES)})for(const e of ${JSON.stringify(ESTILOS)}){
     const svg=pinturaLab(p,C,e), tex=estiloTikz(p,e,C,reg);
     out.push({p,e,svg,tex});
   }
   return out;})())`));
 for(const {p,e,svg,tex} of filas){
  assert.equal(svg===null,tex===null,`«${p}» en estilo «${e}» se dibuja en una salida y en la otra no`);
  if(!svg) continue;
  /* Donde la pantalla usa opacidad, el PDF mezcla con el fondo: el número que
     usan los dos sale de la misma celda, así que el color tiene que cuadrar. */
  if(svg.opacity!=null&&svg.fill&&svg.fill!=='none'){
   const esperado=run(`labMezcla(${JSON.stringify(COLORES.fondo)},${JSON.stringify(svg.fill)},${svg.opacity}).toUpperCase()`);
   if(tex.includes('fill=')) assert.ok(tex.includes('fill='+esperado),
     `«${p}/${e}»: la pantalla pinta ${svg.fill} al ${svg.opacity} y el PDF dice ${tex}, esperaba ${esperado}`);
   else assert.ok(tex.includes('opacity='+svg.opacity),`«${p}/${e}» pierde su opacidad en el PDF: ${tex}`);
  }
  assert.match(tex,/line width=[\d.]+pt|draw=none/,`«${p}/${e}» sale al PDF sin grosor declarado: ${tex}`);
 }
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The constants that had already drifted stay pinned',async()=>{const{dom,run,errors}=await editor();try{
 const C=JSON.stringify(COLORES);
 const svg=(p,e)=>JSON.parse(run(`JSON.stringify(pinturaLab(${JSON.stringify(p)},${C},${JSON.stringify(e)}))`));
 assert.equal(svg('sombra','suave').opacity,.13,'la sombra fue .13 en pantalla y .14 en el PDF');
 assert.equal(svg('liq','linea').opacity,.7,'el líquido en línea fue .7 y .6');
 assert.equal(svg('liq','suave').opacity,.82,'y en suave .82 y .78');
 assert.equal(svg('fina','suave').opacity,.8,'la línea fina perdía su opacidad al exportar');
 const metal=svg('metal','solido').fill;
 assert.equal(metal,run(`labMezcla(${JSON.stringify(COLORES.fondo)},${JSON.stringify(COLORES.traza)},0.3)`),
   'el metal sólido fue .30 en pantalla y .32 en el PDF');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
