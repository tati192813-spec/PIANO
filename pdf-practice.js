/* Clara · Biblioteca de PDF y capa interactiva de estudio.
   El ejemplo incluido contiene notas preprocesadas. Los PDF nuevos se analizan en el navegador cuando sus símbolos son identificables; el resto se anota manualmente.
   Toda la información privada se almacena localmente en IndexedDB. */
(()=>{'use strict';
const builtin=window.CLARA_SCORES, M=window.ClaraMusic, NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const KEY='claraPDFPracticeV1', DB_NAME='claraPDFLibraryV1', STORE='scores';
const defaults=()=>({hand:'0',chords:false,showNames:true,showPiano:true,sidebarCollapsed:false,index:0,corrections:{},handCorrections:{},removedNotes:{},addedNotes:[]});
let data=builtin, currentId=builtin.id, pdfDocument=null, library=[], libraryInit=false, loadingPage=0, marking=false, detecting=false;
let memory=defaults();
function loadMemory(){try{memory={...defaults(),...JSON.parse(localStorage.getItem(storageKey())||'{}')};memory.corrections ||= {};memory.handCorrections ||= {};memory.removedNotes ||= {};memory.addedNotes ||= [];}catch{memory=defaults()}}
function storageKey(){return currentId===builtin.id?KEY:KEY+':'+currentId}
loadMemory();
let hand=memory.hand,chords=!!memory.chords,showNames=!!memory.showNames,showPiano=memory.showPiano!==false,sidebarCollapsed=!!memory.sidebarCollapsed,events=[],index=Number(memory.index)||0,shownPage=0,locked=false,midiChord=new Set(),errorCount=0,completed=new Set(),audio=null,writingTimer=null,editorRows=[];
function save(){memory.hand=hand;memory.chords=chords;memory.showNames=showNames;memory.showPiano=showPiano;memory.sidebarCollapsed=sidebarCollapsed;memory.index=index;try{localStorage.setItem(storageKey(),JSON.stringify(memory))}catch{status('No se han podido guardar los cambios. Comprueba el almacenamiento del navegador.','wrong')}}
function pitch(midi){return M.soundingName(midi)}
function noteMidi(note){return Number.isInteger(memory.corrections[note.id])?memory.corrections[note.id]:note.midi}
function noteHand(note){return [0,1].includes(memory.handCorrections[note.id])?memory.handCorrections[note.id]:note.hand}
function allNotes(){return [...data.notes,...(currentId===builtin.id?memory.addedNotes:[])].filter(n=>!memory.removedNotes[n.id])}
function syncSidebarHeight(){
 const layout=$('pdf-layout'),sheet=document.querySelector?.('.pdf-sheet-panel');
 if(!sheet)return;
 const height=Math.ceil(sheet.getBoundingClientRect().height);
 if(height>0)layout.style.setProperty('--pdf-sheet-height',height+'px');
}
function configureView(){const sidebar=$('pdf-sidebar'),layout=$('pdf-layout'),toggle=$('pdf-toggle-sidebar');sidebar.classList.toggle('is-collapsed',sidebarCollapsed);layout.classList.toggle('sidebar-collapsed',sidebarCollapsed);toggle.textContent=sidebarCollapsed?'Mostrar controles':'Ocultar controles';toggle.setAttribute('aria-expanded',String(!sidebarCollapsed));$('pdf-show-piano').checked=showPiano;$('pdf-piano-content').hidden=!showPiano;requestAnimationFrame(syncSidebarHeight);}
function svg(tag,attrs,parent){const o=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))o.setAttribute(k,v);if(parent)parent.appendChild(o);return o}
function status(text,kind=''){const el=$('pdf-library-status');if(el){el.textContent=text;el.className='pdf-small'+(kind?' '+kind:'')}}
function setFeedback(text){const node=$('pdf-feedback');node.textContent=text;}
function openDb(){return new Promise((resolve,reject)=>{
 if(!window.indexedDB){reject(new Error('Tu navegador no permite guardar archivos locales.'));return}
 const req=indexedDB.open(DB_NAME,1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 })}
async function database(method,object){const db=await openDb();return new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,method==='list'||method==='get'?'readonly':'readwrite'),store=tx.objectStore(STORE);
 let req;if(method==='list')req=store.getAll();else if(method==='get')req=store.get(object);else if(method==='put')req=store.put(object);else req=store.delete(object);
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);
 })}
