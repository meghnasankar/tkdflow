/* Test-only reader of the PostgREST query subset the Community client emits:
   `col=eq.value`, `or=(…)` with nested `and(…)`, `lt`/`gt`/`eq`, double-quoted
   values, `order=a.desc,b.desc` and `limit=n`. It parses the real request URL
   (after URLSearchParams decoding), so tests check what the client actually
   sends, not a copy of the string-building code. Anything outside the subset
   throws, so a new operator or an unquoted reserved character is noticed. */
const OPS={lt:'<',gt:'>',eq:'='};

/** Split a logical list at top-level commas, respecting parentheses and quotes. */
function splitTop(text){
 const parts=[];let depth=0,quoted=false,start=0;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"')quoted=!quoted;
  else if(!quoted&&c==='(')depth++;
  else if(!quoted&&c===')')depth--;
  else if(!quoted&&depth===0&&c===','){parts.push(text.slice(start,i));start=i+1;}
  if(depth<0)throw new Error(`Unbalanced filter: ${text}`);
 }
 if(quoted||depth)throw new Error(`Unbalanced filter: ${text}`);
 parts.push(text.slice(start));return parts;
}
function parseItem(item){
 const logical=item.match(/^(and|or)\((.*)\)$/s);
 if(logical)return {op:logical[1],items:splitTop(logical[2]).map(parseItem)};
 const m=item.match(/^([a-z_]+)\.(lt|gt|eq)\.(.*)$/s);
 if(!m)throw new Error(`Unsupported filter item: ${item}`);
 let value=m[3];
 if(value.startsWith('"')){if(!/^"[^"]*"$/.test(value))throw new Error(`Bad quoting: ${value}`);value=value.slice(1,-1);}
 else if(/[,.:()"]/.test(value.replace(/^[\da-f-]+$/i,'')))throw new Error(`Reserved character must be quoted: ${value}`);
 return {col:m[1],cmp:m[2],value};
}
/** Parse the query of a REST URL into filters, logic tree, order and limit. */
export function parseQuery(url){
 const u=new URL(url),p=u.searchParams,out={table:u.pathname.split('/').pop(),eq:{},logic:null,order:[],limit:null,select:p.get('select')};
 for(const [k,v] of p){
  if(k==='select')continue;
  if(k==='or'){const m=v.match(/^\((.*)\)$/s);if(!m)throw new Error(`or must be parenthesised: ${v}`);out.logic={op:'or',items:splitTop(m[1]).map(parseItem)};}
  else if(k==='order')out.order=v.split(',').map(s=>{const [col,dir]=s.split('.');if(!['asc','desc'].includes(dir))throw new Error(`Bad order ${s}`);return {col,dir};});
  else if(k==='limit')out.limit=Number(v);
  else{const m=v.match(/^eq\.(.+)$/);if(!m)throw new Error(`Unsupported filter ${k}=${v}`);out.eq[k]=m[1];}
 }
 return out;
}
/** SQL for a parsed query, with $n parameters (timestamps and ids typed by column). */
export function toSql(q,columns,{keyColumns={created_at:'timestamptz',id:'uuid',topic_id:'uuid'}}={}){
 const params=[],add=(col,v)=>{params.push(v);const type=keyColumns[col]||'text';return `$${params.length}::${type}`;};
 const node=n=>n.items?`(${n.items.map(node).join(n.op==='and'?' and ':' or ')})`:`${ident(n.col)} ${OPS[n.cmp]} ${add(n.col,n.value)}`;
 const ident=c=>{if(!/^[a-z_]+$/.test(c))throw new Error(`Bad column ${c}`);return c;};
 const where=[...Object.entries(q.eq).map(([k,v])=>`${ident(k)} = ${add(k,v)}`),...(q.logic?[node(q.logic)]:[])];
 const select=columns.split(',').map(c=>c==='created_at'?`to_json(created_at)#>>'{}' as created_at`:ident(c)).join(',');
 return {text:`select ${select} from public.${ident(q.table)}${where.length?` where ${where.join(' and ')}`:''}${q.order.length?` order by ${q.order.map(o=>`${ident(o.col)} ${o.dir}`).join(', ')}`:''}${q.limit?` limit ${Number(q.limit)}`:''}`,params};
}
/** A JS predicate for a parsed logic tree over rows whose keys compare as given. */
export function toPredicate(q,compare){
 const test=(n,row)=>n.items?(n.op==='and'?n.items.every(i=>test(i,row)):n.items.some(i=>test(i,row))):{lt:c=>c<0,gt:c=>c>0,eq:c=>c===0}[n.cmp](compare(n.col,row[n.col],n.value));
 return row=>Object.entries(q.eq).every(([k,v])=>String(row[k])===v)&&(!q.logic||test(q.logic,row));
}
