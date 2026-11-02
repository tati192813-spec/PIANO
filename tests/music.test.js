'use strict';
const assert=require('node:assert/strict');
const M=require('../music.js');
const noStats=()=>null;
assert.equal(M.ROOTS.length,17);assert.equal(M.FAMILIES.length,10);assert.deepEqual(M.checkIntegrity(),[]);
let counted=0;
for(const root of M.ROOTS)for(const family of M.FAMILIES){
 const notes=M.chordTones(root,family);
 assert.equal(notes.length,family.intervals.length);assert(notes.every(n=>M.midi(n)>=21&&M.midi(n)<=108));
 assert.deepEqual(notes.map(n=>M.mod(M.midi(n)-M.midi(notes[0]),12)),family.intervals.map(x=>M.mod(x,12)));
 for(let inv=0;inv<notes.length;inv++){
  const chord={root,family,inversion:inv,notes:M.rotateInversion(notes,inv)};
  const text=chord.notes.map(n=>M.english(n)).join(',');
  assert(M.compareChordInput(text,chord).ok,root.symbol+family.suffix+' inv '+inv+' text '+text);
  assert(M.compareChordMidi(chord.notes.map(M.midi),chord).ok,root.symbol+family.suffix+' inv '+inv);
  assert(!M.compareChordMidi(chord.notes.map(M.midi).slice(1),chord).ok);
  counted++;
 }
}
for(const mode of ['treble','bass'])for(const lv of M.MODES[mode].levels){
 const lo=M.step(M.parseRequired(lv[1])),hi=M.step(M.parseRequired(lv[2]));
 for(let i=0;i<100;i++){
  const sheet=M.makeSheet(mode,lv,{accidentals:'all',signature:'0',smart:true},noStats);
  assert.equal(sheet.clefs[0],mode);
  for(let bar=0;bar<3;bar++)assert.equal(sheet.events.filter(e=>e.bar===bar).reduce((s,e)=>s+e.duration,0),4,lv[0]);
  for(const e of sheet.events)for(const {note,mark} of e.notes){assert(M.step(note)>=lo&&M.step(note)<=hi,lv[0]);assert(M.physical(note));if(mark==='8va')assert.equal(mode,'treble');if(mark==='8vb')assert.equal(mode,'bass');}
 }
}
for(const lv of M.MODES.hands.levels)for(const lowerClef of ['bass','treble']){
 const max=Number(lv[1]);
 for(let i=0;i<120;i++){
  const sheet=M.makeSheet('hands',lv,{accidentals:'none',signature:'0',smart:true,handStyle:'basic',lowerClef},noStats);
  for(let bar=0;bar<3;bar++)assert.equal(sheet.events.filter(e=>e.bar===bar).reduce((s,e)=>s+e.duration,0),4);
  for(const e of sheet.events){assert.equal(e.duration,1);assert.equal(new Set(e.notes.map(it=>M.midi(it.note))).size,e.notes.length);
   for(const it of e.notes){const clef=sheet.clefs[it.staff];if(max===0)assert(M.step(it.note)>=M.BOTTOM[clef]&&M.step(it.note)<=M.BOTTOM[clef]+8);else if(max!==99)assert(M.ledger(it.note,clef)<=max);}
  }
 }
}
for(let i=0;i<5000;i++)assert.equal(M.partitionBar().reduce((s,x)=>s+x,0),4);
assert(M.noteEq(M.parseRequired('Fa#4'),M.parseRequired('Solb4'),true));
assert(!M.noteEq(M.parseRequired('Fa#4'),M.parseRequired('Solb4'),false));
assert.equal(M.parseRequired('Do4').o,4);assert.equal(M.parseRequired('La0').o,0);
assert.equal(M.midi(M.parseRequired('La0')),21);assert.equal(M.midi(M.parseRequired('Do8')),108);
console.log('OK: 170 acordes,',counted,'inversiones, 1200 partituras sol/fa, 1200 de dos manos, 5000 compases 4/4.');
