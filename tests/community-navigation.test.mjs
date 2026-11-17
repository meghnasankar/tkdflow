import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPreviewServer} from '../scripts/serve.mjs';
import {publishedTopic,mergePublishedTopics,starterGuides,copyDiscussionLink,reportDecisionMessage,resolveReport} from '../js/lib/discussions.js';
test('old forum links redirect to the unified Community page with their filters and selected topic intact',async()=>{
 const server=await createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const search='?category=training&q=block+%26+turn&topic=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const result=await fetch(origin+'/forum.html'+search,{redirect:'manual'});assert.equal(result.status,308);assert.equal(result.headers.get('location'),'/community.html'+search);
  const html=await (await fetch(origin+result.headers.get('location'))).text();
  assert.match(html,/id="community-discussions-pane"/);assert.match(html,/id="community-resources-pane" hidden/);assert.doesNotMatch(html,/data-nav="forum"/);
  assert.equal((html.match(/data-nav="community"/g)||[]).length,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('selected published topics can load independently of the first feed page and never request private columns',async()=>{
 const calls=[],id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',client={from(table){calls.push(table);return {select(cols){assert.doesNotMatch(cols,/author_id|email|age/);return this;},eq(key,value){calls.push([key,value]);return this;},maybeSingle(){return {data:{id,status:'published'},error:null};}};}};
 assert.equal((await publishedTopic(client,id)).data.id,id);assert.deepEqual(calls.slice(1),[['id',id],['status','published']]);
 const before=calls.length;assert.equal((await publishedTopic(client,'not-a-topic')).data,null);assert.equal(calls.length,before);
});
test('live feed visibility wins over static guides, so hidden guides are not reinserted',()=>{
 const guides=[{id:'guide-a',status:'published',resourceUrl:'forms.html',title:'Old title'}];
 assert.deepEqual(mergePublishedTopics(guides,[]),[]);
 assert.deepEqual(mergePublishedTopics(guides,[{id:'guide-a',status:'rejected'}]),[]);
 assert.equal(mergePublishedTopics(guides,[{id:'guide-a',status:'published',title:'Current title'}])[0].resourceUrl,'forms.html');
 assert.equal(mergePublishedTopics(guides,[{id:'guide-a',status:'published',title:'Current title'}])[0].title,'Current title');
});
test('starter cards use existing labelled editorial guides across three useful categories',()=>{
 const topics=JSON.parse(readFileSync(new URL('../data/forum.json',import.meta.url))).topics;
 const selected=starterGuides(topics);assert.equal(selected.length,3);assert.ok(selected.every(t=>t.editorial));assert.equal(new Set(selected.map(t=>t.category)).size,3);
});
test('copying a discussion link uses the unified canonical route, without unrelated search state',async()=>{
 let copied;const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';assert.equal(await copyDiscussionLink('https://tkdflow.com',id,{writeText:async value=>{copied=value;}}),true);
 assert.equal(copied,'https://tkdflow.com/community.html?topic='+id);
 assert.equal(await copyDiscussionLink('https://tkdflow.com',id,{writeText:async()=>{throw Error('blocked');}}),false);
 assert.equal(await copyDiscussionLink('https://tkdflow.com',id,null),false);
});
test('report decisions cannot supply reviewer identity or publication privileges',async()=>{
 let args;await resolveReport({rpc:(name,values)=>{assert.equal(name,'resolve_discussion_report');args=values;return {data:{resolution:'dismissed'}};}},'report-id','dismiss');
 assert.deepEqual(args,{report_id:'report-id',report_decision:'dismiss'});
 assert.match(reportDecisionMessage({already_reviewed:true}),/already reviewed/);assert.match(reportDecisionMessage({content_unavailable:true}),/no longer available/);
 assert.match(reportDecisionMessage({resolution:'dismissed'}),/kept/);assert.match(reportDecisionMessage({resolution:'hidden'}),/hidden/);
});