function makeButton(text,fn,klass='btn small subtle'){const button=document.createElement('button');button.type='button';button.className=klass;button.textContent=text;button.addEventListener('click',fn);return button}
function renderLibrary(){const box=$('pdf-library-list');if(!box)return;box.replaceChildren();
 for(const score of [builtin,...library]){
  const item=document.createElement('div');item.className='pdf-library-item'+(currentId===score.id?' selected':'');
  const label=document.createElement('div');label.className='pdf-library-title';
  const name=document.createElement('strong');name.textContent=score.title;
  const meta=document.createElement('small');const n=score.id===currentId?allNotes().length:score.notes.length;meta.textContent=`${score.pages.length} páginas · ${n} notas ${score.id===builtin.id?'detectadas (beta)':score.notes.some(n=>n.auto)?'detectadas y anotadas (beta)':'anotadas'}`;
  label.appendChild(name);label.appendChild(meta);item.appendChild(label);
  item.appendChild(makeButton(score.id===currentId?'Abierta':'Abrir',()=>selectScore(score.id),score.id===currentId?'btn small primary':'btn small subtle'));
  if(score.id!==builtin.id)item.appendChild(makeButton('Eliminar',()=>removeScore(score.id),'btn small danger'));
  box.appendChild(item);
 }
}
async function initLibrary(){if(libraryInit)return;libraryInit=true;
 try{library=await database('list');library.sort((a,b)=>(b.added||0)-(a.added||0));renderLibrary();
 const wanted=localStorage.getItem('claraPDFLastScoreId');if(wanted&&wanted!==builtin.id&&library.some(v=>v.id===wanted))await selectScore(wanted);
 }catch(e){status(`No se pudo abrir la biblioteca local: ${e.message}. La partitura de ejemplo sigue disponible.`,'wrong')}
}
let pdfJsPromise=null;
function loadScript(src){return new Promise((resolve,reject)=>{const e=document.createElement('script');e.src=src;e.onload=resolve;e.onerror=()=>{e.remove();reject(new Error('No se pudo cargar el visor de PDF.'))};document.head.appendChild(e)})}
async function pdfjs(){if(window.pdfjsLib)return window.pdfjsLib;
 if(!pdfJsPromise)pdfJsPromise=(async()=>{
  const sources=['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'];
  for(const src of sources){try{await loadScript(src);if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return window.pdfjsLib}}catch{}}
  throw new Error('Para importar PDF hace falta conexión a Internet la primera vez que se carga el visor. Comprueba tu conexión y vuelve a intentar.');
 })().catch(e=>{pdfJsPromise=null;throw e});
 return pdfJsPromise;
}
async function openPdf(blob){const lib=await pdfjs();const binary=new Uint8Array(await blob.arrayBuffer());
 const task=lib.getDocument({data:binary,isEvalSupported:false,disableFontFace:false});return task.promise;
}
// Los archivos se procesan localmente. La detección automática cubre solo PDFs
// vectoriales con símbolos musicales Unicode y líneas de pentagrama legibles.
async function detectCurrent(){
 if(currentId===builtin.id||detecting)return;
 const detector=window.ClaraPDFRecognition;
 if(!detector){status('El módulo de reconocimiento no está disponible. Puedes marcar notas manualmente.','wrong');return}
 const id=currentId,record=library.find(r=>r.id===id);if(!record)return;
 detecting=true;$('pdf-detect').disabled=true;
 let found=[],checked=0,unsupported=0,errors=0;
 $('pdf-auto-status').className='pdf-small pdf-auto-progress';
 try{
  const doc=pdfDocument||await openPdf(record.pdf);
  for(let p=1;p<=doc.numPages;p++){
   if(currentId!==id)break;
   $('pdf-auto-status').textContent=`Analizando la página ${p} de ${doc.numPages}…`;
   // Ceder control al navegador para mostrar el progreso.
   await new Promise(resolve=>setTimeout(resolve,0));
   try{const result=await detector.analyzePage(await doc.getPage(p),p);
    found.push(...result.notes);checked++;
    if(!result.notes.length)unsupported++;
   }catch(e){errors++;checked++;console.warn('Clara: no se pudo analizar una página',p,e)}
   if(found.length>20000)throw Error('Esta partitura supera el límite de 20.000 notas detectadas.');
  }
  if(currentId!==id)return;
  // Se conservan todas las anotaciones manuales. Las nuevas detecciones no
  // deben duplicar una cabeza ya marcada por el usuario.
  const manual=record.notes.filter(n=>!n.auto);
  const previous=new Map(record.notes.filter(n=>n.auto).map(n=>[`${n.page}:${roundCoord(n.x)}:${roundCoord(n.y)}`,n]));
  found=found.filter(n=>!manual.some(m=>m.page===n.page&&Math.hypot(m.x-n.x,m.y-n.y)<7));
  found.sort((a,b)=>a.page-b.page||a.system-b.system||a.x-b.x||a.hand-b.hand||a.y-b.y);
  found=found.map((n,i)=>({...n,id:previous.get(`${n.page}:${roundCoord(n.x)}:${roundCoord(n.y)}`)?.id||`auto-${n.page}-${i}`,order:i}));
  for(let i=0;i<manual.length;i++){
   const n=manual[i];if(found.length){const same=found.filter(a=>a.page===n.page).sort((a,b)=>Math.abs(a.y-n.y)-Math.abs(b.y-n.y))[0];
    if(same)n.system=same.system;}
  }
  record.notes=[...manual,...found];record.recognition={type:'vector',checked,unsupported,errors,detected:found.length,date:new Date().toISOString()};
  data=record;index=0;completed.clear();midiChord.clear();buildEvents();save();
  await database('put',record);render();renderLibrary();
  const message=found.length?`Detección experimental: ${found.length} notas propuestas en ${checked} páginas. Revisa clave, armadura, alteraciones y octavas antes de tocar.${unsupported?` ${unsupported} página(s) sin reconocimiento.`:''}`:`No se detectaron cabezas de nota utilizables en ${checked} páginas. Prueba «Marcar notas» o un PDF digital generado por un editor musical.`;
  $('pdf-auto-status').textContent=message;
  $('pdf-auto-status').className='pdf-small '+(found.length?'pdf-auto-success':'pdf-auto-warning');
  status(message,found.length?'correct':'');
  if(!found.length)setFeedback('Esta partitura necesita marcado manual o reconocimiento musical externo.');
 }catch(e){if(currentId===id){const message='No se pudo completar el reconocimiento: '+(e.message||String(e));status(message,'wrong');$('pdf-auto-status').textContent=message;$('pdf-auto-status').className='pdf-small pdf-auto-warning';}}
 finally{detecting=false;$('pdf-detect').disabled=false}
}
function roundCoord(x){return Math.round(x*2)/2}
async function importPdf(file){if(!file)return;
 if(file.size>25*1024*1024){status('El PDF supera el límite de 25 MB.','wrong');return}
 if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){status('Selecciona un archivo PDF válido.','wrong');return}
 status(`Abriendo «${file.name}»…`);
 try{const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());const header=String.fromCharCode(...bytes);if(!header.startsWith('%PDF-'))throw Error('El archivo no parece un PDF.');
  const doc=await openPdf(file);if(doc.numPages>100)throw Error('Por seguridad, la versión actual admite hasta 100 páginas por PDF.');
  const pages=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),viewport=page.getViewport({scale:1});pages.push({page:i,width:viewport.width,height:viewport.height})}
  const id='user-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
  const record={version:1,id,title:file.name.replace(/\.pdf$/i,''),source:file.name,pdf:new Blob([file],{type:'application/pdf'}),added:Date.now(),pages,notes:[]};
  await database('put',record);library.unshift(record);pdfDocument=doc;await selectScore(id,doc);status(`«${record.title}» añadida. Analizando automáticamente las notas compatibles…`);await detectCurrent();
 }catch(e){status('No se pudo importar el PDF: '+(e.message||String(e)),'wrong')}
}
async function selectScore(id,alreadyOpened=null){
 try{let record=id===builtin.id?builtin:library.find(d=>d.id===id)||await database('get',id);
  if(!record)throw Error('No se encuentra la partitura.');
  let doc=null;if(id!==builtin.id)doc=alreadyOpened||await openPdf(record.pdf);
  loadingPage++;currentId=id;data=record;pdfDocument=doc;shownPage=0;locked=false;marking=false;completed.clear();midiChord.clear();
  loadMemory();hand=memory.hand;chords=!!memory.chords;showNames=!!memory.showNames;showPiano=memory.showPiano!==false;sidebarCollapsed=!!memory.sidebarCollapsed;index=Number(memory.index)||0;
  $('pdf-hand').value=hand;$('pdf-chords').checked=chords;$('pdf-show-names').checked=showNames;
  $('pdf-mark-panel').hidden=false;$('pdf-detection-tools').hidden=id===builtin.id;$('pdf-mark-mode').checked=false;configureView();
  $('pdf-heading').textContent=record.title;
  $('pdf-subtitle').textContent=id===builtin.id?'Partitura original preparada como ejemplo. Reconocimiento experimental de notas.':'PDF importado. Clara propone notas detectadas automáticamente cuando reconoce los símbolos; compruébalas antes de practicar.';
  if(id!==builtin.id){$('pdf-mark-status').textContent=`${data.notes.length} notas disponibles. Activa el marcado para añadir o reparar notas.`;$('pdf-auto-status').textContent=record.recognition?`${record.recognition.detected} notas propuestas automáticamente. Comprueba la lectura antes de tocar.`:'Esta partitura aún no tiene reconocimiento automático. Pulsa «Volver a detectar notas». ';}
  try{localStorage.setItem('claraPDFLastScoreId',id)}catch{}
  buildEvents();renderLibrary();render();
 }catch(e){status('No se pudo abrir la partitura: '+(e.message||String(e)),'wrong')}
}
async function removeScore(id){const item=library.find(r=>r.id===id);if(!item)return;
 if(!window.confirm(`¿Eliminar «${item.title}» de Clara? Se perderán las notas marcadas en este navegador.`))return;
 try{await database('delete',id);library=library.filter(r=>r.id!==id);if(currentId===id)await selectScore(builtin.id);renderLibrary();status('Partitura eliminada de la biblioteca.')}catch(e){status('No se pudo eliminar: '+e.message,'wrong')}
}
function storeAnnotations(){if(currentId===builtin.id)return;
 const record=library.find(r=>r.id===currentId);if(!record)return;record.notes=data.notes.map(n=>({...n}));
 if(writingTimer)clearTimeout(writingTimer);
 writingTimer=setTimeout(async()=>{try{await database('put',record)}catch(e){status('No se pudieron guardar las notas marcadas: '+e.message,'wrong')}},250);
}
function buildEvents(){
 const selected=allNotes().filter(n=>hand==='both'||noteHand(n)===+hand).map(n=>noteHand(n)===n.hand?n:{...n,hand:noteHand(n)});
 if(currentId===builtin.id)selected.sort((a,b)=>a.page-b.page||a.system-b.system||a.x-b.x||a.hand-b.hand||a.y-b.y);
 else if(selected.some(n=>n.auto))selected.sort((a,b)=>a.page-b.page||a.system-b.system||a.x-b.x||a.hand-b.hand||a.y-b.y);
 else selected.sort((a,b)=>a.order-b.order);
 const out=[];
 for(const n of selected){const prev=out[out.length-1];
  if(chords&&prev&&prev.page===n.page&&prev.system===n.system&&Math.abs(prev.x-n.x)<2.2)prev.notes.push(n);
  else out.push({page:n.page,system:n.system,x:n.x,notes:[n]});
 }
 events=out;index=Math.min(Math.max(0,index),Math.max(0,events.length-1));
}
function event(){return events[index]||null}
function setPage(page){if(!data.pages.length)return;
 shownPage=Math.max(1,Math.min(page,data.pages.length));const info=data.pages[shownPage-1];
 $('pdf-overlay').setAttribute('viewBox',`0 0 ${info.width} ${info.height}`);
 $('pdf-page-label').textContent=`Página ${shownPage} de ${data.pages.length}`;
 $('pdf-previous-page').disabled=shownPage<=1;$('pdf-next-page').disabled=shownPage>=data.pages.length;
 const img=$('pdf-page-image');img.alt=`Página ${shownPage} de ${data.pages.length} de ${data.title}`;
 const requested=++loadingPage, pageNumber=shownPage;
 if(!pdfDocument){img.src=info.image;return}
 img.removeAttribute('src');
 (async()=>{try{const page=await pdfDocument.getPage(pageNumber),viewport=page.getViewport({scale:2});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
   if(requested!==loadingPage)return;
   img.src=canvas.toDataURL('image/png');
  }catch(e){if(requested===loadingPage){status('No se pudo mostrar la página: '+e.message,'wrong')}}})();
}
function scrollToNote(){const ev=event();if(!ev||shownPage!==ev.page)return;
 const first=ev.notes[0],scroll=$('pdf-paper-scroll'),paper=$('pdf-paper');
 const scale=paper.getBoundingClientRect().width/data.pages[ev.page-1].width;
 const targetY=first.y*scale,top=scroll.scrollTop;
 if(targetY<top+80||targetY>top+scroll.clientHeight-125)scroll.scrollTo({top:Math.max(0,targetY-scroll.clientHeight*.34),behavior:'smooth'});
 const targetX=first.x*scale;if(targetX<scroll.scrollLeft+35||targetX>scroll.scrollLeft+scroll.clientWidth-35)scroll.scrollLeft=Math.max(0,targetX-scroll.clientWidth*.45);
}
function renderOverlay(){const overlay=$('pdf-overlay');overlay.replaceChildren();if(!data)return;
 const active=new Set(event()?.notes.map(n=>n.id)||[]),info=data.pages[shownPage-1];if(!info)return;
 if(marking){const surface=svg('rect',{x:0,y:0,width:info.width,height:info.height,class:'pdf-mark-surface'},overlay);
  surface.addEventListener('click',e=>{const rect=overlay.getBoundingClientRect();if(!rect.width||!rect.height)return;
   const x=(e.clientX-rect.left)*info.width/rect.width,y=(e.clientY-rect.top)*info.height/rect.height;
   addNote(x,y);
  });}
 for(const n of allNotes()){if(n.page!==shownPage)continue;
  const hit=svg('circle',{cx:n.x,cy:n.y,r:currentId===builtin.id?5.5:7,class:'pdf-hit',tabindex:0,role:'button','aria-label':`Seleccionar ${pitch(noteMidi(n))}`},overlay);
  const eventIndex=events.findIndex(ev=>ev.notes.some(part=>part.id===n.id));
  if(marking)hit.style.pointerEvents='none';
  if(eventIndex<0){hit.classList.add('pdf-hit-inactive');continue}
  hit.addEventListener('click',()=>{index=eventIndex;locked=false;midiChord.clear();save();render();});
  hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();index=eventIndex;locked=false;midiChord.clear();save();render();}});
  if(active.has(n.id))svg('ellipse',{cx:n.x,cy:n.y,rx:6.15,ry:4.45,transform:`rotate(-20 ${n.x} ${n.y})`,class:'pdf-note-active'},overlay);
  else if(completed.has(n.id))svg('ellipse',{cx:n.x,cy:n.y,rx:5.6,ry:4.0,transform:`rotate(-20 ${n.x} ${n.y})`,class:'pdf-note-completed'},overlay);
  else svg('circle',{cx:n.x,cy:n.y,r:2,class:'pdf-note-marked'},overlay);
 }
}
function makeText(tag,text,klass){const el=document.createElement(tag);el.textContent=text;if(klass)el.className=klass;return el}
function renderPianoNames(ev){
 const node=$('pdf-piano-note-names');node.replaceChildren();node.hidden=!showNames||!ev;
 if(node.hidden)return;
 const notes=ev.notes.filter(n=>noteMidi(n)>=21&&noteMidi(n)<=108);
 const unique=new Set();
 for(const n of notes){const key=`${noteMidi(n)}-${noteHand(n)}`;if(unique.has(key))continue;unique.add(key);
  const label=makeText('span',pitch(noteMidi(n)),'pdf-piano-note '+(noteHand(n)===0?'right':'left'));
  label.title=noteHand(n)===0?'Mano derecha':'Mano izquierda';node.appendChild(label);
 }
}
function renderEditor(){
 const box=$('pdf-editor-notes'),ev=event();box.replaceChildren();editorRows=[];
 if(!ev){box.appendChild(makeText('p','No hay notas seleccionadas. Puedes añadirlas sobre la partitura.','pdf-small'));$('pdf-save-pitch').disabled=true;return}
 $('pdf-save-pitch').disabled=false;
 ev.notes.forEach((n,i)=>{
  const row=document.createElement('div');row.className='pdf-editor-row';row.appendChild(makeText('div',`${noteHand(n)===0?'Mano derecha':'Mano izquierda'} · Nota ${i+1}`,'pdf-editor-row-head'));
  const fields=document.createElement('div');fields.className='pdf-editor-row-fields';
  const pitchLabel=makeText('label','Altura musical');const pitchInput=document.createElement('input');pitchInput.type='text';pitchInput.value=pitch(noteMidi(n));pitchInput.setAttribute('aria-label',`Altura de nota ${i+1}`);pitchLabel.appendChild(pitchInput);
  const handLabel=makeText('label','Mano');const handInput=document.createElement('select');handInput.setAttribute('aria-label',`Mano de nota ${i+1}`);
  for(const [v,t] of [['0','Derecha'],['1','Izquierda']]){const option=document.createElement('option');option.value=v;option.textContent=t;handInput.appendChild(option)}handInput.value=String(noteHand(n));handLabel.appendChild(handInput);
  fields.appendChild(pitchLabel);fields.appendChild(handLabel);row.appendChild(fields);
  const deleteLabel=document.createElement('label');deleteLabel.className='pdf-editor-delete';const del=document.createElement('input');del.type='checkbox';deleteLabel.appendChild(del);deleteLabel.appendChild(makeText('span','Eliminar esta nota (al guardar)'));row.appendChild(deleteLabel);
  box.appendChild(row);editorRows.push({note:n,pitchInput,handInput,del});
 });
}
function render(){if(!data.pages.length)return;
 const ev=event();if(ev){if(ev.page!==shownPage)setPage(ev.page)}else if(shownPage===0)setPage(1);
 renderOverlay();
 $('pdf-note-position').textContent=ev?`Nota ${index+1} de ${events.length}`:'Ninguna nota preparada';
 renderPianoNames(ev);
 renderEditor();
 $('pdf-correct-status').textContent=!ev?'Añade notas para empezar a corregirlas.':ev.notes.some(n=>n.estimatedOctave)?'Hay octavas estimadas: revisa la selección antes de practicar.':ev.notes.some(n=>n.auto)?'Reconocimiento automático sin verificar. Revisa las notas y pulsa Corregir.':'Puedes editar las notas y guardar los cambios.';
 $('pdf-prev-note').disabled=!ev||index===0;$('pdf-next-note').disabled=!ev||index===events.length-1;
 if(!ev&&currentId!==builtin.id)setFeedback('No hay notas preparadas. Puedes probar «Volver a detectar notas» o añadirlas manualmente.');
 paintKeys();requestAnimationFrame(()=>{scrollToNote();syncSidebarHeight();if(showPiano)focusKeyboard()});
}
function addNote(x,y){if(!marking)return;
 const value=M.parseRequired($('pdf-mark-pitch').value),midi=value&&M.midi(value);
 if(!value||midi<21||midi>108){$('pdf-mark-status').textContent='Escribe antes una altura válida (Do4, Fa#5, Sib3).';return}
 const nearby=allNotes().filter(n=>n.page===shownPage).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];const note={id:'n'+Date.now()+'-'+Math.random().toString(36).slice(2,7),page:shownPage,system:nearby?.system||0,hand:Number($('pdf-mark-hand').value),x:+x.toFixed(2),y:+y.toFixed(2),midi,order:allNotes().length,auto:false};
 if(currentId===builtin.id)memory.addedNotes.push(note);else data.notes.push(note);if(!events.length&&hand!=='both'&&hand!==String(note.hand)){hand=String(note.hand);$('pdf-hand').value=hand;}buildEvents();
 const selectedIndex=events.findIndex(e=>e.notes.some(n=>n.id===note.id));if(selectedIndex>=0)index=selectedIndex;
 save();storeAnnotations();render();
 $('pdf-mark-status').textContent=`${allNotes().length} notas disponibles. Marca la siguiente cabeza o desactiva el marcado.`;renderLibrary();
}
function move(delta){if(!events.length)return;index=Math.max(0,Math.min(events.length-1,index+delta));locked=false;midiChord.clear();save();setFeedback('Toca la nota resaltada.');render()}
function pageMove(delta){const requested=Math.max(1,Math.min(data.pages.length,shownPage+delta));const target=events.findIndex(e=>e.page===requested);
 if(target>=0){index=target;save();setFeedback('Página seleccionada; puedes empezar desde esta nota.');render()}
 else if(currentId!==builtin.id){setPage(requested);renderOverlay();}
}
function audioNote(midi){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 audio=audio||new C();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;
 const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=440*Math.pow(2,(midi-69)/12);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.09,now+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,now+.36);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.37);
 }catch{}}
