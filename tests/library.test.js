/* Prueba de importación/anotación local sin servicios remotos (visor PDF simulado). */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const {test}=require('node:test');
class Element{
 constructor(name='div'){this.name=name;this.attrs={};this.dataset={};this.style={};this.children=[];this.handlers={};this.className='';this.value='';this.textContent='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=700;this.clientWidth=700;this.disabled=false;this.checked=false;this.hidden=false;this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};}
 appendChild(el){this.children.push(el);return el}
 append(...els){this.children.push(...els)}
 replaceChildren(...els){this.children=[...els]}
 setAttribute(k,v){this.attrs[k]=String(v)}
 removeAttribute(k){delete this.attrs[k]}
 addEventListener(k,cb){this.handlers[k]=cb}
 getBoundingClientRect(){return {width:750,height:1060,left:0,top:0}}
 scrollTo({top}){this.scrollTop=top}
 click(){this.handlers.click?.({target:this})}
}
const els={}, $=id=>els[id]||(els[id]=new Element(id));
global.document={getElementById:$,head:new Element('head'),createElementNS:(_,tag)=>new Element(tag),createElement:tag=>{const o=new Element(tag);if(tag==='canvas'){o.getContext=()=>({});o.toDataURL=()=>'data:image/png;base64,AA==' }return o}};
global.window=global;global.requestAnimationFrame=cb=>cb();
const saved={};global.localStorage={getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v};
const records=new Map();
global.indexedDB={open:()=>{const request={result:{objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},transaction:()=>({objectStore:()=>({
  getAll:()=>asyncResult([...records.values()]),get:id=>asyncResult(records.get(id)),put:r=>{records.set(r.id,r);return asyncResult(r.id)},delete:id=>{records.delete(id);return asyncResult(undefined)}
 })})}};queueMicrotask(()=>request.onsuccess?.());return request}};
function asyncResult(v){const req={result:v};queueMicrotask(()=>req.onsuccess?.());return req}
global.pdfjsLib={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:2,getPage:async()=>({getViewport:({scale})=>({width:595*scale,height:842*scale}),render:()=>({promise:Promise.resolve()})})})})};
const base=path.join(__dirname,'..');global.ClaraMusic=require(path.join(base,'music.js'));global.__claraBridge={isMidiReady:()=>false,connectMidi:()=>Promise.resolve()};
vm.runInThisContext(fs.readFileSync(path.join(base,'partituras.js'),'utf8'));
require(path.join(base,'pdf-practice.js'));
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
test('importar PDF, marcar nota, guardar local y practicar',async()=>{
 window.ClaraPDF.onShow();await sleep(20);
 const bytes=Buffer.from('%PDF-1.7\n% PDF de prueba simulado\n'),blob=new Blob([bytes],{type:'application/pdf'});blob.name='Prueba.pdf';
 await window.ClaraPDF._test.importPdf(blob);
 assert.equal(window.ClaraPDF.getState().events,0);
 assert.ok(window.ClaraPDF.getState().scoreId.startsWith('user-'));
 assert.equal($('pdf-page-label').textContent,'Página 1 de 2');
 assert.equal($('pdf-mark-panel').hidden,false);
 $('pdf-mark-mode').handlers.change({target:{checked:true}});
 $('pdf-mark-pitch').value='Do4';
 window.ClaraPDF._test.addNote(100,200);
 assert.equal(window.ClaraPDF.getState().marked,1);
 assert.equal(window.ClaraPDF.getState().events,1);
 $('pdf-mark-mode').handlers.change({target:{checked:false}});
 await sleep(450);
 const record=[...records.values()][0];assert.equal(record.notes.length,1);
 assert.equal(record.notes[0].midi,60);
 window.ClaraPDF.receiveMidi(60);await sleep(440);
 assert.match($('pdf-feedback').textContent,/final/);
 await window.ClaraPDF._test.selectScore(window.CLARA_SCORES.id);
 assert.equal(window.ClaraPDF.getState().scoreId,'corazon-de-nino');
 await window.ClaraPDF._test.selectScore(record.id);
 assert.equal(window.ClaraPDF.getState().marked,1);
 assert.equal(window.ClaraPDF.getState().events,1);
});
test('importar otro PDF con reconocimiento automático y mantener marcas al repetirlo',async()=>{
 global.ClaraPDFRecognition={analyzePage:async(_,page)=>({notes:[{page,system:0,hand:0,x:101,y:201,midi:60,auto:true,pitch:'C4',source:'vector-glyphs'}]})};
 const blob=new Blob([Buffer.from('%PDF-1.7\nReconocimiento')],{type:'application/pdf'});blob.name='Automatico.pdf';
 await window.ClaraPDF._test.importPdf(blob);
 assert.equal(window.ClaraPDF.getState().marked,2);
 assert.equal(window.ClaraPDF.getState().events,2);
 const rec=records.get(window.ClaraPDF.getState().scoreId);
 assert.equal(rec.recognition.detected,2);
 assert.ok(rec.notes.every(n=>n.auto));
 $('pdf-mark-mode').handlers.change({target:{checked:true}});
 $('pdf-mark-pitch').value='Re4';
 window.ClaraPDF._test.addNote(275,305);
 assert.equal(window.ClaraPDF.getState().marked,3);
 await window.ClaraPDF._test.detectCurrent();
 assert.equal(window.ClaraPDF.getState().marked,3);
 assert.equal(rec.notes.filter(n=>!n.auto).length,1);
});
