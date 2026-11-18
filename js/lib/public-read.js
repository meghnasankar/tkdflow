/* Stateless public reads from the project's REST API. Shared by public lesson
   answers and public Community reading. It never creates an account client,
   never reads or sends a session or cookie, and sends only the public project
   key, so it is safe for every visitor, including people who cannot have an
   account. Every request is bounded: it always resolves to {data,error}. */
import {ACCOUNTS} from '../config.js';
import {accountsConfigured} from './account-service.js';
import {publicKeyProblem} from './key-check.js';

/** https://<project>.supabase.co[/path] for a usable public configuration, else null. */
export function publicBase(cfg=ACCOUNTS){
 if(!accountsConfigured(cfg)||publicKeyProblem(cfg.supabaseAnonKey))return null;
 try{
  const base=new URL(cfg.supabaseUrl);
  if(base.protocol!=='https:'||!/\.supabase\.co$/.test(base.hostname)||base.username||base.password)return null;
  return `${base.origin}${base.pathname.replace(/\/$/,'')}`;
 }catch{return null;}
}

/** One bounded request. Only `apikey`, `accept` and (with a body) `content-type`
 *  headers are sent; credentials are omitted and nothing is cached. */
export async function publicRequest(url,{cfg=ACCOUNTS,fetchImpl=globalThis.fetch,ms=8000,method='GET',body,messages={}}={}){
 const failed=messages.failed||'Public data could not load.',slow=messages.timeout||'Public data timed out';
 if(!url||typeof fetchImpl!=='function')return {data:null,error:{code:'unavailable',message:messages.unavailable||'Public data is unavailable.'}};
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timer;
 const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller?.abort();resolve({data:null,error:{code:'timeout',name:'TimeoutError',message:slow}});},ms);});
 const headers={apikey:cfg.supabaseAnonKey,accept:'application/json'};
 if(body!==undefined)headers['content-type']='application/json';
 const work=(async()=>{
  try{
   const response=await fetchImpl(url,{method,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller?.signal,headers,
    ...(body!==undefined?{body:JSON.stringify(body)}:{})});
   if(!response?.ok)return {data:null,error:{code:String(response?.status||'network'),message:failed}};
   return {data:await response.json(),error:null};
  }catch(error){return {data:null,error:{code:'network',message:String(error?.message||'network')}};}
 })();
 try{return await Promise.race([work,deadline]);}finally{clearTimeout(timer);}
}
