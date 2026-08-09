const BarcodeScanner=(()=>{
  let controls=null,active=false,locked=false;
  const $=id=>document.getElementById(id);
  async function stop(){
    active=false;locked=false;
    try{controls?.stop()}catch{}
    controls=null;
    const v=$("barcodeVideo");
    if(v?.srcObject){v.srcObject.getTracks().forEach(t=>t.stop());v.srcObject=null}
    $("barcodeScanner")?.classList.add("hidden");
  }
  async function start(onDetected){
    if(!window.ZXingBrowser)throw new Error("The barcode scanning library could not be loaded. Check your internet connection and try again.");
    await stop();
    $("barcodeScanner").classList.remove("hidden");
    $("scannerMessage").textContent="Starting rear camera…";
    const reader=new ZXingBrowser.BrowserMultiFormatReader();active=true;
    try{
      controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}},$("barcodeVideo"),async(result,error,c)=>{
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
      if(e?.name==='NotAllowedError')throw new Error("Camera access was declined. Allow camera access in Safari settings and try again.");
      if(e?.name==='NotFoundError')throw new Error("No suitable camera was found on this device.");
      throw e;
    }
  }
  return{start,stop};
})();