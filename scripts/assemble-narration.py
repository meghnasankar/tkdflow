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

# Effects are a separate synchronized track so learners can switch them off.
fx={};effectRecords=[];effectFolder=root/'assets/effects';effectFolder.mkdir(exist_ok=True)
for name,maximum,gain in [('hand-swish',.38,.18),('kick-swish',.52,.20),('kihap',.70,.65)]:
 source=folder/(name+'.mp3')
 decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-af','silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB:stop_periods=-1:stop_duration=0.05:stop_threshold=-45dB,highpass=f=100','-f','s16le','-ac','1','-ar',str(rate),'pipe:1'])
 samples=array.array('h');samples.frombytes(decoded);samples=samples[:round(maximum*rate)]
 assert len(samples)>rate*.04,'Empty sound effect '+name
 peak=max(abs(v) for v in samples);assert peak>100
 fade=round(.012*rate)
 for j in range(len(samples)):
  edge=min(1,j/fade,(len(samples)-1-j)/fade);samples[j]=round(samples[j]/peak*32767*gain*edge)
 fx[name]=samples
 target=effectFolder/(name+'.mp3')
 subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','96k',str(target)],input=samples.tobytes(),check=True)
 effectRecords.append({'name':name,'provider':'ElevenLabs','model':'eleven_text_to_sound_v2','bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':len(samples)/rate})
records=[]
for lesson in plan['lessons']:
 base=lesson['baseChapters'];cues=[];chapters=[{'index':0,'start':0,'at':0,'duration':0}]
 first=segments[lesson['cues'][0]['key']];cues.append({'index':0,'text':first['text'],'start':.12,'end':.12+first['duration']})
 for i in range(1,len(base)):
  speech=segments[lesson['cues'][i]['key']]
  gap=base[i]['start']-base[i-1]['at'];start=chapters[-1]['at']+gap
  if i==1:start=max(start,cues[0]['end']+.30)
  fact=lesson['facts'][i];finish=1 if fact['slow'] or not fact['impacts'] else fact['impacts'][-1]['phase'];duration=max(base[i]['duration'],(speech['duration']+.40)/finish);at=start+duration
  chapters.append({'index':i,'start':round(start,6),'at':round(at,6),'duration':round(duration,6)})
  cues.append({'index':i,'text':speech['text'],'start':round(start+.08,6),'end':round(start+.08+speech['duration'],6)})
 duration=round(chapters[-1]['at']+lesson['baseDuration']-base[-1]['at'],6)
 events=[]
 for fact,cue,c in zip(lesson['facts'],cues,chapters):
  cue['turn']=fact['turn'];cue['kihap']=fact['kihap']
  for hit in fact['impacts']:
   impact=c['start']+c['duration']*hit['phase'];name='kick-swish' if hit['type']=='kick' else 'hand-swish';samples=fx[name];start=max(c['start'],impact-len(samples)/rate+.025)
   events.append({'type':name,'pose':fact['index'],'start':round(start,6),'end':round(start+len(samples)/rate,6),'impact':round(impact,6)})
  if fact['kihap']:
   impact=c['start']+c['duration']*(fact['impacts'][-1]['phase'] if fact['impacts'] else 1)
   events.append({'type':'kihap','pose':fact['index'],'start':round(impact,6),'end':round(impact+len(fx['kihap'])/rate,6),'impact':round(impact,6)})
 # Keep a little room for a final vocal tail rather than cutting off a shout.
 duration=max(duration,max((e['end']+.15 for e in events),default=0))
 track=array.array('h',[0])*math.ceil((duration+.04)*rate)
 for cue,spec in zip(cues,lesson['cues']):
  samples=segments[spec['key']]['pcm'];at=round(cue['start']*rate);assert at+len(samples)<=len(track);track[at:at+len(samples)]=samples
 raw=folder/(lesson['id']+'.pcm');raw.write_bytes(track.tobytes());target=media/(lesson['id']+'.mp3')
 subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i',str(raw),'-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','96k',str(target)],check=True);raw.unlink()
 effectsTrack=array.array('h',[0])*math.ceil((duration+.04)*rate)
 for event in events:
  at=round(event['start']*rate)
  for j,v in enumerate(fx[event['type']]):effectsTrack[at+j]=max(-32767,min(32767,effectsTrack[at+j]+v))
 effectsTarget=media/(lesson['id']+'-effects.mp3')
 subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-q:a','8',str(effectsTarget)],input=effectsTrack.tobytes(),check=True)
 manifest={'version':1,'lessonId':lesson['id'],'audioSrc':'/assets/narration/'+target.name,'duration':duration,'chapters':chapters,'cues':cues,'effectsSrc':'/assets/narration/'+effectsTarget.name,'effects':events}
 (data/(lesson['id']+'.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 actual=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)],text=True));assert abs(actual-duration)<.15
 record={'lessonId':lesson['id'],'cues':len(cues),'duration':duration,'audio_duration':actual,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};record['effects']={'bytes':effectsTarget.stat().st_size,'sha256':hashlib.sha256(effectsTarget.read_bytes()).hexdigest(),'events':len(events),'kihaps':sum(e['type']=='kihap' for e in events)};records.append(record);print(json.dumps(record),flush=True)
catalog={'provider':'ElevenLabs','voice':'Sarah','model':plan['model'],'stockVoice':True,'voiceCloning':False,'generationCharacters':plan['generationCharacters'],'uniqueUtterances':plan['uniqueUtterances'],'generationRequests':len(plan['banks']),'accountOrPlanChanges':False,'soundEffects':effectRecords,'files':records}
(root/'docs'/'narration'/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');(folder/'assembly-record.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps({'lessons':len(records),'poseCues':sum(r['cues'] for r in records),'audioBytes':sum(r['bytes'] for r in records)}),flush=True)
