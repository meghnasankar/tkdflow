// Export real lesson joint positions (the frozen repo's own motion code, read-only) for posing the Blender prototype.
import {readFileSync,writeFileSync} from 'node:fs';
const repo=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');   // this checkout
const T1=await import(repo+'/js/animation/taegeuk-1-motion.js');
const {POSES}=await import(repo+'/js/lessons/taegeuk-1-data.js');
const {createFormMotion}=await import(repo+'/js/animation/form-motion.js');
const t4=createFormMotion(JSON.parse(readFileSync(repo+'/data/lessons/taegeuk-4.json','utf8')));
const t3=createFormMotion(JSON.parse(readFileSync(repo+'/data/lessons/taegeuk-3.json','utf8')));
const pick=(m,poses,i,label)=>{const c=m.CHAPTERS[i],t=c.at??c.start;return {lesson:label,pose:i+1,name:poses[i].name,t,data:m.poseAtTime(t)};};
const out=[];
for(const i of [0,1,2,6,14])out.push(pick(T1,POSES,i,'taegeuk-1'));
for(const i of [6,8,9])out.push(pick(t4,t4.POSES,i,'taegeuk-4'));
out.push(pick(t3,t3.POSES,9,'taegeuk-3'));   // right knifehand strike (open right hand)
writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log(out.map(p=>`${p.lesson} ${p.pose} ${p.name} t=${p.t.toFixed(2)}`).join('\n'));
