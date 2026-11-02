'use strict';
const assert=require('node:assert/strict');
const M=require('../music.js');
const noStats=()=>null;

// La armadura funciona aunque no se habiliten alteraciones accidentales.
for(const mode of ['treble','bass','hands']){
 for(const signature of [-7,-3,-1,0,1,2,7]){
  const lv=M.MODES[mode].levels[mode==='hands'?1:4];
  const opts={signature:String(signature),accidentals:'none',distribution:'guided',lowerClef:'bass',handStyle:'basic'};
  for(let i=0;i<4;i++){
   const sheet=M.makeSheet(mode,lv,opts,noStats);
   assert.equal(sheet.signature,signature,`${mode} debe conservar la armadura ${signature}`);
   for(const event of sheet.events)for(const {note} of event.notes){
    assert.equal(note.a,M.alterSignature(signature,note.l),`${M.fmt(note)} no respeta armadura ${signature}`);
   }
  }
 }
}
// Los niveles 1.5 y 2.5 mantienen sus límites, pero no lanzan continuamente
// notas a demasiadas líneas adicionales. "Uniforme" sigue disponible.
for(const [mode,levelCode] of [['treble','1.5'],['bass','2.5'],['hands','3.5']]){
 const lv=M.MODES[mode].levels.find(l=>l[0]===levelCode),result={};
 for(const distribution of ['guided','uniform']){
  let far=0,near=0,middle=0,total=0;
  for(let i=0;i<90;i++){
   const sheet=M.makeSheet(mode,lv,{accidentals:'none',signature:'0',distribution,handStyle:'basic',lowerClef:'bass'},noStats);
   if(distribution==='guided')for(const {note,staff} of sheet.events[0].notes){
    assert.equal(M.distanceFromStaff(note,sheet.clefs[staff]),0,`${mode}: la partitura debe comenzar dentro del pentagrama`);
   }
   for(const event of sheet.events)for(const {note,staff} of event.notes){
    const d=M.distanceFromStaff(note,sheet.clefs[staff]);
    if(d>=6)far++;else if(d>=3)middle++;else near++;
    total++;
   }
  }
  result[distribution]={far:far/total,near:near/total,middle:middle/total};
 }
 assert(result.guided.near>.65,`${mode}: ${JSON.stringify(result)}`);
 assert(result.guided.far<.12,`${mode}: ${JSON.stringify(result)}`);
 assert(result.uniform.far>result.guided.far+.16,`${mode}: ${JSON.stringify(result)}`);
}
// Las accidentales sí pueden modificar el sonido respecto a la armadura.
const oneFa=[M.parseRequired('Fa4')];
const level=M.MODES.treble.levels[0];
for(const signature of [-1,0,1,2,3]){
 for(let i=0;i<10;i++){
  const got=M.chooseNote(oneFa,{signature:String(signature),accidentals:'none'},'treble',level,noStats,null,'treble');
  assert.equal(got.note.a,M.alterSignature(signature,3));
 }
}
console.log('OK: armaduras independientes, distribución progresiva de lectura y modo uniforme.');
