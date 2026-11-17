/* Browser-only PNG export of the self-contained social-card.svg source.
   Load from a temporary same-origin studio page; do not ship the studio. */
const status=document.querySelector('#status');
try {
 const source=new Image();
 await new Promise((resolve,reject)=>{source.onload=resolve;source.onerror=reject;source.src='/assets/social-card.svg';});
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0,1200,630);
 const image=document.createElement('img');image.id='social-export';image.width=1200;image.height=630;
 image.alt='TKDflow sharing preview with the current animated black-belt character performing a side kick.';
 image.src=canvas.toDataURL('image/png');
 document.querySelector('main').append(image);status.textContent='Sharing image ready: 1200 × 630';
 document.body.dataset.ready='true';
} catch(error) {status.textContent='Export failed: '+error.message;document.body.dataset.error='true';}
