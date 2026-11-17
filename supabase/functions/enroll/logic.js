export function enrollmentBand(age){
 if(!Number.isInteger(age)||age<1||age>120)return null;
 return age<13?'ineligible':age<18?'teen':'adult';
}
export async function readSmallJson(req,max=256){
 const reader=req.body?.getReader();if(!reader)throw Error('Empty request');let total=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('Request too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));
}

/** Parse only named key dictionaries injected by Supabase; malformed configuration fails closed. */
export function keyDictionary(raw){
 try{const value=JSON.parse(raw);return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([,key])=>typeof key==='string')):{};}catch{return {};}
}
/** A public project key identifies this application; it does not grant member or moderator rights. */
export function validPublicApiKey(value,keys){
 return typeof value==='string'&&value.startsWith('sb_publishable_')&&Object.values(keys).some(key=>key===value);
}
