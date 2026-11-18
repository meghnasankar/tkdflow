#!/usr/bin/env node
/* Read-only production check: does the live site match this checkout?
   GET requests only, no cookies, no credentials, no account or database calls.

     npm run check:live                                  # https://tkdflow.com, CSP enforced
     npm run check:live -- --csp enforced --base https://<deployment-origin> --json check-live.json
     npm run check:live -- --csp report-only             # a deployment from before CSP enforcement
     npm run check:live -- js/pages/forum.js             # also compare these public files
   (--origin is accepted as another name for --base.) Exit 0 = all pass,
   1 = a check failed, 2 = usage error. Expectations come from this checkout, so
   run it from the commit that was deployed.

   It checks:
   1. Public files: every sitemap page, every script and stylesheet, and any
      public files named on the command line, compared with the local file by
      SHA-256. A named file must be a regular, non-symlinked file inside the
      checkout, of a public type, and not a dot-file or development path.
   2. Headers: the headers vercel.json sets for every path, exactly, on an HTML
      page, a stylesheet and each favicon, each of which must answer 200; plus each path-specific rule (the
      favicons' Cache-Control). With --csp report-only the policy is expected as
      Content-Security-Policy-Report-Only and the enforcing header must be absent.
   3. Redirects: each vercel.json redirect answers 308 (or 307) to its destination.
   4. Development files stay private: every .vercelignore entry (a real file inside
      each listed folder), vercel.json and every dot-file or dot-folder in the
      checkout answer 404.
   Bounded: at most 100 named files, local files up to 25 MB, responses read no
   further than the expected size (private paths and headers: not read at all),
   8 requests at a time, 15 s each. */
import {readFileSync,readdirSync,lstatSync,existsSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalPath} from './serve.mjs';

const DEFAULT_ROOT=fileURLToPath(new URL('..',import.meta.url));
const DEFAULT_ORIGIN='https://tkdflow.com';
export const LIMITS=Object.freeze({files:100,fileBytes:25*1024*1024,pathLength:300});
const PUBLIC_EXT=new Set(['.html','.css','.js','.json','.svg','.woff2','.ico','.png','.webp','.jpg','.jpeg','.mp3','.wav','.txt','.xml']);
const LOOPBACK=new Set(['localhost','127.0.0.1','[::1]']);
export class UsageError extends Error{}
const sha=b=>createHash('sha256').update(b).digest('hex');
const posix=p=>p.split(sep).join('/');
/** Regular files under dir (symlinks skipped), as checkout-relative paths. */
const walk=(dir,root,match)=>!existsSync(dir)?[]:readdirSync(dir).sort().flatMap(n=>{const p=join(dir,n),st=lstatSync(p);return st.isSymbolicLink()?[]:st.isDirectory()?walk(p,root,match):st.isFile()&&match(n)?[posix(relative(root,p))]:[];});
const firstFile=dir=>{const names=readdirSync(dir).sort();for(const n of names){const st=lstatSync(join(dir,n));if(st.isFile())return join(dir,n);}for(const n of names){const p=join(dir,n);if(lstatSync(p).isDirectory()){const f=firstFile(p);if(f)return f;}}return null;};

