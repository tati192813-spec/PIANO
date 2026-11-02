/* Clara · interfaz, progresión, evaluación y dispositivos. Sin frameworks. */
(()=>{'use strict';
const M=window.ClaraMusic,N=window.ClaraNotation,$=id=>document.getElementById(id),q=(sel,base=document)=>base.querySelector(sel),qa=(sel,base=document)=>[...base.querySelectorAll(sel)];
const STORAGE='claraTrainingV3';
const DEFAULTS={
 treble:{level:'1.1',method:'text',accidentals:'none',signature:'0',distribution:'guided',strict:true,smart:true,help:true,sound:true,limit:'0',custom:30,masteryTarget:90,masterySample:30},
 bass:{level:'2.1',method:'text',accidentals:'none',signature:'0',distribution:'guided',strict:true,smart:true,help:true,sound:true,limit:'0',custom:30,masteryTarget:90,masterySample:30},
 hands:{level:'3.1',method:'midi',accidentals:'none',signature:'0',distribution:'guided',lowerClef:'bass',handStyle:'basic',tolerance:260,smart:true,help:true,sound:false,limit:'0',custom:30,masteryTarget:90,masterySample:30},
 chords:{level:'4.1',method:'text',strict:true,hand:'right',roots:M.ROOTS.map(r=>r.symbol),families:['maj'],smart:true,help:true,sound:true,limit:'0',custom:30,masteryTarget:90,masterySample:30}
};
const clone=obj=>JSON.parse(JSON.stringify(obj));
const getStore=()=>{try{return JSON.parse(localStorage.getItem(STORAGE))}catch{return null}};
let store=getStore();if(!store||store.version!==3||!store.records)store={version:3,prefs:clone(DEFAULTS),records:{},sessions:[],legacyV2:null};
for(const mode of Object.keys(DEFAULTS))store.prefs[mode]={...clone(DEFAULTS[mode]),...(store.prefs?.[mode]||{})};
try{if(!store.legacyV2){const old=JSON.parse(localStorage.getItem('claraReadingV2')||'null');if(old?.version===2)store.legacyV2={records:old.records||{},sessions:old.sessions||[],settings:old.settings||{}}}}catch{}
const S={screen:'home',mode:'treble',sheet:null,chord:null,cursor:0,session:null,attempted:false,errorsThisEvent:0,hintsThisEvent:0,selected:new Set(),midiAccess:null,midiInputs:[],midiHeld:new Set(),midiPending:new Set(),midiTimer:null,awaitRelease:false,advance:null,clockStamp:null,paused:false,lastExerciseKey:null,chosenMidi:null,ended:false,pendingAdvance:false,audio:null};
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(store))}catch{}}
const pref=()=>store.prefs[S.mode];
const level=()=>M.MODES[S.mode].levels.find(x=>x[0]===pref().level)||M.MODES[S.mode].levels[0];
function el(tag,attrs={},text){const e=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(key==='class')e.className=value;else if(key==='value')e.value=value;else if(key==='type')e.type=value;else if(key==='checked')e.checked=!!value;else e.setAttribute(key,value);}if(text!==undefined)e.textContent=text;return e;}
function targetLimit(){const p=pref();return p.limit==='custom'?Math.max(1,Math.min(1000,Number(p.custom)||30)):Number(p.limit)||0;}
function screen(name){
 if(S.screen==='practice'&&name!=='practice'){stopClock();if(S.pendingAdvance){clearTimeout(S.advance);S.advance=null;}}
 S.screen=name;qa('.screen').forEach(e=>e.classList.toggle('hidden',e.id!==`screen-${name}`));
 qa('.nav-link').forEach(e=>e.classList.toggle('active',e.dataset.go===(name==='setup'||name==='practice'?'home':name)));
 if(name==='pdf'&&window.ClaraPDF)window.ClaraPDF.onShow();if(name==='home')renderHome();if(name==='stats')renderStats();if(name==='guide')$('return-practice').classList.toggle('hidden',!S.session);if(name==='practice'&&!S.paused){startClock();if(S.session){if(S.pendingAdvance){S.pendingAdvance=false;if(S.session.limit&&S.session.completed+S.session.skipped>=S.session.limit){finishSession(true);}else{if(S.mode!=='chords')S.cursor++;nextExercise();}}else renderPractice();}}
 window.scrollTo({top:0,behavior:'instant'});
}
function modeSelect(mode){if(S.session)finishSession(false);S.mode=mode;renderSetup();screen('setup');}
function renderHome(){for(const m of Object.keys(M.MODES))$('last-'+m).textContent='Nivel '+store.prefs[m].level;$('resume-home').classList.toggle('hidden',!S.session);}
function selectField(id,label,options,value,onChange){const wrap=el('div',{class:'setting-row'}),lab=el('label',{for:id},label),select=el('select',{id});for(const o of options){const opt=el('option',{value:String(o[0])},o[1]);select.append(opt)}select.value=String(value);select.addEventListener('change',()=>onChange(select.value));wrap.append(lab,select);return wrap;}
function boolField(id,label,value,onChange){const wrap=el('div',{class:'setting-row switch-setting'}),lab=el('label',{for:id},label),input=el('input',{type:'checkbox',id,checked:value});input.addEventListener('change',()=>onChange(input.checked));wrap.append(lab,input);return wrap;}
function setOption(key,value){pref()[key]=value;save();}
const ACC_OPTS=[['none','Ninguna'],['simple','Simples: ♯ ♭ ♮'],['double','Dobles: 𝄪 𝄫 y ♮'],['all','Todas']];
const DISTRIBUTIONS=[['guided','Progresiva (recomendada)'],['uniform','Uniforme (reto)']];
const METHODS=[['text','Escribir notas'],['virtual','Piano virtual'],['midi','Piano MIDI']];
const SIGS=[['0','Sin armadura'],['1','1 ♯ · Sol mayor'],['2','2 ♯ · Re mayor'],['3','3 ♯ · La mayor'],['4','4 ♯ · Mi mayor'],['5','5 ♯ · Si mayor'],['6','6 ♯ · Fa♯ mayor'],['7','7 ♯ · Do♯ mayor'],['-1','1 ♭ · Fa mayor'],['-2','2 ♭ · Si♭ mayor'],['-3','3 ♭ · Mi♭ mayor'],['-4','4 ♭ · La♭ mayor'],['-5','5 ♭ · Re♭ mayor'],['-6','6 ♭ · Sol♭ mayor'],['-7','7 ♭ · Do♭ mayor']];
function settingsFields(){
 const area=$('settings-fields'),p=pref();area.replaceChildren();
 if(S.mode==='treble'||S.mode==='bass'){
  area.append(selectField('method','Responder con',METHODS,p.method,v=>{setOption('method',v);settingsFields();}));
  area.append(selectField('signature','Armadura (independiente)',SIGS,p.signature,v=>setOption('signature',v)));
  area.append(selectField('accidentals','Alteraciones accidentales',ACC_OPTS,p.accidentals,v=>setOption('accidentals',v)));
  area.append(selectField('distribution','Distribución de notas',DISTRIBUTIONS,p.distribution||'guided',v=>setOption('distribution',v)));
  if(p.method==='text')area.append(boolField('strict','Exigir escritura exacta (sin enarmonías)',p.strict,v=>setOption('strict',v)));
 }
 if(S.mode==='hands'){
  area.append(selectField('hand-style','Modalidad',[['basic','Coordinación básica · negras'],['normal','Lectura normal · figuras variadas']],p.handStyle,v=>setOption('handStyle',v)));
  area.append(selectField('lower-clef','Clave del pentagrama inferior',[['bass','Clave de fa'],['treble','Clave de sol']],p.lowerClef,v=>setOption('lowerClef',v)));
  area.append(selectField('signature','Armadura (independiente)',SIGS,p.signature,v=>setOption('signature',v)));
  area.append(selectField('accidentals','Alteraciones accidentales',ACC_OPTS,p.accidentals,v=>setOption('accidentals',v)));
  area.append(selectField('distribution','Distribución de notas',DISTRIBUTIONS,p.distribution||'guided',v=>setOption('distribution',v)));
  area.append(selectField('tolerance','Ventana de simultaneidad',[['160','160 ms'],['220','220 ms'],['260','260 ms (recomendada)'],['350','350 ms'],['500','500 ms']],p.tolerance,v=>setOption('tolerance',Number(v))));
  area.append(el('p',{class:'tip'},'Este modo exige un teclado MIDI. Se comprueban las alturas y el orden de los eventos, no el tempo.'));
 }
 if(S.mode==='chords'){
  area.append(selectField('method','Responder con',METHODS,p.method,v=>{setOption('method',v);settingsFields();}));
  if(p.method==='midi')area.append(selectField('hand','Mano de práctica',[['right','Derecha'],['left','Izquierda']],p.hand,v=>setOption('hand',v)));
  if(p.method==='text')area.append(boolField('strict','Exigir nombres exactos (sin enarmonías)',p.strict,v=>setOption('strict',v)));
  area.append(checklist('Tónicas',M.ROOTS.map(r=>[r.symbol,r.symbol]),p.roots,arr=>{setOption('roots',arr);updateSetupWarning();},'roots'));
  area.append(checklist('Familias de acordes',M.FAMILIES.map(f=>[f.id,f.name]),p.families,arr=>{setOption('families',arr);updateSetupWarning();},'families'));
 }
 if(S.mode!=='hands')area.append(boolField('sound','Escuchar las notas al acertar',p.sound!==false,v=>setOption('sound',v)));
 area.append(selectField('mastery-target','Objetivo de precisión',[['80','80 %'],['85','85 %'],['90','90 %'],['95','95 %']],p.masteryTarget||90,v=>setOption('masteryTarget',Number(v))));
 area.append(selectField('mastery-sample','Intentos antes de recomendar subir',[['20','20 intentos'],['30','30 intentos'],['50','50 intentos']],p.masterySample||30,v=>setOption('masterySample',Number(v))));
}
function checklist(title,items,selected,onChange,name){
 const group=el('div',{class:'setting-group'}),head=el('div',{class:'setting-group-heading'}),grid=el('div',{class:'check-options'});head.append(el('span',{},title));const all=el('button',{type:'button',class:'mini-link'},'Seleccionar todas');head.append(all);
 const update=()=>onChange(qa('input:checked',grid).map(i=>i.value));
 for(const [value,label] of items){const lab=el('label');const inp=el('input',{type:'checkbox',value,checked:selected.includes(value)});inp.addEventListener('change',update);lab.append(inp,el('span',{},label));grid.append(lab)}
 all.addEventListener('click',()=>{qa('input',grid).forEach(i=>i.checked=true);update();});group.append(head,grid);return group;
}
function renderSetup(){const def=M.MODES[S.mode],p=pref();$('setup-heading').textContent=def.title;$('setup-intro').textContent=def.caption;$('setup-tag').textContent=(S.mode==='chords'?'ARMONÍA':S.mode==='hands'?'COORDINACIÓN':'LECTURA')+' / CONFIGURACIÓN';$('level-count').textContent=def.levels.length+' niveles';
 const grid=$('levels');grid.replaceChildren();for(const item of def.levels){const selected=p.level===item[0];const tile=el('button',{type:'button',class:'level-tile'+(selected?' selected':'')});tile.append(el('strong',{},'Nivel '+item[0]),el('span',{class:'level-range'},S.mode==='treble'||S.mode==='bass'?item[1]+' – '+item[2]:(S.mode==='hands'?(Number(item[1])===99?'88 teclas':'Máximo '+item[1]+' líneas adicionales'):'Progresión armónica')),el('span',{class:'level-desc'},item[3]));tile.addEventListener('click',()=>{p.level=item[0];if(S.mode==='chords')p.families=M.chordPreset(p.level).families.slice();save();renderSetup();});grid.append(tile)}
 const k=Number(p.level.split('.')[1]);$('level-explanation').textContent=S.mode==='treble'||S.mode==='bass'?'Los límites son inclusivos. En distribución progresiva practicarás sobre todo notas cercanas al pentagrama; las más extremas aparecerán ocasionalmente en niveles altos.':S.mode==='hands'?'La restricción de líneas adicionales se aplica por separado a cada pentagrama.':'Progresión orientativa; puedes seleccionar manualmente qué tónicas y familias deseas repasar.';
 settingsFields();$('session-limit').value=String(p.limit);$('custom-limit').value=p.custom;$('custom-limit-wrap').classList.toggle('hidden',p.limit!=='custom');$('context-help').checked=p.help;$('smart-repetition').checked=p.smart;$('setup-summary').textContent='Nivel '+p.level+' · '+(p.limit==='0'?'Práctica libre':(targetLimit()+' ejercicios'));
 updateSetupWarning();
}
function updateSetupWarning(){const warning=$('setup-warning');warning.textContent='';if(S.mode==='chords'&&(!pref().roots.length||!pref().families.length))warning.textContent='Elige al menos una tónica y una familia.';}
function sessionElapsed(){if(!S.session)return 0;return S.session.elapsedMs+(S.clockStamp!==null&&S.screen==='practice'&&!S.paused?Date.now()-S.clockStamp:0);}
function startClock(){if(S.session&&!S.paused&&S.clockStamp===null)S.clockStamp=Date.now();}
function stopClock(){if(S.session&&S.clockStamp!==null){S.session.elapsedMs+=Date.now()-S.clockStamp;S.clockStamp=null;}}
function timeString(ms){const sec=Math.round(ms/1000);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function createSession(){return{id:'s-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),date:new Date().toISOString(),mode:S.mode,level:pref().level,limit:targetLimit(),attempts:0,first:0,completed:0,skipped:0,errors:0,hints:0,elapsedMs:0};}
function isMidiReady(){return !!(S.midiAccess&&S.midiInputs.some(i=>i.state==='connected'));}
async function startSession(){if(S.session)finishSession(false);if(S.mode==='chords'&&(!pref().roots.length||!pref().families.length)){updateSetupWarning();return;}
 if(S.mode==='hands'&&!isMidiReady()){
  $('setup-warning').textContent='Comprobando teclado MIDI…';const ok=await connectMidi();if(!ok){$('setup-warning').textContent='Conecta un teclado MIDI compatible para iniciar «Dos manos». También puedes cambiar de modo.';return;}
 }
 S.session=createSession();S.paused=false;S.ended=false;S.chord=null;S.sheet=null;S.cursor=0;S.lastExerciseKey=null;clearTimers();nextExercise(true);screen('practice');renderSession();}
function clearTimers(){clearTimeout(S.advance);clearTimeout(S.midiTimer);S.advance=null;S.midiTimer=null;S.midiPending.clear();S.selected.clear();S.awaitRelease=S.midiHeld.size>0;}
function getStat(key){return store.records[key];}
function currentEvent(){return S.mode==='chords'?S.chord:S.sheet?.events[S.cursor];}
function advanceRests(){if(!S.sheet)return;while(S.cursor<S.sheet.events.length&&!S.sheet.events[S.cursor].notes.length){S.sheet.events[S.cursor].state='done';S.cursor++;}}
function nextExercise(startNewPage=false){clearTimers();S.pendingAdvance=false;S.attempted=false;S.errorsThisEvent=0;S.hintsThisEvent=0;
 if(S.mode==='chords'){
  const previous=S.chord?.id||S.lastExerciseKey;S.chord=M.makeChord(level(),pref(),getStat,previous);
  if(!S.chord){feedback('No hay acordes compatibles con los filtros seleccionados.','wrong');return;}
  S.lastExerciseKey=S.chord.id;S.chord.stage=1;S.chord.displayNotes=null;
 }else{
  if(startNewPage||!S.sheet||S.cursor>=S.sheet.events.length){S.sheet=M.makeSheet(S.mode,level(),pref(),getStat);S.cursor=0;}advanceRests();
  if(S.cursor>=S.sheet.events.length){S.sheet=null;nextExercise(true);return;}
 }
 $('answer-input').value='';$('answer-input').classList.remove('invalid');$('solution-strip').classList.add('hidden');feedback('');renderPractice();renderSession();}
function titleExercise(){return S.mode==='chords'?M.chordName(S.chord.root,S.chord.family,S.chord.inversion):S.mode==='hands'?'Lee y toca el siguiente evento':'Lee la siguiente nota';}
function renderPractice(){
 const p=pref(),lvl=level(),chord=S.mode==='chords';$('practice-label').textContent=M.MODES[S.mode].title.toUpperCase()+' / NIVEL '+p.level;$('practice-heading').textContent=titleExercise();$('practice-explain').textContent=S.mode==='hands'?'Toca las notas señaladas juntas o por separado. Sin obligación de tempo.':chord?'Primero construye el acorde. Después volverás a tocarlo tras ver la partitura.':'Reconoce la altura y su octava. Las figuras no imponen un tempo.';
 $('answer-input').classList.remove('invalid');$('text-answer').classList.toggle('hidden',p.method!=='text'||S.mode==='hands');$('virtual-answer').classList.toggle('hidden',p.method!=='virtual'||S.mode==='hands');$('midi-answer').classList.toggle('hidden',p.method!=='midi'&&S.mode!=='hands');$('keyboard-check').classList.toggle('hidden',!chord);$('keyboard-clear').classList.toggle('hidden',!chord);
 $('hint-button').textContent='Ver pista';$('sheet-title').textContent=chord?'Construcción armónica':(S.mode==='hands'?'Gran pentagrama · 4/4':'Partitura · 4/4');$('sheet-caption').textContent=chord?'Observa la disposición de las notas. Repite el acorde para pasar al siguiente.':'La nota actual se resalta en violeta, sin tapar las líneas del pentagrama. No hay exigencia de tempo.';
 $('chord-prompt').classList.toggle('hidden',!chord);$('score-scroll').classList.toggle('hidden',chord&&S.chord.stage===1);
 if(chord){const c=S.chord,title=c.root.symbol+c.family.suffix;const wrap=$('chord-prompt');wrap.replaceChildren();wrap.append(el('span',{class:'stage-label'},c.stage===1?'FASE 1 · CONSTRUYE EL ACORDE':'FASE 2 · REPÍTELO DESPUÉS DE VERLO'),el('div',{class:'chord-symbol-name'},title),el('p',{},c.family.name+(c.inversion?' · '+['','Primera','Segunda','Tercera'][c.inversion]+' inversión':' · Posición fundamental')+(p.method==='midi'?' · Mano '+(p.hand==='left'?'izquierda':'derecha'):'')));
  $('sheet-current').textContent='Fase '+c.stage+' de 2';
  if(c.stage===2){N.renderChord(c.displayNotes||c.notes,$('score'));$('solution-strip').classList.remove('hidden');$('solution-strip').textContent='Notas: '+(c.displayNotes||c.notes).map(M.fmt).join(' · ')+(p.method==='text'?' · Registro de referencia: Do4 si no has indicado octavas.':'');}
  $('answer-heading').textContent=c.stage===1?'Construye el acorde':'Repite el mismo acorde';$('input-hint').textContent=p.method==='text'?'Escribe las notas en orden, separadas por comas.':'Sin octava fija; respeta la inversión.';
  $('answer-input').placeholder='Ej.: Do, Mi, Sol';
  $('virtual-instruction').textContent='Selecciona las notas del acorde, de grave a aguda.';
 }else{N.render(S.sheet,S.cursor,$('score'));$('sheet-current').textContent=`Evento ${S.cursor+1} de ${S.sheet.events.length}`;$('answer-heading').textContent=S.mode==='hands'?'Toca en tu piano MIDI':'¿Qué nota aparece?';$('input-hint').textContent=S.mode==='hands'?'MIDI obligatorio':'Incluye el número de octava.';$('answer-input').placeholder='Ej.: Fa#5, Sib3, Do4';$('virtual-instruction').textContent='Pulsa la nota correcta en el piano.';}
 $('answer-secondary').textContent=p.method==='text'?(chord?'Puedes escribir «Do, Mi, Sol» o especificar octavas si lo prefieres.':'Se aceptan #, b, ##, bb y x. La octava es obligatoria.'):(S.mode==='hands'?'Libera las teclas entre eventos para evitar avances involuntarios.':'');
 $('quick-help').classList.toggle('hidden',!p.help);$('answer-input').disabled=S.paused;renderMidiStatus();drawKeyboardIfNeeded();
 if(p.method==='text'&&S.screen==='practice'&&!S.paused)setTimeout(()=>$('answer-input').focus(),50);
}
function feedback(message='',type=''){const e=$('feedback');e.textContent=message||' ';e.className='feedback'+(type?' '+type:'');}
function renderSession(){if(!S.session)return;const s=S.session,pct=s.attempts?Math.round(s.first/s.attempts*100):0;
 $('session-counter').textContent=s.limit?`Ejercicio ${s.completed+s.skipped+1} de ${s.limit}`:`Ejercicio ${s.completed+s.skipped+1}`;$('session-percentage').textContent=pct+' %';$('session-bar').style.width=(s.limit?Math.min(100,(s.completed+s.skipped)/s.limit*100):Math.min(100,(S.mode==='chords'?(s.completed%10):S.cursor/(S.sheet?.events.length||1))*100))+'%';$('aside-done').textContent=s.completed;$('aside-errors').textContent=s.errors;$('aside-time').textContent=timeString(sessionElapsed());$('aside-target').textContent=s.limit?`Objetivo: ${s.limit} ejercicios`:'Práctica libre · sin límite';
 const records=Object.values(store.records).filter(r=>r.mode===S.mode&&r.level===pref().level),n=records.reduce((a,b)=>a+b.seen,0),first=records.reduce((a,b)=>a+b.first,0);const sample=pref().masterySample||30,target=pref().masteryTarget||90,unique=records.filter(r=>r.seen>0).length,requiredUnique=Math.min(20,S.mode==='chords'?Math.min(20,pref().roots.length*2):S.mode==='hands'?12:(pref().distribution!=='uniform'&&Number(pref().level.split('.')[1])>=3?Math.min(14,Math.ceil(M.candidatesForClef(S.mode,level()).filter(n=>M.distanceFromStaff(n,S.mode)<=2).length*.75)):Math.ceil(M.rangeToPositions(level()[1],level()[2]).length*.65)));
 $('mastery-status').textContent=n>=sample&&unique>=requiredUnique?(first/n*100>=target?`Precisión ≥ ${target} % con ${unique} alturas o acordes diferentes: puedes probar el siguiente nivel.`:`Precisión ${Math.round(first/n*100)} % en ${n} intentos. Sigue reforzando este nivel.`):`Progreso: ${n}/${sample} intentos y ${unique}/${requiredUnique} alturas o acordes distintos. Objetivo: ${target} % al primer intento.`;
}
function statForKey(key,label){return store.records[key]||(store.records[key]={mode:S.mode,level:pref().level,label,seen:0,first:0,completed:0,errors:0,hints:0,latencyMs:0});}
function eventKeys(){const e=currentEvent();return S.mode==='chords'?[{key:e.id,label:M.chordName(e.root,e.family,e.inversion)}]:e.notes.map(it=>({key:it.key,label:M.fmt(it.note)+' · '+(it.staff===0?S.mode==='bass'?'Fa':'Sol':'Fa/mano inferior')}));}
function trackFirstSubmission(){if(!S.session||S.attempted)return;S.attempted=true;S.session.attempts++;
 for(const {key,label} of eventKeys())statForKey(key,label).seen++;
 save();}
function countMistake(reason){if(!S.session)return;trackFirstSubmission();S.errorsThisEvent++;S.session.errors++;for(const {key,label} of eventKeys())statForKey(key,label).errors++;$('answer-input').classList.add('invalid');feedback(reason,'wrong');renderSession();save();}
function playSound(notes){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 if(!S.audio)S.audio=new Audio();const ctx=S.audio;ctx.resume();const now=ctx.currentTime+.01;
 for(const n of notes){const m=M.midi(n);if(m<21||m>108)continue;const freq=440*Math.pow(2,(m-69)/12),osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.min(.09,.2/notes.length),now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+.54);osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.57);}
 }catch{}}