function answer(note,sound=false){if(locked||!event()||marking)return;
 if(sound&&note>=21&&note<=108)audioNote(note);
 const expected=event().notes.map(noteMidi),valid=new Set(expected);
 if(!valid.has(note)){errorCount++;setFeedback(`Has tocado ${pitch(note)}. No es la nota indicada; vuelve a intentarlo.`,'wrong');return}
 midiChord.add(note);
 if(![...valid].every(n=>midiChord.has(n))){setFeedback(`Bien. Faltan ${[...valid].filter(n=>!midiChord.has(n)).length} nota(s) del acorde.`);return}
 locked=true;event().notes.forEach(n=>completed.add(n.id));
 setFeedback('Correcto. Avanzando a la siguiente nota.','correct');
 setTimeout(()=>{if(!locked)return;if(index===events.length-1){locked=false;midiChord.clear();setFeedback('Has llegado al final de las notas preparadas de esta partitura.','correct');return}
  index++;locked=false;midiChord.clear();save();render();setFeedback('Toca la siguiente nota.');},380);
}
function buildKeyboard(){const board=$('pdf-keyboard');board.replaceChildren();let white=0;
 for(let midi=21;midi<=108;midi++){
  const isBlack=[1,3,6,8,10].includes(midi%12),key=document.createElement('button');
  key.type='button';key.dataset.midi=String(midi);key.className='pdf-key '+(isBlack?'pdf-black':'pdf-white');
  key.setAttribute('aria-label','Tocar '+pitch(midi));key.title=pitch(midi);
  if(!isBlack){key.style.left=(white*24)+'px';if(midi%12===0)key.textContent='Do';white++}
  else key.style.left=(white*24-9)+'px';
  key.addEventListener('click',()=>answer(midi,true));board.appendChild(key);
 }
 board.style.width=(white*24)+'px';
}
function focusKeyboard(){const value=event()?.notes.map(noteMidi).find(m=>m>=21&&m<=108);if(value===undefined)return;
 const key=[...$('pdf-keyboard').children].find(k=>+k.dataset.midi===value);if(!key)return;
 const scroll=$('pdf-keyboard-scroll'),pos=parseFloat(key.style.left)||0;scroll.scrollLeft=Math.max(0,pos-scroll.clientWidth*.43)}
