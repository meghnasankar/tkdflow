/* Build reviewable scripts. This command never calls a media service. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';
import * as original from '../js/animation/taegeuk-1-motion.js';
import {POSES,LESSON} from '../js/lessons/taegeuk-1-data.js';
import {lessonSpeech} from '../js/lib/narration-script.js';
import {techniqueFacts} from '../js/lib/technique-facts.js';
const out=process.argv[2];if(!out)throw new Error('Provide a local output directory');mkdirSync(out,{recursive:true});
const forms=JSON.parse(readFileSync('data/forms.json')),unique=new Map(),lessons=[];
for(const form of forms){
 const reference=form.id==='taegeuk-1'?null:JSON.parse(readFileSync(`data/lessons/${form.id}.json`)),motion=reference?createFormMotion(reference):{...original,POSES,LESSON};
 const cues=lessonSpeech({id:form.id,POSES:motion.POSES,MOTION:motion,reference});
 for(const cue of cues){const key=createHash('sha256').update(cue.text).digest('hex').slice(0,16);cue.key=key;unique.set(key,cue.text);}
 lessons.push({id:form.id,name:form.name,baseDuration:motion.DURATION,baseChapters:motion.CHAPTERS,facts:techniqueFacts(motion,motion.POSES),cues});
}
const utterances=[...unique].map(([key,text])=>({key,text})),banks=[];let bank={utterances:[],text:''};
for(const u of utterances){if(bank.text.length+u.text.length+2>8000){banks.push(bank);bank={utterances:[],text:''};}bank.utterances.push(u);bank.text+=(bank.text?'\n\n':'')+u.text;}if(bank.text)banks.push(bank);
const plan={version:1,voiceId:'EXAVITQu4vr4xnSDxMaL',voiceName:'Sarah',model:'eleven_multilingual_v2',lessons,banks,uniqueUtterances:unique.size,generationCharacters:banks.reduce((n,b)=>n+b.text.length,0)};
writeFileSync(out+'/plan.json',JSON.stringify(plan,null,2)+'\n');
writeFileSync(out+'/scripts.txt',lessons.map(f=>f.name+'\n'+f.cues.map(c=>`${c.index+1}. ${c.text}`).join('\n')).join('\n\n')+'\n');
console.log(JSON.stringify({lessons:lessons.length,poseCues:lessons.reduce((n,l)=>n+l.cues.length,0),uniqueUtterances:unique.size,generationCharacters:plan.generationCharacters,banks:banks.length}));
