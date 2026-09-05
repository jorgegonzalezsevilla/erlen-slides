/* SPDX-License-Identifier: AGPL-3.0-only */
const SUITE_VISTAS=['inicio','biblioteca','plantillas','herramientas','servicio'];
function suiteVistaValida(v){return SUITE_VISTAS.includes(v)?v:'inicio';}
function suiteRuta(hash){return hash==='#presentaciones'?'editor':suiteVistaValida(String(hash||'').replace(/^#suite\/?/,''));}
function suiteUrl(v){const hash=v==='editor'?'#presentaciones':'#suite/'+suiteVistaValida(v);if(location.hash!==hash)history.pushState(null,'',location.pathname+location.search+hash);}
function suiteDesdeUrl(){const v=suiteRuta(location.hash);v==='editor'?wsCerrar():wsInicio(v);}
function suiteEnlace(v,t,i){return h('a',{class:'suite-nav-link',href:'#suite/'+v,'aria-current':wsVista===v?'page':null},cienciaIcono(i),h('span',null,t));}
function suitePinta(){
 const root=$('#workspaceRoot');root.replaceChildren();root.scrollTop=0;root.setAttribute('aria-label','Erlen Slides');
 const names={inicio:'Inicio',biblioteca:'Mis presentaciones',plantillas:'Ejemplos editables',herramientas:'Recursos',servicio:'Acerca de'};
 document.title=names[wsVista]+' · Erlen Slides';
 const sidebar=h('aside',{class:'suite-sidebar'},h('a',{class:'suite-brand',href:'#suite/inicio'},$('.marca-svg').cloneNode(true),h('span',null,'Erlen'),h('small',null,'SLIDES')),h('nav',{class:'suite-nav','aria-label':'Navegación principal'},suiteEnlace('inicio','Inicio','House'),suiteEnlace('biblioteca','Mis presentaciones','FolderOpen'),suiteEnlace('plantillas','Ejemplos editables','LayoutTemplate'),suiteEnlace('herramientas','Recursos y respaldos','Archive')),h('div',{class:'suite-sidebar-bottom'},suiteEnlace('servicio','Acerca de','Settings2'),h('a',{href:ERLEN_SOURCE_URL,target:'_blank',rel:'noopener'},'Código fuente · AGPLv3'),h('p',null,'Beta · sin cuenta',h('span',null,'Tu ciencia, en tus manos.'))));
 const panel=h('div',{class:'suite-panel'}),content=h('div',{class:'suite-content'});
 panel.append(h('header',{class:'suite-topbar'},h('span',null,'Scientific presentations'),h('div',{class:'suite-top-actions'},h('span',{class:'suite-local'},cienciaIcono('FolderOpen'),'En este navegador'),!deckEnBlanco()?wsBoton('Continuar presentación',wsCerrar):null)),content);root.append(h('div',{class:'suite-shell'},sidebar,panel));
 if(wsVista==='inicio'){
 content.append(h('header',{class:'suite-welcome'},h('span',{class:'ws-eyebrow'},'DEL LABORATORIO A LA AUDIENCIA'),h('h1',{id:'wsTitle',tabindex:'-1'},'Tu investigación,',h('br'),h('em',null,'bien presentada.')),h('p',null,'Ecuaciones, estructuras y datos. Prepara tu próxima charla con herramientas científicas y conserva el archivo editable.')),h('div',{class:'suite-primary-actions'},wsBoton('Nueva presentación',()=>wsNueva(),true),wsBoton('Explorar ejemplos',()=>wsCambiar('plantillas')),wsBoton('Importar proyecto',wsAccion(importJSON))));
 content.append(h('section',{class:'slides-showcase','aria-label':'Ejemplos científicos'},EJEMPLOS.slice(0,3).map((e,i)=>h('article',{class:'slides-example'},h('span',{class:'ws-eyebrow'},['QUÍMICA ANALÍTICA','CINÉTICA','INVESTIGACIÓN'][i]),h('div',{class:'slides-example-art','aria-hidden':'true'},i===0?'A = εlc':i===1?'c(t) = c₀e⁻ᵏᵗ':'Pregunta → Evidencia'),h('h2',null,e.n),h('p',null,e.d),wsBoton('Abrir ejemplo',()=>wsNueva(e.build()),true)))));
 content.append(h('p',{class:'ws-note'},'Ejemplos didácticos con datos ilustrativos. Sustituye las mediciones, autores y conclusiones por los de tu investigación.'));
 }else{content.append(h('header',{class:'suite-page-heading'},h('span',{class:'ws-eyebrow'},'ERLEN SLIDES'),h('h1',{id:'wsTitle',tabindex:'-1'},names[wsVista])),h('section',{id:'wsContent','aria-label':names[wsVista]}));wsPinta();}
 $('#wsTitle')?.focus({preventScroll:true});
}
