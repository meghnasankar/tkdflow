/* No exact age, birthdate, email, credential or request payload is logged/stored.
   Deploy behind Supabase's gateway and configured rate limit before enabling signup. */
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {enrollmentBand,readSmallJson} from './logic.js';
const allowed=new Set((Deno.env.get('TKDFLOW_ALLOWED_ORIGINS')||'https://tkdflow.com').split(',').map(s=>s.trim()));
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://tkdflow.com','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json','Vary':'Origin','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 const respond=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method!=='POST'||!allowed.has(origin))return respond(403,{error:'Enrollment unavailable from this origin.'});
 if(Number(req.headers.get('Content-Length')||0)>256)return respond(413,{error:'Request too large.'});
 let band:string|null;try{const data=await readSmallJson(req);band=enrollmentBand(data.age);}catch{return respond(400,{error:'Enter an age in whole years.'});}
 if(!band)return respond(400,{error:'Enter an age in whole years.'});
 if(band==='ineligible')return respond(403,{error:'Use the public learning resources without an account.'});
 const token=crypto.randomUUID()+crypto.randomUUID();
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await admin.rpc('issue_enrollment',{ticket_hash:hash,age_band:band});
 if(error)return respond(503,{error:'Enrollment is temporarily unavailable.'});
 return respond(200,{ticket:token,expiresIn:900});
});