function correctResponse(playedNotes=null){if(!S.session||S.paused)return;trackFirstSubmission();const evt=currentEvent();
 if(S.mode==='chords'&&evt.stage===1){evt.stage=2;evt.displayNotes=playedNotes||evt.notes;S.selected.clear();paintKeyboard();$('answer-input').value='';$('answer-input').classList.remove('invalid');renderPractice();feedback('¡Bien! Observa el acorde escrito y vuelve a interpretarlo.','good');return;}
 const rightFirst=S.errorsThisEvent===0&&S.hintsThisEvent===0;
 if(rightFirst)S.session.first++;
 for(const {key,label} of eventKeys()){const r=statForKey(key,label);r.completed++;if(rightFirst)r.first++;}
 S.session.completed++;
 if(pref().sound!==false&&pref().method!=='midi'&&S.mode!=='hands')playSound(S.mode==='chords'?(playedNotes||evt.notes):evt.notes.map(it=>it.note));
 if(S.mode!=='chords')evt.state='done';
 feedback('¡Correcto! '+(S.mode==='chords'?'Acorde completado.':evt.notes.map(it=>M.fmt(it.note)).join(' + ')+'.'),'good');renderSession();save();
 if(S.mode!=='chords')N.render(S.sheet,S.cursor,$('score'));
 S.pendingAdvance=true;S.advance=setTimeout(()=>{if(S.paused||S.screen!=='practice')return;S.advance=null;S.pendingAdvance=false;if(S.session.limit&&S.session.completed+S.session.skipped>=S.session.limit){finishSession(true);return;}
 if(S.mode!=='chords')S.cursor++;nextExercise();},670);
}
function submitText(){if(S.paused||!S.session||S.advance)return;const value=$('answer-input').value.trim(),p=pref();if(!value){feedback('Escribe una respuesta antes de comprobar.','wrong');return;}
 if(S.mode==='chords'){const result=M.compareChordInput(value,S.chord,!p.strict);if(result.ok)correctResponse(result.notes);else countMistake(result.error);}
 else{const answer=M.parseRequired(value);if(!answer){feedback('Escribe una nota válida y su octava, por ejemplo Sib3 o Fa#5.','wrong');return;}
 const target=currentEvent().notes[0].note,ok=M.noteEq(answer,target,!p.strict);if(ok)correctResponse();else countMistake('No es correcto. La nota es '+M.fmt(target)+'. Vuelve a intentarlo.');}
}
function checkMidiNotes(values){if(S.paused||!S.session||S.advance)return;const got=[...values];if(S.mode==='chords'){
  const answer=M.compareChordMidi(got,S.chord);if(answer.ok)correctResponse(answer.notes);else countMistake(S.chord.stage===1?'Ese acorde o inversión no es correcto. Vuelve a intentarlo.':'La repetición no coincide. Inténtalo otra vez.');
 }else if(S.mode==='hands'){const expected=currentEvent().notes.map(it=>M.midi(it.note)).sort((a,b)=>a-b),actual=got.slice().sort((a,b)=>a-b);if(expected.length===actual.length&&expected.every((n,i)=>n===actual[i]))correctResponse();else countMistake('No coinciden todas las notas. Esperadas: '+currentEvent().notes.map(it=>M.fmt(it.note)).join(' + ')+'.');
 }else{if(got.length===1&&got[0]===M.midi(currentEvent().notes[0].note))correctResponse();else countMistake('La nota correcta es '+M.fmt(currentEvent().notes[0].note)+'. Vuelve a tocarla.');}
}
function submitKeyboard(){if(!S.selected.size){feedback('Selecciona las teclas del acorde antes de comprobar.','wrong');return;}checkMidiNotes(S.selected);S.selected.clear();paintKeyboard();}
function showHint(){if(!S.session||S.advance)return;S.hintsThisEvent++;S.session.hints++;for(const {key,label} of eventKeys())statForKey(key,label).hints++;
 if(S.mode==='chords'){const c=S.chord;const text=S.hintsThisEvent===1?'Pista: empieza por '+M.fmt(c.notes[0],false)+'; '+c.family.name.toLowerCase()+'.':'Notas esperadas: '+c.notes.map(n=>M.fmt(n,false)).join(' · ');feedback(text,'wrong');}
 else feedback('La respuesta es '+currentEvent().notes.map(it=>M.fmt(it.note)).join(' + ')+'. Inténtalo otra vez.','wrong');
 renderSession();save();}
