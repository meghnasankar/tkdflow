/* Offline source-pose selection and provenance. No media/API calls. */
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {createFormMotion} from '../js/animation/form-motion.js';import * as original from '../js/animation/taegeuk-1-motion.js';import {POSES} from '../js/lessons/taegeuk-1-data.js';
const specs=[
 ['taegeuk-1',1,'low','sky',30],['taegeuk-2',11,'high-block','lake',28],['taegeuk-3',5,'knifehand-strike','fire',24],['taegeuk-4',7,'side-kick','thunder',65],['taegeuk-5',10,'elbow-strike','wind',-35],['taegeuk-6',12,'roundhouse-kick','water',60],['taegeuk-7',12,'scissor-block','mountain',30],['taegeuk-8',5,'mountain-block','earth',35],
 ['koryo',2,'side-kick','scholar',60],['keumgang',8,'diamond-block','diamond',25],['taebaek',5,'knifehand-high-block','dawn',30],['pyongwon',6,'turning-side-kick','plain',60],['sipjin',15,'rock-pushing','stone',25],['jitae',11,'diamond-front-punch','soil',30],
 ['chon-ji',1,'low-block','horizon',25],['dan-gun',9,'twin-forearm-block','forest',30],['do-san',13,'wedging-block','paper',25],['won-hyo',7,'bending-ready','lotus',30],['yul-gok',24,'elbow-strike','ink',-35],['joong-gun',31,'u-shape-block','resolve',25],
 ['songahm-1',7,'side-kick','pine',-25],['songahm-2',4,'roundhouse-kick','pine-sun',60],['songahm-3',9,'spearhand','pine-stone',30],
];
const trigrams=['111','011','101','001','110','010','100','000']; // top line → bottom line
const forms=JSON.parse(readFileSync('data/forms.json')),files=[];
function signature(p){return JSON.stringify({pelvis:p.pelvis,yaw:p.yaw,chestYaw:p.chestYaw,arms:p.arms,legs:p.legs},(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v);}
for(const [id,n,type,theme,cameraAngle] of specs){const f=forms.find(f=>f.id===id),m=id==='taegeuk-1'?{...original,POSES}:createFormMotion(JSON.parse(readFileSync(`data/lessons/${id}.json`)));let plan;
 if(id==='taegeuk-1')plan=m.referencePlans[1];else plan=m.referencePlans.find(p=>p.entry?.n===n&&p.actions.some(a=>a.type===type&&!(id==='koryo'&&(a.height||a.level)==='low')));
 if(!plan)throw Error('Missing real source pose: '+id+' '+n+' '+type);
 const p=m.poseAtIndex(plan.index),taegeuk=/^taegeuk-(\d)$/.exec(id),songahm=/^songahm-(\d)$/.exec(id),index=taegeuk?Number(taegeuk[1]):songahm?Number(songahm[1]):null;
 files.push({id,src:`/assets/forms/${id}.webp`,width:960,height:540,poseIndex:plan.index,poseNumber:plan.index+1,poseName:m.POSES[plan.index].name,referenceCounts:m.POSES[plan.index].official,sourcePoseSha256:createHash('sha256').update(signature(p)).digest('hex'),theme,cameraAngle,series:taegeuk?'TAEGEUK':songahm?'SONGAHM':f.category==='itf'?'ITF PATTERN':'BLACK BELT FORM',number:index,trigram:taegeuk?trigrams[index-1]:null,meaning:f.meaning||'Pine tree & rock',name:f.name,alt:`${f.name}: the lesson character performing ${m.POSES[plan.index].name.toLowerCase()}.`});}
const plan={version:1,source:'Exact lesson rig and selected source pose endpoints; no generated people or altered technique',trigramReference:'https://www.nbtkda.com/poomsae',files};writeFileSync('data/form-thumbnails.json',JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({forms:files.length,poses:files.map(f=>({id:f.id,pose:f.poseNumber,name:f.poseName}))}));
