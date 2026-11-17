export function enrollmentBand(age){
 if(!Number.isInteger(age)||age<1||age>120)return null;
 return age<13?'ineligible':age<18?'teen':'adult';
}
export async function readSmallJson(req,max=256){
 const reader=req.body?.getReader();if(!reader)throw Error('Empty request');let total=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw Error('Request too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));
}