function skip(){if(!S.session||S.paused||S.advance)return;const event=currentEvent();S.session.skipped++;if(S.mode!=='chords')event.state='done';if(S.session.limit&&S.session.completed+S.session.skipped>=S.session.limit){finishSession(true);return;}if(S.mode!=='chords')S.cursor++;nextExercise();}
function pause(){if(!S.session||S.ended)return;if(!S.paused){stopClock();S.paused=true;clearTimeout(S.advance);S.advance=null;showOverlay('Sesión en pausa','Tu progreso se conserva. Cuando reanudes podrás continuar con el mismo ejercicio.','Reanudar','Terminar sesión',()=>resume(),()=>finishSession(false));}
 else resume();}
function resume(){S.paused=false;hideOverlay();startClock();if(S.pendingAdvance){S.pendingAdvance=false;if(S.session.limit&&S.session.completed+S.session.skipped>=S.session.limit){finishSession(true);return;}if(S.mode!=='chords')S.cursor++;nextExercise();}else renderPractice();}
function showOverlay(title,desc,primary,secondary,fn1,fn2){$('overlay-heading').textContent=title;$('overlay-description').textContent=desc;const btn=$('overlay-primary'),other=$('overlay-secondary');btn.textContent=primary;btn.onclick=fn1;other.textContent=secondary||'';other.onclick=fn2||null;other.classList.toggle('hidden',!secondary);$('practice-overlay').classList.remove('hidden');}
function hideOverlay(){$('practice-overlay').classList.add('hidden');}
function finishSession(showSummary=true){if(!S.session)return;stopClock();clearTimers();S.pendingAdvance=false;const s=clone(S.session);s.finished=new Date().toISOString();if(s.attempts||s.completed||s.skipped){store.sessions.unshift(s);store.sessions=store.sessions.slice(0,300);}S.session=null;S.paused=false;S.ended=true;save();
 const percent=s.attempts?Math.round(s.first/s.attempts*100):0;
 if(showSummary){showOverlay('Sesión completada',`${s.completed} ejercicios correctos · ${s.skipped} saltados · ${s.errors} errores · ${percent} % al primer intento · ${timeString(s.elapsedMs)} de práctica.`, 'Volver al inicio','Repetir este nivel',()=>{hideOverlay();screen('home');},()=>{hideOverlay();renderSetup();screen('setup');});}
 else{hideOverlay();renderSetup();screen('setup');}
}
function paintKeyboard(){qa('#keyboard button').forEach(b=>{b.classList.toggle('selected',S.selected.has(Number(b.dataset.midi)));b.classList.remove('wrong')});}
let keyboardBuilt=false;
function buildKeyboard(){if(keyboardBuilt)return;keyboardBuilt=true;const container=$('keyboard');const white=[];for(let m=21;m<=108;m++)if(![1,3,6,8,10].includes(m%12))white.push(m);
 const W=31;container.style.width=white.length*W+'px';for(const [i,m] of white.entries()){const b=el('button',{type:'button',class:'piano-white'});b.style.left=i*W+'px';b.dataset.midi=m;b.title=M.soundingName(m);b.setAttribute('aria-label',b.title);b.textContent=m%12===0?'Do'+(Math.floor(m/12)-1):'';b.addEventListener('click',()=>keyboardPress(m));container.append(b);}
 for(let m=21;m<=108;m++){if(![1,3,6,8,10].includes(m%12))continue;const prev=white.filter(x=>x<m).length-1,b=el('button',{type:'button',class:'piano-black'});b.style.left=(prev*W+W-10)+'px';b.dataset.midi=m;b.title=M.soundingName(m);b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>keyboardPress(m));container.append(b);}
}
function drawKeyboardIfNeeded(){if(pref().method!=='virtual'||S.mode==='hands')return;buildKeyboard();paintKeyboard();const hint=S.mode==='chords'?60:M.midi(currentEvent().notes[0].note);const target=q(`#keyboard button[data-midi="${hint}"]`);if(target)requestAnimationFrame(()=>{$('keyboard-scroller').scrollLeft=Math.max(0,target.offsetLeft-$('keyboard-scroller').clientWidth/2);});}
function keyboardPress(m){if(S.paused||!S.session||S.advance)return;if(S.mode==='chords'){if(S.selected.has(m))S.selected.delete(m);else S.selected.add(m);paintKeyboard();}else checkMidiNotes(new Set([m]));}
async function connectMidi(){
 if(!navigator.requestMIDIAccess){renderMidiStatus('Web MIDI no está disponible en este navegador. Usa Chrome o Edge en localhost/HTTPS.');return false;}
 try{if(!S.midiAccess){S.midiAccess=await navigator.requestMIDIAccess({sysex:false});S.midiAccess.onstatechange=refreshMidiInputs;}
  refreshMidiInputs();return isMidiReady();
 }catch(e){renderMidiStatus('No fue posible acceder a MIDI: '+(e?.message||'Comprueba los permisos.'));return false;}
}
function refreshMidiInputs(){if(!S.midiAccess)return;S.midiInputs=[...S.midiAccess.inputs.values()].filter(i=>i.state==='connected');const sel=$('midi-device'),previous=S.chosenMidi;sel.replaceChildren();for(const input of S.midiInputs){sel.append(el('option',{value:input.id},input.name||'Entrada MIDI'));input.onmidimessage=ev=>processMidi(ev.data,input.id);}
 S.chosenMidi=S.midiInputs.some(i=>i.id===previous)?previous:S.midiInputs[0]?.id||null;if(S.chosenMidi)sel.value=S.chosenMidi;renderMidiStatus();}
