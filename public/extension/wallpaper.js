'use strict';
(()=>{
const C=Nuage, video=document.getElementById('video'), photo=document.getElementById('photo'), layer=document.getElementById('layer');
let settings=C.normalize(), metadata=null, legacy='', url='', signature='', generation=0;
video.muted=true;video.defaultMuted=true;video.loop=true;
// Report errors only to the extension popup, never to the FACEIT page.
const parentOrigin=location.ancestorOrigins?.[0]||'';
function status(state){if(parent!==window&&parentOrigin===location.origin)parent.postMessage({source:'nuage-wallpaper-v2',state},parentOrigin);}
function playback(){
  if(settings.videoPaused||!settings.enabled||settings.pauseHidden&&document.hidden)video.pause();
  else if(video.src&&!video.hidden)video.play().then(()=>status('playing')).catch(e=>{if(e?.name==='NotAllowedError')status('blocked');});
}
function applySettings(){
  for(const el of [photo,video]){el.style.objectFit=settings.fit;el.style.objectPosition=`${settings.x}% ${settings.y}%`;}
  layer.style.inset=`-${settings.blur*2}px`;layer.style.filter=settings.blur?`blur(${settings.blur}px)`:'none';
  document.getElementById('shade').style.opacity=settings.dim/100;
  playback();
}
function clear(){video.pause();video.removeAttribute('src');video.load();photo.removeAttribute('src');video.hidden=photo.hidden=true;if(url){URL.revokeObjectURL(url);url='';}}
async function media(){
  const next=C.validMedia(metadata)?metadata.id:C.validImage(legacy)?legacy:'';
  if(next===signature)return;
  signature=next;const token=++generation;clear();
  if(!next)return;
  try{
    if(C.validMedia(metadata)){
      const kind=metadata.kind,blob=await NuageMedia.get(metadata.id);
      if(token!==generation)return;
      if(!(blob instanceof Blob))throw new Error('Missing local file');
      url=URL.createObjectURL(blob);
      if(kind==='video'){video.hidden=false;video.src=url;video.load();}
      else{photo.hidden=false;photo.src=url;}
    }else{photo.hidden=false;photo.src=legacy;}
    applySettings();
  }catch{if(token===generation){signature='';status('missing');}}
}
video.addEventListener('canplay',playback);video.addEventListener('error',()=>status('unsupported'));
photo.addEventListener('error',()=>status('unsupported'));
document.addEventListener('visibilitychange',playback);
window.addEventListener('pagehide',()=>{generation++;clear();});
let booted=false;const early=[];
function change(changes){if(changes[C.key])settings=C.normalize(changes[C.key].newValue);if(changes[C.mediaKey])metadata=changes[C.mediaKey].newValue;if(changes[C.imageKey])legacy=changes[C.imageKey].newValue||'';applySettings();media();}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'){if(!booted)early.push(changes);else change(changes);}});
chrome.storage.local.get([C.key,C.mediaKey,C.imageKey]).then(data=>{settings=C.normalize(data[C.key]);metadata=data[C.mediaKey];legacy=data[C.imageKey]||'';booted=true;applySettings();media();early.forEach(change);}).catch(()=>status('missing'));
})();
