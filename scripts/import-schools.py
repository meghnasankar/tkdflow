#!/usr/bin/env python3
"""Build a licensed, first-party school snapshot and seed from cached public OSM/Photon data.
No network requests, credentials or member records. See docs/school-directory.md.
"""
import argparse,json,re,unicodedata,hashlib
from pathlib import Path
from datetime import datetime,timezone
p=argparse.ArgumentParser();p.add_argument('--input',type=Path,required=True);p.add_argument('--countries',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--seed',type=Path,required=True);a=p.parse_args()
now=datetime.now(timezone.utc).isoformat(timespec='seconds');kind={'N':'node','W':'way','R':'relation'}
features={};details={};provenance=[]
for f in sorted(a.input.glob('photon-*.json')):
 d=json.loads(f.read_text());provenance.append({'file':f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'returned':len(d.get('features',[]))})
 for row in d.get('features',[]):
  v=row['properties'];features[(kind[v['osm_type']],v['osm_id'])]=row
for f in a.input.glob('osm-detail-*.json'):
 for row in json.loads(f.read_text()).get('elements',[]):details[(row['type'],row['id'])]=row
clean=lambda v:re.sub(r'\s+',' ',str(v or '')).strip()
def normal(v):return re.sub(r'[^\w]','',unicodedata.normalize('NFKD',v).lower())
def url(v):
 v=clean(v).split(';')[0]
 if v and not re.match(r'^\w+://',v):v='https://'+v
 return v if len(v)<=500 and re.match(r'^https?://[^\s]+$',v)else ''
rows=[];skipped=[]
for key,row in sorted(features.items()):
 v=row['properties'];detail=details.get(key);t=detail.get('tags',{})if detail else {};name=clean(t.get('name')or v.get('name'))
 if detail and (detail.get('visible')is False or not t):skipped.append([*key,'removed or untagged']);continue
 if any(t.get(k)in ['yes','true','1']for k in ['disused','abandoned','demolished','closed']):skipped.append([*key,'inactive']);continue
 if t.get('shop') or v.get('osm_key')in ['highway','place','boundary','natural'] or t.get('office')in ['government','association'] or re.search(r'\b(federation|association|federación|federacion)\b',name,re.I):skipped.append([*key,'not a school']);continue
 if not any(x in normal(name)for x in ['taekwondo','태권','跆拳']):skipped.append([*key,'name did not identify taekwondo']);continue
 if not 2<=len(name)<=100:skipped.append([*key,'name length']);continue
 country=clean(t.get('addr:country')or v.get('countrycode')).upper();country=country if re.match(r'^[A-Z]{2}$',country)else None
 region=clean(v.get('state')or t.get('addr:state'))[:100];city=clean(t.get('addr:city')or t.get('addr:town')or t.get('addr:village')or v.get('city')or v.get('town')or v.get('village'))[:100]
 website=url(t.get('website')or t.get('contact:website'))
 # Names/campus coordinates deduplicate redundant node+building representations only.
 coords=row.get('geometry',{}).get('coordinates',[])
 duplicate=next((s for s in rows if normal(s['name'])==normal(name) and s['country']==country and s['_coords'] and coords and sum((s['_coords'][i]-coords[i])**2 for i in [0,1])<0.0004**2),None)
 if duplicate:
  if not duplicate['website']:duplicate['website']=website
  skipped.append([*key,'same-name nearby mapped duplicate']);continue
 rows.append({'id':'osm/'+key[0]+'/'+str(key[1]),'name':name,'country':country,'region':region,'city':city,'website':website,'source_url':'https://www.openstreetmap.org/'+key[0]+'/'+str(key[1]),'source':'OpenStreetMap contributors (Photon search)','license':'ODbL-1.0','imported_at':now,'_coords':coords})
# One individually checked official-school fact, separate from the OSM extraction.
rows.append({'id':'tkd/young-moo-somerset','name':'Young Moo Taekwondo','country':'US','region':'New Jersey','city':'Somerset','website':'https://youngmootkd.com','source_url':'https://youngmootkd.com/page/contact-us','source':'School official website','license':'ODbL-1.0','imported_at':now,'_coords':[]})
for s in rows:s.pop('_coords',None)
rows.sort(key=lambda s:(s['country']or'',s['name'].casefold(),s['id']))
result={'version':1,'importedAt':now,'license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','sourceUrl':'https://www.openstreetmap.org/copyright','coverage':'Initial partial worldwide name-search snapshot, plus individually sourced schools. Not a complete registry or proof a school is currently operating. New school suggestions require admin review.','countries':json.loads(a.countries.read_text()),'schools':rows}
a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
payload=json.dumps(rows,ensure_ascii=False,separators=(',',':'));assert '$schools$'not in payload
sql="""-- Initial sourced school directory, ODbL-1.0. Apply after school-directory.sql.
-- Re-running preserves existing directory corrections and inactive flags.
begin;
insert into public.school_directory(id,name,country,region,city,website,source_url,source,license,imported_at)
select id,name,country,region,city,website,source_url,source,license,imported_at::timestamptz
from jsonb_to_recordset($schools$"""+payload+"""$schools$::jsonb) as s(id text,name text,country text,region text,city text,website text,source_url text,source text,license text,imported_at text)
on conflict(id) do nothing;
commit;
"""
a.seed.write_text(sql)
(a.input/'import-report.json').write_text(json.dumps({'importedAt':now,'count':len(rows),'countries':len(set(s['country']for s in rows if s['country'])),'mappedDetailsFetched':len(details),'searchObjects':len(features),'skipped':skipped,'sourceFiles':provenance},ensure_ascii=False,indent=2))
print(json.dumps({'schools':len(rows),'countries':len(set(s['country']for s in rows if s['country'])),'withCity':sum(bool(s['city'])for s in rows),'withWebsite':sum(bool(s['website'])for s in rows),'skipped':len(skipped)}))
