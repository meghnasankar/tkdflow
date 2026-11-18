/* Lesson help client: validation, pose context, composer races, stateless
   public answers, RPC parameters and page wiring for all 23 lessons. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createFormMotion} from '../js/animation/form-motion.js';
import {POSES as TAEGEUK_1} from '../js/lessons/taegeuk-1-data.js';
import {FORM_IDS} from '../js/lib/learning-model.js';
import {
 POSE_COUNTS,QuestionComposer,RequestIds,questionProblem,poseContext,poseLabel,poseHref,faqHref,safeReference,questionRecord,faqRecord,
 faqDraftProblems,helpErrorMessage,accessMessage,newRequestId,groupSummary,NEXT_STATUSES,paragraphs,
} from '../js/lib/lesson-help-model.js';
import {readPublicFaq,publicFaqEndpoint} from '../js/lib/public-faq.js';
import * as service from '../js/lib/lesson-help-service.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ID='11111111-2222-4333-8444-555555555555',ID2='11111111-2222-4333-8444-666666666666',ACCOUNT='aaaaaaaa-2222-4333-8444-555555555555',OTHER='bbbbbbbb-2222-4333-8444-555555555555';
const question=(over={})=>({id:ID,lesson_id:'taegeuk-2',pose_index:4,pose_count:25,body:'How far apart are my feet?',status:'submitted',created_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T10:00:00Z',replies:[],...over});
const ok=(over={})=>({data:{version:1,duplicate:false,question:question(over)},error:null});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const cfg={enabled:true,supabaseUrl:'https://exampleproject.supabase.co',supabaseAnonKey:'sb_publishable_TESTONLYexampleKEY123456'};

test('client pose counts match every lesson animation and the SQL table',()=>{
 const sql=JSON.parse(read('supabase/lesson-help.sql').match(/select \('(\{[^']+\})'::jsonb/)[1]);
 for(const id of FORM_IDS){
  const expected=id==='taegeuk-1'?TAEGEUK_1.length:createFormMotion(JSON.parse(read(`data/lessons/${id}.json`))).POSES.length;
  assert.equal(POSE_COUNTS[id],expected,id);assert.equal(sql[id],expected,`sql ${id}`);
 }
 assert.deepEqual(Object.keys(POSE_COUNTS).sort(),[...FORM_IDS].sort());
});

test('question text, pose context and links are validated and labelled as animation poses',()=>{
 assert.equal(questionProblem('too short'),'Use 10–1,000 characters for the question.');
 assert.equal(questionProblem('x'.repeat(1001)),'Use 10–1,000 characters for the question.');
 assert.match(questionProblem('A bell \u0007 character inside'),/unsupported characters/);
 assert.equal(questionProblem('  A long enough question?  '),null);
 assert.deepEqual(poseContext(4,25),{pose_index:4,pose_count:25});
 for(const [i,c] of [[25,25],[-1,25],[1.5,25],[0,0],[0,201],[3,undefined]])assert.equal(poseContext(i,c),null);
 assert.equal(poseLabel(4,25),'Animation pose 5 of 25');assert.equal(poseLabel(null,null),'The whole form');
 assert.equal(poseHref('taegeuk-2',4),'/taegeuk-2.html?pose=5#player','explicit ?pose= link (1-based) outranks resume');
 assert.equal(poseHref('taegeuk-2',null),'/taegeuk-2.html#player');
 assert.equal(poseHref('../evil',2),'/forms.html');
 assert.equal(faqHref('koryo',ID),`/lesson-faq.html?lesson=koryo#faq-${ID}`);
 assert.equal(faqHref('nope','x'),'/lesson-faq.html');
});

test('references must be credential-free https links',()=>{
 assert.equal(safeReference('https://www.kukkiwon.or.kr/eng/main'),'https://www.kukkiwon.or.kr/eng/main');
 for(const bad of ['javascript:alert(1)','http://example.com','https://user:pw@example.com/','https://example.com/a b','https://localhost/','https://example.com/"x','data:text/html,x','//example.com',`https://example.com/${'a'.repeat(500)}`,null,42])
  assert.equal(safeReference(bad),null,String(bad));
});

test('server records are validated and reduced to known fields',()=>{
 const row=questionRecord({...question(),author_id:ACCOUNT,email:'x@example.test',member:'Member A1B2C3',topic_key:null});
 assert.ok(row);assert.ok(!('author_id' in row)&&!('email' in row));assert.equal(row.member,'Member A1B2C3');
 for(const bad of [{lesson_id:'nope'},{pose_index:4,pose_count:null},{pose_index:25},{status:'deleted'},{replies:[{id:'x',body:'y',created_at:'z'}]},{id:'1'}])
  assert.equal(questionRecord(question(bad)),null,JSON.stringify(bad));
 const faq={id:ID,lesson_id:'taegeuk-2',pose_index:null,pose_count:null,question:'Q?',answer:'A.',source_url:'https://example.com/ref',source_label:'Ref',credit:'TKDflow moderators',published_at:'2026-11-17T10:00:00Z',updated_at:'2026-11-17T10:00:00Z',created_by:ACCOUNT};
 assert.ok(!('created_by' in faqRecord(faq)));
 assert.equal(faqRecord({...faq,source_url:'javascript:alert(1)'}),null,'unsafe links are refused, not rendered');
 assert.equal(faqRecord({...faq,lesson_id:'nope'}),null);
 assert.deepEqual(paragraphs('<b>one</b>\n\n two '),['<b>one</b>','two'],'markup stays literal text');
});

test('FAQ form problems mirror the server rules',()=>{
 const good={lesson:'taegeuk-2',pose:'5',count:25,question:'Why does the back foot turn out?',answer:'It keeps the hips square and the stance stable.',url:'',label:'',credit:'team'};
 assert.equal(faqDraftProblems(good),null);
 assert.ok(faqDraftProblems({...good,pose:'26'}).pose);assert.ok(faqDraftProblems({...good,pose:'0'}).pose);
 assert.ok(faqDraftProblems({...good,url:'http://x.com'}).url);assert.ok(faqDraftProblems({...good,label:'Only a label'}).url);
 assert.ok(faqDraftProblems({...good,credit:'instructor'}).credit,'no credential-style credit option');
 assert.ok(faqDraftProblems({...good,lesson:'x'}).lesson);
 assert.equal(faqDraftProblems({...good,pose:''}),null,'empty pose = whole form');
 assert.ok(faqDraftProblems({...good,credit:'keep'}).credit,'a new answer has no credit to keep');
 assert.equal(faqDraftProblems({...good,credit:'keep',editing:true}),null);
});

test('composer: a failed send keeps the draft, exact request ID and pose for the retry',async()=>{
 const sent=[],c=new QuestionComposer({lesson:'taegeuk-2',makeId:(n=>()=>`req-${++n}`)(0)});
 assert.equal((await c.submit(async()=>ok())).kind,'blocked');
 c.setAccount(ACCOUNT);c.capture(4,25);c.edit('How far apart should my feet be?');
 const failing=async args=>{sent.push(args);return {data:null,error:{code:'timeout',name:'TimeoutError'}};};
 assert.equal((await c.submit(failing)).kind,'error');
 assert.equal(c.draft,'How far apart should my feet be?');assert.match(c.message,/kept here/);
 await c.submit(failing);
 assert.deepEqual(sent[0],sent[1],'retry repeats the same payload and request ID');
 assert.deepEqual(sent[0],{account:ACCOUNT,lesson:'taegeuk-2',pose:4,body:'How far apart should my feet be?',request:'req-1'});
 c.edit('How far apart should my feet be in this stance?');
 await c.submit(failing);
 assert.equal(sent[2].request,'req-2','changed text gets a new request ID');
 c.capture(5,25);await c.submit(failing);
 assert.equal(sent[3].request,'req-3');assert.equal(sent[3].pose,5,'a changed pose gets a new request ID');
 const result=await c.submit(async args=>{sent.push(args);return ok({pose_index:5});});
 assert.equal(result.kind,'sent');assert.equal(sent[4].request,'req-3');
 assert.equal(c.draft,'');assert.equal(c.pose,null);assert.equal(c.requestId,null);
 assert.equal((await c.submit(async()=>ok())).kind,'invalid','an empty draft is not sent');
});

test('composer: pose is locked while sending and newer edits survive success',async()=>{
 const c=new QuestionComposer({lesson:'koryo',makeId:()=>'req'});c.setAccount(ACCOUNT);c.capture(2,52);c.edit('Is this the right ready stance?');
 const wait=deferred(),seen=[];
 const pending=c.submit(args=>{seen.push(args);return wait.promise;});
 assert.equal(c.status,'sending');
 assert.equal(c.capture(9,52),false,'pose cannot change mid-send');assert.equal(c.pose.pose_index,2);
 assert.equal((await c.submit(async()=>ok())).kind,'busy');
 c.edit('A follow-up typed while the first question was sending.');
 wait.resolve(ok({lesson_id:'koryo',pose_index:2,pose_count:52}));
 assert.equal((await pending).kind,'sent');
 assert.equal(seen[0].pose,2);
 assert.equal(c.draft,'A follow-up typed while the first question was sending.','in-flight edits are kept');
});

test('composer: switching accounts clears the draft and discards an in-flight result',async()=>{
 const c=new QuestionComposer({lesson:'koryo'});c.setAccount(ACCOUNT);c.capture(1,52);c.edit('A private question from the first account.');
 const wait=deferred(),pending=c.submit(()=>wait.promise);
 c.setAccount(OTHER);
 assert.equal(c.draft,'');assert.equal(c.pose,null);assert.equal(c.status,'idle');
 wait.resolve(ok());
 assert.equal((await pending).kind,'stale');
 assert.equal(c.last,null);assert.equal(c.message,'');
 assert.equal(c.setAccount(OTHER),false);
});

test('request IDs are reused only for an identical retry',()=>{
 const ids=new RequestIds((n=>()=>`id-${++n}`)(0));
 assert.equal(ids.for('reply:1',{body:'a'}),'id-1');assert.equal(ids.for('reply:1',{body:'a'}),'id-1');
 assert.equal(ids.for('reply:1',{body:'b'}),'id-2');ids.done('reply:1');assert.equal(ids.for('reply:1',{body:'b'}),'id-3');
 ids.clear();assert.equal(ids.for('reply:1',{body:'b'}),'id-4');
 assert.match(newRequestId(),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.match(newRequestId({getRandomValues:a=>a.fill(7)}),/^07070707-0707-4707-8707-070707070707$/);
});

test('public answers use a stateless request with only the public key',async()=>{
 const calls=[];
 const fetchImpl=async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>({version:1,entries:[]})};};
 const result=await readPublicFaq({lesson:'koryo',search:'stance'},{cfg,fetchImpl});
 assert.deepEqual(result,{data:{version:1,entries:[]},error:null});
 assert.equal(calls[0].url,'https://exampleproject.supabase.co/rest/v1/rpc/public_lesson_faq');
 assert.equal(calls[0].init.method,'POST');assert.equal(calls[0].init.credentials,'omit');
 assert.deepEqual(Object.keys(calls[0].init.headers).sort(),['accept','apikey','content-type'],'no Authorization/session header');
 assert.deepEqual(JSON.parse(calls[0].init.body),{lesson_filter:'koryo',search_text:'stance'});
 assert.equal((await readPublicFaq({},{cfg,fetchImpl:async()=>({ok:false,status:500})})).error.code,'500');
 assert.equal((await readPublicFaq({},{cfg,fetchImpl:async()=>{throw new TypeError('Failed to fetch');}})).error.code,'network');
 const started=Date.now(),slow=await readPublicFaq({},{cfg,ms:30,fetchImpl:()=>new Promise(()=>{})});
 assert.equal(slow.error.code,'timeout');assert.ok(Date.now()-started<1000);
 for(const bad of [{...cfg,enabled:false},{...cfg,supabaseUrl:'http://exampleproject.supabase.co'},{...cfg,supabaseUrl:'https://evil.example.com'},{...cfg,supabaseUrl:'http://127.0.0.1:8930'},{...cfg,supabaseUrl:'https://u:p@exampleproject.supabase.co'},{...cfg,supabaseAnonKey:''}])
  assert.equal(publicFaqEndpoint(bad),null,JSON.stringify(bad));
 assert.equal((await readPublicFaq({},{cfg:{...cfg,enabled:false},fetchImpl})).error.code,'unavailable');
 assert.equal(calls.length,1,'a disabled configuration sends nothing');
});

test('public answers never start an account client, even for a known under-13 visitor',()=>{
 for(const file of ['js/pages/lesson-faq.js','js/lib/lesson-faq-ui.js','js/lib/public-faq.js'])
  assert.doesNotMatch(read(file),/getAccountService\(|initAccountService\(|createClient|auth\./,file);
 const ui=read('js/lib/lesson-help-ui.js');
 const answers=ui.slice(ui.indexOf('async function loadAnswers'),ui.indexOf('/* ── private question'));
 assert.match(answers,/readPublicFaq\(/);assert.doesNotMatch(answers,/getAccountService/);
 const access=ui.slice(ui.indexOf('async function refreshAccess'));
 assert.ok(access.indexOf('INELIGIBLE')<access.indexOf('getAccountService('),'the age screen result is checked before any account client');
 const page=read('js/pages/lesson-help.js');
 assert.ok(page.indexOf('INELIGIBLE',page.indexOf('async function connect'))<page.indexOf('getAccountService(',page.indexOf('async function connect')));
});

test('sign-in changes clear private text immediately and cancel in-flight work',()=>{
 const ui=read('js/lib/lesson-help-ui.js');
 const callback=ui.slice(ui.indexOf('onAuthStateChange'),ui.indexOf('setTimeout(refreshAccess,0)'));
 for(const step of ['state.request++','composer.setAccount(next)','state.form=null','replaceChildren(ask'])assert.ok(callback.includes(step),step);
 const page=read('js/pages/lesson-help.js');
 const pageCallback=page.slice(page.indexOf('onAuthStateChange'),page.indexOf('setTimeout(connect,0)'));
 for(const step of ['connection++','clearPrivate()'])assert.ok(pageCallback.includes(step),step);
 const clear=page.slice(page.indexOf('function invalidateReads'),page.indexOf('/* Same account, changed rights'));
 for(const step of ['loads.mine++','loads.queue++','loads.faq++','ids.clear()','replyDrafts.clear()','pendingWrites.clear()','my-question-list','review-list','faq-admin-list',"$('faq-form').reset()",'resetFaqForm()'])assert.ok(clear.includes(step),step);
 assert.doesNotMatch(clear,/connection\+\+/,'clearing does not cancel the connect() that called it');
 assert.match(ui,/for\(const control of \[send,text,poseChoice,wholeChoice,useNow\]\)control\.disabled=sending/,'composing controls lock while sending');
});

test('RPC wrappers send the expected account on every member and moderator call',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push([name,args]);return {data:{version:1},error:null};}};
 await service.submitQuestion(client,{account:ACCOUNT,lesson:'koryo',pose:1,body:'b',request:ID});
 await service.myQuestions(client,ACCOUNT);
 await service.helpQueue(client,ACCOUNT,{lesson:'koryo',status:'open'});
 await service.setQuestionStatus(client,ACCOUNT,ID,'resolved');
 await service.replyQuestion(client,ACCOUNT,ID,'r',ID2);
 await service.groupQuestion(client,ACCOUNT,ID,'');
 await service.saveFaq(client,ACCOUNT,{lesson:'koryo',pose:null,question:'q',answer:'a',credit:'team',request:ID2,updatePublic:true});
 await service.setFaqPublished(client,ACCOUNT,ID,true,3);
 await service.faqAdmin(client,ACCOUNT);
 assert.deepEqual(calls.map(c=>c[0]),['submit_lesson_question','my_lesson_questions','lesson_help_queue','set_lesson_question_status','reply_lesson_question','group_lesson_question','save_lesson_faq','set_lesson_faq_published','lesson_faq_admin']);
 for(const [name,args] of calls)assert.equal(args.account_id,ACCOUNT,name);
 assert.equal(calls[5][1].group_key,null,'empty group clears it');
 assert.equal(calls[6][1].update_public,true);assert.equal(calls[6][1].reference_url,null);
 const hanging={rpc:()=>new Promise(()=>{})};
 assert.ok(!('publicFaq' in service),'public reads do not go through an account client');
 assert.equal(typeof (await Promise.race([service.helpAccess({rpc:async()=>({data:null,error:{message:'x'}})}),new Promise(r=>setTimeout(()=>r('hung'),2000))])),'object');
 void hanging;
});

test('error and access messages are specific and never expose internals',()=>{
 assert.match(helpErrorMessage({message:'Your sign-in changed. Reload this page before sending.'}),/sign-in changed/);
 assert.match(helpErrorMessage({message:'You have sent several questions recently.'}),/wait/);
 assert.match(helpErrorMessage({message:'This answer changed since you opened it.'}),/Reload the list/);
 assert.match(helpErrorMessage({code:'timeout'}),/kept here/);
 assert.equal(helpErrorMessage({message:'relation "public.secret" does not exist'}),'That did not work. Please try again.');
 for(const reason of ['sign-in','confirm-email','complete-profile','under-13','age-unconfirmed','ineligible','unavailable'])assert.ok(accessMessage(reason).length>20,reason);
 assert.match(accessMessage('under-13'),/stay open to everyone/);
 assert.deepEqual(NEXT_STATUSES.closed,['reviewed']);
 assert.deepEqual(groupSummary([{lesson_id:'koryo',key:'pose-3',count:'2',pose_index:2},{lesson_id:'bad',key:'x',count:5}],{koryo:'Koryo'}).map(g=>g.label),['2 open questions · Koryo · animation pose 3']);
});

test('all 23 lessons have an accessible help section linked to their own answers',()=>{
 for(const id of FORM_IDS){
  const html=read(`${id}.html`);
  assert.match(html,/<section class="lesson-help" id="lesson-help" aria-labelledby="lesson-help-title">\s*<h2 id="lesson-help-title">Help with this lesson<\/h2>/,id);
  assert.ok(html.includes(`href="/lesson-faq.html?lesson=${id}"`),`${id} links its answers`);
  assert.ok(html.includes('href="/lesson-help.html"'));
  assert.ok(html.includes('<link rel="stylesheet" href="/css/help.css">'));
  assert.ok(html.indexOf('id="lesson-help"')>html.indexOf('class="lesson-layout"'),'help sits below the player, never over it');
 }
 assert.match(read('js/pages/lesson-player.js'),/mountLessonHelp\(\{id:LESSON\.id,title:lessonTitle\(\),count:POSES\.length,player,/);
 assert.match(read('js/pages/form-lesson.js'),/mountLessonHelp\(\{id,/,'help still mounts if the animation fails');
 assert.match(read('css/help.css'),/\.lesson-study \.lesson-help \{ display: none; \}/,'Study view stays fitted');
});

test('help never moves the player, rewrites the address or writes saved learning',()=>{
 const ui=read('js/lib/lesson-help-ui.js');
 assert.doesNotMatch(ui,/learning-service|\.update\(|player\.(select|seek|next|prev|first|last|toggle|play|pause)\(|history\.|location\.(href|search)\s*=/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage\.setItem/,'private drafts stay in memory');
});

test('the public FAQ page and private questions page are registered correctly with no seeded content',()=>{
 const pages=JSON.parse(read('layout/pages.json')).pages;
 const faq=pages.find(p=>p.file==='lesson-faq.html'),mine=pages.find(p=>p.file==='lesson-help.html');
 assert.equal(faq.sitemap,true);assert.ok(!faq.noindex);
 assert.equal(mine.noindex,true);assert.equal(mine.sitemap,false);
 assert.match(read('sitemap.xml'),/lesson-faq\.html/);assert.doesNotMatch(read('sitemap.xml'),/lesson-help\.html/);
 for(const f of ['lesson-faq.html','lesson-help.html'])assert.doesNotMatch(read(f),/class="faq-item"|class="help-card"/,'no fabricated questions or answers');
 assert.equal(existsSync(new URL('../data/lesson-faq.json',import.meta.url)),false);
 assert.match(read('layout/footer.html'),/href="\/lesson-faq\.html"/);
 const help=read('lesson-help.html');
 assert.match(help,/New answers start as drafts and are published as a separate step\. Editing a published answer updates the public page only after you confirm it\./);
 assert.match(help,/id="faq-form-curated" type="checkbox" required/);
 assert.match(help,/This answer is public\. Update the public answer now\./);
 assert.doesNotMatch(help+read('js/pages/lesson-help.js'),/certified|qualified instructor reviewed|endorsed/i,'no unverified credential claims');
});

test('moderator page: each list keeps only its latest response and lost access hides panels',()=>{
 const page=read('js/pages/lesson-help.js');
 for(const [fn,key] of [['loadMine','mine'],['loadQueue','queue'],['loadFaqAdmin','faq']]){
  const body=page.slice(page.indexOf(`async function ${fn}`));
  assert.match(body.slice(0,600),new RegExp(`request=\\+\\+loads\\.${key}`),fn);
  assert.match(body.slice(0,900),new RegExp(`!guard\\.isCurrent\\(token\\)\\|\\|request!==loads\\.${key}`),`${fn} ignores older responses`);
 }
 const apply=page.slice(page.indexOf('function applyAccess'),page.indexOf('async function connect'));
 assert.match(apply,/if\(!next\.member\)clearMember\(\)/);assert.match(apply,/if\(!next\.moderator\)clearModerator\(\)/);
 assert.match(apply,/\$\('review-panel'\)\.hidden=!next\.moderator/);
 const connect=page.slice(page.indexOf('async function connect'));
 assert.match(connect.slice(0,400),/INELIGIBLE\)\{guard\.switchTo\(null\);account=null;clearPrivate\(\)/,'a known-ineligible session cancels private reads');
 assert.match(connect,/applyAccess\(result\.data\)/);
});

test('moderator page: FAQ editor and list actions lock while saving and unlock on reset',()=>{
 const page=read('js/pages/lesson-help.js');
 const busy=page.slice(page.indexOf('function setFaqBusy'),page.indexOf('function resetFaqForm'));
 assert.match(busy,/for\(const control of \$\('faq-form'\)\.elements\)control\.disabled=on/);
 assert.match(busy,/\$\('faq-admin-list'\)\.querySelectorAll\('button'\)/);
 assert.match(page.slice(page.indexOf('function resetFaqForm')),/^function resetFaqForm\(\)\{\n setFaqBusy\(false\)/,'reset (including on account switch) re-enables the editor');
 const submit=page.slice(page.indexOf('async function submitFaq'),page.indexOf('async function loadFaqAdmin'));
 assert.ok(submit.indexOf('setFaqBusy(true)')<submit.indexOf('await saveFaq('),'locked before the request');
 assert.match(submit,/e\.preventDefault\(\);if\(faqBusy\)return;/);
 assert.match(page,/function edit\(entry\)\{\n if\(faqBusy\)return;/,'no new edit can open mid-save');
 assert.match(page,/\$\('faq-credit-keep'\)\.checked=true/,'edits keep the existing credit by default');
});

test('moderator page: a pending review write locks that card across re-renders',()=>{
 const page=read('js/pages/lesson-help.js');
 const run=page.slice(page.indexOf('async function runWrite'),page.indexOf('function reviewTools'));
 assert.match(run,/if\(pendingWrites\.has\(q\.id\)\)return;/);
 assert.ok(run.indexOf('pendingWrites.add(q.id)')<run.indexOf('await work()'));
 const tools=page.slice(page.indexOf('function reviewTools'),page.indexOf('function renderQueue'));
 for(const control of ['replyText','sendReply','moves','groupInput','saveGroup'])assert.match(tools,new RegExp(`${control}=[^;]*disabled:busy`),`${control} is disabled while a write is pending`);
 assert.match(tools,/replyText\.value=replyDrafts\.get\(q\.id\)/,'the reply draft is restored on every render');
 assert.match(page,/const headingId=`\$\{review\?'review':'mine'\}-q-\$\{q\.id\}`/,'own and review copies of a question have distinct heading IDs');
});

test('moderator tools are reachable from Community moderation and the profile',()=>{
 assert.match(read('community.html'),/<section id="moderation" hidden><h2>Moderation<\/h2><p><a class="text-link" href="\/lesson-help\.html#review-panel">/);
 assert.match(read('profile.html'),/href="\/lesson-help\.html">Open lesson questions/);
 assert.match(read('learning.html'),/href="\/lesson-help\.html">My lesson questions/);
});

test('moderator page: losing rights cancels pending reads and writes (permission epoch)',()=>{
 const page=read('js/pages/lesson-help.js');
 assert.match(page,/function clearMember\(\)\{loads\.mine\+\+;/);
 assert.match(page,/function clearModerator\(\)\{\n loads\.queue\+\+;loads\.faq\+\+;modEpoch\+\+;/);
 const writes=page.split('\n').filter(line=>/await (work|saveFaq|setFaqPublished)\(/.test(line));
 assert.equal(writes.length,3,'every moderator write path is covered');
 for(const line of writes)assert.match(line,/if\(!guard\.isCurrent\(token\)\|\|epoch!==modEpoch\)return;/,line.trim().slice(0,60));
});

test('composer: the showing pose is attached when the form opens and again after a successful send',async()=>{
 const c=new QuestionComposer({lesson:'taegeuk-2',makeId:(n=>()=>`req-${++n}`)(0)});c.setAccount(ACCOUNT);
 assert.equal(c.ensurePose(true,4,25),true,'fresh form with pose scope attaches the showing pose');
 assert.deepEqual(c.pose,{pose_index:4,pose_count:25});
 assert.equal(c.ensurePose(true,9,25),false,'an attached pose is not silently replaced');
 assert.equal(c.ensurePose(false,4,25),false);
 const whole=new QuestionComposer({lesson:'taegeuk-2'});whole.setAccount(ACCOUNT);
 assert.equal(whole.ensurePose(false,4,25),false);assert.equal(whole.pose,null,'whole-form scope attaches nothing');
 assert.equal(whole.ensurePose(true,null,25),false,'no player means no pose');
 c.edit('Where should my fist finish in the low block?');
 const sent=[],fail=async args=>{sent.push(args);return {data:null,error:{code:'timeout'}};};
 await c.submit(fail);
 assert.equal(c.ensurePose(true,12,25),false,'a failed send keeps its pose');
 await c.submit(fail);
 assert.deepEqual([sent[1].pose,sent[1].request],[4,'req-1'],'retry keeps the exact pose and request ID');
 await c.submit(async()=>ok());
 assert.equal(c.pose,null);
 assert.equal(c.ensurePose(true,12,25),true,'after a successful send the pose showing is attached again');
 assert.deepEqual(c.pose,{pose_index:12,pose_count:25});
 assert.equal(c.requestId,null);
 const ui=read('js/lib/lesson-help-ui.js');
 assert.match(ui,/if\(composer\.draft\)text\.value=composer\.draft;\n[^\n]*\n  composer\.ensurePose\(poseChoice\.checked,currentIndex\(\),state\.count\);/,'attached on open');
 assert.match(ui,/if\(result\.kind==='sent'\)\{text\.value=composer\.draft;composer\.ensurePose\(poseChoice\.checked,currentIndex\(\),state\.count\);\}/,'attached again after success only');
});
