/* The focus helper's own rules, with elements whose browser-like quirks the
   page harnesses do not model (a caret that jumps on programmatic focus). */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './helpers/mini-dom.mjs';
import {keepFocus,captureFocus,restoreFocus,focusTarget} from '../js/lib/focus-keep.js';

const is=(a,b,msg='not the expected element')=>assert.ok(a===b,`${msg} (got ${a?.dataset?.fk||a?.id||a?.tagName})`);

test('a rebuilt text field gets focus and its caret back, even if focusing moves the caret',()=>{
 const env=installDom();
 try{
  const {doc,el}=env,box=el('div');doc.body.append(box);
  const make=()=>{const t=el('textarea',{'data-fk':'note'});const focus=t.focus.bind(t);t.focus=o=>{focus(o);t.setSelectionRange(t.value.length,t.value.length);};return t;};
  const first=make();box.append(first);first.value='hello world';first.focus();first.setSelectionRange(2,5);
  keepFocus(box,()=>{const next=make();next.value='hello world';box.replaceChildren(next);});
  const now=doc.activeElement;
  assert.ok(now!==first&&now.dataset.fk==='note','focus moved to the rebuilt field by key');
  assert.deepEqual([now.selectionStart,now.selectionEnd],[2,5],'the caret is restored after focusing');
 }finally{env.restore();}
});

test('nothing moves when focus was outside, survived the update, or has no key and no element to return to',()=>{
 const env=installDom();
 try{
  const {doc,el}=env,region=el('div'),outside=el('input',{type:'search'});doc.body.append(outside,region);
  const button=el('button',{'data-fk':'b'});region.append(button);
  outside.focus();
  keepFocus(region,()=>region.replaceChildren(el('button',{'data-fk':'b'})));
  is(doc.activeElement,outside,'focus outside the region is never taken');
  const kept=region.children[0];kept.focus();
  keepFocus(region,()=>region.append(el('p')));
  is(doc.activeElement,kept,'focus that survived is left alone');
  const plain=el('button');region.replaceChildren(plain);plain.focus();
  let asked=false;
  keepFocus(region,()=>region.replaceChildren(el('p')),{fallback:()=>{asked=true;return null;}});
  assert.equal(asked,false,'an unkeyed control that vanished does not trigger a fallback');
  is(doc.activeElement,doc.body);
  assert.equal(restoreFocus(region,null),null);
  assert.equal(captureFocus(region),null,'nothing to capture when focus is on <body>');
 }finally{env.restore();}
});

test('a keyed control that vanished uses the bounded fallback once, synchronously',()=>{
 const env=installDom();
 try{
  const {doc,el}=env,region=el('div'),summary=el('p',{id:'summary'});doc.body.append(summary,region);
  const button=el('button',{'data-fk':'item:1'});region.append(button);button.focus();
  let calls=0;
  keepFocus(region,()=>region.replaceChildren(el('p')),{fallback:saved=>{calls++;assert.equal(saved.key,'item:1');return summary;}});
  assert.equal(calls,1);is(doc.activeElement,summary);
  assert.equal(summary.getAttribute('tabindex'),'-1','a non-interactive fallback becomes focusable without entering the tab order');
 }finally{env.restore();}
});

test('explicit focus never scrolls unless asked, and asked scrolling honours reduced motion',()=>{
 for(const reducedMotion of [false,true]){
  const env=installDom({reducedMotion});
  try{
   const {doc,el}=env,h=el('h2'),panel=el('section',{},h),link=el('a',{href:'/x'});doc.body.append(panel,link);
   focusTarget(link);assert.equal(link.hasAttribute('tabindex'),false,'links keep their natural tab order');
   assert.deepEqual(link.focusCalls.at(-1),{preventScroll:true});assert.equal(doc.scrolls.length,0);
   focusTarget(h,{scroll:true,scrollTarget:panel});
   is(doc.activeElement,h);assert.equal(doc.scrolls.length,1);
   is(doc.scrolls[0].element,panel);assert.equal(doc.scrolls[0].options.behavior,reducedMotion?'auto':'smooth');
  }finally{env.restore();}
 }
});
