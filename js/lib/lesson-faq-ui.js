/* Renders one published answer as an accessible disclosure. Plain text only;
   reference links are already restricted to safe https URLs by faqRecord(). */
import {h} from './dom.js';
import {poseHref,poseLabel,paragraphs} from './lesson-help-model.js';

export function faqItem(entry,{headingLevel='h3',lessonName=null}={}){
 const meta=h('p',{class:'faq-meta'},
  entry.pose_index===null?'About the whole form':h('a',{href:poseHref(entry.lesson_id,entry.pose_index),class:'text-link'},`Open ${poseLabel(entry.pose_index,entry.pose_count).toLowerCase()}${lessonName?` in ${lessonName}`:''}`),
  ` · Answer by ${entry.credit}`,entry.updated_at?` · Updated ${new Date(entry.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`:'');
 return h('details',{class:'faq-item',id:`faq-${entry.id}`},
  h('summary',{},h(headingLevel,{class:'faq-question'},entry.question)),
  h('div',{class:'faq-answer'},...paragraphs(entry.answer).map(p=>h('p',{},p)),
   entry.source_url?h('p',{class:'faq-source'},'Reference: ',h('a',{href:entry.source_url,target:'_blank',rel:'noopener noreferrer'},entry.source_label||new URL(entry.source_url).hostname)):null,meta));
}
