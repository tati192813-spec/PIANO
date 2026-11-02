/* Pruebas del módulo PDF en DOM mínimo, ejecutables con Node. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element{
 constructor(name='div'){this.name=name;this.attrs={};this.dataset={};this.style={};this.children=[];this.handlers={};this.className='';this.value='';this.textContent='';this.scrollTop=0;this.scrollLeft=0;this.clientHeight=500;this.clientWidth=700;this.disabled=false;this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};}
 appendChild(el){this.children.push(el);return el}
 replaceChildren(...args){this.children=[...args]}
 setAttribute(key,v){this.attrs[key]=String(v)}
 addEventListener(key,cb){this.handlers[key]=cb}
 getBoundingClientRect(){return {width:750,height:1050}}
 scrollTo(obj){this.scrollTop=obj.top}
}
const els={};const $=id=>els[id]||(els[id]=new Element(id));
global.document={getElementById:$,createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag)};
global.window=global;global.requestAnimationFrame=cb=>cb();
let saved={};global.localStorage={getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v};
global.ClaraMusic=require('../music.js');global.__claraBridge={isMidiReady:()=>false,connectMidi:()=>Promise.resolve(true)};
vm.runInThisContext(fs.readFileSync(require('path').join(__dirname,'../partituras.js'),'utf8'));
require('../pdf-practice.js');
global.ClaraPDF.onShow();
assert.equal($('pdf-page-label').textContent,'Página 1 de 6');
assert.ok($('pdf-note-position').textContent.includes('Nota 1 de'));
assert.ok($('pdf-keyboard').children.length===88);
assert.ok($('pdf-overlay').children.length>100);
let pos=global.ClaraPDF.getState();assert.equal(pos.shownPage,1);
// Respuesta MIDI a primera nota (mano derecha) debe avanzar una posición.
global.ClaraPDF.receiveMidi(global.CLARA_SCORES.notes.find(n=>n.hand===0).midi);
setTimeout(()=>{
 assert.equal(global.ClaraPDF.getState().index,1);
 assert.ok($('pdf-note-position').textContent.startsWith('Nota 2 de'));
 console.log('OK: PDF 6 páginas, 88 teclas, superposición, avance MIDI y progreso.');
},450);

// Pruebas de regresión 2.1: edición de acordes, resaltado por mano y panel.
setTimeout(()=>{
 const api=global.ClaraPDF;
 $('pdf-hand').value='both';$('pdf-hand').handlers.change({target:{value:'both'}});
 $('pdf-chords').handlers.change({target:{checked:true}});
 assert.ok($('pdf-piano-note-names').children.length>=2,'las alturas actuales se muestran junto al piano');
 assert.ok($('pdf-piano-note-names').children.some(x=>x.className.includes('right')));
 assert.ok($('pdf-piano-note-names').children.some(x=>x.className.includes('left')));
 assert.ok($('pdf-editor-notes').children.length>=2,'el acorde debe ser editable por notas');
 const rows=$('pdf-editor-notes').children;
 const firstInput=rows[0].children[1].children[0].children[0];
 firstInput.value='NoExiste';api._test.correctPitch();
 assert.match($('pdf-correct-status').textContent,/No se ha guardado/);
 firstInput.value='Do4';api._test.correctPitch();
 assert.match($('pdf-correct-status').textContent,/guardadas/);
 assert.ok(Object.values(JSON.parse(saved['claraPDFPracticeV1']).corrections).includes(60));
 const activeKey=$('pdf-keyboard').children.find(k=>+k.dataset.midi===60);
 assert.match(activeKey.attrs['aria-description'],/Mano derecha|Mano izquierda/);
 $('pdf-show-piano').handlers.change({target:{checked:false}});
 assert.equal(api.getState().showPiano,false);
 assert.equal($('pdf-piano-content').hidden,true);
 $('pdf-show-piano').handlers.change({target:{checked:true}});
 assert.equal(api.getState().showPiano,true);
 $('pdf-show-names').handlers.change({target:{checked:false}});
 assert.equal($('pdf-piano-note-names').hidden,true,'los nombres se ocultan al desmarcar la opción');
 $('pdf-show-names').handlers.change({target:{checked:true}});
 assert.equal($('pdf-piano-note-names').hidden,false,'los nombres vuelven a aparecer');
 $('pdf-toggle-sidebar').handlers.click();
 assert.equal(api.getState().sidebarCollapsed,true);
 $('pdf-toggle-sidebar').handlers.click();
 assert.equal(api.getState().sidebarCollapsed,false);
 console.log('OK: acorde editable, guardado local, etiquetas en piano, piano opcional y panel plegable.');
},480);

// La interfaz compacta no contiene avisos de prototipo ni una ficha de nombres por manos.
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
assert.ok(!html.includes('id="pdf-current"'));
assert.ok(!html.includes('pdf-disclaimer-text'));
assert.ok(!html.includes('>PROTOTIPO<'));
assert.ok(html.indexOf('id="pdf-piano-panel"')<html.indexOf('id="pdf-sidebar"'));
assert.ok(html.indexOf('id="pdf-piano-panel"')>html.indexOf('class="pdf-sheet-panel"'));
console.log('OK: panel compacto sin duplicidades y piano bajo la partitura.');
