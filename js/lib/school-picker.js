import { h, safeHref } from './dom.js';
import { NEW_SCHOOL } from './profile-model.js';
import { countryName, schoolLabel, schoolChoices } from './school-directory.js';
export function createSchoolPicker(prefix) {
  const $ = suffix => document.getElementById(`${prefix}-${suffix}`);
  const select=$('school'), wrap=$('school-new-wrap');
  let rows=[], saved=null, countries=[];
  const filters={query:'',country:'',region:'',city:''};
  const setOptions=(el,values,first,label=v=>v) => {
    const previous=el.value;
    el.replaceChildren(h('option',{value:''},first),...values.map(v=>h('option',{value:v},label(v))));
    if(values.includes(previous))el.value=previous;
  };
  function locations() {
    setOptions($('school-country'),[...new Set(rows.map(s=>s.country).filter(Boolean))].sort((a,b)=>countryName(a).localeCompare(countryName(b))),'All countries',countryName);
    filters.country=$('school-country').value;
    setOptions($('school-region'),[...new Set(rows.filter(s=>!filters.country||s.country===filters.country).map(s=>s.region).filter(Boolean))].sort(),'All regions');
    filters.region=$('school-region').value;
    setOptions($('school-city'),[...new Set(rows.filter(s=>(!filters.country||s.country===filters.country)&&(!filters.region||s.region===filters.region)).map(s=>s.city).filter(Boolean))].sort(),'All cities');
    filters.city=$('school-city').value;
  }
  const source=h('p',{class:'field-help'}); select.after(source);
  function showSource() {
    const record=rows.find(row=>row.id===select.value);
    const link=safeHref(record?.source_url);
    source.replaceChildren(...(link?[h('a',{href:link,target:'_blank',rel:'noopener noreferrer'},'Check this school’s source and location')]:[]));
  }
  function showCustom(focus=false) {
    const show=select.value===NEW_SCHOOL;
    wrap.hidden=!show;showSource();
    wrap.querySelectorAll('input,select').forEach(el=>{el.disabled=!show;});
    if(show&&focus)$('school-new').focus();
  }
  function render() {
    const value=select.value, result=schoolChoices(rows,filters,value);
    const options=[h('option',{value:''},'No school / prefer not to say')];
    if(saved?.school_name && (!saved.school_directory_id || !rows.some(s=>s.id===saved.school_directory_id))) {
      options.push(h('option',{value:saved.school_directory_id || '__saved__'},`${saved.school_name} — saved school`));
    }
    options.push(...result.rows.map(s=>h('option',{value:s.id},schoolLabel(s))),h('option',{value:NEW_SCHOOL},'+ My school is not listed…'));
    select.replaceChildren(...options);
    select.value=[...select.options].some(o=>o.value===value)?value:'';
    $('school-results').textContent=`${result.total.toLocaleString()} matching ${result.total===1?'school':'schools'}${result.total>100?' · Showing the first 100. Search or filter to narrow the list.':'.'}`;
    showCustom();
  }
  $('school-search').addEventListener('input',e=>{filters.query=e.target.value;render();});
  for(const key of ['country','region','city'])$('school-'+key).addEventListener('change',()=>{filters[key]=$('school-'+key).value;locations();render();});
  select.addEventListener('change',()=>showCustom(true));
  render();
  return {
    setData(data) {
      rows=data.rows;countries=data.countries;
      const selected=$('school-new-country').value;
      setOptions($('school-new-country'),countries,'Choose country',countryName);
      if(selected)$('school-new-country').value=selected;
      locations();render();
      $('school-coverage').replaceChildren(
        document.createTextNode(data.unavailable?'The school directory is unavailable. Your saved selection is kept. You can still add a school. ':`${rows.length.toLocaleString()} schools in the current directory. Coverage is incomplete; locations may be missing or outdated. ${data.offline?'Showing the saved directory snapshot. ':''}`),
        h('a',{href:'/data/schools.json'},'Download school data'),document.createTextNode(' · '),
        h('a',{href:'https://www.openstreetmap.org/copyright',target:'_blank',rel:'noopener noreferrer'},'© OpenStreetMap contributors · ODbL'),
        document.createTextNode(data.snapshotDate?` · Initial import ${data.snapshotDate.slice(0,10)}`:''));
    },
    setProfile(profile={}) {
      saved=profile;
      // Add the saved option before selecting, even if the list is still loading.
      render();
      const value=profile.school_directory_id || (profile.school_name?'__saved__':'');
      if(![...select.options].some(o=>o.value===value))select.append(h('option',{value},profile.school_name || value));
      select.value=value;showCustom();
    },
    read() {
      const value=select.value, record=rows.find(s=>s.id===value);
      if(value===NEW_SCHOOL)return {school_choice:NEW_SCHOOL,school_new:$('school-new').value,school_directory_id:null,school_country:$('school-new-country').value,school_region:$('school-new-region').value,school_city:$('school-new-city').value,school_website:$('school-new-website').value};
      if(record)return {school_choice:record.name,school_directory_id:record.id,school_country:record.country,school_region:record.region,school_city:record.city,school_website:record.website};
      if(value&&saved)return {school_choice:saved.school_name,school_directory_id:saved.school_directory_id,school_country:saved.school_country,school_region:saved.school_region,school_city:saved.school_city,school_website:saved.school_website};
      return {school_choice:'',school_directory_id:null,school_country:null,school_region:null,school_city:null,school_website:null};
    }
  };
}
