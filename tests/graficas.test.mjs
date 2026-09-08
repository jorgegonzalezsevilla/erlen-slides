import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';

/* Una gráfica de laboratorio tiene que enseñar dónde se midió y hasta dónde
   llega el eje: sin eso, la figura no dice lo que el autor cree que dice. */
const grafica=(run,extra)=>run(`(()=>{const b=Object.assign(newBlock('chart'),${JSON.stringify(extra)});
 window.__g=renderChart(b,S.deck,'export',900);return window.__g.querySelectorAll('path[fill]:not([fill="none"])').length})()`);

test('A curve of measurements shows the measurements',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const pocos='x\ty\n0\t0.01\n1\t0.13\n2\t0.25\n3\t0.37\n4\t0.49';
 assert.equal(grafica(run,{data:pocos,kind:'linea'}),5,'cinco medidas, cinco marcas');
 assert.equal(grafica(run,{data:pocos,kind:'linea',puntos:false}),0,'la casilla puede apagarlas');
 const muchos='x\ty\n'+Array.from({length:60},(_,i)=>i+'\t'+Math.sin(i/6).toFixed(3)).join('\n');
 assert.equal(grafica(run,{data:muchos,kind:'linea'}),0,'un registro continuo no se llena de marcas');
 assert.equal(grafica(run,{data:muchos,kind:'linea',puntos:true}),60,'salvo que se pidan');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The vertical axis reaches the data it is drawing',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const ticks=(data)=>JSON.parse(run(`(()=>{const b=Object.assign(newBlock('chart'),{data:${JSON.stringify(data)},kind:'linea'});
   const g=renderChart(b,S.deck,'export',900);
   return JSON.stringify([...g.querySelectorAll('text')].map(t=>t.textContent))})()`));
 const t1=ticks('x\ty\n0\t0.01\n2\t0.25\n4\t0.49');
 assert.ok(t1.includes('0.5'),'el máximo 0.49 necesita un tick en 0.5, no quedarse en 0.4: '+JSON.stringify(t1));
 const t2=ticks('x\ty\n0\t-1\n1\t0\n2\t1');
 assert.ok(t2.includes('-1')&&t2.includes('1'),'los extremos también se rotulan: '+JSON.stringify(t2));
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Numbers in a table line up on the right, on screen and in Beamer',async()=>{const{dom,run,errors}=await editor();try{
 run(`wsNueva();addSlide('content');
  (()=>{const b=Object.assign(newBlock('table'),{header:true,rows:[['Condición','Respuesta','Naturaleza'],['Control','1.00','Ilustrativa'],['A','1.08','Ilustrativa'],['B','0.97','Ilustrativa']]});
   zona(S.deck.slides[S.cur],0).push(b);window.__t=b.id;commit()})()`);
 const clases=JSON.parse(run("JSON.stringify([...document.querySelectorAll('#stageInner table.btab tr')].map(tr=>[...tr.children].map(c=>c.classList.contains('num'))))"));
 assert.deepEqual(clases[0],[false,true,false],'solo la columna de cifras se alinea a la derecha');
 assert.deepEqual(clases[1],[false,true,false]);
 assert.match(run('toBeamer(S.deck)'),/\\begin\{tabular\}\{crc\}/,'la columna numérica va en r');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('A fit does not report a precision it does not have',async()=>{const{dom,run,errors}=await editor();try{
 assert.equal(run("conError(0.12, 1.6e-18)"),'0.12','el ruido de coma flotante no es una incertidumbre');
 assert.equal(run("conError(0.12, 0.004)"),'0.1200 ± 0.0040','una incertidumbre real sí se reporta');
 assert.equal(run("conError(1.5, 0)"),'1.5');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The build ships its own tab icon',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<link rel="icon" href="data:image\/svg\+xml,/,'sin favicon incrustado cada carga deja un 404');
});