function paintKeys(){const notes=showPiano?(event()?.notes||[]):[];const rights=new Set(notes.filter(n=>noteHand(n)===0).map(noteMidi)),lefts=new Set(notes.filter(n=>noteHand(n)===1).map(noteMidi));for(const key of $('pdf-keyboard').children){const midi=Number(key.dataset.midi),r=rights.has(midi),l=lefts.has(midi);key.classList.toggle('pdf-target-key',r||l);key.classList.toggle('pdf-right',r&&!l);key.classList.toggle('pdf-left',l&&!r);key.classList.toggle('pdf-both',r&&l);key.setAttribute('aria-description',r&&l?'Mano derecha e izquierda':r?'Mano derecha':l?'Mano izquierda':'Tecla no seleccionada')}}
function onShow(){$('pdf-detection-tools').hidden=currentId===builtin.id;if(!events.length){hand=memory.hand||'0';chords=!!memory.chords;index=Number(memory.index)||0;buildEvents();$('pdf-hand').value=hand;$('pdf-chords').checked=chords;$('pdf-show-names').checked=showNames}
 configureView();render();midiStatus(window.__claraBridge?.isMidiReady()||false);initLibrary();
}
function correctPitch(){if(!event()||!editorRows.length)return;
 const changes=[];
 for(const row of editorRows){const value=M.parseRequired(row.pitchInput.value),midi=value&&M.midi(value);
  if(!row.del.checked&&(!value||!Number.isInteger(midi)||midi<21||midi>108)){row.pitchInput.setAttribute('aria-invalid','true');$('pdf-correct-status').textContent='Comprueba las alturas: usa Do4, Si♭3, Fa#5… (La0 a Do8). No se ha guardado ningún cambio.';return}
  row.pitchInput.setAttribute('aria-invalid','false');changes.push({id:row.note.id,midi,hand:Number(row.handInput.value),deleted:row.del.checked});
 }
 for(const edit of changes){
  if(edit.deleted){memory.removedNotes[edit.id]=true;continue}
  delete memory.removedNotes[edit.id];memory.corrections[edit.id]=edit.midi;
  memory.handCorrections[edit.id]=edit.hand;
 }
 buildEvents();locked=false;midiChord.clear();save();storeAnnotations();render();renderLibrary();
 $('pdf-correct-status').textContent='Correcciones guardadas. La partitura y el piano virtual muestran las nuevas notas.';
 setFeedback('Notas corregidas. Puedes continuar la práctica.','correct');
}
function resetPitch(){const selected=event();if(!selected)return;
 for(const n of selected.notes){delete memory.corrections[n.id];delete memory.handCorrections[n.id];delete memory.removedNotes[n.id]}
 buildEvents();save();storeAnnotations();render();$('pdf-correct-status').textContent='Notas de esta selección restablecidas a sus valores originales.';
}
function midiStatus(connected,err){if(!$('pdf-midi-state'))return;
 $('pdf-midi-state').textContent=err||(connected?'Piano MIDI conectado. Toca la nota resaltada.':'Piano MIDI no conectado. Puedes usar el teclado virtual.');
 $('pdf-connect-midi').textContent=connected?'MIDI conectado · cambiar dispositivo':'Conectar piano MIDI';
}
function applyZoom(){const factor=Number($('pdf-zoom').value)||1;$('pdf-paper').style.width=Math.round(750*factor)+'px';requestAnimationFrame(scrollToNote)}
function blobUrlDownload(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function asDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
async function exportCurrent(){if(currentId===builtin.id){status('La partitura de ejemplo ya viene incluida en Clara. Puedes exportar las partituras que hayas añadido.');return}
 try{const rec=library.find(v=>v.id===currentId);if(!rec)throw Error('No se encuentra el archivo PDF');
 const pdf=await asDataUrl(rec.pdf),out={format:'clara-pdf-backup-v1',title:rec.title,pdf,notes:allNotes().map(n=>({...n,hand:noteHand(n),midi:noteMidi(n)}))};
 blobUrlDownload(new Blob([JSON.stringify(out)],{type:'application/json'}),rec.title+'.clara.json');status('Copia de la partitura y de las notas preparada para descargar.','correct');
 }catch(e){status('No se pudo exportar la partitura: '+e.message,'wrong')}
}
async function importBackup(file){try{if(file.size>38*1024*1024)throw Error('La copia supera el límite de tamaño.');const backup=JSON.parse(await file.text());
 if(backup.format!=='clara-pdf-backup-v1'||typeof backup.pdf!=='string'||!backup.pdf.startsWith('data:application/pdf;base64,'))throw Error('Formato de copia no reconocido.');
 const base64=backup.pdf.split(',')[1],raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const blob=new Blob([bytes],{type:'application/pdf'}),doc=await openPdf(blob);if(doc.numPages>100)throw Error('El PDF tiene más de 100 páginas.');
 const pages=[];for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),v=pg.getViewport({scale:1});pages.push({page:i,width:v.width,height:v.height})}
 const safeNotes=Array.isArray(backup.notes)?backup.notes.filter(n=>Number.isInteger(n.page)&&n.page>=1&&n.page<=pages.length&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&Number.isInteger(n.midi)&&n.midi>=21&&n.midi<=108&&[0,1].includes(n.hand)).slice(0,10000).map((n,i)=>({...n,id:'restored-'+i,order:i})):[];
 const id='user-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
 const record={version:1,id,title:String(backup.title||'Partitura importada').slice(0,120),pdf:blob,source:file.name,added:Date.now(),pages,notes:safeNotes};
 await database('put',record);library.unshift(record);await selectScore(id,doc);status(`Copia restaurada: ${safeNotes.length} notas marcadas.`,'correct');
 }catch(e){status('No se pudo restaurar la copia: '+e.message,'wrong')}
}
function bind(){if(!builtin||!Array.isArray(builtin.notes))return;
 $('pdf-page-image').addEventListener('load',()=>{scrollToNote();syncSidebarHeight()});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncSidebarHeight).observe(document.querySelector('.pdf-sheet-panel'));
 window.addEventListener?.('resize',syncSidebarHeight);
 $('pdf-previous-page').addEventListener('click',()=>pageMove(-1));$('pdf-next-page').addEventListener('click',()=>pageMove(1));
 $('pdf-prev-note').addEventListener('click',()=>move(-1));$('pdf-next-note').addEventListener('click',()=>move(1));
 $('pdf-hand').addEventListener('change',e=>{hand=e.target.value;index=0;completed.clear();buildEvents();save();render()});
 $('pdf-chords').addEventListener('change',e=>{chords=e.target.checked;index=0;completed.clear();buildEvents();save();render()});
 $('pdf-show-names').checked=showNames;
 $('pdf-show-names').addEventListener('change',e=>{showNames=e.target.checked;save();render()});
 $('pdf-show-piano').addEventListener('change',e=>{showPiano=e.target.checked;configureView();save();render()});
 $('pdf-toggle-sidebar').addEventListener('click',()=>{sidebarCollapsed=!sidebarCollapsed;configureView();save();requestAnimationFrame(scrollToNote)});
 $('pdf-zoom').addEventListener('change',applyZoom);
 $('pdf-connect-midi').addEventListener('click',()=>window.__claraBridge?.connectMidi());
 $('pdf-save-pitch').addEventListener('click',correctPitch);
 $('pdf-reset-pitch').addEventListener('click',resetPitch);
 $('pdf-import').addEventListener('click',()=>$('pdf-import-file').click());
 $('pdf-import-file').setAttribute('accept','.pdf,application/pdf,.clara.json,application/json');
 $('pdf-import-file').addEventListener('change',e=>{const file=e.target.files?.[0];if(file){if(file.name.endsWith('.clara.json'))importBackup(file);else importPdf(file)}e.target.value=''});
 $('pdf-export').addEventListener('click',exportCurrent);
 $('pdf-detect').addEventListener('click',()=>detectCurrent());
 $('pdf-mark-mode').addEventListener('change',e=>{marking=e.target.checked;renderOverlay();$('pdf-mark-status').textContent=marking?'Pulsa las cabezas de nota en el orden de lectura.':'Marcado desactivado; ya puedes practicar.'});
 buildEvents();buildKeyboard();applyZoom();
}
bind();
window.ClaraPDF={onShow,midiStatus,receiveMidi:note=>answer(note,false),getState:()=>({index,hand,chords,events:events.length,shownPage,errors:errorCount,scoreId:currentId,marked:allNotes().length,showPiano,sidebarCollapsed}),
 _test:{buildEvents,selectScore,addNote,openDb,importPdf,detectCurrent,correctPitch,resetPitch,allNotes,paintKeys}};
})();
