import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/js/88c-ciencia-libre.js',import.meta.url),'utf8');
const pendiente=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function interfaz(){
 const nodos=[],insertados=[];let modal;
 const ctx={AbortController,document:{querySelector:()=>true},S:{deck:{}},flushEdicion:()=>{},h:(tag,attrs,...children)=>{
  const events={};const n={tag,attrs:attrs||{},children,value:attrs?.value||'',files:[],disabled:attrs?.disabled||false,addEventListener:(k,f)=>{(events[k]??=[]).push(f);},getAttribute:k=>attrs?.[k],fire:async(k)=>{const ps=[...(events[k]||[]),attrs?.['on'+k]].filter(Boolean).map(f=>f());return Promise.all(ps);}};
  n.replaceChildren=(...kids)=>{n.children=kids;};n.append=(...kids)=>n.children.push(...kids);nodos.push(n);return n;
 },openModal:o=>modal=o,window:{},console};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.cienciaJS=async()=>{};ctx.cienciaInserta=(...a)=>insertados.push(a);
 const Plotly={react:async()=>{},toImage:async()=> 'data:image/png;base64,prueba',purge:()=>{}};ctx.window.Plotly=ctx.Plotly=Plotly;
 return {ctx,nodos,insertados,Plotly,modal:()=>modal,boton:t=>nodos.find(n=>n.tag==='button'&&n.children.includes(t)),campo:t=>nodos.find(n=>n.attrs['aria-label']===t)};
}
test('El ejemplo no modifica datos mientras se exporta la gráfica anterior',async()=>{
 const u=interfaz();await u.ctx.openDatosLibres();const entrada=u.campo('Datos x,y');entrada.value='0,10\n1,20';await entrada.fire('input');await u.boton('Dibujar gráfica').fire('click');
 const exportacion=pendiente();u.Plotly.toImage=()=>exportacion.promise;const listo=u.boton('Insertar gráfica').fire('click');
 await u.boton('Ejemplo: calibración').fire('click');assert.equal(entrada.value,'0,10\n1,20');
 exportacion.resolve('data:image/png;base64,prueba');await listo;assert.equal(u.insertados[0][1].texto,'0,10\n1,20');
});
test('La última selección de archivo gana aunque la anterior termine después',async()=>{
 const u=interfaz();await u.ctx.openDatosLibres();const archivo=u.campo('Archivo con datos x,y'),a=pendiente(),b=pendiente();
 archivo.files=[{name:'a.csv',size:10,text:()=>a.promise}];const primera=archivo.fire('change');
 archivo.files=[{name:'b.csv',size:10,text:()=>b.promise}];const segunda=archivo.fire('change');
 b.resolve('0,20\n1,30');await segunda;a.resolve('0,1\n1,2');await primera;
 assert.equal(u.campo('Datos x,y').value,'0,20\n1,30');
});
test('Editar datos durante la exportación descarta la imagen obsoleta',async()=>{
 const u=interfaz();await u.ctx.openDatosLibres();const entrada=u.campo('Datos x,y');entrada.value='0,10\n1,20';await entrada.fire('input');await u.boton('Dibujar gráfica').fire('click');
 const exportacion=pendiente();u.Plotly.toImage=()=>exportacion.promise;const listo=u.boton('Insertar gráfica').fire('click');entrada.value='0,30\n1,40';await entrada.fire('input');exportacion.resolve('data:image/png;base64,vieja');await listo;assert.equal(u.insertados.length,0);assert.equal(u.boton('Insertar gráfica').disabled,true);
});
test('Reabrir el visor reutiliza un solo contexto 3D y limpia cada escena',async()=>{
 const u=interfaz();let creados=0,limpiezas=0,paradas=0;
 u.ctx.$3Dmol={createViewer:()=>{creados++;return {resize:()=>{},clear:()=>limpiezas++,stopAnimate:()=>paradas++};}};
 for(let i=0;i<4;i++){await u.ctx.openMolecular3D();u.modal().onclose();}
 assert.equal(creados,1);assert.equal(limpiezas,4);assert.equal(paradas,4);
});
test('El artifact servido por HTTP explica que el laboratorio necesita la edición web',async()=>{
 const c=vm.createContext({window:{},location:{protocol:'https:'}});vm.runInContext(source,c);
 await assert.rejects(c.cienciaJS('plotly'),/editor web/);
});
test('Una molécula guardada se puede analizar e insertar aunque falle Kekule',async()=>{
 const u=interfaz();u.ctx.cienciaJS=async()=>{throw new Error('No se pudo cargar el dibujo');};
 const mol='MOL conservado';u.ctx.cienciaAnaliza=async()=>({mol,smiles:'CCO',svg:'<svg/>',descriptores:{amw:46.07},version:'prueba'});u.ctx.cienciaPng=async()=> 'data:image/png;base64,mol';
 await u.ctx.openMoleculaLibre({alt:'Molécula',cientifico:{v:1,tipo:'molecula',mol}});
 assert.equal(u.campo('SMILES o MOL').value,mol);assert.equal(u.boton('Analizar dibujo').disabled,true);assert.equal(u.boton('Actualizar figura').disabled,false);
 await u.boton('Actualizar figura').fire('click');assert.equal(u.insertados[0][1].mol,mol);
});