function renderMidiStatus(err){const connected=isMidiReady();$('midi-indicator').innerHTML='<span class="led'+(connected?' connected':'')+'"></span> '+(connected?'MIDI conectado':'MIDI sin conectar');$('midi-status').textContent=err||(!connected?'Conecta tu piano para responder.':S.midiInputs.length+' dispositivo(s) MIDI disponible(s).');$('midi-select-wrap').classList.toggle('hidden',!connected);if(window.ClaraPDF)window.ClaraPDF.midiStatus(connected,err);$('midi-last').textContent=connected?'Libera las teclas antes de repetir o pasar al siguiente evento.':'Web MIDI suele requerir Chrome/Edge y un contexto seguro (HTTPS o localhost).';}
function processMidi(data,device){const [status,note,velocity]=data||[];if(S.chosenMidi&&device!==S.chosenMidi)return;const kind=status&0xF0;
 if(kind===0x80||(kind===0x90&&velocity===0)){S.midiHeld.delete(note);if(!S.midiHeld.size)S.awaitRelease=false;return;}
 if(kind!==0x90||!velocity||S.midiHeld.has(note))return;S.midiHeld.add(note);
 if(S.screen==='pdf'&&window.ClaraPDF){window.ClaraPDF.receiveMidi(note);return;}
 if(S.screen!=='practice'||S.paused||!S.session||pref().method!=='midi'&&S.mode!=='hands'||S.advance||S.awaitRelease)return;
 $('midi-last').textContent='Pulsadas: '+[...S.midiHeld].sort((a,b)=>a-b).map(M.soundingName).join(' · ');
 if(S.mode==='treble'||S.mode==='bass'){S.awaitRelease=true;checkMidiNotes(new Set([note]));return;}
 S.midiPending.add(note);
 if(!S.midiTimer){const timeout=S.mode==='hands'?Number(pref().tolerance)||260:260;S.midiTimer=setTimeout(()=>{S.midiTimer=null;const held=new Set([...S.midiHeld].filter(m=>S.midiPending.has(m)));S.midiPending.clear();S.awaitRelease=true;checkMidiNotes(held);},timeout);}
}
function renderStats(){const rows=Object.values(store.records),tot=rows.reduce((s,r)=>s+r.seen,0),first=rows.reduce((s,r)=>s+r.first,0),correct=rows.reduce((s,r)=>s+r.completed,0),errors=rows.reduce((s,r)=>s+r.errors,0),hints=rows.reduce((s,r)=>s+(r.hints||0),0);
 $('overall-stats').replaceChildren();for(const [label,v] of [['Primeros intentos',tot],['Precisión',tot?Math.round(first/tot*100)+' %':'—'],['Resueltos',correct],['Errores',errors],['Pistas consultadas',hints]]){const box=el('div',{class:'metric'});box.append(el('span',{},label),el('strong',{},String(v)));$('overall-stats').append(box);}
 const modeBox=$('by-mode');modeBox.replaceChildren();for(const mode of Object.keys(M.MODES)){const m=rows.filter(r=>r.mode===mode||r.mode===mode+':0'||r.mode===mode+':1'),n=m.reduce((s,r)=>s+r.seen,0),f=m.reduce((s,r)=>s+r.first,0),pct=n?Math.round(f/n*100):0;modeBox.append(makeStatRow(M.MODES[mode].title,n?pct+' % al primer intento · '+n+' intentos':'Sin practicar',pct));}
 const weak=$('weak-points');weak.replaceChildren();const relevant=rows.filter(r=>r.seen>=2).sort((a,b)=>(a.first/a.seen)-(b.first/b.seen)||b.errors-a.errors).slice(0,9);if(!relevant.length)weak.append(el('p',{class:'empty'},'Cuando tengas varias respuestas, aparecerán las notas y acordes que conviene repasar.'));for(const r of relevant)weak.append(makeStatRow(r.label,`${r.first} / ${r.seen} al primer intento`,Math.round(r.first/r.seen*100)));
 const sessions=$('recent-sessions');sessions.replaceChildren();if(!store.sessions.length)sessions.append(el('p',{class:'empty'},'Todavía no hay sesiones terminadas.'));for(const s of store.sessions.slice(0,12)){const d=new Date(s.date),percent=s.attempts?Math.round(s.first/s.attempts*100):0;const previous=store.sessions.slice(store.sessions.indexOf(s)+1).find(x=>x.mode===s.mode&&x.level===s.level&&x.attempts);const diff=previous?percent-Math.round(previous.first/previous.attempts*100):null;const comparison=diff===null?'':` · ${diff>=0?'+':''}${diff} p.p. vs. sesión anterior`;sessions.append(makeStatRow(d.toLocaleDateString('es-ES')+' · '+(M.MODES[s.mode]?.title||s.mode)+' · nivel '+s.level,`${s.completed} completados · ${s.errors} errores · ${percent} %${comparison}`,percent));}
 if(store.legacyV2){const n=Object.values(store.legacyV2.records||{}).reduce((x,r)=>x+(r.seen||0),0);sessions.append(el('p',{class:'tip'},`Se ha conservado el historial antiguo de Clara V2 (${n} intentos archivados). Sus categorías no se mezclan con las nuevas estadísticas y se incluyen en la exportación.`));}
}
function makeStatRow(title,detail,pct){const wrap=el('div',{class:'stat-row'}),inner=el('div');inner.append(el('strong',{},title),el('div',{},detail));const bar=el('div',{class:'stat-bar'});bar.style.width='82px';bar.append(el('div'));bar.firstElementChild.style.width=Math.min(100,Math.max(0,pct))+'%';wrap.append(inner,bar);return wrap;}
function downloadData(){save();const blob=new Blob([JSON.stringify({...store,exported:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a',{href:url,download:'clara-respaldo-'+new Date().toISOString().slice(0,10)+'.json'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
async function importData(file){if(!file)return;try{const json=JSON.parse(await file.text());if(!json||typeof json!=='object')throw Error('Estructura inválida');if(json.version===2){if(!confirm('La copia es de Clara V2. Se conservará como historial anterior, sin mezclar las estadísticas. ¿Importar?'))return;store.legacyV2={records:json.records||{},sessions:json.sessions||[],settings:json.settings||{}};}else if(json.version===3&&json.records&&json.prefs&&Array.isArray(json.sessions)){if(!confirm('¿Reemplazar las estadísticas y preferencias actuales con las de esta copia?'))return;store={version:3,prefs:{...clone(DEFAULTS),...json.prefs},records:json.records,sessions:json.sessions.slice(0,300),legacyV2:json.legacyV2||null};for(const m of Object.keys(DEFAULTS))store.prefs[m]={...clone(DEFAULTS[m]),...(store.prefs[m]||{})};}else throw Error('Formato no compatible');save();renderStats();renderHome();alert('Copia importada correctamente.');}catch(e){alert('No se pudo importar: '+e.message);}finally{$('import-file').value='';}}
function bind(){qa('[data-mode]').forEach(e=>e.addEventListener('click',()=>modeSelect(e.dataset.mode)));qa('[data-go]').forEach(e=>e.addEventListener('click',()=>screen(e.dataset.go)));$('logo-home').addEventListener('click',()=>screen('home'));$('resume-home').addEventListener('click',()=>screen('practice'));$('return-practice').addEventListener('click',()=>screen('practice'));
 $('session-limit').addEventListener('change',()=>{setOption('limit',$('session-limit').value);renderSetup();});$('custom-limit').addEventListener('change',()=>{setOption('custom',Math.max(1,Math.min(1000,Number($('custom-limit').value)||30)));renderSetup();});$('context-help').addEventListener('change',()=>setOption('help',$('context-help').checked));$('smart-repetition').addEventListener('change',()=>setOption('smart',$('smart-repetition').checked));$('start-practice').addEventListener('click',startSession);
 $('exit-practice').addEventListener('click',()=>{if(S.session&&!confirm('¿Terminar esta sesión y volver a la configuración? Se conservarán tus resultados.'))return;finishSession(false);});$('check-text').addEventListener('click',submitText);$('answer-input').addEventListener('keydown',e=>{if(e.key==='Enter')submitText();});$('answer-input').addEventListener('input',()=>$('answer-input').classList.remove('invalid'));$('keyboard-check').addEventListener('click',submitKeyboard);$('keyboard-clear').addEventListener('click',()=>{S.selected.clear();paintKeyboard();});$('connect-midi').addEventListener('click',connectMidi);$('midi-device').addEventListener('change',()=>{S.chosenMidi=$('midi-device').value;S.midiHeld.clear();S.awaitRelease=false;});$('skip-button').addEventListener('click',skip);$('hint-button').addEventListener('click',showHint);$('pause-button').addEventListener('click',pause);$('end-button').addEventListener('click',()=>finishSession(true));$('export-data').addEventListener('click',downloadData);$('import-data').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',e=>importData(e.target.files[0]));$('clear-data').addEventListener('click',()=>{if(!confirm('¿Borrar todas las estadísticas de Clara? Se conservarán los ajustes.'))return;store.records={};store.sessions=[];store.legacyV2=null;save();renderStats();});
 document.addEventListener('visibilitychange',()=>{if(!S.session)return;if(document.hidden)stopClock();else if(S.screen==='practice'&&!S.paused)startClock();});window.addEventListener('beforeunload',()=>{stopClock();save();});setInterval(()=>{if(S.session&&S.screen==='practice'){$('aside-time').textContent=timeString(sessionElapsed());}},500);
}
function init(){bind();save();renderHome();screen('home');}
window.__claraBridge={connectMidi,openPdf:()=>screen('pdf'),isMidiReady};
init();
window.__claraDebug={music:M,state:()=>S,prefs:()=>store.prefs,records:()=>store.records,feedMidi:(data)=>processMidi(data,S.chosenMidi),forceEvent:()=>currentEvent(),connectMidi};
})();
