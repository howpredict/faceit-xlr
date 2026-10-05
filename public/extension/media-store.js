'use strict';
// Extension-origin IndexedDB. Video bytes never pass through FACEIT or a server.
globalThis.NuageMedia = (()=>{
  let connection;
  function open(){
    if(!connection)connection=new Promise((resolve,reject)=>{
      const req=indexedDB.open('faceit-nuage-media',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('files');
      req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();connection=null;};resolve(req.result);};
      req.onerror=()=>{connection=null;reject(req.error);};
    });
    return connection;
  }
  async function transact(mode,action){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('files',mode);let result;
      const request=action(tx.objectStore('files'));
      if(request)request.onsuccess=()=>{result=request.result;};
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error('Storage failed'));
      tx.onabort=()=>reject(tx.error||new Error('Storage aborted'));
    });
  }
  return Object.freeze({
    async putAsset(id,blob,thumb){return transact('readwrite',s=>{s.put(blob,id);s.put(thumb,'thumb-'+id);});},
    async removeAsset(id){return transact('readwrite',s=>{s.delete(id);s.delete('thumb-'+id);});},
    getThumb:id=>transact('readonly',s=>s.get('thumb-'+id)),
    get:id=>transact('readonly',s=>s.get(id)),put:(id,blob)=>transact('readwrite',s=>s.put(blob,id)),
    remove:id=>transact('readwrite',s=>s.delete(id)),
    async prune(keep){const keys=await transact('readonly',s=>s.getAllKeys());for(const key of keys)if(!keep.includes(key))await transact('readwrite',s=>s.delete(key));}
  });
})();
