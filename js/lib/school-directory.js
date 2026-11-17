import { bounded } from './account-ops.js';
export const SCHOOL_COLUMNS = 'id,name,country,region,city,website,source_url,source,license,imported_at';
export const SCHOOL_PAGE_SIZE = 100;
export const schoolText = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
const display = new Intl.DisplayNames(['en'], { type: 'region' });
export const countryName = code => { try { return code ? display.of(code) || code : 'Country not recorded'; } catch { return code; } };
export function schoolLabel(s) { return [s.name, [s.city, s.region, s.country ? countryName(s.country) : ''].filter(Boolean).join(', ')].filter(Boolean).join(' — '); }
export function filterSchools(rows, { query = '', country = '', region = '', city = '' } = {}) {
  const words = schoolText(query).split(/\s+/).filter(Boolean);
  return rows.filter(s => (!country || s.country === country) && (!region || s.region === region) && (!city || s.city === city)
    && words.every(word => schoolText([s.name,s.city,s.region,s.country,countryName(s.country)].join(' ')).includes(word)))
    .sort((a,b) => schoolLabel(a).localeCompare(schoolLabel(b)) || a.id.localeCompare(b.id));
}
export function schoolChoices(rows, filters, selected = '', limit = SCHOOL_PAGE_SIZE) {
  const matches = filterSchools(rows, filters), shown = matches.slice(0,limit);
  const current = rows.find(s => s.id === selected);
  if (current && !shown.some(s => s.id === selected)) shown.unshift(current);
  return { rows: shown, total: matches.length };
}
export async function loadSchoolDirectory(client, fetcher = globalThis.fetch) {
  const snapshot = await bounded(async () => {
    const response = await fetcher('/data/schools.json');
    if (!response.ok) throw new Error('School snapshot unavailable');
    return { data: await response.json(), error: null };
  }, { ms: 8000, label: 'School snapshot' });
  const live = client ? await bounded(async () => {
    const rows = [];
    for (let start=0;start<20000;start+=1000) {
      const response=await client.from('school_directory').select(SCHOOL_COLUMNS).order('id').range(start,start+999);
      if(response.error) return response;
      rows.push(...response.data || []);
      if((response.data || []).length<1000) return {data:rows,error:null};
    }
    throw new Error('School directory is too large to load');
  },{ms:10000,label:'School directory'}) : {data:null,error:new Error('Offline')};
  const meta = snapshot.data || {};
  // A successful database response is authoritative, including an empty directory.
  return { rows: live.error ? meta.schools || [] : live.data || [], countries: meta.countries || [],
    snapshotDate: meta.importedAt || '', offline: Boolean(live.error), unavailable: Boolean(live.error && snapshot.error) };
}
export const ownSchoolStatus = client => bounded(() => client.rpc('school_submission_status'), {label:'School suggestion status'});
export const schoolReviewQueue = client => bounded(() => client.rpc('school_review_queue'), {label:'School review queue'});
export const reviewSchool = (client,id,decision,details) => bounded(() => client.rpc('review_school',{suggestion_id:id,decision,details}), {label:'Reviewing school'});
