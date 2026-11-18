/* Stateless public read of published lesson answers. It never creates an
   account client, never reads or stores a session and sends only the public
   project key, so it is safe for every visitor, including people who cannot
   have an account. Bounded: always resolves to {data,error} within `ms`. */
import {ACCOUNTS} from '../config.js';
import {accountsConfigured} from './account-service.js';
import {publicKeyProblem} from './key-check.js';

export function publicFaqEndpoint(cfg=ACCOUNTS){
 if(!accountsConfigured(cfg)||publicKeyProblem(cfg.supabaseAnonKey))return null;
 try{
  const base=new URL(cfg.supabaseUrl);
  if(base.protocol!=='https:'||!/\.supabase\.co$/.test(base.hostname)||base.username||base.password)return null;
  return `${base.origin}${base.pathname.replace(/\/$/,'')}/rest/v1/rpc/public_lesson_faq`;
 }catch{return null;}
}

export async function readPublicFaq({lesson=null,search=null}={},{cfg=ACCOUNTS,fetchImpl=globalThis.fetch,ms=8000}={}){
 const url=publicFaqEndpoint(cfg);
 if(!url||typeof fetchImpl!=='function')return {data:null,error:{code:'unavailable',message:'Answers are unavailable.'}};
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timer;
 const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller?.abort();resolve({data:null,error:{code:'timeout',name:'TimeoutError',message:'Lesson answers timed out'}});},ms);});
 const work=(async()=>{
  try{
   const response=await fetchImpl(url,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller?.signal,
    headers:{apikey:cfg.supabaseAnonKey,'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({lesson_filter:lesson||null,search_text:search||null})});
   if(!response?.ok)return {data:null,error:{code:String(response?.status||'network'),message:'Answers could not load.'}};
   return {data:await response.json(),error:null};
  }catch(error){return {data:null,error:{code:'network',message:String(error?.message||'network')}};}
 })();
 try{return await Promise.race([work,deadline]);}finally{clearTimeout(timer);}
}
