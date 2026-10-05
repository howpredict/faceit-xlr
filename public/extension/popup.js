'use strict';
(()=>{
const C=Nuage,$=id=>document.getElementById(id);
const settingIds=['enabled','dim','blur','focus','x','y','fit','focusEnabled','pauseHidden','colorEnabled','glassBlur','radius','modeGlow','ctaGlow','glowPulse','glowColor','hideEsea','hideMissions','hideQueue','hideBadges','hideElo','clearMatchPanel','hideLadders','hideInviteSlots','textColorEnabled'];
const boolIds=['enabled','focusEnabled','pauseHidden','colorEnabled','modeGlow','ctaGlow','glowPulse','hideEsea','hideMissions','hideQueue','hideBadges','hideElo','clearMatchPanel','hideLadders','hideInviteSlots','textColorEnabled'];
const textIds=['fit','glowColor'];
let settings=C.normalize(),metadata=null,legacy='',gallery=[],lang='ru',tab='wallpaper',busy=false;
let queue=Promise.resolve(),lastStatus='',lastError=false,gallerySignature='',galleryGeneration=0;
const thumbURLs=new Set(),t=key=>NuageText[lang][key]||key;
function status(key,error=false){
 lastStatus=key;lastError=error;
 const text=(!key||key==='ready')?'':(t(key)||key);
 $('status').textContent=text;
 $('statusDot').style.display=text?'inline-block':'none';
 $('statusDot').classList.toggle('error',error);
}

function translate(){
 document.documentElement.lang=lang;
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelectorAll('[data-title]').forEach(el=>el.title=t(el.dataset.title));
 document.querySelectorAll('[data-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.aria)));
 $('language').replaceChildren(document.createTextNode(lang.toUpperCase()+' '));const span=document.createElement('span');span.textContent=lang==='ru'?'/ EN':'/ RU';$('language').append(span);$('language').setAttribute('aria-label',lang==='ru'?'Switch to English':'Переключить на русский');$('pageTitle').textContent=t('title_'+tab);status(lastStatus,lastError);
}
function drawGallery(){
 const signature=JSON.stringify([gallery,metadata?.id,busy,lang]);if(signature===gallerySignature)return;gallerySignature=signature;const generation=++galleryGeneration;
 for(const url of thumbURLs)URL.revokeObjectURL(url);thumbURLs.clear();$('gallery').replaceChildren();
 $('galleryEmpty').hidden=gallery.length>0;
 $('galleryCount').textContent=gallery.length?`${gallery.length} · ${(gallery.reduce((sum,m)=>sum+(m.size||0),0)/1048576).toFixed(1)} ${t('mb')}`:'';
 for(const item of gallery){
  const wrap=document.createElement('div');wrap.className='gallery-item';
  const button=document.createElement('button');button.type='button';button.className='gallery-select';button.dataset.mediaId=item.id;button.setAttribute('aria-pressed',String(metadata?.id===item.id));button.setAttribute('aria-label',t('selectSaved')+': '+item.name);button.title=item.name;button.disabled=busy;
  const thumb=document.createElement('div');thumb.className='thumb';const fallback=document.createElement('span');fallback.className='thumb-fallback';fallback.textContent='☁';thumb.append(fallback);
  const badge=document.createElement('span');badge.className='thumb-kind';badge.textContent=item.kind==='video'?'MP4 ↻':'IMG';thumb.append(badge);
  const name=document.createElement('span');name.className='gallery-name';name.textContent=item.name||t('wallpaper');button.append(thumb,name);button.addEventListener('click',()=>selectSaved(item.id));
  const del=document.createElement('button');del.type='button';del.className='gallery-delete';del.textContent='×';del.title=t('deleteSaved');del.setAttribute('aria-label',t('deleteSaved')+': '+item.name);del.disabled=busy;del.addEventListener('click',()=>deleteSaved(item.id));wrap.append(button,del);$('gallery').append(wrap);
  NuageMedia.getThumb(item.id).then(blob=>{if(generation!==galleryGeneration||!(blob instanceof Blob))return;const url=URL.createObjectURL(blob);thumbURLs.add(url);const image=new Image();image.src=url;image.alt='';image.loading='lazy';fallback.replaceWith(image);}).catch(()=>{});
 }
}
function draw(){
 for(const id of settingIds){if(boolIds.includes(id))$(id).checked=settings[id];else $(id).value=settings[id];if($(id+'Value'))$(id+'Value').textContent=id==='radius'&&!settings.radius?t('radiusSite'):settings[id]+(['blur','glassBlur','radius'].includes(id)?' '+t('px'):'%');}
 document.querySelectorAll('[data-style]').forEach(el=>el.setAttribute('aria-checked',String(el.dataset.style===settings.style)));if(document.activeElement!==$('ctaText'))$('ctaText').value=settings.ctaText;$('ctaText').placeholder=lang==='ru'?'НАЙТИ МАТЧ':'FIND MATCH';document.querySelector('.demo-button').textContent=settings.ctaText||t('findMatch');$('glassBlur').disabled=settings.style==='classic';$('glowColor').disabled=!settings.modeGlow&&!settings.ctaGlow;$('glowPulse').disabled=!settings.modeGlow&&!settings.ctaGlow;
 const demo=document.querySelector('.demo-controls');demo.classList.toggle('glass',settings.style==='glass');demo.classList.toggle('water',settings.style==='water');demo.style.borderRadius=settings.radius?Math.min(settings.radius,14)+'px':'';
 $('focus').disabled=!settings.focusEnabled;
 if($('accentColor'))$('accentColor').value=settings.accentColor;
 if(document.activeElement!==$('accentHex'))$('accentHex').value=settings.accentColor.toUpperCase();
 document.querySelectorAll('[data-color]').forEach(el=>el.setAttribute('aria-pressed',String(settings.colorEnabled&&el.dataset.color===settings.accentColor)));
 document.querySelectorAll('[data-text-color]').forEach(el=>el.setAttribute('aria-pressed',String(settings.textColorEnabled&&el.dataset.textColor.toLowerCase()===(settings.textColor||'#ffffff').toLowerCase())));
 document.documentElement.style.setProperty('--text-swatch', settings.textColor || '#ffffff');
 document.documentElement.style.setProperty('--text-glow', (settings.textColor || '#ffffff') + '88');
 document.documentElement.style.setProperty('--accent-swatch', settings.accentColor || '#ff5500');
 document.documentElement.style.setProperty('--accent-glow', (settings.accentColor || '#ff5500') + '88');
 if ($('textColorWell')) $('textColorWell').style.setProperty('--swatch', settings.textColor || '#ffffff');
 if ($('accentColorWell')) $('accentColorWell').style.setProperty('--swatch', settings.accentColor || '#ff5500');
 if (syncTextWheel) syncTextWheel(settings.textColor || '#ffffff');
 if (syncAccentWheel) syncAccentWheel(settings.accentColor || '#ff5500');
 const valid=C.validMedia(metadata),has=valid||C.validImage(legacy),video=valid&&metadata.kind==='video';
 $('filename').textContent=valid?metadata.name||t(video?'video':'image'):has?t('legacyFile'):t('noFile');$('filename').title='';
 $('fileDetails').textContent=valid?[t(video?'localVideo':'localImage'),((metadata.size||0)/1048576).toFixed(1)+' '+t('mb'),video?Math.round(metadata.duration||0)+' '+t('seconds'):null].filter(Boolean).join(' · '):has?t('localImage'):t('chooseFile');
 $('mediaKind').textContent=has?t(video?'video':'image'):'XLR';$('mediaIcon').setAttribute('href',video?'#i-video':'#i-image');$('previewFrame').hidden=!has;$('emptyPreview').hidden=has;$('emptyPreview').style.display=has?'none':'flex';$('remove').disabled=!has||busy;$('pause').hidden=!video;$('pause').textContent=t(settings.videoPaused?'resume':'pause');$('playbackHint').textContent=t(video?'videoHint':'uploadHint');$('preview').style.setProperty('--focus',settings.focusEnabled?settings.focus/100:.24);$('preview').style.opacity=settings.enabled?'1':'.5';
 const color=settings.colorEnabled?settings.accentColor:'#ffffff';document.querySelector('.demo-button').style.background=color;document.querySelector('.demo-button').style.color=foreground(color);document.querySelector('.demo-tab').style.color=settings.colorEnabled?color:'#ffffff';const demoButton=document.querySelector('.demo-button');demoButton.classList.toggle('glow',settings.ctaGlow);demoButton.style.setProperty('--glow',(settings.colorEnabled?settings.accentColor:'#ffffff')+'88');
 for(const id of ['uploadImage','uploadVideo','imageFile','videoFile','reset'])$(id).disabled=busy;
 drawGallery();drawExtras();
}
function foreground(hex){const a=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722>.179?'#111827':'#ffffff';}
function serial(action){const job=queue.catch(()=>{}).then(action);queue=job;return job;}
function save(){const snapshot={...settings};status('saving');return serial(()=>chrome.storage.local.set({[C.key]:snapshot})).then(()=>{if(!busy)status(settings.enabled?'saved':'disabled');}).catch(()=>status('saveError',true));}
function selectTab(next){if(tab!==next)document.querySelector('main').scrollTop=0;tab=next;document.querySelectorAll('[data-tab]').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});document.querySelectorAll('.tab-pane').forEach(el=>el.hidden=el.id!=='tab-'+tab);$('pageTitle').textContent=t('title_'+tab);}
function fail(key){const e=new Error(key);e.nuageKey=key;return e;}
async function thumbnail(source,width,height){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=108;const scale=Math.max(192/width,108/height);canvas.getContext('2d').drawImage(source,(192-width*scale)/2,(108-height*scale)/2,width*scale,height*scale);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.78));if(!blob)throw fail('imageError');return blob;
}
async function imageBlob(file){
 if(file.size>80*1048576)throw fail('imageSize');if(!/^image\/(png|jpeg|webp|avif|gif|bmp)$/.test(file.type))throw fail('imageType');const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();const scale=Math.min(1,3840/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));if(!blob)throw fail('imageError');return {blob,thumb:await thumbnail(image,image.naturalWidth,image.naturalHeight),width:canvas.width,height:canvas.height};}catch(error){throw error.nuageKey?error:fail('imageError');}finally{URL.revokeObjectURL(url);}
}
async function videoBlob(file,validate=true){
 if(validate&&file.size>200*1048576)throw fail('videoSize');if(validate&&!/\.mp4$/i.test(file.name))throw fail('videoType');const blob=new Blob([file],{type:'video/mp4'}),url=URL.createObjectURL(blob),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(fail('videoError')),20000);function finish(error){clearTimeout(timer);video.onloadeddata=null;video.onerror=null;error?reject(error):resolve();}video.onloadeddata=()=>finish();video.onerror=()=>finish(fail('videoError'));video.src=url;});if(!Number.isFinite(video.duration)||video.duration<=0||validate&&video.duration>180)throw fail('videoDuration');if(!video.videoWidth||!video.videoHeight)throw fail('videoError');return {blob,thumb:await thumbnail(video,video.videoWidth,video.videoHeight),width:video.videoWidth,height:video.videoHeight,duration:video.duration};}finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
