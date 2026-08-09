const BarcodeScanner=(()=>{
  let controls=null,active=false,locked=false,libraryPromise=null;
  const $=id=>document.getElementById(id);

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(window.ZXingBrowser)return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;script.async=true;script.crossOrigin='anonymous';
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureLibrary(){
    if(window.ZXingBrowser)return window.ZXingBrowser;
    if(libraryPromise)return libraryPromise;
    libraryPromise=(async()=>{
      // UNPKG is the loading method documented by the ZXing browser project.
      const sources=[
        'https://unpkg.com/@zxing/browser@0.2.1',
        'https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js'
      ];
      let lastError;
      for(const src of sources){
        try{
          await loadScript(src);
          if(window.ZXingBrowser)return window.ZXingBrowser;
        }catch(e){lastError=e;console.warn('ZXing load failed',src,e)}
      }
      throw new Error('The barcode library could not be loaded. Please check the internet connection and reload the page.');
    })();
    try{return await libraryPromise}catch(e){libraryPromise=null;throw e}
  }

  async function stop(){
    active=false;locked=false;
    try{controls?.stop()}catch{}
    controls=null;
    const v=$("barcodeVideo");
    if(v?.srcObject){v.srcObject.getTracks().forEach(t=>t.stop());v.srcObject=null}
    $("barcodeScanner")?.classList.add("hidden");
  }

  async function start(onDetected){
    await stop();
    $("barcodeScanner").classList.remove("hidden");
    $("scannerMessage").textContent="Loading barcode scanner…";
    const ZX=await ensureLibrary();
    $("scannerMessage").textContent="Starting rear camera…";
    const reader=new ZX.BrowserMultiFormatReader();active=true;
    try{
      controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}},$("barcodeVideo"),async(result,error,c)=>{
        if(!active||locked)return;
        if(result){
          locked=true;
          const code=result.getText().trim();
          $("scannerMessage").textContent=`Barcode found: ${code}`;
          c.stop();await stop();await onDetected(code);return;
        }
        if(error?.name&&!['NotFoundException','ChecksumException','FormatException'].includes(error.name))console.warn("Scan warning",error);
      });
      $("scannerMessage").textContent="Hold the barcode steady and fill the camera view.";
    }catch(e){
      await stop();
      if(e?.name==='NotAllowedError')throw new Error("Camera access was declined. Allow camera access for this site in Safari and try again.");
      if(e?.name==='NotFoundError')throw new Error("No suitable camera was found on this device.");
      throw e;
    }
  }
  return{start,stop};
})();