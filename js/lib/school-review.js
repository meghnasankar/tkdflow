import { h, safeHref } from './dom.js';
import { bounded } from './account-ops.js';
import { countryName, schoolLabel, schoolReviewQueue, reviewSchool, ownSchoolStatus } from './school-directory.js';
export async function showSchoolSubmission(client, current=()=>true) {
  const el=document.getElementById('school-submission-status');
  const result=await ownSchoolStatus(client);
  if(!current())return;
  const status=result.data?.status;
  el.textContent=result.error?'School review status could not be checked. Your saved school is kept.':status==='pending'?'Your school is saved privately and is awaiting directory review.':status==='rejected'?'Your school stays on your private profile. It was not added to the shared directory; contact support if its business details need correcting.':status==='approved'?'Your school suggestion was approved for the shared directory.':'';
}
export async function initSchoolReview(client, directory, current=()=>true) {
  const access=await bounded(()=>client.rpc('school_review_access'),{label:'School review access'});
  if(!current()||access.data!==true)return;
  const panel=document.getElementById('school-review'),list=document.getElementById('school-review-list'),status=document.getElementById('school-review-status');
  panel.hidden=false;
  let generation=0;
  const message=text=>{status.textContent=text;};
  async function load() {
    const check=++generation;message('Loading school suggestions…');
    const result=await schoolReviewQueue(client);
    if(!current()||check!==generation)return;
    if(result.error){message('The school review queue could not load. Try again.');return;}
    list.replaceChildren(...(result.data || []).map(render));
    message(result.data?.length?`${result.data.length} pending ${result.data.length===1?'suggestion':'suggestions'}${result.data.length===100?' · Review these, then reload for more.':''}.`:'No schools are awaiting review.');
  }
  function render(s) {
    const form=h('form',{class:'school-review-card'}),fields={};
    const field=(key,label,value,{required=false,type='text',max=100}={})=>{
      const id='review-'+s.id+'-'+key;
      const input=h('input',{id,type,value:value||'',maxlength:max,required});fields[key]=input;
      return h('div',{class:'form-group'},h('label',{for:id},label),input);
    };
    const existing=h('select',{id:'review-existing-'+s.id},h('option',{value:''},'Add a new school after checking its details'),...directory.rows.map(row=>h('option',{value:row.id},schoolLabel(row))));
    const country=h('select',{id:'review-country-'+s.id,required:true},h('option',{value:''},'Choose country'),...directory.countries.map(code=>h('option',{value:code},countryName(code))));country.value=s.country||'';fields.country=country;
    const existingSource=h('p',{class:'field-help'});
    const edit=h('div',{},field('name','School name',s.name,{required:true}),h('div',{class:'form-group'},h('label',{for:country.id},'Country'),country),field('region','State or region',s.region),field('city','City',s.city,{required:true}),field('website','School website (optional)',s.website,{type:'url',max:500}),field('source_url','Public source confirming this school',s.website,{required:true,type:'url',max:500}));
    existing.addEventListener('change',()=>{const row=directory.rows.find(row=>row.id===existing.value);const link=safeHref(row?.source_url);existingSource.replaceChildren(...(link?[h('a',{href:link,target:'_blank',rel:'noopener noreferrer'},'Check the existing school’s source')]:[]));edit.hidden=Boolean(existing.value);Object.values(fields).forEach(input=>{input.disabled=Boolean(existing.value);});});
    const approve=h('button',{type:'submit',class:'btn btn-primary'},'Approve school'),reject=h('button',{type:'button',class:'btn btn-secondary'},'Keep out of directory');
    const result=h('p',{role:'status',class:'field-help'});
    async function decide(decision) {
      approve.disabled=reject.disabled=true;result.textContent='Saving review…';
      const details=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value]));details.existing_id=existing.value;
      const response=await reviewSchool(client,s.id,decision,details);
      if(!current())return;
      if(response.error){result.textContent='The review could not be saved. Check the details and reload if it has already been reviewed.';approve.disabled=reject.disabled=false;return;}
      await load();
      message(decision==='approved'?'School approved and added to the shared picker. Reload the page to refresh the directory.':'School kept out of the public directory. The member’s private profile is preserved.');
    }
    form.addEventListener('submit',e=>{e.preventDefault();decide('approved');});reject.addEventListener('click',()=>decide('rejected'));
    const link=safeHref(s.website);
    form.append(h('h3',{},s.name),h('p',{},[s.city,s.region,countryName(s.country)].filter(Boolean).join(', ')),link?h('a',{href:link,target:'_blank',rel:'noopener noreferrer'},'Open suggested website'):document.createTextNode(''),h('div',{class:'form-group'},h('label',{for:existing.id},'Check for an existing campus'),existing),existingSource,edit,h('p',{class:'field-help'},'Publish business details only. Check the source and campus location; remove personal names or contact details. Approved directory facts are shared under ODbL.'),h('div',{class:'school-review-actions'},approve,reject),result);
    return form;
  }
  document.getElementById('school-review-refresh').onclick=load;
  await load();
}
