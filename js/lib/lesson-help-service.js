/* Narrow, bounded RPC calls for lesson help. Every call resolves to
   {data,error}; none throws or hangs. Tables are never queried directly.
   Member and moderator calls send the account the page loaded with; the
   server refuses the call if the signed-in account has changed since. */
import {bounded} from './account-ops.js';

export const helpAccess=client=>bounded(()=>client.rpc('lesson_help_access'),{label:'Question access'});
export const submitQuestion=(client,{account,lesson,pose,body,request})=>bounded(()=>client.rpc('submit_lesson_question',{account_id:account,lesson_id:lesson,pose_index:pose,question_body:body,request_id:request}),{label:'Sending question'});
export const myQuestions=(client,account)=>bounded(()=>client.rpc('my_lesson_questions',{account_id:account}),{label:'Your questions'});
export const helpQueue=(client,account,{lesson=null,status='open'}={})=>bounded(()=>client.rpc('lesson_help_queue',{account_id:account,lesson_filter:lesson,status_filter:status}),{label:'Question review'});
export const setQuestionStatus=(client,account,id,status)=>bounded(()=>client.rpc('set_lesson_question_status',{account_id:account,question_id:id,new_status:status}),{label:'Updating question'});
export const replyQuestion=(client,account,id,body,request)=>bounded(()=>client.rpc('reply_lesson_question',{account_id:account,question_id:id,reply_body:body,request_id:request}),{label:'Sending reply'});
export const groupQuestion=(client,account,id,key)=>bounded(()=>client.rpc('group_lesson_question',{account_id:account,question_id:id,group_key:key||null}),{label:'Grouping question'});
export const saveFaq=(client,account,f)=>bounded(()=>client.rpc('save_lesson_faq',{account_id:account,entry_id:f.entry??null,lesson_id:f.lesson,pose_index:f.pose??null,question_text:f.question,answer_text:f.answer,
 reference_url:f.url||null,reference_label:f.label||null,credit_mode:f.credit,expected_version:f.version??null,request_id:f.request,update_public:f.updatePublic===true}),{label:'Saving answer'});
export const setFaqPublished=(client,account,id,publish,version)=>bounded(()=>client.rpc('set_lesson_faq_published',{account_id:account,entry_id:id,publish,expected_version:version}),{label:'Publishing answer'});
export const faqAdmin=(client,account,lesson=null)=>bounded(()=>client.rpc('lesson_faq_admin',{account_id:account,lesson_filter:lesson}),{label:'Answers'});
// Public answers are read by public-faq.js without an account client.