async function importFile(file,kind){
 if(!file||busy)return;busy=true;draw();status('processing');let id='',committed=false;
 try{const asset=kind==='video'?await videoBlob(file):await imageBlob(file);id=crypto.randomUUID();await NuageMedia.putAsset(id,asset.blob,asset.thumb);const next={id,kind,name:file.name,size:asset.blob.size,width:asset.width,height:asset.height,duration:asset.duration||0,added:Date.now()};const nextGallery=[next,...gallery],previous=settings;settings={...settings,enabled:true,videoPaused:false};try{await serial(()=>chrome.storage.local.set({[C.mediaKey]:next,[C.galleryKey]:nextGallery,[C.imageKey]:'',[C.key]:{...settings}}));}catch(error){settings=previous;throw error;}committed=true;metadata=next;gallery=nextGallery;legacy='';selectTab('wallpaper');status('saved');}catch(error){if(id&&!committed)await NuageMedia.removeAsset(id).catch(()=>{});status(error.nuageKey||'saveError',true);}finally{busy=false;$('imageFile').value='';$('videoFile').value='';draw();}
}
async function selectSaved(id){
 if(busy||metadata?.id===id)return;const item=gallery.find(m=>m.id===id);if(!item)return;busy=true;draw();status('saving');
 try{if(!(await NuageMedia.get(id) instanceof Blob))throw fail('fileMissing');const nextSettings={...settings,enabled:true,videoPaused:false};await serial(()=>chrome.storage.local.set({[C.mediaKey]:item,[C.imageKey]:'',[C.key]:nextSettings}));settings=nextSettings;metadata=item;legacy='';status('selected');}catch(error){status(error.nuageKey||'saveError',true);}finally{busy=false;draw();}
}
async function clearCurrent(){if(busy)return;busy=true;draw();status('saving');try{await serial(()=>chrome.storage.local.set({[C.mediaKey]:null,[C.imageKey]:''}));metadata=null;legacy='';status('removed');}catch{status('saveError',true);}finally{busy=false;draw();}
}
async function deleteSaved(id){
 if(busy)return;busy=true;draw();status('saving');
 try{const nextGallery=gallery.filter(item=>item.id!==id),active=metadata?.id===id;await serial(()=>chrome.storage.local.set({[C.galleryKey]:nextGallery,...(active?{[C.mediaKey]:null,[C.imageKey]:''}:{})}));gallery=nextGallery;if(active){metadata=null;legacy='';}await NuageMedia.removeAsset(id);status('deleted');}catch{status('saveError',true);}finally{busy=false;draw();}
}
async function migrate(){
 if(C.validMedia(metadata)){
  if(!gallery.some(m=>m.id===metadata.id)){gallery=[metadata,...gallery];await serial(()=>chrome.storage.local.set({[C.galleryKey]:gallery}));}
  if(!(await NuageMedia.getThumb(metadata.id) instanceof Blob)){
   const blob=await NuageMedia.get(metadata.id);if(!(blob instanceof Blob))throw fail('fileMissing');
   const asset=metadata.kind==='video'?await videoBlob(blob,false):await imageBlob(blob);await NuageMedia.put('thumb-'+metadata.id,asset.thumb);
  }
 }else if(C.validImage(legacy)){
  const parts=legacy.split(','),type=parts[0].slice(5,-7),bytes=Uint8Array.from(atob(parts[1]),c=>c.charCodeAt(0)),asset=await imageBlob(new Blob([bytes],{type}));const id=crypto.randomUUID();await NuageMedia.putAsset(id,asset.blob,asset.thumb);
  const next={id,kind:'image',name:t('legacyFile'),size:asset.blob.size,width:asset.width,height:asset.height,duration:0,added:Date.now()};const list=[next,...gallery];
  try{await serial(()=>chrome.storage.local.set({[C.mediaKey]:next,[C.galleryKey]:list,[C.imageKey]:''}));}catch(error){await NuageMedia.removeAsset(id);throw error;}
  metadata=next;gallery=list;legacy='';
 }
 gallerySignature='';
}
function setColor(value){if(!/^#[0-9a-f]{6}$/i.test(value)){status('badHex',true);$('accentHex').setAttribute('aria-invalid','true');return;}$('accentHex').removeAttribute('aria-invalid');settings.accentColor=value.toLowerCase();settings.colorEnabled=true;draw();save();}
window.addEventListener('message',event=>{if(event.source!==$('previewFrame').contentWindow||event.data?.source!=='nuage-wallpaper-v2'||!C.validMedia(metadata))return;const map={missing:'fileMissing',unsupported:metadata.kind==='video'?'videoError':'imageError',blocked:'playBlocked'};if(map[event.data.state]&&!busy)status(map[event.data.state],true);});
window.addEventListener('pagehide',()=>{galleryGeneration++;for(const url of thumbURLs)URL.revokeObjectURL(url);});
async function init(){
 try{
  const data=await chrome.storage.local.get([C.key,C.imageKey,C.mediaKey,C.langKey,C.galleryKey,C.fontKey,C.hiddenKey,C.seedKey]);if(!data[C.seedKey]){data[C.hiddenKey]=C.withDefaults(data[C.hiddenKey],false);chrome.storage.local.set({[C.hiddenKey]:data[C.hiddenKey],[C.seedKey]:true}).catch(()=>{});}fontData=data[C.fontKey]&&typeof data[C.fontKey].data==='string'?data[C.fontKey]:null;settings=C.normalize(data[C.key]);legacy=data[C.imageKey]||'';metadata=data[C.mediaKey];gallery=Array.isArray(data[C.galleryKey])?data[C.galleryKey].filter(C.validMedia):[];lang=['ru','en'].includes(data[C.langKey])?data[C.langKey]:'ru';translate();draw();
  for(const id of settingIds)$(id).addEventListener('input',()=>{settings[id]=boolIds.includes(id)?$(id).checked:textIds.includes(id)?$(id).value:Number($(id).value);draw();save();});
  $('language').addEventListener('click',()=>{lang=lang==='ru'?'en':'ru';translate();draw();drawHidden();serial(()=>chrome.storage.local.set({[C.langKey]:lang})).catch(()=>status('saveError',true));});document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>selectTab(el.dataset.tab)));
  document.querySelectorAll('[data-style]').forEach(el=>el.addEventListener('click',()=>{settings.style=el.dataset.style;draw();save();}));
  $('uploadImage').addEventListener('click',()=>$('imageFile').click());$('uploadVideo').addEventListener('click',()=>$('videoFile').click());$('imageFile').addEventListener('change',()=>importFile($('imageFile').files[0],'image'));$('videoFile').addEventListener('change',()=>importFile($('videoFile').files[0],'video'));
  const saveCta=()=>{settings.ctaText=$('ctaText').value.replace(/[\u0000-\u001f]/g,'').trim().slice(0,24);draw();save();};
  $('ctaText').addEventListener('change',saveCta);$('ctaText').addEventListener('keydown',e=>{if(e.key==='Enter')$('ctaText').blur();});
  $('ctaReset').addEventListener('click',()=>{$('ctaText').value='';saveCta();});
  initExtras();initPicker(data);
  syncTextWheel = initWheelPicker('textColor', setTextColor);
  syncAccentWheel = initWheelPicker('accentColor', setColor);
  $('remove').addEventListener('click',clearCurrent);$('pause').addEventListener('click',()=>{settings.videoPaused=!settings.videoPaused;draw();save();});$('reset').addEventListener('click',()=>{const keep={};for(const k of ['enabled','colorEnabled','accentColor','videoPaused','hideEsea','hideMissions','hideQueue','hideBadges','hideElo','clearMatchPanel','hideLadders','hideInviteSlots','ctaText'])keep[k]=settings[k];settings=C.normalize(keep);draw();save();});
  if($('accentColor'))$('accentColor').addEventListener('input',()=>setColor($('accentColor').value));$('accentHex').addEventListener('change',()=>setColor($('accentHex').value.trim()));$('accentHex').addEventListener('keydown',e=>{if(e.key==='Enter'){$('accentHex').blur();}});document.querySelectorAll('[data-color]').forEach(el=>el.addEventListener('click',()=>setColor(el.dataset.color)));$('resetColor').addEventListener('click',()=>{settings.accentColor='#ff5500';settings.colorEnabled=false;$('accentHex').removeAttribute('aria-invalid');draw();save();});
  busy=true;draw();if(C.validMedia(metadata)||C.validImage(legacy))status('migration');try{await migrate();status('');}catch(error){status(error.nuageKey||'migrationError',true);}finally{busy=false;draw();}
 }catch{status('readError',true);}
}

