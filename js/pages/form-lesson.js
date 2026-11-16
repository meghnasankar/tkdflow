/* Only the selected form's factual sequence is loaded. */
import {loadJSON} from '../lib/data.js';
import {createFormMotion} from '../animation/form-motion.js';
import {mountLesson} from './lesson-player.js';
const id=document.body.dataset.formId;
async function start(){
 try{
  if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid lesson');
  const form=await loadJSON(`/data/lessons/${id}.json`,{validate:f=>f?.id===id&&Array.isArray(f.sequence)&&f.sequence.length&&Array.isArray(f.sources)&&f.sources.length?null:'Missing movement reference'});
  const MOTION=createFormMotion(form);
  await mountLesson({POSES:MOTION.POSES,LESSON:MOTION.LESSON,MOTION});
 }catch{
  document.getElementById('character-loading').hidden=true;
  document.getElementById('lesson-canvas').hidden=true;
  const message=document.getElementById('lesson-fallback');message.hidden=false;message.textContent='This animation could not load. Reload the page to try again, or use the movement references below.';
  document.querySelectorAll('.lesson-controls button,.lesson-controls select,#lesson-progress,#btn-copy-link,#study-view,[data-lesson-view]').forEach(control=>{control.disabled=true;});
  document.getElementById('lesson-clock').textContent='Lesson unavailable';
 }
}
start();
