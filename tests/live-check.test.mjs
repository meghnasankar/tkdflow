/* The read-only live checker (npm run check:live), exercised against the real
   local preview server, which applies vercel.json headers, redirects and the
   private-path rules. A wrapper changes single responses to prove each kind of
   difference is reported. Also: every dot-file in the checkout is excluded from
   deployment, so production can't serve one (it served /.gitattributes). */
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createPreviewServer} from '../scripts/serve.mjs';
import {runLiveChecks,privatePaths,parseArgs,parseOrigin,publicFileProblem,headerExpectations,UsageError} from '../scripts/check-live.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
let server,origin;
before(async()=>{server=await createPreviewServer({root:ROOT});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>server.close(r)));
const failures=results=>results.filter(r=>!r.pass).map(r=>r.name);

test('every dot-file and dot-folder in the checkout is excluded from deployment',()=>{
 const ignored=new Set(readFileSync(new URL('../.vercelignore',import.meta.url),'utf8').split('\n').map(l=>l.trim().replace(/^\//,'')).filter(l=>l&&!l.startsWith('#')));
 const dots=readdirSync(ROOT).filter(n=>n.startsWith('.')&&!['.git','.vercelignore'].includes(n));
 assert.ok(dots.includes('.gitattributes'));
 for(const n of dots)assert.ok(ignored.has(n),`${n} is listed in .vercelignore`);
 const paths=privatePaths(ROOT);
 for(const p of ['.gitattributes','.gitignore','.vercelignore','vercel.json','SETUP.md','supabase-setup.sql'])assert.ok(paths.includes(p),`checks /${p}`);
 assert.ok(paths.some(p=>p.startsWith('.github/'))&&paths.some(p=>p.startsWith('supabase/'))&&paths.some(p=>p.startsWith('tests/')),'a real file inside each private folder');
});

test('a deployment that matches this checkout passes every check, read-only',async()=>{
 const methods=new Set();
 const results=await runLiveChecks({origin,root:ROOT,fetchImpl:(url,init)=>{methods.add(init.method);return fetch(url,init);}});
 assert.deepEqual(failures(results),[]);
 assert.ok(results.length>150,'pages, scripts, styles, headers, redirects and private paths');
 assert.deepEqual([...methods],['GET']);
});

test('changed bytes, a missing header, a wrong redirect and a served private file are each reported',async()=>{
 const tamper=async(url,init)=>{
  const u=new URL(url);
  if(u.pathname==='/.gitattributes')return new Response('* text=auto\n',{status:200});
  const r=await fetch(url,init);
  if(u.pathname==='/js/site.js')return new Response((await r.text())+'\n',{status:200,headers:r.headers});
  if(u.pathname==='/'){const h=new Headers(r.headers);h.delete('x-content-type-options');return new Response(await r.arrayBuffer(),{status:r.status,headers:h});}
  if(u.pathname==='/forum.html')return new Response(null,{status:301,headers:{location:'/community.html'}});
  return r;
 };
 const failed=failures(await runLiveChecks({origin,root:ROOT,fetchImpl:tamper}));
 assert.ok(failed.includes('private /.gitattributes'),'served dot-file');
 assert.ok(failed.includes('file /js/site.js'),'changed bytes');
 assert.ok(failed.includes('header X-Content-Type-Options on /')||failed.some(n=>/^header x-content-type-options on \/$/i.test(n)),'missing header');
 assert.ok(failed.includes('redirect /forum.html'),'wrong redirect status');
 assert.equal(failed.length,4,`only the tampered responses fail: ${failed.join(', ')}`);
});

test('npm run check:live exists and the command exits 0 against a matching deployment',async()=>{
 assert.equal(JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts['check:live'],'node scripts/check-live.mjs');
 const r=await new Promise(resolve=>{
  // spawnSync would block this process's own preview server, so run it asynchronously.
  import('node:child_process').then(({spawn})=>{const c=spawn(process.execPath,['scripts/check-live.mjs','--origin',origin],{cwd:ROOT});let out='';c.stdout.on('data',d=>out+=d);c.on('close',code=>resolve({code,out}));});
 });
 assert.equal(r.code,0,r.out);assert.match(r.out,/^(\d+)\/\1 live checks passed for http:\/\/127\.0\.0\.1:\d+\.$/m);
});

test('the documented options work: --csp, --base (or --origin), --json; anything else is a usage error',async()=>{
 assert.deepEqual(parseArgs(['--csp','report-only','--base','https://example.vercel.app/','--json','out.json','js/site.js']),{files:['js/site.js'],csp:'report-only',origin:'https://example.vercel.app',json:'out.json'});
 assert.equal(parseArgs(['--origin','http://127.0.0.1:9']).origin,'http://127.0.0.1:9');
 for(const bad of [['--csp','off'],['--base','https://x.example/path'],['--base'],['--nope']])assert.throws(()=>parseArgs(bad),bad.join(' '));
 const report=failures(await runLiveChecks({origin,root:ROOT,csp:'report-only'}));
 assert.ok(report.includes('header Content-Security-Policy-Report-Only on /')&&report.includes('header Content-Security-Policy on /'),'an enforcing deployment fails a report-only expectation');
 const {spawn}=await import('node:child_process');
 const code=await new Promise(r=>spawn(process.execPath,['scripts/check-live.mjs','--csp','maybe'],{cwd:ROOT}).on('close',r));
 assert.equal(code,2,'usage error exit code');
});

test('every npm script named in SETUP.md and docs/RELEASE.md exists',()=>{
 const scripts=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
 for(const doc of ['SETUP.md','docs/RELEASE.md']){
  const named=[...readFileSync(new URL('../'+doc,import.meta.url),'utf8').matchAll(/npm run ([\w:-]+)/g)].map(m=>m[1]);
  assert.ok(named.includes('check:live'),`${doc} names check:live`);
  for(const n of named)assert.ok(scripts[n],`${doc}: npm run ${n} exists`);
 }
});

test('--base accepts only a bare https origin (http only on loopback)',()=>{
 assert.equal(parseOrigin('https://tkdflow.com/'),'https://tkdflow.com');
 assert.equal(parseOrigin('http://127.0.0.1:9002'),'http://127.0.0.1:9002');
 for(const bad of ['https://user:pw@tkdflow.com','https://tkdflow.com@evil.example','https://tkdflow.com/docs','https://tkdflow.com/?q=1','https://tkdflow.com/#x','http://tkdflow.com','ftp://tkdflow.com','//tkdflow.com','javascript:alert(1)','tkdflow.com',''])
  assert.throws(()=>parseOrigin(bad),UsageError,bad);
});

test('named files must be permitted public files of this checkout',()=>{
 for(const ok of ['js/site.js','/js/site.js','assets/icons.svg','data/forms.json'])assert.equal(publicFileProblem(ROOT,ok),null,ok);
 const refused={
  'https://evil.example/x.js':'URLs','//evil.example/x.js':'URLs','C:/x.js':'URLs',
  '../package.json':'plain','js/../package.json':'plain','js//site.js':'plain','js\\site.js':'characters','js/%2e%2e/x.js':'characters','js/site.js?x':'characters',
  '.gitattributes':'dot','js/.hidden.js':'dot','.github/workflows/check.yml':'dot',
  'package.json':'development','tests/site.test.mjs':'development','supabase/community.sql':'development','SETUP.md':'development','vercel.json':'development','docs/RELEASE.md':'development','scripts/serve.mjs':'development',
  'js/missing.js':'checkout','js':'type','LICENSE':'type',
 };
 for(const [path,why] of Object.entries(refused)){const p=publicFileProblem(ROOT,path);assert.ok(p,`${path} refused`);assert.match(p,new RegExp(why),`${path}: ${p}`);}
});

test('symlinks and files outside the checkout are refused, and refusal happens before any request',async()=>{
 // Both directories are new and unique; nothing outside them is created or removed.
 const root=mkdtempSync(join(tmpdir(),'check-live-root-')),outside=mkdtempSync(join(tmpdir(),'check-live-outside-'));
 try{
  mkdirSync(join(root,'js'));writeFileSync(join(root,'js/real.js'),'ok');writeFileSync(join(outside,'secret.txt'),'secret');
  symlinkSync(join(outside,'secret.txt'),join(root,'js/link.js'));symlinkSync(outside,join(root,'linked'));
  assert.equal(publicFileProblem(root,'js/real.js'),null);
  assert.match(publicFileProblem(root,'js/link.js'),/symlink/);
  assert.match(publicFileProblem(root,'linked/secret.txt'),/symlink/);
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
 let requests=0;
 await assert.rejects(runLiveChecks({origin,root:ROOT,files:['../package.json'],fetchImpl:async()=>{requests++;}}),UsageError);
 await assert.rejects(runLiveChecks({origin:'https://u:p@tkdflow.com',root:ROOT,fetchImpl:async()=>{requests++;}}),UsageError);
 assert.equal(requests,0,'nothing is fetched or hashed for a refused input');
 assert.throws(()=>parseArgs(Array.from({length:101},(_,i)=>`js/f${i}.js`)),UsageError,'at most 100 named files');
 const {spawn}=await import('node:child_process');
 const run=args=>new Promise(r=>{const c=spawn(process.execPath,['scripts/check-live.mjs',...args],{cwd:ROOT});let err='';c.stderr.on('data',d=>err+=d);c.on('close',code=>r({code,err}));});
 for(const args of [['.gitattributes'],['--base','https://tkdflow.com/x'],['--json','out.txt'],['-x']]){const r=await run(args);assert.equal(r.code,2,args.join(' '));assert.match(r.err,/^Usage error: /);}
});

test('a response larger than the local file is not read to the end, and favicon headers are checked',async()=>{
 const exp=headerExpectations(JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')));
 assert.deepEqual(exp.map(e=>e.path),['/','/styles.css','/favicon.svg','/favicon.ico']);
 const fav=exp.find(e=>e.path==='/favicon.svg').headers;
 assert.ok(fav.some(h=>h.key==='Cache-Control'&&h.value==='public, max-age=86400')&&fav.some(h=>h.key==='Content-Security-Policy'),'favicon gets its own cache rule and the global headers');
 let pulled=0;
 const endless=()=>new ReadableStream({pull(c){pulled++;c.enqueue(new Uint8Array(64*1024));}});
 const tamper=async(url,init)=>{const u=new URL(url);
  if(u.pathname==='/js/site.js')return new Response(endless(),{status:200});
  const r=await fetch(url,init);
  if(u.pathname==='/favicon.svg'){const h=new Headers(r.headers);h.set('cache-control','no-store');return new Response(await r.arrayBuffer(),{status:r.status,headers:h});}
  return r;};
 const results=await runLiveChecks({origin,root:ROOT,fetchImpl:tamper});
 const failed=results.filter(r=>!r.pass);
 assert.deepEqual(failed.map(r=>r.name).sort(),['file /js/site.js','header Cache-Control on /favicon.svg']);
 assert.match(failed.find(r=>r.name==='file /js/site.js').detail,/larger/);
 assert.ok(pulled<40,`stopped reading early (${pulled} chunks)`);
});

test('a header sample that is not 200 fails, even when it carries the expected headers',async()=>{
 const notFound=async(url,init)=>{const u=new URL(url),r=await fetch(url,init);
  if(u.pathname==='/styles.css'||u.pathname==='/favicon.ico')return new Response('missing',{status:404,headers:r.headers});
  return r;};
 const failed=(await runLiveChecks({origin,root:ROOT,fetchImpl:notFound})).filter(r=>!r.pass).map(r=>r.name);
 assert.ok(failed.includes('status /styles.css')&&failed.includes('status /favicon.ico'),failed.join(', '));
 assert.ok(failed.includes('header Content-Security-Policy on /styles.css')&&failed.includes('header Cache-Control on /favicon.ico'),'matching headers on a 404 do not pass');
 assert.ok(!failed.some(n=>/ on \/$| \/$|favicon\.svg/.test(n)),'the 200 samples still pass');
});
