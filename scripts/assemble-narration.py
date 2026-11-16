"""Assemble generated, aligned utterances into one synchronized track per lesson.

Offline only: this tool makes no network calls and reads no credentials.
Usage: python3 scripts/assemble-narration.py /path/to/generated-banks
"""
import array,hashlib,json,math,pathlib,subprocess,sys
folder=pathlib.Path(sys.argv[1]);root=pathlib.Path(__file__).resolve().parent.parent
plan=json.loads((folder/'plan.json').read_text());rate=22050;segments={};generation=json.loads((folder/'generation-record.json').read_text())
def normalized_map(text):
 indices=[i for i,c in enumerate(text) if c.isalnum()]
 return ''.join(text[i].lower() for i in indices),indices
for n,bank in enumerate(plan['banks']):
 stem='bank-'+str(n+1).zfill(2);record=json.loads((folder/(stem+'.json')).read_text());a=record['alignment'];chars=a['characters'];starts=a['character_start_times_seconds'];ends=a['character_end_times_seconds']
 assert len(chars)==len(starts)==len(ends)
 text=''.join(chars);canonical,positions=normalized_map(text);cursor=0;bounds=[]
 for cue in bank['utterances']:
  at=text.find(cue['text'],cursor)
  if at>=0:startIndex=at;endIndex=at+len(cue['text'])-1;cursor=endIndex+1
  else:
   needle,_=normalized_map(cue['text']);startNorm=sum(1 for i in positions if i<cursor);at=canonical.find(needle,startNorm);assert at>=0,'Spoken words do not match '+cue['key'];startIndex=positions[at];endIndex=positions[at+len(needle)-1];cursor=endIndex+1
  while startIndex<endIndex and not chars[startIndex].isalnum():startIndex+=1
  while endIndex>startIndex and not chars[endIndex].isalnum():endIndex-=1
  bounds.append((float(starts[startIndex]),float(ends[endIndex]),cue))
 decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(folder/(stem+'.mp3')),'-f','s16le','-ac','1','-ar',str(rate),'pipe:1'])
 pcm=array.array('h');pcm.frombytes(decoded)
 for i,(start,end,cue) in enumerate(bounds):
  left=max(0,start-.055,min(start,bounds[i-1][1]+.015) if i else 0);right=min(len(pcm)/rate,end+.10,max(end,bounds[i+1][0]-.015) if i+1<len(bounds) else len(pcm)/rate)
  assert left<=start and right>=end and right>left
  samples=pcm[int(left*rate):math.ceil(right*rate)]
  fade=min(int(.006*rate),len(samples)//3)
  for j in range(fade):samples[j]=int(samples[j]*j/fade);samples[-1-j]=int(samples[-1-j]*j/fade)
  segments[cue['key']]={'pcm':samples,'duration':len(samples)/rate,'bank':stem,'start':left,'end':right,'text':cue['text']}
media=root/'assets/narration';data=root/'data/narration';media.mkdir(exist_ok=True);data.mkdir(exist_ok=True)
records=[]
for lesson in plan['lessons']:
 base=lesson['baseChapters'];cues=[];chapters=[{'index':0,'start':0,'at':0,'duration':0}]
 first=segments[lesson['cues'][0]['key']];cues.append({'index':0,'text':first['text'],'start':.12,'end':.12+first['duration']})
 for i in range(1,len(base)):
  speech=segments[lesson['cues'][i]['key']]
  gap=base[i]['start']-base[i-1]['at'];start=chapters[-1]['at']+gap
  if i==1:start=max(start,cues[0]['end']+.30)
  duration=max(base[i]['duration'],speech['duration']+.30);at=start+duration
  chapters.append({'index':i,'start':round(start,6),'at':round(at,6),'duration':round(duration,6)})
  cues.append({'index':i,'text':speech['text'],'start':round(start+.08,6),'end':round(start+.08+speech['duration'],6)})
 duration=round(chapters[-1]['at']+lesson['baseDuration']-base[-1]['at'],6)
 track=array.array('h',[0])*math.ceil((duration+.04)*rate)
 for cue,spec in zip(cues,lesson['cues']):
  samples=segments[spec['key']]['pcm'];at=round(cue['start']*rate);assert at+len(samples)<=len(track);track[at:at+len(samples)]=samples
 raw=folder/(lesson['id']+'.pcm');raw.write_bytes(track.tobytes());target=media/(lesson['id']+'.mp3')
 subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i',str(raw),'-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','96k',str(target)],check=True);raw.unlink()
 manifest={'version':1,'lessonId':lesson['id'],'provider':'ElevenLabs','voice':'Sarah','model':plan['model'],'audioSrc':'/assets/narration/'+target.name,'duration':duration,'chapters':chapters,'cues':cues}
 (data/(lesson['id']+'.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 actual=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)],text=True));assert abs(actual-duration)<.15
 record={'lessonId':lesson['id'],'cues':len(cues),'duration':duration,'audio_duration':actual,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};records.append(record);print(json.dumps(record),flush=True)
catalog={'provider':'ElevenLabs','voice':'Sarah','model':plan['model'],'stockVoice':True,'voiceCloning':False,'generationCharacters':plan['generationCharacters'],'uniqueUtterances':plan['uniqueUtterances'],'generationRequests':len(plan['banks']),'accountOrPlanChanges':False,'files':records}
(data/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');(folder/'assembly-record.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps({'lessons':len(records),'poseCues':sum(r['cues'] for r in records),'audioBytes':sum(r['bytes'] for r in records)}),flush=True)
