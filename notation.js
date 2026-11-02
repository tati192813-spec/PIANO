/* Clara — representación SVG musical; toda evaluación reside en music.js. */
(function(root,factory){const obj=factory(root.ClaraMusic||require('./music.js'));root.ClaraNotation=obj;if(typeof module==='object'&&module.exports)module.exports=obj;})(typeof window!=='undefined'?window:globalThis,function(M){
'use strict';
const NS='http://www.w3.org/2000/svg',INK='#252b35',VIOLET='#6759dc',DONE='#16805f';
const CLEF_PATHS={treble:'M314 801Q300 854 291.0 906.0Q282 958 282 1012Q282 1059 288.5 1100.5Q295 1142 307 1177Q320 1217 341.0 1252.5Q362 1288 385.5 1311.0Q409 1334 427 1334Q451 1334 493 1249Q514 1206 524.0 1156.0Q534 1106 534 1049Q534 978 515.0 907.5Q496 837 459.5 775.0Q423 713 372 666L407 498Q422 500 432.0 501.0Q442 502 447 502Q508 502 556.0 467.5Q604 433 632.5 377.0Q661 321 661 254Q661 177 621.5 115.5Q582 54 503 25Q508 8 532 -117Q538 -147 541.0 -164.5Q544 -182 545.0 -195.0Q546 -208 546 -225Q546 -275 521.5 -314.5Q497 -354 455.5 -376.0Q414 -398 363 -398Q311 -398 271.0 -378.5Q231 -359 208.0 -324.5Q185 -290 185 -245Q185 -197 211.5 -165.0Q238 -133 287 -133Q329 -133 355.5 -163.5Q382 -194 382 -236Q382 -272 357.0 -299.0Q332 -326 292 -326H282Q308 -365 364 -365Q433 -365 472.0 -320.0Q511 -275 511 -205Q511 -188 507.0 -159.5Q503 -131 493 -91Q483 -51 477.5 -25.0Q472 1 470 12Q436 2 390 2Q304 2 222 52Q142 102 96.0 184.0Q50 266 50 361Q50 451 91 530Q132 609 192.5 675.0Q253 741 314 801ZM341 826Q364 838 390.0 870.5Q416 903 440.0 945.0Q464 987 479.0 1029.5Q494 1072 494 1106Q494 1142 483.0 1163.0Q472 1184 445 1184Q421 1184 398.5 1162.0Q376 1140 358.5 1103.5Q341 1067 331.0 1022.0Q321 977 321 930Q321 898 327.5 872.0Q334 846 341 826ZM398 379Q371 373 347.0 353.5Q323 334 308.5 306.5Q294 279 294 248Q294 223 307.0 196.5Q320 170 339 154Q352 142 365 136Q380 129 380 123Q380 120 370 117Q332 126 301.5 151.0Q271 176 253.5 211.5Q236 247 236 287Q236 330 253.5 370.0Q271 410 302.5 442.0Q334 474 374 490L345 641Q229 547 174.5 456.5Q120 366 120 277Q120 212 154.0 156.0Q188 100 247.0 65.5Q306 31 380 31Q400 31 420.5 35.0Q441 39 464 45ZM495 55Q593 97 593 227Q593 270 571.0 305.5Q549 341 512.0 362.0Q475 383 429 383Z',bass:'M50 123Q216 231 288 301Q336 348 373.0 408.5Q410 469 431.5 536.0Q453 603 453 669Q453 728 435.0 773.5Q417 819 383.0 845.0Q349 871 302 871Q284 871 264.5 867.0Q245 863 224 855Q181 839 158.0 813.5Q135 788 135 765Q135 756 143.0 752.0Q151 748 158 748Q168 748 183 752Q190 754 196.5 755.0Q203 756 210 756Q248 756 272.0 733.5Q296 711 296 674Q296 638 266.0 612.0Q236 586 195 586Q146 586 111.0 617.0Q76 648 76 697Q76 756 109.0 802.0Q142 848 198.5 874.0Q255 900 324 900Q400 900 460.0 867.0Q520 834 555.5 776.5Q591 719 591 646Q591 551 538 464Q511 419 476.5 379.0Q442 339 389.0 297.5Q336 256 256.0 208.0Q176 160 57 101ZM687 809Q710 809 726.0 793.0Q742 777 742 754Q742 731 726.0 715.5Q710 700 687 700Q664 700 648.0 715.5Q632 731 632 754Q632 777 648.0 793.0Q664 809 687 809ZM687 589Q710 589 726.0 573.0Q742 557 742 534Q742 511 726.0 495.5Q710 480 687 480Q664 480 648.0 495.5Q632 511 632 534Q632 557 648.0 573.0Q664 589 687 589Z'};
/* Contornos SVG de signos musicales de Noto Music (SIL Open Font License 1.1).
   Solo se incluyen las rutas vectoriales necesarias; no se distribuye una fuente. */
const MUSIC_GLYPHS={
 'quarterRest':'M147 878 307 683Q257 624 230.0 581.0Q203 538 203 494Q203 457 227.0 416.5Q251 376 303 314L287 292Q243 320 205 320Q177 320 163.0 301.5Q149 283 149 257Q149 225 162.5 196.5Q176 168 199 142L186 123Q117 173 84.0 214.0Q51 255 51 303Q51 346 78.0 366.0Q105 386 143 386Q173 386 221 363V365L67 570Q168 659 168 736Q168 797 104 878Z',
 'eighthRest':'M155 269 251 609Q230 590 203.5 582.0Q177 574 151 574Q108 574 79.0 597.0Q50 620 50 663Q50 691 70.0 710.5Q90 730 121 730Q150 730 168.5 711.5Q187 693 187 662Q187 640 177 623Q177 617 189 617Q244 617 294 703H312L191 269Z',
 'sixteenthRest':'M155 147 251 487Q230 468 203.5 460.0Q177 452 151 452Q108 452 79.0 475.0Q50 498 50 541Q50 569 69.5 588.5Q89 608 121 608Q150 608 168.5 589.5Q187 571 187 540Q187 518 177 501Q177 495 189 495Q230 495 267 541L319 731Q298 712 271.5 704.0Q245 696 219 696Q176 696 147.0 719.0Q118 742 118 785Q118 813 138.0 832.5Q158 852 189 852Q219 852 237.0 833.0Q255 814 255 784Q255 774 252.0 763.5Q249 753 245 745Q245 739 257 739Q312 739 362 825H380L191 147Z',
 'sharp':'M502 82 404 39V-135H357V20L196 -58V-233H149V-77L51 -124V-46L149 0V245L51 198V276L149 323V482H196V342L357 420V590H404V439L502 485V408L404 361V116L502 160ZM357 97V342L196 264V19Z',
 'flat':'M51 524H88V179Q117 220 148.0 243.5Q179 267 209 267Q250 267 273.0 242.0Q296 217 296 173Q296 115 263 70Q241 40 208.0 19.0Q175 -2 138.5 -13.5Q102 -25 69 -25H51ZM88 141V3Q115 3 153 25Q192 47 215.5 83.0Q239 119 239 162Q239 191 230.5 206.5Q222 222 199 222Q171 222 140.5 198.0Q110 174 88 141Z',
 'natural':'M306 -213H259V-59L51 -156V404H98V264L306 361ZM259 19V261L98 186V-57Z',
 'doubleSharp':'M224 0V45Q224 64 211.5 75.0Q199 86 181 86Q162 86 149.0 75.0Q136 64 136 47V0H50V86H105Q119 86 127.5 100.0Q136 114 136 131Q136 147 126.5 161.5Q117 176 111 176H50V262H136V209Q136 195 149.0 185.5Q162 176 181 176Q196 176 210.0 185.0Q224 194 224 207V262H310V176H259Q246 176 235.0 160.5Q224 145 224 131Q224 114 233.5 100.0Q243 86 259 86H310V0Z',
 'doubleFlat':'M218 107Q210 95 192.5 78.0Q175 61 147 39Q92 -4 50 -55V615H79V225Q125 262 163 262Q195 262 218 242V615H249V225Q286 262 333 262Q365 262 391.0 240.5Q417 219 417 178Q417 146 398.0 119.0Q379 92 347 65L278 6Q239 -28 218 -55ZM249 12Q289 54 316.0 95.5Q343 137 343 170Q343 198 330.0 210.5Q317 223 302 223Q286 223 270.5 211.5Q255 200 249 180ZM79 12 120 59Q149 92 161.0 117.0Q173 142 173 170Q173 221 132 221Q116 221 100.5 209.5Q85 198 79 180Z'
};
function musicGlyph(parent,name,x,y,scale,dx=0,dy=0,color=INK){
 return add(parent,'path',{d:MUSIC_GLYPHS[name],transform:`translate(${x+dx} ${y+dy}) scale(${scale} ${-scale})`,fill:color,stroke:'none'});
}
function add(parent,tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=String(text);parent.appendChild(el);return el;}
function line(p,x1,y1,x2,y2,c=INK,w=1.5,dash){const attrs={x1,y1,x2,y2,stroke:c,'stroke-width':w,'stroke-linecap':'round'};if(dash)attrs['stroke-dasharray']=dash;return add(p,'line',attrs);}
function accidental(svg,x,y,a,scale=.78,color=INK){
 const glyph={1:'sharp','-1':'flat',0:'natural',2:'doubleSharp','-2':'doubleFlat'}[a];
 if(!glyph)return null;
 // Contornos musicales estandarizados, con centro óptico junto a la nota.
 const layout={sharp:[.048,-13.3,9],flat:[.078,-13.5,19.5],natural:[.064,-11.4,6.2],doubleSharp:[.130,-23.4,17],doubleFlat:[.064,-14.9,18]};
 const [factor,dx,dy]=layout[glyph],actual=factor*scale/.78;
 return musicGlyph(svg,glyph,x,y,actual,dx*scale/.78,dy*scale/.78,color);
}
function head(svg,x,y,d,stemUp,color,drawStem=true,beam=null){const filled=d<2,whole=d===4;add(svg,'ellipse',{cx:x,cy:y,rx:whole?13.5:11,ry:whole?7:7.5,fill:filled?color:'#fff',stroke:color,'stroke-width':filled?1:2.7,transform:`rotate(-21 ${x} ${y})`});if(!whole&&drawStem){const h=stemUp?-55:55,sx=x+(stemUp?10:-10);line(svg,sx,y,sx,beam?beam.endY:y+h,color,2.1);if(d<1&&!beam){const flagColor=color;const sy=y+h;const sign=stemUp?1:-1;add(svg,'path',{d:stemUp?`M ${sx} ${sy} Q ${sx+30} ${sy+7} ${sx+19} ${sy+30} Q ${sx+28} ${sy+13} ${sx} ${sy+10} Z`:`M ${sx} ${sy} Q ${sx+26} ${sy-6} ${sx+19} ${sy-30} Q ${sx+26} ${sy-15} ${sx} ${sy-10} Z`,fill:flagColor});if(d<.5)add(svg,'path',{d:stemUp?`M ${sx} ${sy+16} Q ${sx+28} ${sy+23} ${sx+17} ${sy+45} Q ${sx+26} ${sy+27} ${sx} ${sy+26} Z`:`M ${sx} ${sy-15} Q ${sx+28} ${sy-20} ${sx+17} ${sy-44} Q ${sx+26} ${sy-27} ${sx} ${sy-24} Z`,fill:flagColor});}}if([3,1.5,.75].includes(d))add(svg,'circle',{cx:x+19,cy:y-3,r:2.8,fill:color});}
function rest(svg,x,y,d,color){
 // Silencios convencionales: redonda suspendida de la cuarta línea y blanca
 // apoyada sobre la tercera (contando desde abajo). Figuras menores en SVG.
 if(d>=2){const whole=d===4,top=whole?y-60:y-49;
  add(svg,'rect',{x:x-12,y:top,width:24,height:9,fill:color});
  if(d===3)add(svg,'circle',{cx:x+21,cy:top+3,r:3,fill:color});return;
 }
 if(d>=1){musicGlyph(svg,'quarterRest',x,y,.076,-13.6,4,color);
  if(d===1.5)add(svg,'circle',{cx:x+21,cy:y-24,r:3,fill:color});return;
 }
 if(d===.25)musicGlyph(svg,'sixteenthRest',x,y,.077,-16.6,3,color);
 else musicGlyph(svg,'eighthRest',x,y,.11,-19.9,22,color);
 if(d===.75)add(svg,'circle',{cx:x+23,cy:y-26,r:3,fill:color});
}
const SIGN_POS={treble:{sharp:[8,5,9,6,3,7,4],flat:[4,7,3,6,2,5,1]},bass:{sharp:[6,3,7,4,1,5,2],flat:[2,5,1,4,0,3,-1]}};
function render(sheet,cursor,svg,opts={}){
 svg.replaceChildren();const chord=!!opts.chord,staffCount=sheet.clefs.length,GAP=20,HALF=GAP/2;
 const baselines=staffCount===2?[183,430]:[179];const topStaff=baselines[0]-GAP*4;
 const sigCount=chord?0:Math.abs(sheet.signature||0),left=chord?170:252+Math.max(0,sigCount-3)*20,barW=(1174-left)/(chord?1:3);
 let minY=topStaff-65,maxY=baselines[staffCount-1]+75;
 const getWritten=(item)=>({...item.note,o:item.note.o+(item.mark==='8va'?-1:item.mark==='8vb'?1:0)});
 for(const event of sheet.events)for(const item of event.notes){const written=getWritten(item),base=baselines[item.staff],y=base-(M.step(written)-M.BOTTOM[sheet.clefs[item.staff]])*HALF;minY=Math.min(minY,y-75);maxY=Math.max(maxY,y+75);}
 const vbY=Math.min(-5,minY),vbH=Math.max(285,maxY-vbY+25);svg.setAttribute('viewBox',`0 ${vbY} 1200 ${vbH}`);svg.setAttribute('aria-label',`${staffCount===2?'Partitura a dos pentagramas':'Partitura en clave de '+(sheet.clefs[0]==='treble'?'sol':'fa')}, ${chord?'acorde escrito':(sheet.events.length+' figuras y silencios')}`);
 for(let s=0;s<staffCount;s++){
  const b=baselines[s],clef=sheet.clefs[s];for(let i=0;i<5;i++)line(svg,26,b-i*GAP,1175,b-i*GAP,'#535968',1.35);
  const clefX=clef==='treble'?46:50;add(svg,'path',{d:CLEF_PATHS[clef],transform:`translate(${clefX} ${b}) scale(.0875 -.0875)`,fill:INK});
  if(!chord){add(svg,'text',{x:144,y:b-40,'font-size':34,fill:INK,'text-anchor':'middle','font-weight':750,'font-family':'Georgia,serif'},'4');add(svg,'text',{x:144,y:b-3,'font-size':34,fill:INK,'text-anchor':'middle','font-weight':750,'font-family':'Georgia,serif'},'4');
   const sign=sheet.signature||0,positions=SIGN_POS[clef][sign>0?'sharp':'flat'];for(let i=0;i<sigCount;i++)accidental(svg,179+i*19,b-positions[i]*HALF,sign>0?1:-1,.62);
  }
 }
 if(staffCount===2){line(svg,26,baselines[0]-4*GAP,26,baselines[1],INK,2);add(svg,'path',{d:`M 22 ${baselines[0]-80} Q 4 ${baselines[0]+60} 22 ${baselines[1]} `,stroke:INK,'stroke-width':2,fill:'none'});}
 if(!chord)for(let bar=0;bar<3;bar++){const x=left+(bar+1)*barW;for(const b of baselines)line(svg,x,b-4*GAP,x,b,'#6e7690',1.3);if(staffCount===2)line(svg,x,baselines[0],x,baselines[1]-4*GAP,'#a9afbf',1);}
 const byMeasure=[[],[],[]];for(let i=0;i<sheet.events.length;i++)byMeasure[sheet.events[i].bar||0].push(i);
 // Distribución proporcional a los valores rítmicos con espacio óptico mínimo.
 // Así no quedan todas las notas separadas por distancias mecánicamente iguales.
 const eventLocations={};
 for(let bar=0;bar<3;bar++){
  const ids=byMeasure[bar],weights=ids.map(i=>{
   const ev=sheet.events[i],d=ev.duration||1;
   return Math.max(.64,Math.sqrt(Math.max(.25,d)))+(ev.notes.length>1?.12:0);
  });
  const total=weights.reduce((a,b)=>a+b,0)||1;let used=0;
  for(let j=0;j<ids.length;j++){
   eventLocations[ids[j]]=left+bar*barW+24+(barW-48)*(used+weights[j]*.5)/total;
   used+=weights[j];
  }
 }
 const eventX=(event,index)=>chord?655:eventLocations[index];
 // Plicas y barras de unión para grupos de corcheas/semicorcheas consecutivas.
 const beams=new Map(),runs=[];
 if(!chord)for(let s=0;s<staffCount;s++)for(let bar=0;bar<3;bar++){
  let run=[];const flush=()=>{
   if(run.length<2){run=[];return;}
   const base=baselines[s],ys=run.map(i=>{
    const item=sheet.events[i].notes.find(n=>n.staff===s);
    return base-(M.step(getWritten(item))-M.BOTTOM[sheet.clefs[s]])*HALF;
   });
   const stemUp=ys.reduce((a,b)=>a+b,0)/ys.length>=base-2*GAP;
   const endY0=stemUp?Math.min(...ys)-52:Math.max(...ys)+52;
   const endY1=endY0+Math.max(-13,Math.min(13,ys[ys.length-1]-ys[0])*.48);
   const x0=eventLocations[run[0]],x1=eventLocations[run[run.length-1]];
   const coord=(i)=>endY0+(endY1-endY0)*(eventLocations[i]-x0)/(x1-x0);
   for(const i of run)beams.set(i+':'+s,{stemUp,endY:coord(i)});
   runs.push({s,ids:run.slice(),stemUp,y0:endY0,y1:endY1});run=[];
  };
  for(const i of byMeasure[bar]){
   const ev=sheet.events[i],items=ev.notes.filter(n=>n.staff===s);
   if(items.length===1&&ev.duration<1&&ev.duration>=.25)run.push(i);else flush();
  }flush();
 }
 const context=sheet.clefs.map(()=>({}));let lastBar=-1;
 for(let i=0;i<sheet.events.length;i++){
  const ev=sheet.events[i],x=eventX(ev,i),active=i===cursor&&!chord,completed=ev.state==='done';if(ev.bar!==lastBar){context.forEach((_,k)=>context[k]={});lastBar=ev.bar;}
  // La nota activa se diferencia solo por su color; sin rectángulos ni indicadores.
  const color=completed?DONE:active?VIOLET:INK;
  for(let s=0;s<staffCount;s++){
   const items=ev.notes.filter(item=>item.staff===s),item=items[0],b=baselines[s],clef=sheet.clefs[s];
   if(!item){rest(svg,x,b,ev.duration,completed?'#b3b9c6':active?VIOLET:INK);continue;}
   let neighborOffset=0;
   for(const [j,it] of items.entries()){
    const n=getWritten(it),y=b-(M.step(n)-M.BOTTOM[clef])*HALF,d=M.step(n)-M.BOTTOM[clef];
    for(let v=-2;v>=d;v-=2)line(svg,x-17,b-v*HALF,x+18,b-v*HALF,'#5a6176',1.4);
    for(let v=10;v<=d;v+=2)line(svg,x-17,b-v*HALF,x+18,b-v*HALF,'#5a6176',1.4);
    const contextKey=n.l+':'+n.o,expected=context[s][contextKey]===undefined?M.alterSignature(sheet.signature||0,n.l):context[s][contextKey];
    if(n.a!==expected){accidental(svg,x-27-(Math.abs(n.a)===2?7:0)-(j>0?j*12:0),y,n.a,.78,color);}context[s][contextKey]=n.a;
    // Cuando dos notas contiguas están a una segunda de distancia, desplazamos la cabeza.
    const prev=j>0?getWritten(items[j-1]):null;if(prev&&Math.abs(M.step(n)-M.step(prev))===1)neighborOffset=neighborOffset===0?15:0;else neighborOffset=0;
    const beam=beams.get(i+':'+s);head(svg,x+neighborOffset,y,ev.duration,beam?beam.stemUp:y>=b-GAP*2,color,items.length===1,beam);
   }
   if(items.length>1){const ys=items.map(it=>b-(M.step(getWritten(it))-M.BOTTOM[clef])*HALF);const up=ys.reduce((a,v)=>a+v,0)/ys.length>=b-2*GAP;line(svg,x+(up?11:-11),up?Math.max(...ys):Math.min(...ys),x+(up?11:-11),up?Math.min(...ys)-55:Math.max(...ys)+55,color,2.2);}
  }
 }
 // Barras inclinadas ópticamente, preservando el color independiente de la nota activa.
 for(const group of runs){
  const i0=group.ids[0],i1=group.ids[group.ids.length-1],up=group.stemUp;
  const x0=eventLocations[i0]+(up?10:-10),x1=eventLocations[i1]+(up?10:-10);
  const edge=up?1:-1;
  const beamPath=(a,b,ay,by)=>add(svg,'path',{d:`M ${a} ${ay} L ${b} ${by} L ${b} ${by+edge*5.1} L ${a} ${ay+edge*5.1} Z`,fill:INK});
  beamPath(x0,x1,group.y0,group.y1);
  // Segundo brazo: parejas de semicorcheas, y ganchos si están aisladas.
  for(let j=0;j<group.ids.length;j++){
   const id=group.ids[j],ev=sheet.events[id];if(ev.duration>.25)continue;
   const nx=eventLocations[id]+(up?10:-10),ny=beams.get(id+':'+group.s).endY+edge*10;
   const next=group.ids[j+1],previous=group.ids[j-1];
   if(next!==undefined&&sheet.events[next].duration<=.25){
    const ex=eventLocations[next]+(up?10:-10),ey=beams.get(next+':'+group.s).endY+edge*10;beamPath(nx,ex,ny,ey);
   }else if(previous===undefined||sheet.events[previous].duration>.25){
    const span=next!==undefined?Math.min(14,(eventLocations[next]-eventLocations[id])*.5):-14;
    beamPath(nx,nx+span,ny,ny);
   }
  }
 }
 // Octave lines are continuous across adjacent marked notes, with an end hook.
 for(let s=0;s<staffCount;s++)for(const kind of ['8va','8vb']){
  let running=[];const flush=()=>{if(!running.length)return;const first=running[0],last=running[running.length-1],b=baselines[s];const y=kind==='8va'?b-126:b+67;const x1=eventX(sheet.events[first],first),x2=eventX(sheet.events[last],last)+24;
   add(svg,'text',{x:x1-19,y:y-8,'font-size':19,fill:VIOLET,'font-style':'italic','font-weight':650},kind);line(svg,x1+25,y,x2,y,VIOLET,1.6,'5 5');line(svg,x2,y,x2,y+(kind==='8va'?10:-10),VIOLET,1.6);running=[];};
  sheet.events.forEach((ev,i)=>{const has=ev.notes.some(it=>it.staff===s&&it.mark===kind);if(has)running.push(i);else flush();});flush();
 }
 if(!chord){for(let bar=0;bar<3;bar++)add(svg,'text',{x:left+bar*barW+barW/2,y:vbY+19,'font-size':12,fill:'#a0a7b6','text-anchor':'middle'},`Compás ${bar+1}`);}
}
function renderChord(notes,svg){
 const media=notes.reduce((s,n)=>s+M.midi(n),0)/notes.length,clef=media<60?'bass':'treble';
 const fake={mode:'chords',clefs:[clef],signature:0,events:[{bar:0,beat:0,duration:1,notes:notes.slice().sort((a,b)=>M.step(a)-M.step(b)).map(note=>({staff:0,note,mark:null})),state:'pending'}]};
 render(fake,-1,svg,{chord:true});
}

return{render,renderChord,add,accidental};
});
