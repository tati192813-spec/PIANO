"""Extrae los glifos de cabezas de nota de PDFs vectoriales de MuseScore.
Uso: python herramientas/preparar_pdf.py archivo.pdf carpeta_salida [titulo]
Requiere: pip install pymupdf. No efectúa OMR de PDFs escaneados ni
reconstruye ritmo, ligaduras o simultaneidad con exactitud.
"""
import sys, os, json, math, re
from pathlib import Path
import fitz

HEADS={chr(x) for x in (0xE0A2, 0xE0A3, 0xE0A4)}
ACC={chr(0xE260):-1,chr(0xE261):0,chr(0xE262):1,chr(0xE263):2,chr(0xE264):-2}
CLEFS={chr(0xE050):'treble',chr(0xE062):'bass'}
BASE={'treble':(4*7+2),'bass':(2*7+4)} # E4 y G2
STEPS=['C','D','E','F','G','A','B']
SEMITONES=[0,2,4,5,7,9,11]

def group_staves(page):
 ys=sorted(set(round(it[1].y,2) for d in page.get_drawings() for it in d['items']
    if it[0]=='l' and abs(it[1].y-it[2].y)<.25 and abs(it[1].x-it[2].x)>85))
 result=[]; used=set()
 for i in range(len(ys)-4):
  if any(j in used for j in range(i,i+5)):continue
  if all(abs(ys[i+j]-(ys[i]+5*j))<.35 for j in range(5)):
   result.append({'top':ys[i], 'bottom':ys[i+4], 'center':ys[i]+10})
   used.update(range(i,i+5))
 return result

def extract(page, number):
 staves=group_staves(page)
 chars=[]
 for b in page.get_text('rawdict')['blocks']:
  for line in b.get('lines',[]):
   for span in line['spans']:
    if 'MScore' not in span['font']:continue
    for ch in span['chars']:
     if ch['c'] in HEADS|set(ACC)|set(CLEFS):
      x,y=ch['origin'];chars.append({'char':ch['c'],'x':x,'y':y,'size':span['size']})
 clef_glyphs=[g for g in chars if g['char'] in CLEFS]
 accidentals=[g for g in chars if g['char'] in ACC]
 notes=[g for g in chars if g['char'] in HEADS]
 if not staves:return [], {'page':number,'width':page.rect.width,'height':page.rect.height,'staves':0}
 # Each new pair of staves is a system. The PDF may have a trailing single staff.
 for s,staff in enumerate(staves):staff['system']=s//2;staff['hand']=s%2
 def choose_staff(g):
  return min(range(len(staves)),key=lambda i:abs(g['y']-staves[i]['center']))
 for g in clef_glyphs:g['staff']=choose_staff(g)
 for g in accidentals:g['staff']=choose_staff(g)
 for g in notes:g['staff']=choose_staff(g)
 # nearest preceding clef on the same staff; a clef can change within a system.
 def current_clef(g):
  gs=[c for c in clef_glyphs if c['staff']==g['staff'] and c['x']<=g['x']+2]
  return CLEFS[max(gs,key=lambda x:x['x'])['char']] if gs else ('treble' if g['staff']%2==0 else 'bass')
 # Bars can reset local accidentals; approximate by PDF vertical stave-crossing paths.
 def bar_positions(staff):
  y0,y1=staff['top'],staff['bottom']
  xs=set()
  for d in page.get_drawings():
   for item in d['items']:
    if item[0]!='l':continue
    a,b=item[1:3]
    if abs(a.x-b.x)>.4:continue
    if min(a.y,b.y)<=y0+1 and max(a.y,b.y)>=y1-1:
     xs.add(round(a.x,1))
  return sorted(xs)
 bars=[bar_positions(s) for s in staves]
 output=[]
 context={}
 for g in sorted(notes,key=lambda g:(g['staff'],g['x'],g['y'])):
  staff=staves[g['staff']];clef=current_clef(g)
  step_from_bottom=round((staff['bottom']-g['y'])/2.5)
  diatonic=BASE[clef]+step_from_bottom
  name=STEPS[diatonic%7];octave=diatonic//7
  base_midi=12*(octave+1)+SEMITONES[diatonic%7]
  # F major: B-flat in this score. Other signatures are not inferred here.
  prevbar=max((x for x in bars[g['staff']] if x<g['x']-1),default=-1000)
  ctx_key=(g['staff'],prevbar,name,octave)
  alteration=context.get(ctx_key,-1 if name=='B' else 0)
  nearby=[a for a in accidentals if a['staff']==g['staff'] and prevbar<a['x']<g['x'] and
          abs(a['y']-g['y'])<=3.0 and g['x']-a['x']<18]
  if nearby:alteration=ACC[max(nearby,key=lambda a:a['x'])['char']]
  context[ctx_key]=alteration
  estimated_octave=False
  calculated_midi=base_midi+alteration
  while calculated_midi<21:calculated_midi+=12;octave+=1;estimated_octave=True
  while calculated_midi>108:calculated_midi-=12;octave-=1;estimated_octave=True
  output.append({'page':number,'system':staff['system'],'hand':staff['hand'],
    'x':round(g['x']+3.2,2),'y':round(g['y']-0.25,2),'midi':calculated_midi,
    'pitch':name+({'-2':'bb','-1':'b','0':'','1':'#','2':'x'}[str(alteration)])+str(octave),
    'clef':clef,'type':'half' if g['char']==chr(0xE0A3) else 'whole' if g['char']==chr(0xE0A2) else 'filled',
    'auto':True,'estimatedOctave':estimated_octave})
 # Onsets occur from left to right within each system; align upper/lower voices by X.
 output.sort(key=lambda n:(n['system'],n['x'],n['hand'],n['y']))
 return output, {'page':number,'width':page.rect.width,'height':page.rect.height,'staves':len(staves)}

def prepare(source,dest,title):
 pdf=fitz.open(source);dest=Path(dest);dest.mkdir(parents=True,exist_ok=True)
 data={'version':1,'id':dest.name,'title':title,'source':Path(source).name,
       'pages':[],'notes':[], 'notice':'Detección experimental de glifos; revisar notas y acordes. No evalúa el ritmo.'}
 for n,page in enumerate(pdf,1):
  pix=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False,colorspace=fitz.csRGB)
  pix.save(str(dest/f'pagina-{n}.png'))
  notes,info=extract(page,n)
  info['image']=f'partituras/{dest.name}/pagina-{n}.png'
  data['pages'].append(info)
  data['notes']+=notes
 data['notes']=[{**v,'id':i} for i,v in enumerate(data['notes'])]
 (dest/'datos.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print('Páginas:',len(pdf),'notas detectadas:',len(data['notes']),'por página:',[sum(1 for note in data['notes'] if note['page']==i+1) for i in range(len(pdf))])

if __name__=='__main__':
 if len(sys.argv)<3:raise SystemExit('python herramientas/preparar_pdf.py entrada.pdf carpeta_salida [titulo]')
 prepare(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else Path(sys.argv[1]).stem)
