/* DOM integration helper. Isolated storage; geometry is simulated, not a browser screenshot. */
import {readFileSync} from 'node:fs';import {JSDOM,VirtualConsole} from 'jsdom';import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
export async function editor(url='http://localhost:8130/'){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type!=='not implemented')errors.push(e.message);});vc.on('error',(...x)=>errors.push(x.join(' ')));
 const dom=new JSDOM(readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}unobserve(){}};w.indexedDB=new IDBFactory();w.IDBKeyRange=IDBKeyRange;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;w.Element.prototype.scrollIntoView=function(){};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.confirm=()=>true;}});
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));return {dom,errors,run:s=>dom.window.eval(s)};
}
