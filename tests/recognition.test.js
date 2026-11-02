const assert=require('node:assert/strict');const {test}=require('node:test');
const R=require('../pdf-recognition.js');
function canvasImage(){const width=900,height=1260,data=new Uint8ClampedArray(width*height*4);data.fill(255);
 const staves=[{top:150,bottom:170},{top:200,bottom:220}];
 for(const s of staves)for(let i=0;i<5;i++){
  const y=Math.round((s.top+i*5)*1.5);
  for(let x=35;x<width-20;x++){
   const k=(y*width+x)*4;data[k]=data[k+1]=data[k+2]=0;
  }
 }
 return {data,width,height};
}
test('detecta cinco líneas en los dos pentagramas, no las notas',()=>{
 const staves=R._test.detectStaves(canvasImage(),1.5);
 assert.equal(staves.length,2);
 assert.equal(staves[0].hand,0);assert.equal(staves[1].hand,1);
 assert.equal(staves[0].system,0);assert.equal(staves[1].system,0);
 assert.ok(Math.abs(staves[0].bottom-170)<1);
});
test('clave de sol, un bemol de armadura y becuadro accidental',()=>{
 const staves=R._test.detectStaves(canvasImage(),1.5);
 const gl=[
  {c:'\ue050',x:70,y:165},{c:'\ue260',x:86,y:160}, // armadura Si♭4, y línea de Si4=160
  {c:'\ue0a4',x:130,y:160}, // Si♭4 (midi 70)
  {c:'\ue261',x:180,y:160},{c:'\ue0a4',x:195,y:160}, // Si natural4 (71)
  {c:'\ue062',x:70,y:215},{c:'\ue260',x:86,y:215},
  {c:'\ue0a4',x:130,y:220}, // Sol2 MIDI 43
 ];
 const notes=R._test.inferNotes(gl,staves,[[],[]],1);
 assert.equal(notes.length,3);
 assert.deepEqual(notes.map(n=>n.midi),[70,43,71]);
 assert.equal(notes[0].hand,0);assert.equal(notes[1].hand,1);
});
test('síncroniza con página de PDF.js simulada, devuelve coordenadas',async()=>{
 const image=canvasImage(),texts=[
   {str:'\ue050',transform:[1,0,0,1,70,165],width:8},
   {str:'\ue260',transform:[1,0,0,1,86,160],width:8},
   {str:'\ue0a4',transform:[1,0,0,1,130,160],width:8},
 ];
 global.document={createElement:()=>({width:0,height:0,getContext:()=>({getImageData:()=>image})})};
 const pg={getViewport:({scale})=>({width:600*scale,height:840*scale,convertToViewportPoint:(x,y)=>[x,y]}),getTextContent:async()=>({items:texts}),render:()=>({promise:Promise.resolve()})};
 const res=await R.analyzePage(pg,2);
 assert.equal(res.notes.length,1);assert.equal(res.notes[0].midi,70);assert.equal(res.notes[0].page,2);
});
test('PDF sin símbolos musicales retorna cero sin falsear el reconocimiento',async()=>{
 const pg={getViewport:()=>({}),getTextContent:async()=>({items:[{str:'Esto es una foto',transform:[1,0,0,1,5,5]}]})};
 const res=await R.analyzePage(pg,1);assert.equal(res.notes.length,0);assert.match(res.reason,/escaneo/);
});
