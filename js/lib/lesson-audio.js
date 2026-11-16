/* Recorded audio follows the lesson clock. Nothing is generated in a browser. */
export function createLessonAudio(audio,{onFail=()=>{},now=()=>performance.now(),timeoutMs=10000}={}){
 let enabled=true,failed=!audio,pending=false,version=0,waitingSince=null,lastSeek=null;
 function stop(){version++;pending=false;waitingSince=null;if(audio&&!audio.paused)audio.pause();}
 function fail(){if(failed)return;failed=true;enabled=false;stop();onFail();}
 if(audio){audio.preload='auto';for(const name of ['preservesPitch','webkitPreservesPitch','mozPreservesPitch'])if(name in audio)audio[name]=true;audio.addEventListener('error',fail);}
 function update({time,playing,rate}){
  if(!audio||failed||!enabled)return true;
  if(!playing){stop();return true;}
  // A decoder can reach the padded end a frame before the visual clock.
  // Calling play() on an ended element would restart it at zero.
  if(audio.ended&&Number.isFinite(audio.duration)&&time>=audio.duration-.20){stop();return true;}
  if(audio.playbackRate!==rate)audio.playbackRate=rate;
  if(audio.readyState>=1&&Math.abs(audio.currentTime-time)>.16&&(!audio.seeking||lastSeek===null||Math.abs(lastSeek-time)>.05)){
   try{audio.currentTime=time;lastSeek=time;}catch{fail();return true;}
  }
  if(audio.paused&&!pending){
   pending=true;const requestVersion=version;
   try{const result=audio.play();Promise.resolve(result).then(()=>{if(requestVersion===version)pending=false;},error=>{if(requestVersion===version){pending=false;if(error?.name!=='AbortError')fail();}});}catch{fail();return true;}
  }
  const ready=audio.readyState>=3&&!audio.paused&&!audio.seeking;
  audio.muted=!ready;
  if(ready)waitingSince=null;
  else{waitingSince??=now();if(now()-waitingSince>timeoutMs){fail();return true;}}
  return ready;
 }
 return {get enabled(){return enabled&&!failed;},get available(){return !failed;},setEnabled(on){enabled=!!on&&!failed;if(!enabled)stop();},stop,update};
}