/** A safe deployment origin: https (http only for loopback), no credentials, path, query or fragment. */
export function parseOrigin(value){
 let u;try{u=new URL(value);}catch{throw new UsageError('--base must be an origin such as https://tkdflow.com');}
 if(u.username||u.password)throw new UsageError('--base must not contain credentials');
 if(!(u.protocol==='https:'||u.protocol==='http:'&&LOOPBACK.has(u.hostname)))throw new UsageError('--base must use https (http only for localhost)');
 if(String(value).replace(/\/$/,'').toLowerCase()!==u.origin.toLowerCase())throw new UsageError('--base must be just an origin: no path, query or fragment');
 return u.origin;
}
/** Why `rel` may not be compared, or null for a permitted public file of this checkout. */
export function publicFileProblem(root,raw){
 if(typeof raw!=='string'||!raw||raw.length>LIMITS.pathLength)return 'not a file path';
 if(/^[a-z][a-z\d+.-]*:/i.test(raw)||raw.startsWith('//'))return 'not a site path (no URLs)';
 if(/[\0-\x1f\\%?#]/.test(raw))return 'unsupported characters';
 const rel=raw.replace(/^\//,''),segments=rel.split('/');
 if(segments.some(s=>!s||s==='.'||s==='..'))return 'not a plain path';
 if(segments.some(s=>s.startsWith('.')))return 'dot-files are private';
 if(canonicalPath('/'+rel).kind!=='ok')return 'a development path';
 if(!PUBLIC_EXT.has(extname(rel).toLowerCase()))return 'not a public file type';
 let p=root;
 for(const s of segments){p=join(p,s);let st;try{st=lstatSync(p);}catch{return 'not in this checkout';}if(st.isSymbolicLink())return 'a symlink';}
 const st=lstatSync(p);if(!st.isFile())return 'not a regular file';
 if(st.size>LIMITS.fileBytes)return 'larger than 25 MB';
 const realRoot=realpathSync(root);if(!realpathSync(p).startsWith(realRoot+sep))return 'outside the checkout';
 return null;
}

/** Development paths that must answer 404, derived from this checkout. */
export function privatePaths(root=DEFAULT_ROOT){
 const entries=readFileSync(join(root,'.vercelignore'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>l.replace(/^\//,''));
 const dots=readdirSync(root).filter(n=>n.startsWith('.')&&n!=='.git');
 const out=new Set(['vercel.json']);
 for(const name of [...entries,...dots]){
  if(name==='node_modules'||name.includes('*'))continue;   // installed locally, never uploaded
  const p=join(root,name);
  if(!existsSync(p)){out.add(name);continue;}
  const st=lstatSync(p);
  if(st.isDirectory()){const first=firstFile(p);if(first)out.add(posix(relative(root,first)));}
  else out.add(name);
 }
 return [...out].sort();
}
/** Public files compared byte for byte: sitemap pages, scripts, stylesheets and named files. */
export function publicFiles(root=DEFAULT_ROOT,extra=[]){
 if(extra.length>LIMITS.files)throw new UsageError(`at most ${LIMITS.files} named files`);
 for(const f of extra){const problem=publicFileProblem(root,f);if(problem)throw new UsageError(`${f}: ${problem}`);}
 const pages=JSON.parse(readFileSync(join(root,'layout/pages.json'),'utf8')).pages.filter(p=>p.sitemap).map(p=>({path:p.path,file:p.file}));
 const code=[...walk(join(root,'js'),root,n=>n.endsWith('.js')),...walk(join(root,'css'),root,n=>n.endsWith('.css')),'styles.css'].filter(f=>existsSync(join(root,f)));
 const seen=new Set(pages.map(p=>p.file));
 return [...pages,...[...code,...extra.map(f=>f.replace(/^\//,''))].filter(f=>!seen.has(f)&&seen.add(f)).map(f=>({path:'/'+f,file:f}))];
}
/** Header expectations per path: the global rule on an HTML page, a stylesheet and
 *  each path a specific rule names, plus that rule's own headers. */
export function headerExpectations(config,csp='enforced'){
 const CSP='Content-Security-Policy',REPORT='Content-Security-Policy-Report-Only';
 const global=((config.headers||[]).find(h=>h.source==='/(.*)')?.headers||[]).map(h=>csp==='report-only'&&h.key===CSP?{key:REPORT,value:h.value}:h);
 if(csp==='report-only')global.push({key:CSP,value:null});
 const specific=new Map();
 for(const rule of config.headers||[]){
  if(rule.source==='/(.*)')continue;
  const m=rule.source.match(/^\/\(([\w.|-]+)\)$/)||rule.source.match(/^\/([\w.-]+)$/);
  if(!m)throw new Error(`Unsupported header source in vercel.json: ${rule.source}`);
  for(const name of m[1].split('|'))specific.set('/'+name,[...(specific.get('/'+name)||[]),...rule.headers]);
 }
 return [...new Set(['/','/styles.css',...specific.keys()])].map(path=>({path,headers:[...global.filter(g=>!(specific.get(path)||[]).some(s=>s.key.toLowerCase()===g.key.toLowerCase())),...(specific.get(path)||[])]}));
}
/** Read at most `limit` bytes of a response body; returns null if it is longer. */
async function bounded(r,limit){
 if(!r.body)return Buffer.alloc(0);
 const declared=Number(r.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>limit){await r.body.cancel().catch(()=>{});return null;}
 const reader=r.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel().catch(()=>{});return null;}chunks.push(value);}
 return Buffer.concat(chunks);
}
const discard=r=>r.body?.cancel?.().catch(()=>{});

export async function runLiveChecks({origin=DEFAULT_ORIGIN,root=DEFAULT_ROOT,files=[],csp='enforced',fetchImpl=globalThis.fetch,timeoutMs=15000,concurrency=8}={}){
 origin=parseOrigin(origin);
 const config=JSON.parse(readFileSync(join(root,'vercel.json'),'utf8'));
 const list=publicFiles(root,files),expected=headerExpectations(config,csp);
 const results=[],ok=(name,pass,detail='')=>results.push({name,pass,detail});
 const get=path=>fetchImpl(new URL(path,origin).href,{method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
 const pool=async(items,fn)=>{let i=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(i<items.length)await fn(items[i++]);}));};

 await pool(list,async({path,file})=>{
  try{const local=readFileSync(join(root,file)),r=await get(path);
   if(r.status!==200){discard(r);ok(`file ${path}`,false,`HTTP ${r.status}`);return;}
   const body=await bounded(r,local.length);
   ok(`file ${path}`,body!==null&&sha(body)===sha(local),body===null?'live file is larger than this checkout’s':'live bytes differ from this checkout');}
  catch(e){ok(`file ${path}`,false,e.message);}
 });
 for(const {path,headers} of expected){
  try{const r=await get(path);discard(r);
   // Headers only count on the real page: a 404 or redirect carrying the same headers fails.
   ok(`status ${path}`,r.status===200,`HTTP ${r.status}`);
   for(const {key,value} of headers){const got=r.headers.get(key);ok(`header ${key} on ${path}`,r.status===200&&got===value,r.status!==200?`HTTP ${r.status}`:value===null?'must be absent':got===null?'missing':`got ${got}`);}}
  catch(e){ok(`headers on ${path}`,false,e.message);}
 }
 for(const {source,destination,permanent} of config.redirects||[]){
  try{const r=await get(source),loc=r.headers.get('location');discard(r);const to=loc&&new URL(loc,origin);
   ok(`redirect ${source}`,r.status===(permanent?308:307)&&to?.origin===origin&&to.pathname===destination,`HTTP ${r.status} → ${loc}`);}
  catch(e){ok(`redirect ${source}`,false,e.message);}
 }
 await pool(privatePaths(root),async rel=>{
  try{const r=await get('/'+rel);discard(r);ok(`private /${rel}`,r.status===404,`HTTP ${r.status}`);}
  catch(e){ok(`private /${rel}`,false,e.message);}
 });
 return results;
}

/** Parse the command line; throws a UsageError for anything unknown or unsafe. */
export function parseArgs(argv){
 const out={files:[],csp:'enforced',origin:undefined,json:null};
 for(let i=0;i<argv.length;i++){
  const a=argv[i],value=()=>{const v=argv[++i];if(!v||v.startsWith('--'))throw new UsageError(`${a} needs a value`);return v;};
  if(a==='--csp'){out.csp=value();if(!['enforced','report-only'].includes(out.csp))throw new UsageError('--csp must be enforced or report-only');}
  else if(a==='--base'||a==='--origin')out.origin=parseOrigin(value());
  else if(a==='--json'){out.json=value();if(!/\.json$/.test(out.json))throw new UsageError('--json must name a .json file');}
  else if(a.startsWith('-'))throw new UsageError(`Unknown option ${a}`);
  else out.files.push(a);
 }
 if(out.files.length>LIMITS.files)throw new UsageError(`at most ${LIMITS.files} named files`);
 return out;
}
async function main(argv){
 let args,results;
 try{args=parseArgs(argv);results=await runLiveChecks(args);}
 catch(e){if(e instanceof UsageError){console.error(`Usage error: ${e.message}`);process.exitCode=2;return;}throw e;}
 const failed=results.filter(r=>!r.pass);
 for(const r of failed)console.log(`FAIL ${r.name}: ${r.detail}`);
 if(args.json){const {writeFileSync}=await import('node:fs');writeFileSync(args.json,JSON.stringify({origin:args.origin||DEFAULT_ORIGIN,csp:args.csp,passed:results.length-failed.length,total:results.length,results},null,1)+'\n');}
 console.log(`${results.length-failed.length}/${results.length} live checks passed${args.origin?` for ${args.origin}`:''}.`);
 process.exitCode=failed.length?1:0;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main(process.argv.slice(2));
