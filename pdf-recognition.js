/* Clara · Detección experimental en PDF vectoriales con glifos musicales Unicode.
   No es OMR general: NO interpreta escaneos, notas dibujadas como contornos ni ritmo.
   Las alturas son propuestas para revisar antes de practicar, nunca notas certificadas. */
(function(root){'use strict';
 const HEAD=new Set(['\ue0a2','\ue0a3','\ue0a4']);
 const CLEF={'\ue050':'treble','\ue062':'bass'};
 const ACC={'\ue260':-1,'\ue261':0,'\ue262':1,'\ue263':2,'\ue264':-2};
 const SEMI=[0,2,4,5,7,9,11],STEP=['C','D','E','F','G','A','B'];
 const BASE={treble:4*7+2,bass:2*7+4}; // nota de línea inferior: Mi4 / Sol2
 const round=(a)=>Math.round(a*100)/100;
 const recognized=c=>HEAD.has(c)||c in CLEF||c in ACC;
 // PDF.js devuelve coordenadas de texto en espacio PDF (origen inferior).
 function extractGlyphs(text,viewport){const out=[];
  for(const t of text.items||[]){if(typeof t.str!=='string'||!t.transform)continue;
   const chars=Array.from(t.str),interesting=chars.filter(recognized);
   if(!interesting.length)continue;
   // Algunos PDF agrupan varios glifos. PDF.js no publica sus avances individuales;
   // en estos casos las posiciones horizontales son aproximadas y se advierte.
   const width=Number(t.width)||0;
   for(let i=0;i<chars.length;i++){
    const c=chars[i];if(!recognized(c))continue;
    const horizontal=(chars.length>1?i*width/chars.length:0);
    const [x,y]=viewport.convertToViewportPoint(t.transform[4]+horizontal,t.transform[5]);
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    out.push({c,x,y,approximate:chars.length>1});
   }
  }
  return out;
 }
 // Busca cinco líneas equidistantes en los píxeles de la página renderizada.
 function detectStaves(image,scale){const {data,width:w,height:h}=image;
  if(!data||w<200||h<200)return [];
  const left=Math.round(w*.18),right=Math.round(w*.91),step=4,n=Math.ceil((right-left)/step),candidates=[];
  for(let y=0;y<h;y++){
   let dark=0;
   for(let x=left;x<right;x+=step){const k=(y*w+x)*4;
    if((data[k]*3+data[k+1]*6+data[k+2])/10<170)dark++;
   }
   if(dark/n>.30)candidates.push(y);
  }
  const lines=[];for(const y of candidates){const prev=lines[lines.length-1];
   if(prev&&y-prev.last<=1){prev.sum+=y;prev.count++;prev.last=y;}
   else lines.push({last:y,sum:y,count:1});
  }
  const ys=lines.filter(l=>l.count<=Math.max(4,Math.round(3*scale))).map(l=>l.sum/l.count/scale);
  const matches=[];
  for(let i=0;i<ys.length-4;i++)for(let end=i+4;end<Math.min(ys.length,i+13);end++){
   const gap=(ys[end]-ys[i])/4;if(gap<3.2||gap>10.5)continue;
   const sel=[i],errors=[];let prev=i,valid=true;
   for(let k=1;k<4;k++){
    const expected=ys[i]+k*gap;let best=-1,err=Infinity;
    for(let j=prev+1;j<end;j++){
     const delta=Math.abs(ys[j]-expected);
     if(delta<err){best=j;err=delta;}
    }
    if(best<0||err>Math.max(1.5,gap*.31)){valid=false;break}
    sel.push(best);errors.push(err);prev=best;
   }
   if(!valid||prev>=end)continue;
   sel.push(end);matches.push({sel,score:errors.reduce((a,b)=>a+b,0),top:ys[i]});
  }
  matches.sort((a,b)=>a.score-b.score);
  const used=new Set(),staves=[];
  for(const m of matches){if(m.sel.some(i=>used.has(i)))continue;
   const vals=m.sel.map(i=>ys[i]);
   staves.push({top:vals[0],bottom:vals[4],center:(vals[0]+vals[4])/2,spacing:(vals[4]-vals[0])/4});
   m.sel.forEach(i=>used.add(i));
  }
  staves.sort((a,b)=>a.top-b.top);
  // Agrupación en sistemas: dos pentagramas próximos forman uno de piano.
  let system=0;
  for(let i=0;i<staves.length;i++){
   const s=staves[i],prev=staves[i-1];
   const paired=prev&&i>0&&prev.hand===0&&s.center-prev.center<14*Math.max(s.spacing,prev.spacing);
   if(i&& !paired)system++;
   s.system=system;s.hand=paired?1:0;
  }
  return staves;
 }
 // En partituras digitales, la propia clave señala la posición del pentagrama.
 // Esta vía recupera líneas que el muestreo de píxeles puede pasar por alto
 // cuando hay muchas notas superpuestas a las líneas horizontales.
 function completeStavesFromClefs(glyphs,detected,pageWidth,image,scale){
  const approx=detected.length?detected.map(s=>s.spacing).sort((a,b)=>a-b)[Math.floor(detected.length/2)]:5;
  const nominal=Math.max(3.5,Math.round(approx*2)/2);
  const clefs=glyphs.filter(g=>g.c in CLEF&&g.x<pageWidth*.29).sort((a,b)=>a.y-b.y);
  const measure=(top)=>{
   const {data,width,height}=image;let score=0;
   for(let line=0;line<5;line++){
    const y=Math.round((top+line*nominal)*scale);let strongest=0;
    for(let dy=-1;dy<=1;dy++){
     const yy=y+dy;if(yy<0||yy>=height)continue;let dark=0,total=0;
     for(let x=Math.round(width*.18);x<Math.round(width*.91);x+=5){
      const k=(yy*width+x)*4;if((3*data[k]+6*data[k+1]+data[k+2])/10<165)dark++;
      total++;
     }
     strongest=Math.max(strongest,dark/Math.max(1,total));
    }
    score+=strongest;
   }
   return score;
  };
  const result=[];
  for(const g of clefs){
   const offsets=g.c==='\ue050'?[3,4]:[1];
   const choices=offsets.map(o=>({top:g.y-o*nominal,spacing:nominal}));
   choices.sort((a,b)=>measure(b.top)-measure(a.top));
   const candidate=choices[0],top=candidate.top;
   if(result.some(s=>Math.abs(s.top-top)<nominal*1.4))continue;
   // Si el raster revela el mismo pentagrama, utiliza sus coordenadas exactas.
   const existing=detected.filter(s=>Math.abs(s.top-top)<nominal*1.4).sort((a,b)=>Math.abs(a.top-top)-Math.abs(b.top-top))[0];
   const proposal=existing&&Math.abs(existing.top-top)<nominal*.6?existing:candidate;
   result.push({top:proposal.top,bottom:proposal.bottom??proposal.top+4*proposal.spacing,
    center:proposal.center??proposal.top+2*proposal.spacing,spacing:proposal.spacing});
  }
  for(const staff of detected){
   if(!result.some(s=>Math.abs(s.center-staff.center)<nominal*1.7))result.push({...staff});
  }
  result.sort((a,b)=>a.center-b.center);
  let system=0;
  for(let i=0;i<result.length;i++){
   const s=result[i],prev=result[i-1];
   const paired=prev&&prev.hand===0&&s.center-prev.center<14*Math.max(s.spacing,prev.spacing);
   if(i&&!paired)system++;
   s.system=system;s.hand=paired?1:0;
  }
  return result;
 }
 function findBarlines(image,scale,staves){const {data,width:w,height:h}=image,bars=staves.map(()=>[]);
  const from=Math.floor(w*.13),to=Math.ceil(w*.95);
  for(let si=0;si<staves.length;si++){
   const s=staves[si],top=Math.round(s.top*scale),bottom=Math.round(s.bottom*scale),count=8;
   for(let x=from;x<to;x++){
    let dark=0;
    for(let k=0;k<count;k++){
     const y=Math.round(top+(bottom-top)*(k+.5)/count),idx=(y*w+x)*4;
     if(y>=0&&y<h&&(data[idx]*3+data[idx+1]*6+data[idx+2])/10<110)dark++;
    }
    if(dark>=7)bars[si].push(x/scale);
   }
   // Eliminación de plicas: para considerarlo barra, debe tener continuidad cerca
   // del pentagrama de la otra mano. Si no existe, no se usa para arrastrar alteraciones.
   const pair=staves.findIndex((other,j)=>j!==si&&other.system===s.system);
   if(pair<0){bars[si]=[];continue;}
   const other=staves[pair],newbars=[];
   for(const x of bars[si]){
    const px=Math.round(x*scale);let hits=0;
    for(let k=0;k<count;k++){
     const y=Math.round((other.top+(other.bottom-other.top)*(k+.5)/count)*scale),idx=(y*w+px)*4;
     if(y>=0&&y<h&&(data[idx]*3+data[idx+1]*6+data[idx+2])/10<110)hits++;
    }
    if(hits>=7&&(newbars.length===0||x-newbars[newbars.length-1]>.9))newbars.push(x);
   }
   bars[si]=newbars;
  }
  return bars;
 }
 function assignStaff(g,staves){let best=0,distance=Infinity;
  for(let i=0;i<staves.length;i++){const delta=Math.abs(g.y-staves[i].center);
   if(delta<distance){distance=delta;best=i;}}
  return best;
 }
 function inferNotes(glyphs,staves,barlines,page){if(!staves.length)return [];
  for(const g of glyphs)g.staff=assignStaff(g,staves);
  const clefs=glyphs.filter(g=>g.c in CLEF),accs=glyphs.filter(g=>g.c in ACC);
  const head=glyphs.filter(g=>HEAD.has(g.c));
  const keyByStaff=new Map(), signatureEnd=new Map();
  for(let si=0;si<staves.length;si++){
   const gs=clefs.filter(g=>g.staff===si).sort((a,b)=>a.x-b.x),first=head.filter(g=>g.staff===si).sort((a,b)=>a.x-b.x)[0];
   const firstClef=gs[0],start=firstClef?firstClef.x:staves[si].spacing*4;
   const startAcc=accs.filter(a=>a.staff===si&&a.x>start+3&&a.x<start+staves[si].spacing*10&&(!first||a.x<first.x-5)).sort((a,b)=>a.x-b.x);
   const count=startAcc.length&&startAcc.every(a=>Math.sign(ACC[a.c])===Math.sign(ACC[startAcc[0].c]))?Math.min(7,startAcc.length):0;
   const sign=count?Math.sign(ACC[startAcc[0].c]):0;
   const keys=sign<0?['B','E','A','D','G','C','F']:['F','C','G','D','A','E','B'];
   keyByStaff.set(si,new Map(keys.slice(0,count).map(name=>[name,sign])));
   signatureEnd.set(si,startAcc.length?startAcc[startAcc.length-1].x:start);
  }
  const contexts=new Map(),out=[];
  head.sort((a,b)=>staves[a.staff].system-staves[b.staff].system||a.x-b.x||a.staff-b.staff||a.y-b.y);
  for(const g of head){const staff=staves[g.staff],leftClefs=clefs.filter(c=>c.staff===g.staff&&c.x<=g.x+1).sort((a,b)=>b.x-a.x);
   const clef=leftClefs.length?CLEF[leftClefs[0].c]:(staff.hand===0?'treble':'bass');
   const pos=BASE[clef]+Math.round((staff.bottom-g.y)/(staff.spacing/2));
   const letter=STEP[((pos%7)+7)%7],oct=Math.floor(pos/7);
   const bars=(barlines&&barlines[g.staff])||[];
   const before=bars.filter(x=>x<g.x-2).at(-1)??-1000;
   const key=keyByStaff.get(g.staff)||new Map(),ctx=`${g.staff}:${before}:${letter}:${oct}`;
   let alteration=contexts.has(ctx)?contexts.get(ctx):key.get(letter)||0;
   const near=accs.filter(a=>a.staff===g.staff&&a.x>Math.max(before,signatureEnd.get(g.staff)+.5)&&a.x<g.x-2&&g.x-a.x<Math.max(19,staff.spacing*3.7)&&Math.abs(a.y-g.y)<staff.spacing*.6).sort((a,b)=>b.x-a.x);
   if(near.length)alteration=ACC[near[0].c];
   contexts.set(ctx,alteration);
   const midi=12*(oct+1)+SEMI[((pos%7)+7)%7]+alteration;
   if(midi<21||midi>108)continue; // no transponer silenciosamente octavas imposibles
   const keySign=key.size;
   out.push({page,system:staff.system,hand:staff.hand,x:round(g.x+staff.spacing*.63),y:round(g.y),midi,
    pitch:letter+({[-2]:'bb',[-1]:'b',[0]:'',[1]:'#',[2]:'x'}[alteration])+oct,
    clef,type:g.c==='\ue0a2'?'whole':g.c==='\ue0a3'?'half':'filled',auto:true,
    uncertain:!!g.approximate||!bars.length&&!!near.length,signature:keySign,source:'vector-glyphs'});
  }
  return out;
 }
 async function analyzePage(page,num){const viewport=page.getViewport({scale:1});const content=await page.getTextContent();const glyphs=extractGlyphs(content,viewport);
  const heads=glyphs.filter(g=>HEAD.has(g.c));
  if(!heads.length)return {notes:[],reason:'Sin glifos reconocibles (puede ser un escaneo o un PDF con notas dibujadas).'};
  const scale=1.5,rv=page.getViewport({scale});const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(rv.width);canvas.height=Math.ceil(rv.height);
  if(canvas.width*canvas.height>9e6)return {notes:[],reason:'Página demasiado grande para el análisis automático.'};
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  if(!ctx)return {notes:[],reason:'El navegador no permite analizar el lienzo de PDF.'};
  await page.render({canvasContext:ctx,viewport:rv}).promise;
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),staves=completeStavesFromClefs(glyphs,detectStaves(pixels,scale),viewport.width,pixels,scale);
  if(!staves.length)return {notes:[],reason:'No se pudieron identificar cinco líneas de pentagrama.'};
  const bars=findBarlines(pixels,scale,staves),notes=inferNotes(glyphs,staves,bars,num);
  return {notes,staves:staves.length,glifos:heads.length,reason:notes.length?'':'No se han podido asignar alturas a las notas.'};
 }
 root.ClaraPDFRecognition={analyzePage,_test:{extractGlyphs,detectStaves,completeStavesFromClefs,findBarlines,inferNotes}};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.ClaraPDFRecognition;
})(typeof window!=='undefined'?window:globalThis);
