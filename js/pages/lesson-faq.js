/* Public lesson answers. Readable by everyone without signing in; this page
   never starts an account client (see public-faq.js). Text renders as text. */
import {h,replaceChildren} from '../lib/dom.js';
import {loadJSON} from '../lib/data.js';
import {validateForms} from '../lib/validators.js';
import {readPublicFaq} from '../lib/public-faq.js';
import {faqRecord,isLesson} from '../lib/lesson-help-model.js';
import {faqItem} from '../lib/lesson-faq-ui.js';
import {FORM_IDS} from '../lib/learning-model.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let lesson=isLesson(params.get('lesson'))?params.get('lesson'):'',query=(params.get('q')||'').slice(0,100),names={},request=0,timer=null,opened=false;

function writeUrl(){const p=new URLSearchParams();if(lesson)p.set('lesson',lesson);if(query.trim())p.set('q',query.trim());history.replaceState(null,'',`${location.pathname}${p.size?'?'+p:''}${location.hash}`);}
function status(text){$('faq-status').textContent=text;}
async function load(){
 const current=++request;$('faq-retry').hidden=true;status('Loading answers…');
 const result=await readPublicFaq({lesson:lesson||null,search:query.trim()||null});
 if(current!==request)return;
 const entries=result.data?.version===1&&Array.isArray(result.data.entries)?result.data.entries.map(faqRecord):null;
 if(result.error||!entries||entries.some(e=>!e)){
  status(navigator.onLine===false?'You appear to be offline. Answers will load when you reconnect.':'Answers could not load right now.');
  $('faq-retry').hidden=false;replaceChildren($('faq-results'));return;
 }
 const filtered=query.trim()?` matching “${query.trim()}”`:'';
 if(!entries.length){
  status(query.trim()?`No answers${filtered}.`:lesson?`No answers have been published for ${names[lesson]||lesson} yet.`:'No lesson answers have been published yet.');
  replaceChildren($('faq-results'));return;
 }
 status(`${entries.length} answer${entries.length===1?'':'s'}${filtered}${lesson?` for ${names[lesson]||lesson}`:''}.`);
 const groups=FORM_IDS.map(id=>[id,entries.filter(e=>e.lesson_id===id)]).filter(([,rows])=>rows.length);
 replaceChildren($('faq-results'),...groups.map(([id,rows])=>h('section',{class:'faq-lesson-group','aria-labelledby':`faq-group-${id}`},
  h('h2',{id:`faq-group-${id}`},names[id]||id,' ',h('a',{href:`/${id}.html`,class:'text-link'},'Open lesson')),
  h('div',{class:'faq-list'},...rows.map(e=>faqItem(e,{lessonName:names[id]||id}))))));
 if(!opened){
  opened=true;const target=/^#faq-[0-9a-f-]{36}$/i.test(location.hash)?document.getElementById(location.hash.slice(1)):null;
  if(target){target.open=true;target.querySelector('summary').focus();target.scrollIntoView({block:'start'});}
 }
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{writeUrl();load();},300);}

$('faq-q').value=query;
$('faq-q').addEventListener('input',e=>{query=e.target.value.slice(0,100);schedule();});
$('faq-lesson').addEventListener('change',e=>{lesson=isLesson(e.target.value)?e.target.value:'';writeUrl();load();});
$('faq-search').addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);writeUrl();load();});
$('faq-retry').addEventListener('click',load);
window.addEventListener('online',load);
try{const forms=await loadJSON('/data/forms.json',{validate:validateForms,timeoutMs:6000});for(const f of forms)names[f.id]=f.name;}catch{/* lesson IDs stay readable */}
$('faq-lesson').append(...FORM_IDS.map(id=>h('option',{value:id},names[id]||id)));
$('faq-lesson').value=lesson;
load();