let syncTextWheel = null, syncAccentWheel = null;
function initWheelPicker(prefix, onColorChange) {
  const canvas = $(prefix + 'WheelCanvas');
  const pointer = $(prefix + 'WheelPointer');
  const ringPointer = $(prefix + 'RingPointer');
  const preview = $(prefix + 'Preview');
  const hexInput = $(prefix + 'HexInput');
  const rInput = $(prefix + 'RInput');
  const gInput = $(prefix + 'GInput');
  const bInput = $(prefix + 'BInput');
  const box = $(prefix + 'WheelBox');
  const well = $(prefix + 'Well');
  if (!canvas || !wrapElement(canvas)) return null;

  const ctx = canvas.getContext('2d');
  const size = 200, cx = 100, cy = 100;
  const innerR = 66, ringIn = 78, ringOut = 94, ringMid = 86;
  const gapRad = 28 * Math.PI / 180;
  const thetaStart = -Math.PI / 2 + gapRad / 2;
  const totalArc = Math.PI * 2 - gapRad;

  let currentH = 0, currentS = 0, currentV = 1;
  let isDraggingWheel = false, isDraggingRing = false;

  function wrapElement(el) { return el ? el.parentElement : null; }
  const wrap = wrapElement(canvas);

  function hsv2rgb(h, s, v) {
    let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
  }

  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = currentH, s = max === 0 ? 0 : d / max, v = max;
    if (d > 0.002) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, v];
  }

  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function hex2rgb(hex) {
    const m = hex.replace('#', '').match(/[0-9a-f]{2}/gi);
    if (!m || m.length < 3) return [255, 255, 255];
    return m.slice(0, 3).map(v => parseInt(v, 16));
  }

  function drawWheel() {
    ctx.clearRect(0, 0, size, size);

    // 1. Draw inner color disc (Hue & Saturation) - always full brightness (V = 1.0)
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.hypot(dx, dy);
        const idx = (y * size + x) * 4;
        if (d <= innerR) {
          const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          const s = d / innerR;
          const [r, g, b] = hsv2rgb(h, s, 1.0);
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
          data[idx + 3] = d > innerR - 1.2 ? Math.round(255 * (innerR - d)) : 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Subtle groove track and borders
    ctx.beginPath();
    ctx.arc(cx, cy, ringMid, 0, Math.PI * 2);
    ctx.lineWidth = ringOut - ringIn;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, ringIn, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, ringOut, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Smooth segmented gradient arc with elegant rounded caps (no seam!)
    const ringWidth = ringOut - ringIn;
    const steps = 100;
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const a1 = thetaStart + t1 * totalArc;
      const a2 = thetaStart + t2 * totalArc + 0.015;
      const v = t1 + (t2 - t1) * 0.5;
      const [r, g, b] = hsv2rgb(currentH, currentS, v);
      ctx.beginPath();
      ctx.arc(cx, cy, ringMid, a1, a2);
      ctx.lineWidth = ringWidth;
      ctx.lineCap = (i === 0 || i === steps - 1) ? 'round' : 'butt';
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.stroke();
    }
  }

  function updatePointers() {
    const rad = (currentH * Math.PI) / 180;
    const rDist = currentS * innerR;
    const px = cx + rDist * Math.cos(rad);
    const py = cy + rDist * Math.sin(rad);
    pointer.style.left = px + 'px';
    pointer.style.top = py + 'px';

    const ringAngle = thetaStart + currentV * totalArc;
    const rx = cx + ringMid * Math.cos(ringAngle);
    const ry = cy + ringMid * Math.sin(ringAngle);
    ringPointer.style.left = rx + 'px';
    ringPointer.style.top = ry + 'px';
    const [ringR, ringG, ringB] = hsv2rgb(currentH, currentS, currentV);
    ringPointer.style.background = rgb2hex(ringR, ringG, ringB);
  }

  function applyColor(commit = true) {
    const [r, g, b] = hsv2rgb(currentH, currentS, currentV);
    const hex = rgb2hex(r, g, b);
    preview.style.background = hex;
    well.style.setProperty('--swatch', hex);
    if (document.activeElement !== hexInput) hexInput.value = hex.toUpperCase();
    if (document.activeElement !== rInput) rInput.value = r;
    if (document.activeElement !== gInput) gInput.value = g;
    if (document.activeElement !== bInput) bInput.value = b;

    drawWheel();
    updatePointers();

    if (commit) {
      onColorChange(hex);
    }
  }

  function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist <= innerR + 4) {
      isDraggingWheel = true;
      handleWheelDrag(x, y);
    } else if (dist >= ringIn - 6 && dist <= ringOut + 6) {
      isDraggingRing = true;
      handleRingDrag(x, y);
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function handleWheelDrag(x, y) {
    const dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy);
    currentH = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    currentS = Math.min(1, Math.max(0, dist / innerR));
    applyColor(true);
  }

  function handleRingDrag(x, y) {
    const dx = x - cx, dy = y - cy;
    const phi = Math.atan2(dy, dx);
    const delta = (phi - thetaStart + Math.PI * 4) % (Math.PI * 2);
    if (delta <= totalArc) {
      currentV = Math.max(0.02, Math.min(1, delta / totalArc));
    } else {
      const distToEnd = delta - totalArc;
      currentV = distToEnd < (Math.PI * 2 - totalArc) / 2 ? 1 : 0.02;
    }
    applyColor(true);
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isDraggingWheel) handleWheelDrag(x, y);
    else if (isDraggingRing) handleRingDrag(x, y);
  }

  function onPointerUp() {
    isDraggingWheel = false;
    isDraggingRing = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  wrap.addEventListener('pointerdown', onPointerDown);

  well.addEventListener('click', () => {
    const isOpen = !box.hidden;
    box.hidden = isOpen;
    well.classList.toggle('active', !isOpen);
    if (!isOpen) {
      drawWheel();
      updatePointers();
    }
  });

  hexInput.addEventListener('change', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9a-f]{6}$/i.test(val)) {
      const [r, g, b] = hex2rgb(val);
      [currentH, currentS, currentV] = rgb2hsv(r, g, b);
      applyColor(true);
    } else {
      applyColor(false);
    }
  });
  hexInput.addEventListener('keydown', e => { if (e.key === 'Enter') hexInput.blur(); });

  const onRgbChange = () => {
    const r = Math.max(0, Math.min(255, parseInt(rInput.value) || 0));
    const g = Math.max(0, Math.min(255, parseInt(gInput.value) || 0));
    const b = Math.max(0, Math.min(255, parseInt(bInput.value) || 0));
    [currentH, currentS, currentV] = rgb2hsv(r, g, b);
    applyColor(true);
  };
  [rInput, gInput, bInput].forEach(inp => {
    inp.addEventListener('input', onRgbChange);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });

  return function sync(hex) {
    if (isDraggingWheel || isDraggingRing) return;
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    const [r, g, b] = hex2rgb(hex);
    const [h, s, v] = rgb2hsv(r, g, b);
    if (v > 0.05 && s > 0.02) {
      currentH = h;
      currentS = s;
    }
    currentV = v;
    applyColor(false);
  };
}
let fontData=null,fontLang='';
function b64(bytes){let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(out);}
function unb64(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function buildFontOptions(){
 if(fontLang===lang)return;fontLang=lang;const sel=$('fontFamily');sel.replaceChildren();
 const add=(value,label,family)=>{const o=document.createElement('option');o.value=value;o.textContent=label;if(family)o.style.fontFamily=family;sel.append(o);};
 add('',t('fontDefault'));for(const f of C.fonts)add(f,f,`"${f}"`);add('custom',t('fontCustom'));
}
function drawExtras(){
 buildFontOptions();
 const custom=$('fontFamily').querySelector('option[value="custom"]');custom.textContent=t('fontCustom')+(fontData?': '+fontData.name:'');
 $('fontFamily').value=settings.fontFamily;$('fontName').textContent=fontData?fontData.name:'';$('fontRemove').hidden=!fontData;
 if ($('textColor')) $('textColor').value=settings.textColor;
 document.querySelectorAll('[data-text-color]').forEach(el=>el.setAttribute('aria-pressed',String(settings.textColorEnabled&&el.dataset.textColor===settings.textColor)));
 for(const id of ['fontUpload','fontFamily','presetExport','presetImport'])$(id).disabled=busy;
}
async function uploadFont(file){
 if(!file||busy)return;if(file.size>8*1048576){status('fontError',true);$('fontFile').value='';return;}
 busy=true;draw();status('processing');
 try{const buf=await file.arrayBuffer();await new FontFace('NuageCheck',buf).load();
  const data={name:file.name.replace(/\.[^.]+$/,'').slice(0,60)||'font',data:b64(new Uint8Array(buf))};
  const next={...settings,fontFamily:'custom'};await serial(()=>chrome.storage.local.set({[C.fontKey]:data,[C.key]:next}));
  fontData=data;settings=next;status('fontLoaded');
 }catch{status('fontError',true);}finally{busy=false;$('fontFile').value='';draw();}
}
async function removeFont(){
 if(busy)return;const next={...settings,fontFamily:settings.fontFamily==='custom'?'':settings.fontFamily};
 try{await serial(()=>chrome.storage.local.set({[C.fontKey]:null,[C.key]:next}));fontData=null;settings=next;status('saved');}catch{status('saveError',true);}draw();
}
function setTextColor(value){settings.textColor=value.toLowerCase();settings.textColorEnabled=true;draw();save();}
const MAGIC='FACEITXLR001';
const LEGACY_MAGIC='NUAGEPRESET1';
async function getNextPresetName(){
 try{
  const data=await chrome.storage.local.get('xlrPresetCount');
  const count=(Number(data.xlrPresetCount)||0)+1;
  await chrome.storage.local.set({xlrPresetCount:count});
  return `faceit-xlr-preset${count}.xlr`;
 }catch{
  return 'faceit-xlr-preset1.xlr';
 }
}
async function exportPreset(){
 if(busy)return;busy=true;draw();status('presetBuilding');
 try{
  const stored=await chrome.storage.local.get([C.key,C.fontKey,C.mediaKey,C.imageKey]);
  settings=C.normalize(stored[C.key]);metadata=stored[C.mediaKey];legacy=stored[C.imageKey]||'';fontData=stored[C.fontKey]&&typeof stored[C.fontKey].data==='string'?stored[C.fontKey]:null;
  const hiddenStored=(await chrome.storage.local.get(C.hiddenKey))[C.hiddenKey];
  const header={format:'faceit-xlr-preset',version:1,created:new Date().toISOString(),settings:{...settings},media:null,font:null,hidden:Array.isArray(hiddenStored)?hiddenStored:[]};
  let media=null;
  if(C.validMedia(metadata)){const blob=await NuageMedia.get(metadata.id);if(blob instanceof Blob){media=blob;header.media={kind:metadata.kind,name:metadata.name,type:blob.type||(metadata.kind==='video'?'video/mp4':'image/webp'),size:blob.size,width:metadata.width,height:metadata.height,duration:metadata.duration||0};}}
  else if(C.validImage(legacy)){const type=legacy.slice(5,legacy.indexOf(';'));media=new Blob([unb64(legacy.split(',')[1])],{type});header.media={kind:'image',name:t('legacyFile'),type,size:media.size};}
  let font=null;if(fontData){font=unb64(fontData.data);header.font={name:fontData.name,size:font.length};}
  const json=new TextEncoder().encode(JSON.stringify(header)),len=new Uint8Array(4);new DataView(len.buffer).setUint32(0,json.length,true);
  const file=new Blob([MAGIC,len,json,...(media?[media]:[]),...(font?[font]:[])],{type:'application/octet-stream'});
  const fileName=await getNextPresetName();
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=fileName;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);status('presetSaved');
 }catch{status('saveError',true);}finally{busy=false;draw();}
}
async function importPreset(file){
 if(!file||busy)return;busy=true;draw();status('presetReading');let id='';
 try{
  const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
  if(head.length<16)throw fail('presetError');
  const magic=new TextDecoder().decode(head.slice(0,12));
  if(magic!==MAGIC && magic!==LEGACY_MAGIC)throw fail('presetError');
  const len=new DataView(head.buffer).getUint32(12,true);if(len<2||len>1e6||16+len>file.size)throw fail('presetError');
  let header;try{header=JSON.parse(new TextDecoder().decode(await file.slice(16,16+len).arrayBuffer()));}catch{throw fail('presetError');}
  if(header?.format!=='faceit-xlr-preset' && header?.format!=='faceit-nuage-preset')throw fail('presetError');
  let offset=16+len;const next={...C.normalize(header.settings),enabled:true};const changes={[C.key]:next};
  if(Array.isArray(header.hidden))changes[C.hiddenKey]=header.hidden.filter(x=>x&&typeof x.sel==='string'&&x.sel.length<=1500).slice(0,200).map(x=>({sel:x.sel,mode:x.mode==='lines'?'lines':'hide',label:String(x.label||'').slice(0,80),added:Number(x.added)||Date.now()}));
  const m=header.media;
  if(m&&Number.isFinite(m.size)&&m.size>0){
   if(offset+m.size>file.size)throw fail('presetError');
   const kind=m.kind==='video'?'video':'image',type=kind==='video'?'video/mp4':(/^image\/(png|jpeg|webp|avif|gif|bmp)$/.test(m.type)?m.type:'image/webp');
   const blob=file.slice(offset,offset+m.size,type);offset+=m.size;
   const asset=kind==='video'?await videoBlob(blob,false):await imageBlob(new File([blob],m.name||'wallpaper',{type}));
   id=crypto.randomUUID();await NuageMedia.putAsset(id,asset.blob,asset.thumb);
   const item={id,kind,name:String(m.name||t('wallpaper')).slice(0,120),size:asset.blob.size,width:asset.width,height:asset.height,duration:asset.duration||0,added:Date.now()};
   changes[C.mediaKey]=item;changes[C.galleryKey]=[item,...gallery];changes[C.imageKey]='';
  }
  const f=header.font;
  if(f&&Number.isFinite(f.size)&&f.size>0&&f.size<=8*1048576&&offset+f.size<=file.size){
   const bytes=new Uint8Array(await file.slice(offset,offset+f.size).arrayBuffer());offset+=f.size;
   await new FontFace('NuageCheck',bytes.buffer.slice(0)).load();changes[C.fontKey]={name:String(f.name||'font').slice(0,60),data:b64(bytes)};
  }else if(next.fontFamily==='custom')next.fontFamily='';
  await serial(()=>chrome.storage.local.set(changes));
  settings=next;if(changes[C.mediaKey]){metadata=changes[C.mediaKey];gallery=changes[C.galleryKey];legacy='';}if(changes[C.fontKey])fontData=changes[C.fontKey];
  gallerySignature='';selectTab('wallpaper');status('presetLoaded');
 }catch(error){if(id)await NuageMedia.removeAsset(id).catch(()=>{});status(error.nuageKey||'presetError',true);}
 finally{busy=false;$('presetFile').value='';draw();}
}
function initExtras(){
 $('fontFamily').addEventListener('change',()=>{const v=$('fontFamily').value;if(v==='custom'&&!fontData){$('fontFamily').value=settings.fontFamily;$('fontFile').click();return;}settings.fontFamily=v;draw();save();});
 $('fontUpload').addEventListener('click',()=>$('fontFile').click());$('fontFile').addEventListener('change',()=>uploadFont($('fontFile').files[0]));$('fontRemove').addEventListener('click',removeFont);
 if ($('textColor')) $('textColor').addEventListener('input',()=>setTextColor($('textColor').value));
 document.querySelectorAll('[data-text-color]').forEach(el=>el.addEventListener('click',()=>setTextColor(el.dataset.textColor)));
 $('presetExport').addEventListener('click',exportPreset);$('presetImport').addEventListener('click',()=>$('presetFile').click());$('presetFile').addEventListener('change',()=>importPreset($('presetFile').files[0]));
}

