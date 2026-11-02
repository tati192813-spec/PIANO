/* Clara — motor musical independiente de la interfaz y del dibujo. */
(function(root,factory){const value=factory();root.ClaraMusic=value;if(typeof module==='object'&&module.exports)module.exports=value;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const LETTERS=['Do','Re','Mi','Fa','Sol','La','Si'];
const ENGLISH=['C','D','E','F','G','A','B'];
const NATURAL=[0,2,4,5,7,9,11];
const ACC={[-2]:'𝄫',[-1]:'♭',0:'',1:'♯',2:'𝄪'};
const SIGNATURE_ORDER={sharp:[3,0,4,1,5,2,6],flat:[6,2,5,1,4,0,3]};
const BOTTOM={treble:4*7+2,bass:2*7+4};
const MODES={
 treble:{title:'Clave de sol',caption:'Aprende a reconocer las notas del pentagrama superior, desde la zona central hasta los registros más amplios.',levels:[['1.1','Mi4','Fa5','Dentro del pentagrama'],['1.2','Do4','La5','Primeras líneas adicionales'],['1.3','La3','Do6','Amplía el registro'],['1.4','Mi3','Fa6','Lectura extendida'],['1.5','Si2','Si6','Registros amplios · extremos ocasionales'],['1.6','Si2','Do8','Incluye 8va']]},
 bass:{title:'Clave de fa',caption:'Reconoce las notas graves con una progresión gradual hacia las líneas adicionales.',levels:[['2.1','Sol2','La3','Dentro del pentagrama'],['2.2','Mi2','Do4','Primeras líneas adicionales'],['2.3','Do2','Mi4','Amplía el registro'],['2.4','Sol1','La4','Lectura extendida'],['2.5','Re1','Re5','Registros amplios · extremos ocasionales'],['2.6','La0','Re5','Incluye 8vb']]},
 hands:{title:'Dos manos',caption:'Dos pentagramas alineados. Practica simultaneidad y sucesión con un teclado MIDI.',levels:[['3.1','0','0','Solo notas dentro del pentagrama'],['3.2','2','2','Hasta 2 líneas adicionales'],['3.3','3','3','Hasta 3 líneas adicionales'],['3.4','5','5','Hasta 5 líneas adicionales'],['3.5','99','99','Registro MIDI completo']]},
 chords:{title:'Acordes',caption:'Lee el nombre, construye el acorde y después descubre su representación en partitura.',levels:[['4.1','0','0','Mayores en posición fundamental'],['4.2','0','0','Mayores y menores'],['4.3','0','0','Primeras inversiones'],['4.4','0','0','Segundas inversiones'],['4.5','0','0','Acordes de séptima'],['4.6','0','0','Inversiones de séptima'],['4.7','0','0','Aumentados y disminuidos'],['4.8','0','0','Acordes suspendidos'],['4.9','0','0','Todas las familias y tonalidades']]}
};
const ROOTS=['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'].map((symbol)=>{const name=ENGLISH.indexOf(symbol[0]);return{symbol,l:name,a:symbol.includes('#')?1:symbol.includes('b')?-1:0};});
const FAMILIES=[
 {id:'maj',name:'Mayor',suffix:'',intervals:[0,4,7],degrees:[0,2,4]},
 {id:'min',name:'Menor',suffix:'m',intervals:[0,3,7],degrees:[0,2,4]},
 {id:'7',name:'Séptima dominante',suffix:'7',intervals:[0,4,7,10],degrees:[0,2,4,6]},
 {id:'m7',name:'Séptima menor',suffix:'m7',intervals:[0,3,7,10],degrees:[0,2,4,6]},
 {id:'maj7',name:'Séptima mayor',suffix:'maj7',intervals:[0,4,7,11],degrees:[0,2,4,6]},
 {id:'mMaj7',name:'Menor con séptima mayor',suffix:'mMaj7',intervals:[0,3,7,11],degrees:[0,2,4,6]},
 {id:'aug',name:'Aumentado',suffix:'aug',intervals:[0,4,8],degrees:[0,2,4]},
 {id:'dim',name:'Disminuido',suffix:'dim',intervals:[0,3,6],degrees:[0,2,4]},
 {id:'sus2',name:'Suspendido 2',suffix:'sus2',intervals:[0,2,7],degrees:[0,1,4]},
 {id:'sus4',name:'Suspendido 4',suffix:'sus4',intervals:[0,5,7],degrees:[0,3,4]}
];
const mod=(v,n)=>((v%n)+n)%n;
const step=n=>n.o*7+n.l;
const midi=n=>12*(n.o+1)+NATURAL[n.l]+n.a;
const pc=n=>mod(midi(n),12);
const physical=n=>midi(n)>=21&&midi(n)<=108;
const fmt=(n,oct=true)=>LETTERS[n.l]+(ACC[n.a]||'')+(oct?n.o:'');
const english=(n,oct=false)=>ENGLISH[n.l]+(n.a===1?'#':n.a===-1?'b':n.a===2?'##':n.a===-2?'bb':'')+(oct?n.o:'');
function parseNote(str,allowOct=true){
 const value=String(str||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ \t]/g,'').replace(/♯/g,'#').replace(/♭/g,'b').replace(/𝄪/g,'x').replace(/𝄫/g,'bb').replace(/♮/g,'');
 const match=/^(do|re|mi|fa|sol|la|si|c|d|e|f|g|a|b)(##|bb|x|#|b)?([0-8])?$/.exec(value);
 if(!match)return null;
 let l=LETTERS.findIndex(x=>x.toLowerCase()===match[1]);if(l<0)l='cdefgab'.indexOf(match[1]);
 return {l,a:({'##':2,bb:-2,x:2,'#':1,b:-1}[match[2]]||0),o:match[3]===undefined?null:Number(match[3])};
}
const parseRequired=str=>{const n=parseNote(str);return n&&n.o!==null?n:null};
const spellingEq=(a,b)=>!!a&&!!b&&a.l===b.l&&a.a===b.a&&(a.o===null||b.o===null||a.o===b.o);
const noteEq=(a,b,enharmonic=false)=>enharmonic?(a&&b&&a.o!==null&&b.o!==null?midi(a)===midi(b):a&&b&&mod(NATURAL[a.l]+a.a,12)===mod(NATURAL[b.l]+b.a,12)):spellingEq(a,b);
function rangeToPositions(lo,hi){const a=step(parseRequired(lo)),b=step(parseRequired(hi)),out=[];for(let k=a;k<=b;k++)out.push({l:mod(k,7),o:Math.floor(k/7),a:0});return out;}
function ledger(note,clef){const d=step(note)-BOTTOM[clef];return d<0?Math.floor(-d/2):d>8?Math.floor((d-8)/2):0;}
function candidatesForClef(clef,level){
 if(level[0][0]!=='3')return rangeToPositions(level[1],level[2]);
 const count=Number(level[1]),out=[];
 for(let o=0;o<=8;o++)for(let l=0;l<7;l++){
  const n={l,a:0,o};if(physical(n)&&(count===99||(count===0?(step(n)>=BOTTOM[clef]&&step(n)<=BOTTOM[clef]+8):ledger(n,clef)<=count)))out.push(n);
 }
 return out;
}
function alterSignature(signature,l){const order=signature>0?SIGNATURE_ORDER.sharp:SIGNATURE_ORDER.flat;return order.slice(0,Math.abs(signature)).includes(l)?(signature>0?1:-1):0;}
function optionsForAccidentals(mode){return mode==='none'?[0]:mode==='simple'?[-1,0,1]:mode==='double'?[-2,0,2]:[-2,-1,0,1,2];}
function durationName(d){return d===4?'redonda':d===3?'blanca con puntillo':d===2?'blanca':d===1.5?'negra con puntillo':d===1?'negra':d===.75?'corchea con puntillo':d===.5?'corchea':'semicorchea';}
function partitionBar(basic=false){if(basic)return [1,1,1,1];if(Math.random()<.10)return [4];const durations=[3,2,1.5,1,.75,.5,.25],out=[];let remaining=4;while(remaining>0.001){let choices=durations.filter(x=>x<=remaining+1e-5);if(out.length>=8)choices=choices.filter(x=>x===remaining);if(!choices.length)choices=[remaining];const weights=choices.map(x=>x===1?5:x===.5?3:x===2?2.4:x===.25?1.2:1);const total=weights.reduce((a,b)=>a+b,0);let r=Math.random()*total;let selected=choices[choices.length-1];for(let i=0;i<choices.length;i++){r-=weights[i];if(r<=0){selected=choices[i];break}}out.push(selected);remaining=Math.round((remaining-selected)*4)/4;}return out;}
// Cuanto más lejos queda una nota del pentagrama, más líneas adicionales
// exige leer. En la distribución guiada las notas extremas siguen presentes,
// pero no dominan los ejercicios de nivel 1.5/2.5/3.5.
function distanceFromStaff(note,clef){
 const position=step(note)-BOTTOM[clef];return Math.max(0,-position,position-8);
}
function guidedCandidates(basePool,opts,level,clef){
 if(opts.distribution==='uniform'||!clef)return basePool;
 const number=Number(level[0].split('.')[1]);
 if(number<3)return basePool;
 const tiers=[[],[],[]];
 for(const note of basePool){const d=distanceFromStaff(note,clef);tiers[d<=2?0:d<=5?1:2].push(note);}
 const chances=number>=6?[.68,.22,.10]:number>=5?[.76,.20,.04]:number===4?[.82,.17,.01]:[.88,.12,0];
 const roll=Math.random();let tier=roll<chances[0]?0:roll<chances[0]+chances[1]?1:2;
 if(!tiers[tier].length)tier=tiers[0].length?0:tiers[1].length?1:2;
 return tiers[tier].length?tiers[tier]:basePool;
}
function startingCandidates(pool,opts,clef,bar,index){
 if(opts.distribution==='uniform'||bar!==0||index!==0)return pool;
 const central=pool.filter(n=>distanceFromStaff(n,clef)===0);
 return central.length?central:pool;
}
function chooseNote(basePool,opts,mode,level,statGetter,lastKey,clef=null,previousNote=null){
 // La armadura y las alteraciones accidentales son dos parámetros independientes.
 // "Sin accidentales" respeta SIEMPRE los sostenidos/bemoles de la armadura.
 const sig=Number(opts.signature||0);
 const accidentals=opts.accidentals||'none';
 const alters=optionsForAccidentals(accidentals);
 const eligible=guidedCandidates(basePool,opts,level,clef);
 let samples=[];
 for(let trial=0;trial<Math.min(36,eligible.length*Math.max(1,alters.length));trial++){
  const base=eligible[Math.floor(Math.random()*eligible.length)];
  const naturalKey=alterSignature(sig,base.l);
  const a=accidentals==='none'||Math.random()<.74?naturalKey:alters[Math.floor(Math.random()*alters.length)];
  const note={...base,a};if(!physical(note))continue;
  const id=mode+':'+level[0]+':'+base.l+':'+a+':'+base.o;
  const stat=statGetter(id)||{seen:0,first:0,errors:0};
  let score=Math.random()*.85;
  if(opts.smart!==false){score+=2/Math.sqrt(1+(stat.seen||0));if(stat.seen)score+=Math.min(2,(stat.errors||0)/(stat.seen||1))*1.5;}
  if(opts.distribution!=='uniform'&&previousNote){
   const leap=Math.abs(step(note)-step(previousNote));
   if(leap<=4)score+=.9;else if(leap>8)score-=Math.min(2,(leap-8)*.2);
  }
  if(lastKey===id)score-=6;
  samples.push({note,id,score});
 }
 if(!samples.length){
  const base=basePool.find(b=>physical({...b,a:alterSignature(sig,b.l)}));
  if(!base)return null;
  const note={...base,a:alterSignature(sig,base.l)};
  return{note,id:mode+':'+level[0]+':'+note.l+':'+note.a+':'+note.o};
 }
 samples.sort((a,b)=>b.score-a.score);return samples[0];
}
function octaveMark(note,mode,level,clef){
 const k=Number(level[0].split('.')[1]);
 if(mode==='treble'&&k===6&&step(note)>=step(parseRequired('Si6'))){if(fmt(note)==='Si6'&&Math.random()<.5)return null;return '8va';}
 if(mode==='bass'&&k===6&&step(note)<=step(parseRequired('Mi1'))){if((fmt(note)==='Mi1'||fmt(note)==='Re1')&&Math.random()<.5)return null;return '8vb';}
 if(mode==='hands'&&k>=4&&ledger(note,clef)>3)return step(note)>BOTTOM[clef]+8?'8va':'8vb';
 return null;
}
function makeSheet(mode,level,opts,statGetter){
 const hands=mode==='hands',clefs=hands?['treble',opts.lowerClef||'bass']:[mode];
 let lastKey=null;const previousNotes=clefs.map(()=>null),events=[],measures=3;
 const pools=clefs.map(clef=>candidatesForClef(hands?clef:mode,level));
 for(let bar=0;bar<measures;bar++){
  const durations=partitionBar(hands&&opts.handStyle==='basic');let beat=0;
  for(let i=0;i<durations.length;i++){
   const duration=durations[i],notes=[];
   if(hands){
    const type=Math.floor(Math.random()*3);for(let staff=0;staff<2;staff++){if(type===0&&staff===1||type===1&&staff===0)continue;
      const got=chooseNote(startingCandidates(pools[staff],opts,clefs[staff],bar,i),opts,mode+':'+staff,level,statGetter,lastKey,clefs[staff],previousNotes[staff]);if(!got)continue;
      notes.push({staff,note:got.note,mark:octaveMark(got.note,mode,level,clefs[staff]),key:got.id});lastKey=got.id;previousNotes[staff]=got.note;
    }
   }else if(!(Math.random()<.19&&i>0)){
    const got=chooseNote(startingCandidates(pools[0],opts,clefs[0],bar,i),opts,mode,level,statGetter,lastKey,clefs[0],previousNotes[0]);
    if(got){notes.push({staff:0,note:got.note,mark:octaveMark(got.note,mode,level,clefs[0]),key:got.id});lastKey=got.id;previousNotes[0]=got.note;}
   }
   // En un piano físico no se puede pulsar dos veces la misma tecla a la vez.
   if(hands&&notes.length===2&&midi(notes[0].note)===midi(notes[1].note)){
    for(let t=0;t<30&&midi(notes[0].note)===midi(notes[1].note);t++){
     const alt=chooseNote(startingCandidates(pools[1],opts,clefs[1],bar,i),opts,mode+':1',level,statGetter,null,clefs[1],previousNotes[1]);
     if(alt){notes[1]={staff:1,note:alt.note,mark:octaveMark(alt.note,mode,level,clefs[1]),key:alt.id};previousNotes[1]=alt.note;}
    }
    if(midi(notes[0].note)===midi(notes[1].note))notes.pop();
   }
   // Los silencios se generan como eventos sin notas y se saltan automáticamente.
   if(hands&&notes.length===0){const got=chooseNote(startingCandidates(pools[0],opts,clefs[0],bar,i),opts,mode+':0',level,statGetter,lastKey,clefs[0],previousNotes[0]);if(got){notes.push({staff:0,note:got.note,mark:null,key:got.id});previousNotes[0]=got.note;}}
   events.push({bar,beat,duration,notes,id:`${bar}:${beat}`,state:'pending'});beat=Math.round((beat+duration)*4)/4;
  }
 }
 // Una partitura no puede empezar ni terminar como puro silencio.
 if(!events[0].notes.length){const n=chooseNote(pools[0],opts,mode,level,statGetter,null,clefs[0],previousNotes[0]);if(n)events[0].notes=[{staff:0,note:n.note,mark:null,key:n.id}];}
 const signature=Number(opts.signature||0);
 return{mode,level,clefs,signature,events};
}
function chordPreset(levelId){
 const number=Number(levelId.split('.')[1]);
 const groups={1:['maj'],2:['maj','min'],3:['maj','min'],4:['maj','min'],5:['7','m7','maj7','mMaj7'],6:['7','m7','maj7','mMaj7'],7:['aug','dim'],8:['sus2','sus4'],9:FAMILIES.map(f=>f.id)};
 return{families:groups[number]||groups[9],inversions:number===3?[1]:number===4?[2]:number===6?[0,1,2,3]:number===9?[0,1,2,3]:[0]};
}
function chordTones(root,family,octave=4){
 const start={l:root.l,a:root.a,o:octave},base=midi(start),s=step(start);
 return family.intervals.map((interval,index)=>{const diat=s+family.degrees[index],l=mod(diat,7),o=Math.floor(diat/7),a=base+interval-(12*(o+1)+NATURAL[l]);return{l,o,a};});
}
function rotateInversion(notes,i){const lower=notes.slice(i),raised=notes.slice(0,i).map(n=>({...n,o:n.o+1}));return lower.concat(raised).map(n=>({...n}));}
function chordName(root,family,inversion){return root.symbol+family.suffix+(inversion?` · ${['','1.ª','2.ª','3.ª'][inversion]} inversión`:' · posición fundamental');}
function makeChord(level,opts,statGetter,lastKey){
 const preset=chordPreset(level[0]);
 const roots=ROOTS.filter(root=>(opts.roots||ROOTS.map(r=>r.symbol)).includes(root.symbol));
 const families=FAMILIES.filter(f=>(opts.families||preset.families).includes(f.id));
 const choices=[];
 for(const root of roots)for(const family of families){
  const basic=chordTones(root,family);if(basic.some(n=>Math.abs(n.a)>2))continue;
  for(const inversion of preset.inversions.filter(i=>i<basic.length)){
   const id=`chords:${root.symbol}:${family.id}:${inversion}`;
   const r=statGetter(id)||{seen:0,errors:0};let score=Math.random();
   if(opts.smart!==false){score+=2/Math.sqrt(1+(r.seen||0));if(r.seen)score+=Math.min(2,(r.errors||0)/r.seen);}
   if(id===lastKey)score-=8;
   choices.push({id,root,family,inversion,notes:rotateInversion(basic,inversion),score});
  }
 }
 choices.sort((a,b)=>b.score-a.score);
 return choices[0]||null;
}
function fromMidiSpelling(m,target){for(let o=0;o<=8;o++){const note={...target,o};if(midi(note)===m)return note;}return null;}
function compareChordInput(input,challenge,enharmonic=false){
 const words=String(input||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean),target=challenge.notes;
 if(words.length!==target.length)return{ok:false,error:`Este acorde necesita ${target.length} notas, de grave a aguda.`};
 const notes=words.map(word=>parseNote(word));if(notes.some(n=>!n))return{ok:false,error:'Introduce notas separadas por comas: Do, Mi, Sol. Las octavas son opcionales.'};
 const same=notes.every((note,index)=>noteEq(note,target[index],enharmonic));
 if(!same)return{ok:false,error:'Revisa las notas y su orden según la inversión solicitada.'};
 // Si se indica octava, es necesario que todas las notas explícitas estén en orden ascendente.
 const explicit=notes.filter(n=>n.o!==null);if(explicit.length>1&&explicit.some((n,i)=>i>0&&midi(n)<=midi(explicit[i-1])))return{ok:false,error:'Las octavas indicadas deben estar de grave a aguda.'};
 const rendered=target.map((n,i)=>({...n,o:notes[i].o===null?n.o:notes[i].o}));return{ok:true,notes:rendered};
}
function compareChordMidi(midiNumbers,challenge){
 const actual=[...new Set(midiNumbers)].sort((a,b)=>a-b),expected=challenge.notes;
 if(actual.length!==expected.length)return{ok:false};
 const match=actual.every((m,i)=>mod(m,12)===pc(expected[i]));
 return{ok:match,notes:match?actual.map((m,i)=>fromMidiSpelling(m,expected[i])):null};
}
function soundingName(m){const names=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','Sol♯','La','Si♭','Si'];return names[mod(m,12)]+(Math.floor(m/12)-1);}
function checkIntegrity(){const missing=[];for(const root of ROOTS)for(const family of FAMILIES){const notes=chordTones(root,family);if(notes.some(n=>Math.abs(n.a)>2))missing.push(root.symbol+family.suffix)}return missing;}
return{LETTERS,ENGLISH,NATURAL,ACC,MODES,ROOTS,FAMILIES,BOTTOM,SIGNATURE_ORDER,mod,step,midi,pc,physical,fmt,english,parseNote,parseRequired,spellingEq,noteEq,rangeToPositions,ledger,distanceFromStaff,candidatesForClef,alterSignature,optionsForAccidentals,partitionBar,durationName,chooseNote,octaveMark,makeSheet,chordPreset,chordTones,rotateInversion,chordName,makeChord,compareChordInput,compareChordMidi,fromMidiSpelling,soundingName,checkIntegrity};
});
