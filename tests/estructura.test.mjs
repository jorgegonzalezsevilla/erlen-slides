import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {editor} from '../herramientas/test-browser.mjs';

/* La estructura química es el segundo editor de figura repartido en tres
   piezas: el modelo (átomos y enlaces), el motor (el dibujo) y el lienzo (la
   interfaz). Estas pruebas sostienen la frontera, no el dibujo: que el modelo
   no sabe de colores, que el motor no mira la app y que las dos salidas
   —pantalla y PDF— pintan cada elemento del mismo color. */

const lee = n => readFileSync(new URL('../src/' + n, import.meta.url), 'utf8');

test('The model knows nothing about how a structure looks',()=>{
 const mod=lee('js/45-estructura.js'), motor=lee('js/45b-estructura-dibujo.js');
 for(const señal of ['COLOR_ELEM','ESTILOS_REVISTA','tikzpicture','sv(','document.'])
  assert.ok(!mod.includes(señal),`el modelo no debería contener «${señal}»`);
 /* Y al revés: el motor dibuja con lo que le pasan, no con lo que la app
    tenga abierto ni con cómo esté puesta la interfaz. */
 for(const señal of ['S.deck','EE.','document.','openModal'])
  assert.ok(!motor.includes(señal),`el motor no debería contener «${señal}»`);
 assert.ok(mod.includes('function ponAnillo')&&mod.includes('function hImplicitos'),'el modelo entero sigue ahí');
 assert.ok(motor.includes('function svgEstructura')&&motor.includes('function estructuraTikz'),'las dos salidas siguen ahí');
});

/* Paracetamol: tiene O, N y carbonos implícitos, o sea rótulo de sobra. */
const conEjemplo="(()=>{const b=newBlock('estruct');b.est=estructuraVacia();EJEMPLOS_EST(b.est);return b})()";

test('The engine draws from the deck it is given, not from the open one',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const fill=tema=>run(`(()=>{const b=${conEjemplo};
   const svg=svgEstructura(b,deckDe({title:'x',theme:${JSON.stringify(tema)}},[]));
   return [...svg.querySelectorAll('text')].map(t=>t.getAttribute('fill')).join(' ')})()`);
 const claro=fill('metropolis'), oscuro=fill('nocturno');
 assert.match(claro,/#2b58c4/,'con un tema claro, el azul de siempre para el N');
 assert.match(oscuro,/#8fb0f7/,'con un tema oscuro, la versión subida de luz');
 assert.ok(!oscuro.includes('#2b58c4'),'no se cuela la paleta de papel en el tema oscuro');
 /* El lienzo del editor va con el tema de la app, y por eso lo pasa aparte. */
 const forzado=run(`(()=>{const b=${conEjemplo};
   const svg=svgEstructura(b,deckDe({title:'x',theme:'metropolis'},[]),'currentColor',true,true);
   return svg.outerHTML})()`);
 assert.match(forzado,/#8fb0f7/,'el lienzo en oscuro pinta en claro aunque el mazo sea claro');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Screen and PDF give every element label the same colour',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 /* Un carbono con un vecino: el vecino siempre lleva rótulo. */
 const par=(el,tema)=>JSON.parse(run(`JSON.stringify((()=>{
   const b=newBlock('estruct');b.est=estructuraVacia();
   const c=nuevoAtomo(b.est,0,0,'C'),x=nuevoAtomo(b.est,40,0,${JSON.stringify(el)});
   unir(b.est,c.id,x.id,1);
   const mazo=deckDe({title:'x',theme:${JSON.stringify(tema)}},[]);
   const svg=svgEstructura(b,mazo);
   const tex=estructuraTikz(b,'',mazo);
   const defs={};tex.replace(/\\\\definecolor\\{(\\w+)\\}\\{HTML\\}\\{(\\w+)\\}/g,(_,n,h)=>defs[n]='#'+h);
   const nodo=tex.split('\\n').find(l=>l.includes('\\\\node'));
   const m=/text=(\\w+)/.exec(nodo||'');
   return {svg:[...svg.querySelectorAll('text')].map(t=>t.getAttribute('fill'))[0],
     tex:m?defs[m[1]]:null, nodo};})())`));
 for(const tema of ['metropolis','nocturno'])
  for(const el of ['N','O','S','P','F','Cl','Br','I','C']){
   const r=par(el,tema);
   if(el==='C'){
    /* Dos carbonos unidos son el vértice de siempre: sin rótulo en ninguna
       de las dos salidas, y por tanto sin color que discrepe. */
    assert.equal(r.svg,undefined,'el carbono implícito no se rotula en pantalla');
    assert.equal(r.nodo,undefined,'ni en el PDF');
    continue;
   }
   assert.ok(r.tex,`«${el}» en «${tema}» sale al PDF sin color: ${r.nodo}`);
   assert.equal(r.tex.toUpperCase(),r.svg.toUpperCase(),
     `«${el}» en «${tema}»: la pantalla lo pinta ${r.svg} y el PDF ${r.tex}`);
  }
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The label is cut out against the theme paper, not against white',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const tex=tema=>run(`(()=>{const b=${conEjemplo};
   return estructuraTikz(b,'',deckDe({title:'x',theme:${JSON.stringify(tema)}},[]))})()`);
 const oscuro=tex('nocturno');
 assert.ok(!/fill=white/.test(oscuro),'un parche blanco detrás de cada rótulo en un tema oscuro');
 const fondo=run("temaDe(deckDe({title:'x',theme:'nocturno'},[])).bg").slice(1).toUpperCase();
 assert.ok(oscuro.includes('{HTML}{'+fondo+'}'),'el rótulo se recorta contra el papel del tema: '+fondo);
 /* En el lienzo el papel no es el de la diapositiva sino el del propio
    lienzo, y lo pone el CSS: sin esto, con la app en oscuro cada rótulo
    salía sobre un disco casi blanco. */
 assert.match(lee('css/01-editor.css'),/\.ee-svg\{[^}]*--sbg:/s,'el lienzo declara su propio papel');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('The drawing stays the same drawing after the split',async()=>{const{dom,run,errors}=await editor();try{
 run("wsNueva();addSlide('content')");
 const n=JSON.parse(run(`JSON.stringify((()=>{const b=${conEjemplo};
   const svg=svgEstructura(b,S.deck);
   const tex=estructuraTikz(b,'',S.deck);
   return {lineas:svg.querySelectorAll('line').length, rotulos:svg.querySelectorAll('text').length,
     draws:(tex.match(/\\\\draw/g)||[]).length, nodos:(tex.match(/\\\\node/g)||[]).length};})())`));
 /* El paracetamol de ejemplo: nueve enlaces con tres dobles del anillo, uno
    del carbonilo, y tres rótulos —OH, HN y O—. */
 assert.equal(n.rotulos,3);
 assert.equal(n.lineas,n.draws,'la pantalla y el PDF dibujan los mismos trazos');
 assert.equal(n.nodos,3,'y los mismos rótulos');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