// ---------- 3.8: element picker ----------
let hiddenItems=[];
function drawHidden(){
 const list=$('hiddenList');list.replaceChildren();
 hiddenItems.forEach((item,index)=>{
  const row=document.createElement('div');row.className='hidden-item';
  const label=document.createElement('span');label.textContent=item.label||item.sel;label.title=item.sel;
  const kind=document.createElement('small');kind.textContent=item.mode==='lines'?t('hiddenLines'):t('hiddenHide');
  const back=document.createElement('button');back.type='button';back.className='text-button';back.textContent=t('hiddenRestore');
  back.addEventListener('click',()=>saveHidden(hiddenItems.filter((_,i)=>i!==index)));
  row.append(label,kind,back);list.append(row);
 });
 $('hiddenClear').hidden=!hiddenItems.length;
}
function saveHidden(next){hiddenItems=next;drawHidden();serial(()=>chrome.storage.local.set({[C.hiddenKey]:next})).then(()=>status('saved')).catch(()=>status('saveError',true));}
async function startPicker(){
 const send=tab=>chrome.tabs.sendMessage(tab.id,{type:'nuage-pick',lang,textColor:settings.textColorEnabled?settings.textColor:''}).then(r=>!!r?.ok).catch(()=>false);
 try{
  let ok=false;const [active]=await chrome.tabs.query({active:true,currentWindow:true});
  if(active)ok=await send(active);
  if(!ok){for(const tab of await chrome.tabs.query({url:['https://www.faceit.com/*','https://faceit.com/*']})){if(await send(tab)){await chrome.tabs.update(tab.id,{active:true}).catch(()=>{});ok=true;break;}}}
  if(ok)window.close();else status('pickNoTab',true);
 }catch{status('pickNoTab',true);}
}
function initPicker(data){
 hiddenItems=Array.isArray(data[C.hiddenKey])?data[C.hiddenKey]:[];drawHidden();
 $('pickStart').addEventListener('click',startPicker);$('hiddenClear').addEventListener('click',()=>saveHidden([]));
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[C.hiddenKey]){hiddenItems=Array.isArray(changes[C.hiddenKey].newValue)?changes[C.hiddenKey].newValue:[];drawHidden();}});
}
const mcPool='立って走る私にとってはそれだけで奇跡だだから私は分秒でも長くこの脚で走り続けたい今までもこれからも私は私の道を往く挑戦したかったやれるだけの事はやったと思うそれでも走れなかったけど運命とか宿命とかそういうのはどうでもいい恋しくなる時はあるだがまだ帰るわけにはいかない遠く離れた故郷に私の勝利を応援する人々がいるその期待には必ず応えたいんだ最後の直線ここまで我慢してきた分脚には十分なためがあるまるでここがスタートだと思えるほどに負けた何が足りなかった脚力持久力先手必勝の戦略かそれとも勝利への渇望かよしまた走ろう';
const mcChars=Array.from(mcPool);
function initMinecraftObfuscator(){
 const el=$('mcObfuscated');if(!el)return;
 const len=32,poolLen=mcChars.length;
 function tick(){
  let s='';for(let i=0;i<len;i++)s+=mcChars[(Math.random()*poolLen)|0];
  el.textContent=s;
 }
 tick();
 setInterval(tick,45);
}
document.addEventListener('scroll',()=>{if(document.scrollingElement.scrollTop)document.scrollingElement.scrollTop=0;},true);
init();
initMinecraftObfuscator();
})();
