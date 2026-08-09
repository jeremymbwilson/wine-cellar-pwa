const App=(()=>{let wines=[],photos={front:"",back:"",bottle:""},favourite=false,deferredPrompt=null,smartMeta={},autoRecogniseAfterCapture=false;const $=id=>document.getElementById(id),year=new Date().getFullYear();
const fields=["name","producer","vintage","country","region","appellation","colour","grape","quantity","bottleSize","cellar","rack","bin","caseReference","barcode","purchaseDate","price","currentValue","merchant","drinkFrom","drinkBy","storageCondition","rating","lastTasted","tastingNotes","notes"];
function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>$("toast").classList.remove("show"),2600)}
function view(n){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));$(`${n}View`).classList.add("active");document.querySelector(`.nav-item[data-view="${n}"]`)?.classList.add("active");BarcodeScanner.stop();scrollTo({top:0,behavior:"smooth"})}
function dateYear(v){return v?new Date(`${v}T12:00:00`).getFullYear():null}
function status(w){const f=dateYear(w.drinkFrom),b=dateYear(w.drinkBy);if(!f&&!b)return"unknown";if(b&&year>b)return"past";if(f&&year<f)return f<=year+1?"soon":"keep";return"ready"}
function statusText(s){return{ready:"Ready now",soon:"Ready within 12 months",keep:"Keep",past:"Past window",unknown:"No drinking dates"}[s]}
function title(w){return`${w.name}${w.vintage?` ${w.vintage}`:""}`}
function money(v){return v===""||v==null?"":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v))}
function locationText(w){return[w.cellar,w.rack?`Rack ${w.rack}`:"",w.bin?`Bin ${w.bin}`:""].filter(Boolean).join(" · ")}
function unitValue(w){return Number(w.currentValue||w.price||0)}
function totalValue(w){return unitValue(w)*Number(w.quantity||0)}
function card(w){const s=status(w),photo=w.photos?.front||w.photo||w.photos?.bottle||"",meta=[w.producer,w.region,w.country].filter(Boolean).join(" · ");return`<article class="wine-card" data-id="${w.id}">${photo?`<img class="wine-photo" src="${photo}" alt="${esc(title(w))}">`:`<div class="wine-placeholder">🍷</div>`}<div><h3>${w.favourite?"★ ":""}${esc(title(w))}</h3><p class="wine-meta">${esc(meta||"No additional details")}</p><p class="wine-meta">${esc(locationText(w)||"Location not set")}</p><p class="wine-value"><strong>${Number(w.quantity||0)}</strong> bottle${Number(w.quantity||0)===1?"":"s"}${totalValue(w)?` · ${money(totalValue(w))}`:""}</p><span class="badge ${s}">${statusText(s)}</span></div><div class="wine-actions"><button data-action="details">Details</button><button data-action="edit">Edit</button><button data-action="add">+1</button><button data-action="drink" ${Number(w.quantity||0)<1?"disabled":""}>Drink one</button><button data-action="delete">Delete</button></div></article>`}
function list(id,items){$(id).innerHTML=items.length?items.map(card).join(""):`<div class="empty">No wines match this view.</div>`}
function options(id,values,label){const current=$(id).value;$(id).innerHTML=`<option value="all">${label}</option>`+[...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");if([...$(id).options].some(o=>o.value===current))$(id).value=current}
function renderDashboard(){
  const bottles=wines.reduce((a,w)=>a+Number(w.quantity||0),0);
  const intelligent=wines.map(w=>{
    const m=w.smartCaptureMeta||{};
    return {w,s:intelligentDrinkStatus(w.drinkFrom,w.drinkBy,m.peakFromYear,m.peakToYear)};
  });
  const bottleCounts={};
  intelligent.forEach(({w,s})=>{bottleCounts[s.key]=(bottleCounts[s.key]||0)+Number(w.quantity||0)});
  $("heroBottleCount").textContent=`${bottles} bottle${bottles===1?"":"s"}`;
  $("heroSummary").textContent=`${wines.length} wine${wines.length===1?"":"s"} · ${money(wines.reduce((a,w)=>a+totalValue(w),0))} estimated value`;
  $("metricReady").textContent=(bottleCounts["ready"]||0)+(bottleCounts["at-peak"]||0);
  $("metricSoon").textContent=bottleCounts["approaching"]||0;
  $("metricPast").textContent=bottleCounts["drink-soon"]||0;
  $("metricFavourites").textContent=wines.filter(w=>w.favourite).reduce((a,w)=>a+Number(w.quantity||0),0);

  const f=$("dashboardFilter").value;
  const normalFiltered=wines.filter(w=>f==="favourite"?w.favourite:status(w)===f).slice(0,12);

  const priorityOrder={"drink-soon":0,"at-peak":1,"ready":2,"approaching":3,"too-young":4,"unknown":9};
  const ranked=[...intelligent].filter(x=>x.s.key!=="unknown").sort((a,b)=>(priorityOrder[a.s.key]??9)-(priorityOrder[b.s.key]??9));
  const tonight=ranked.find(x=>x.s.key==="drink-soon")||ranked.find(x=>x.s.key==="at-peak")||ranked.find(x=>x.s.key==="ready");

  const summaryDefs=[
    ["drink-soon","Past Window"],
    ["at-peak","At Peak"],
    ["ready","Ready to Drink"],
    ["approaching","Approaching"],
    ["too-young","Too Young"]
  ];
  const summary=summaryDefs.filter(([k])=>bottleCounts[k]).map(([k,label])=>`<div class="drink-summary-box">${intelligentStatusBadge({key:k,label})}<strong>${bottleCounts[k]}</strong></div>`).join("");

  const intelligenceBlock = ranked.length ? `
    <section class="cellar-intelligence">
      <div class="cellar-intelligence-head">
        <div><span class="eyebrow">Drinking intelligence</span><h3>Your cellar today</h3></div>
      </div>
      <div class="drink-summary">${summary}</div>
      ${tonight?`<div class="tonight-card">
        <span class="eyebrow">Tonight's suggestion</span>
        <h3>${esc(title(tonight.w))}</h3>
        <p>${esc(tonight.w.producer||"")}</p>
        <div class="tonight-status">${intelligentStatusBadge({key:tonight.s.key,label:tonight.s.key==="drink-soon"?"Past Window":tonight.s.label})}<span>${esc(tonight.s.note)}</span></div>
        ${tonight.w.smartCaptureMeta?.styleSummary?`<p><strong>Style:</strong> ${esc(tonight.w.smartCaptureMeta.styleSummary)}</p>`:""}
        ${Array.isArray(tonight.w.smartCaptureMeta?.foodPairings)&&tonight.w.smartCaptureMeta.foodPairings.length?`<p><strong>Food:</strong> ${tonight.w.smartCaptureMeta.foodPairings.map(esc).join(" · ")}</p>`:""}
      </div>`:""}
      <div class="priority-heading"><strong>Priority bottles</strong><span>Past-window and peak bottles first</span></div>
      <div class="priority-cards">${ranked.slice(0,8).map(({w,s})=>`<article class="priority-card">
        <div>
          <h4>${esc(title(w))}</h4>
          <p>${esc(w.producer||"")}</p>
          <small>${esc(s.note)}</small>
        </div>
        <div>${intelligentStatusBadge({key:s.key,label:s.key==="drink-soon"?"Past Window":s.label})}<small>${Number(w.quantity||0)} bottle${Number(w.quantity||0)===1?"":"s"}</small></div>
      </article>`).join("")}</div>
    </section>` : "";

  $("dashboardList").innerHTML=intelligenceBlock+(normalFiltered.length?normalFiltered.map(card).join(""):`<div class="empty">No wines match this view.</div>`);

  const recent=[...wines].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,6);
  $("recentList").innerHTML=recent.length?recent.map(w=>`<div class="compact-row"><span><strong>${esc(title(w))}</strong><br><small>${esc(locationText(w)||"No location")}</small></span><span>${Number(w.quantity||0)} bottle${Number(w.quantity||0)===1?"":"s"}</span></div>`).join(""):`<div class="empty">No recent wines.</div>`;
}
function filtered(){const q=$("searchInput").value.trim().toLowerCase(),fs=$("filterStatus").value,fc=$("filterColour").value,fco=$("filterCountry").value,fce=$("filterCellar").value,ff=$("filterFavourite").value;let a=wines.filter(w=>[w.name,w.producer,w.vintage,w.country,w.region,w.appellation,w.grape,w.barcode,w.cellar,w.rack,w.bin,w.caseReference].join(" ").toLowerCase().includes(q));if(fs!=="all")a=a.filter(w=>status(w)===fs);if(fc!=="all")a=a.filter(w=>w.colour===fc);if(fco!=="all")a=a.filter(w=>w.country===fco);if(fce!=="all")a=a.filter(w=>w.cellar===fce);if(ff==="yes")a=a.filter(w=>w.favourite);const sort=$("sortBy").value;a.sort((x,y)=>sort==="vintage-desc"?Number(y.vintage||0)-Number(x.vintage||0):sort==="vintage-asc"?Number(x.vintage||9999)-Number(y.vintage||9999):sort==="drink-by"?String(x.drinkBy||"9999").localeCompare(String(y.drinkBy||"9999")):sort==="quantity-desc"?Number(y.quantity||0)-Number(x.quantity||0):sort==="value-desc"?totalValue(y)-totalValue(x):sort==="updated-desc"?String(y.updatedAt).localeCompare(String(x.updatedAt)):title(x).localeCompare(title(y)));return a}
function renderInventory(){options("filterColour",wines.map(w=>w.colour),"All colours");options("filterCountry",wines.map(w=>w.country),"All countries");options("filterCellar",wines.map(w=>w.cellar),"All cellars");const a=filtered();$("inventorySummary").textContent=`Showing ${a.length} of ${wines.length} wines`;list("inventoryList",a)}
function breakdown(values){const m={};values.filter(Boolean).forEach(v=>m[v]=(m[v]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8)}
function bars(id,entries){const max=Math.max(1,...entries.map(x=>x[1]));$(id).innerHTML=entries.length?entries.map(([k,v])=>`<div class="bar-item"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%"></div></div><strong>${v}</strong></div>`).join(""):`<div class="empty">Not enough data yet.</div>`}
function renderInsights(){const total=wines.reduce((a,w)=>a+totalValue(w),0),vintages=wines.map(w=>Number(w.vintage)).filter(v=>v>1800&&v<=year),age=vintages.length?Math.round(vintages.reduce((a,v)=>a+(year-v),0)/vintages.length):null;$("insightValue").textContent=money(total);$("insightAge").textContent=age==null?"—":`${age} years`;$("insightCountries").textContent=new Set(wines.map(w=>w.country).filter(Boolean)).size;$("insightCellars").textContent=new Set(wines.map(w=>w.cellar).filter(Boolean)).size;bars("countryBreakdown",breakdown(wines.flatMap(w=>Array(Number(w.quantity||0)).fill(w.country||"Unknown"))));bars("colourBreakdown",breakdown(wines.flatMap(w=>Array(Number(w.quantity||0)).fill(w.colour||"Unknown"))));const decades=wines.flatMap(w=>Array(Number(w.quantity||0)).fill(w.vintage?`${Math.floor(Number(w.vintage)/10)*10}s`:"Unknown"));bars("vintageBreakdown",breakdown(decades));bars("cellarBreakdown",breakdown(wines.flatMap(w=>Array(Number(w.quantity||0)).fill(w.cellar||"Unassigned"))))}
async function refresh(){wines=(await WineDB.getAll()).map(normalise);renderDashboard();renderInventory();renderInsights()}
function normalise(w){return{bottleSize:"750",photos:{front:w.photo||"",back:"",bottle:""},favourite:false,...w,photos:{front:w.photos?.front||w.photo||"",back:w.photos?.back||"",bottle:w.photos?.bottle||""}}}
function reset(){ clearSmartCapture(); const er=$("enrichmentResult");if(er){er.classList.add("hidden");er.innerHTML=""} smartMeta={};autoRecogniseAfterCapture=false; $("wineForm").reset();$("wineId").value="";$("quantity").value=1;$("bottleSize").value="750";$("formTitle").textContent="Add a wine";photos={front:"",back:"",bottle:""};favourite=false;syncFavourite();syncPhotos()}
function syncFavourite(){$("favouriteButton").textContent=favourite?"★":"☆";$("favouriteButton").classList.toggle("active",favourite);$("favouriteButton").setAttribute("aria-pressed",String(favourite))}
function syncPhotos(){for(const k of["front","back","bottle"]){const p=$(`${k}PhotoPreview`),r=$(`remove${k[0].toUpperCase()+k.slice(1)}Photo`);if(photos[k]){p.src=photos[k];p.classList.remove("hidden");r.classList.remove("hidden")}else{p.removeAttribute("src");p.classList.add("hidden");r.classList.add("hidden")}}const rb=$("recogniseLabelButton");if(rb)rb.classList.toggle("hidden",!photos.front)}
async function resize(file,max=1200,q=.78){const url=await new Promise((res,rej)=>{const r=new FileReader;r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file)}),img=await new Promise((res,rej)=>{const i=new Image;i.onload=()=>res(i);i.onerror=rej;i.src=url}),scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",q)}
async function save(e){e.preventDefault();if($("drinkFrom").value&&$("drinkBy").value&&$("drinkBy").value<$("drinkFrom").value)return toast("Drink-by date cannot be before drink-from date.");const id=$("wineId").value||uid(),old=wines.find(w=>w.id===id),w={id,favourite,photos,smartCaptureMeta:{...(old?.smartCaptureMeta||{}),...smartMeta},createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};for(const f of fields)w[f]=$(f).value.trim();w.quantity=Number(w.quantity||0);if(!w.name)return toast("Please enter the wine name.");await WineDB.put(w);await refresh();reset();view("inventory");toast("Wine saved.")}
function edit(w){reset();$("wineId").value=w.id;for(const f of fields)if($(f))$(f).value=w[f]??"";photos={...w.photos};favourite=!!w.favourite;smartMeta={...(w.smartCaptureMeta||{})};syncFavourite();syncPhotos();$("formTitle").textContent="Edit wine";view("editor")}
function details(w){const gallery=Object.values(w.photos||{}).filter(Boolean);$("dialogContent").innerHTML=`${gallery.length?`<div class="detail-gallery">${gallery.map(p=>`<img src="${p}" alt="Wine photograph">`).join("")}</div>`:""}<h2>${w.favourite?"★ ":""}${esc(title(w))}</h2><p><span class="badge ${status(w)}">${statusText(status(w))}</span></p><p><strong>Producer:</strong> ${esc(w.producer||"—")}</p><p><strong>Origin:</strong> ${esc([w.appellation,w.region,w.country].filter(Boolean).join(", ")||"—")}</p><p><strong>Grape/style:</strong> ${esc([w.grape,w.colour].filter(Boolean).join(" · ")||"—")}</p><p><strong>Quantity:</strong> ${Number(w.quantity||0)} · ${esc(w.bottleSize||"750")} ml</p><p><strong>Location:</strong> ${esc(locationText(w)||"—")}</p><p><strong>Value:</strong> ${money(totalValue(w))||"—"}</p><p><strong>Drinking window:</strong> ${esc(w.drinkFrom||"—")} to ${esc(w.drinkBy||"—")}</p><p><strong>Rating:</strong> ${w.rating?`${esc(w.rating)}/5`:"—"}</p><p><strong>Tasting notes:</strong><br>${esc(w.tastingNotes||"—")}</p><p><strong>General notes:</strong><br>${esc(w.notes||"—")}</p>${savedEnrichment(w)}`;$("detailsDialog").showModal()}
async function action(e){const b=e.target.closest("button[data-action]");if(!b)return;const w=wines.find(x=>x.id===b.closest(".wine-card").dataset.id);if(!w)return;if(b.dataset.action==="details")details(w);if(b.dataset.action==="edit")edit(w);if(b.dataset.action==="add"){w.quantity++;w.updatedAt=new Date().toISOString();await WineDB.put(w);await refresh();toast("Bottle added.")}if(b.dataset.action==="drink"&&w.quantity>0){w.quantity--;w.updatedAt=new Date().toISOString();await WineDB.put(w);await refresh();toast("One bottle marked as consumed.")}if(b.dataset.action==="delete"&&confirm(`Delete ${title(w)}?`)){await WineDB.remove(w.id);await refresh();toast("Wine deleted.")}}
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function stamp(){return new Date().toISOString().slice(0,10)}
function exportJson(){download(`wine-cellar-backup-${stamp()}.json`,JSON.stringify({app:"My Wine Cellar",version:"3.1",exportedAt:new Date().toISOString(),wines},null,2),"application/json");toast("Full backup exported.")}
function csv(v){return`"${String(v??"").replace(/"/g,'""')}"`}
function exportCsv(){const h=["Name","Producer","Vintage","Country","Region","Appellation","Colour","Grape","Quantity","Bottle size","Cellar","Rack","Bin","Case reference","Barcode","Purchase date","Purchase price","Current value","Merchant","Drink from","Drink by","Storage condition","Favourite","Rating","Last tasted","Tasting notes","Notes"],r=wines.map(w=>[w.name,w.producer,w.vintage,w.country,w.region,w.appellation,w.colour,w.grape,w.quantity,w.bottleSize,w.cellar,w.rack,w.bin,w.caseReference,w.barcode,w.purchaseDate,w.price,w.currentValue,w.merchant,w.drinkFrom,w.drinkBy,w.storageCondition,w.favourite,w.rating,w.lastTasted,w.tastingNotes,w.notes].map(csv).join(","));download(`wine-cellar-${stamp()}.csv`,[h.map(csv).join(","),...r].join("\r\n"),"text/csv;charset=utf-8");toast("CSV exported.")}
async function importJson(file){try{const x=JSON.parse(await file.text()),a=Array.isArray(x)?x:x.wines;if(!Array.isArray(a))throw 0;if(!confirm(`Restore ${a.length} records? This replaces the current inventory.`))return;await WineDB.replaceAll(a.map(w=>normalise({...w,id:w.id||uid(),updatedAt:w.updatedAt||new Date().toISOString(),createdAt:w.createdAt||new Date().toISOString()})));await refresh();toast("Backup restored.")}catch{toast("That is not a valid backup file.")}finally{$("importJson").value=""}}
function parseCsv(text){const rows=[];let row=[],cell="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++}else if(c==='"'){quoted=!quoted}else if(c===","&&!quoted){row.push(cell);cell=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell=""}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
async function importCsv(file){try{const rows=parseCsv(await file.text());if(rows.length<2)throw 0;const headers=rows[0].map(h=>h.trim().toLowerCase()),map={"name":"name","producer":"producer","vintage":"vintage","country":"country","region":"region","appellation":"appellation","colour":"colour","grape":"grape","quantity":"quantity","bottle size":"bottleSize","cellar":"cellar","rack":"rack","bin":"bin","case reference":"caseReference","barcode":"barcode","purchase date":"purchaseDate","purchase price":"price","current value":"currentValue","merchant":"merchant","drink from":"drinkFrom","drink by":"drinkBy","storage condition":"storageCondition","favourite":"favourite","rating":"rating","last tasted":"lastTasted","tasting notes":"tastingNotes","notes":"notes"};const imported=rows.slice(1).map(r=>{const w={id:uid(),photos:{front:"",back:"",bottle:""},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};headers.forEach((h,i)=>{const key=map[h];if(key)w[key]=r[i]??""});w.quantity=Number(w.quantity||1);w.favourite=String(w.favourite).toLowerCase()==="true";return w}).filter(w=>w.name);if(!confirm(`Import ${imported.length} wines and add them to the current inventory?`))return;for(const w of imported)await WineDB.put(w);await refresh();toast("CSV imported.")}catch{toast("The CSV could not be imported.")}finally{$("importCsv").value=""}}
function smartStatus(stage,message,error=false){
  const box=$("smartCaptureStatus");
  const steps=["Barcode captured","Checking your cellar","Searching online","Ready to review"];
  const current=Math.max(0,Math.min(stage,3));
  box.innerHTML=`<div class="scan-steps">${steps.map((x,i)=>`<div class="scan-step ${error&&i===current?'error':i<current?'done':i===current?'active':''}">${error&&i===current?'✕':i<current?'✓':i===current?'●':'○'} <span>${esc(i===current&&message?message:x)}</span></div>`).join('')}</div>`;
  box.classList.remove("hidden");
}
function clearSmartCapture(){
  $("smartCaptureStatus")?.classList.add("hidden");
  const r=$("smartCaptureResult");if(r){r.classList.add("hidden");r.innerHTML=""}
}
function setBlank(id,value){if(value&&!$(id).value.trim())$(id).value=value}
function offerLabelFallback(message){
  const r=$("smartCaptureResult");
  r.innerHTML=`<h4>${esc(message)}</h4><p class="smart-note">Use the front label as the fallback when the barcode is missing or the online catalogue cannot identify the wine.</p><div class="smart-actions"><button id="smartTakeLabel" class="button button-primary" type="button">🏷️ Photograph front label</button><button id="smartManual" class="button button-secondary" type="button">Enter manually</button></div>`;
  r.classList.remove("hidden");
  $("smartTakeLabel").onclick=()=>{autoRecogniseAfterCapture=true;$("frontPhotoInput").click()};
  $("smartManual").onclick=()=>{r.classList.add("hidden");toast("Enter the wine details manually. You can still add a label photograph below.")};
}
function confidenceBadge(level){const l=["high","medium","low"].includes(level)?level:"low";return`<span class="confidence ${l}">${l==='high'?'●':l==='medium'?'●':'●'} ${l[0].toUpperCase()+l.slice(1)} confidence</span>`}
function showLocalMatch(w,code){
  smartStatus(3,"Existing wine found in your cellar");
  const r=$("smartCaptureResult");
  r.innerHTML=`<h4>Already in your cellar</h4>${confidenceBadge("high")}<div class="smart-result-grid"><div><span>Wine</span><strong>${esc(title(w))}</strong></div><div><span>Producer</span><strong>${esc(w.producer||"—")}</strong></div><div><span>Location</span><strong>${esc(locationText(w)||"—")}</strong></div><div><span>Current quantity</span><strong>${Number(w.quantity||0)} bottle${Number(w.quantity||0)===1?'':'s'}</strong></div></div><div class="smart-actions"><button id="smartAddOne" class="button button-primary" type="button">Add one bottle</button><button id="smartNewFromExisting" class="button button-secondary" type="button">New record from this wine</button><button id="smartEditExisting" class="button button-secondary" type="button">Edit existing</button></div><p class="smart-note">Barcode ${esc(code)} matched a wine already saved on this device.</p>`;
  r.classList.remove("hidden");
  $("smartAddOne").onclick=async()=>{w.quantity=Number(w.quantity||0)+1;w.updatedAt=new Date().toISOString();await WineDB.put(w);await refresh();r.classList.add("hidden");toast("One bottle added to the existing wine.")};
  $("smartNewFromExisting").onclick=()=>{const copy={...w,id:"",quantity:1,vintage:"",createdAt:"",updatedAt:""};edit(copy);$("wineId").value="";$("barcode").value=code;toast("Known wine details copied. Please confirm the vintage.")};
  $("smartEditExisting").onclick=()=>edit(w);
}
function showExternalMatch(p,code){
  smartStatus(3,"Online match ready to review");
  const r=$("smartCaptureResult"),conf=p.confidence||"low";
  r.innerHTML=`<h4>Possible online match</h4>${confidenceBadge(conf)}<div class="smart-result-grid"><div><span>Wine/product</span><strong>${esc(p.name||"Not supplied")}</strong></div><div><span>Producer/brand</span><strong>${esc(p.producer||"Not supplied")}</strong></div><div><span>Country</span><strong>${esc(p.country||"Not supplied")}</strong></div><div><span>Region/origin</span><strong>${esc(p.region||"Not supplied")}</strong></div><div><span>Style</span><strong>${esc(p.colour||"Not supplied")}</strong></div><div><span>Source</span><strong>${esc(p.source||"External lookup")}</strong></div></div><div class="smart-actions"><button id="smartUseMatch" class="button button-primary" type="button">Use these details</button><button id="smartIgnoreMatch" class="button button-secondary" type="button">Ignore and enter manually</button></div><p class="smart-note">Please verify all suggested information. Retail barcodes often identify the product but not the exact vintage.</p>`;
  r.classList.remove("hidden");
  $("smartUseMatch").onclick=()=>{setBlank("name",p.name);setBlank("producer",p.producer);setBlank("country",p.country);setBlank("region",p.region);setBlank("colour",p.colour);$("barcode").value=code;if(!photos.front&&p.photo){photos.front=p.photo;syncPhotos()}r.classList.add("hidden");toast("Suggestions loaded. Check the details, add vintage/location/quantity, then Save.")};
  $("smartIgnoreMatch").onclick=()=>{r.classList.add("hidden");toast("Enter the wine details manually. The barcode will still be saved.")};
}
async function lookup(code){
  code=String(code||"").replace(/\s+/g,"").trim();
  clearSmartCapture();
  if(!code){toast("Enter or scan a barcode first.");return}
  $("barcode").value=code;
  smartStatus(0,`Barcode captured: ${code}`);
  await new Promise(r=>setTimeout(r,120));
  smartStatus(1,"Checking your cellar…");
  const local=wines.find(w=>String(w.barcode||"").replace(/\s+/g,"")===code);
  if(local){showLocalMatch(local,code);return}
  smartStatus(2,"Searching Open Food Facts…");
  try{
    const p=await WineLookup.lookupOpenFoodFacts(code);
    if(!p){smartStatus(3,"No online match found",true);offerLabelFallback("No online match found");toast("No online match found — photograph the label instead.");return}
    showExternalMatch(p,code);
  }catch(e){console.error(e);smartStatus(2,"Online lookup temporarily unavailable",true);offerLabelFallback("Online lookup is temporarily unavailable");toast("Online lookup is temporarily unavailable — try again or photograph the label.")}
}

async function recogniseLabel(){
  if(!photos.front){toast("Photograph the front label first.");return}
  const btn=$("recogniseLabelButton"),r=$("smartCaptureResult");
  btn.disabled=true;btn.textContent="Recognising…";
  r.innerHTML=`<h4>Analysing label…</h4><p class="smart-note">Smart Recognition is reading the photograph. Please wait a few seconds.</p>`;r.classList.remove("hidden");
  try{
    const res=await fetch("/api/identify-wine-gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:photos.front})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Recognition failed.");
    const grapes=Array.isArray(data.grapeVarieties)?data.grapeVarieties.join(", "):"";
    smartMeta={...smartMeta,recognitionMethod:"label-ai",recognitionConfidence:data.confidence||"low",recognitionWarnings:Array.isArray(data.warnings)?data.warnings:[],recognisedAt:new Date().toISOString()};
    r.innerHTML=`<h4>${data.identified?"Possible label match":"Label read — identification uncertain"}</h4>${confidenceBadge(data.confidence)}<div class="smart-result-grid"><div><span>Wine</span><strong>${esc(data.wineName||"Not certain")}</strong></div><div><span>Producer</span><strong>${esc(data.producer||"Not certain")}</strong></div><div><span>Vintage</span><strong>${esc(data.vintage||"Not certain")}</strong></div><div><span>Country</span><strong>${esc(data.country||"Not certain")}</strong></div><div><span>Region</span><strong>${esc(data.region||"Not certain")}</strong></div><div><span>Appellation</span><strong>${esc(data.appellation||"Not certain")}</strong></div><div><span>Style</span><strong>${esc(data.colour||"Not certain")}</strong></div><div><span>Grapes</span><strong>${esc(grapes||"Not certain")}</strong></div></div>${data.warnings?.length?`<p class="smart-warning"><strong>Please check:</strong> ${data.warnings.map(esc).join(" · ")}</p>`:""}<div class="smart-actions"><button id="useRecognitionAndEnrich" class="button button-primary" type="button">Use details + estimate drinking window</button><button id="useRecognition" class="button button-secondary" type="button">Use details only</button><button id="ignoreRecognition" class="button button-secondary" type="button">Ignore</button></div><p class="smart-note">AI suggestion only. Please verify the label and correct anything before saving.</p>`;
    const applyRecognition=()=>{setBlank("name",data.wineName);setBlank("producer",data.producer);setBlank("vintage",data.vintage?String(data.vintage):"");setBlank("country",data.country);setBlank("region",data.region);setBlank("appellation",data.appellation);setBlank("colour",data.colour);setBlank("grape",grapes);r.classList.add("hidden")};
    $("useRecognition").onclick=()=>{applyRecognition();toast("Recognition suggestions loaded. Please check them before saving.")};
    $("useRecognitionAndEnrich").onclick=async()=>{applyRecognition();toast("Recognition loaded. Estimating drinking window…");await estimateDrinkingWindow()};
    $("ignoreRecognition").onclick=()=>{r.classList.add("hidden");toast("Recognition ignored. Enter or correct the details manually.")};
  }catch(e){console.error(e);r.innerHTML=`<h4>Smart Recognition unavailable</h4><p class="smart-warning">${esc(e.message)}</p><p class="smart-note">Your label photograph is still saved locally. You can enter the wine manually and try recognition again later.</p>`;r.classList.remove("hidden");toast("Smart Recognition could not complete.")}
  finally{btn.disabled=false;btn.textContent="✨ Recognise wine from label"}
}

function intelligentDrinkStatus(drinkFrom,drinkBy,peakFrom,peakTo){const y=new Date().getFullYear(),f=drinkFrom?Number(String(drinkFrom).slice(0,4)):null,b=drinkBy?Number(String(drinkBy).slice(0,4)):null,pf=peakFrom?Number(peakFrom):null,pt=peakTo?Number(peakTo):null;if(f&&y<f-1)return{key:"too-young",label:"Too Young",note:`Estimated drinking window begins around ${f}.`};if(f&&y<f)return{key:"approaching",label:"Approaching Window",note:`Estimated drinking window begins around ${f}.`};if(b&&y>b)return{key:"drink-soon",label:"Drink Soon",note:`Beyond the estimated ideal window (drink by ${b}).`};if(pf&&pt&&y>=pf&&y<=pt)return{key:"at-peak",label:"At Peak",note:`Within the estimated peak window (${pf}–${pt}).`};if(f&&(!b||y<=b))return{key:"ready",label:"Ready to Drink",note:b?`Within the estimated drinking window through ${b}.`:"Within the estimated drinking window."};return{key:"unknown",label:"Window Unknown",note:"Add or estimate drinking dates for guidance."}}
function intelligentStatusBadge(x){return `<span class="drink-status drink-status-${esc(x.key)}">${esc(x.label)}</span>`}
function savedEnrichment(w){const m=w.smartCaptureMeta;if(!m||(!m.styleSummary&&!m.peakFromYear&&!m.foodPairings?.length&&!m.servingTemperature))return"";const x=intelligentDrinkStatus(w.drinkFrom,w.drinkBy,m.peakFromYear,m.peakToYear),peak=m.peakFromYear&&m.peakToYear?`${m.peakFromYear}–${m.peakToYear}`:"—";return `<div class="saved-enrichment"><div class="saved-enrichment-head">${intelligentStatusBadge(x)}<span>${esc(x.note)}</span></div><p><strong>Likely peak:</strong> ${esc(peak)}</p>${m.servingTemperature?`<p><strong>Serve:</strong> ${esc(m.servingTemperature)}</p>`:""}${m.styleSummary?`<p><strong>Style:</strong> ${esc(m.styleSummary)}</p>`:""}${Array.isArray(m.foodPairings)&&m.foodPairings.length?`<p><strong>Food:</strong> ${m.foodPairings.map(esc).join(" · ")}</p>`:""}<p class="smart-note">AI-estimated guidance. Bottle condition, storage and personal taste can change the ideal window.</p></div>`}
async function estimateDrinkingWindow(){
  const name=$("name").value.trim(),vintage=$("vintage").value.trim(),box=$("enrichmentResult"),btn=$("estimateWindowButton");
  if(!name){toast("Confirm the wine name before estimating a drinking window.");return}
  if(!vintage){const entered=window.prompt("What vintage is this bottle? Enter the 4-digit year.");if(!entered)return;const yr=Number(String(entered).trim());if(!Number.isInteger(yr)||yr<1800||yr>new Date().getFullYear()+1){toast("Please enter a valid 4-digit vintage.");return}$("vintage").value=String(yr);vintage=String(yr);toast(`Vintage ${yr} added. Estimating drinking window…`)}
  const payload={
    name,
    producer:$("producer").value.trim(),
    vintage:Number(vintage),
    country:$("country").value.trim(),
    region:$("region").value.trim(),
    appellation:$("appellation").value.trim(),
    colour:$("colour").value,
    grape:$("grape").value.trim(),
    bottleSize:$("bottleSize").value,
    storageCondition:$("storageCondition").value
  };
  btn.disabled=true;btn.textContent="Estimating…";
  box.innerHTML=`<h4>Estimating drinking window…</h4><p class="smart-note">This is an AI estimate, not a published critic or producer recommendation.</p>`;
  box.classList.remove("hidden");
  try{
    const res=await fetch("/api/enrich-wine-gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"Drinking-window estimation failed.");
    const yearText=(a,b)=>a&&b?`${a}–${b}`:a?String(a):b?String(b):"Not enough information";
    const pairs=Array.isArray(data.foodPairings)?data.foodPairings:[];
    const basis=Array.isArray(data.basis)?data.basis:[];
    const assumptions=Array.isArray(data.assumptions)?data.assumptions:[];
    box.innerHTML=`<h4>Estimated drinking guidance</h4>${confidenceBadge(data.confidence==="insufficient"?"low":data.confidence)}
      <div class="smart-result-grid">
        <div><span>Drink from</span><strong>${esc(data.drinkFromYear||"—")}</strong></div>
        <div><span>Likely peak</span><strong>${esc(yearText(data.peakFromYear,data.peakToYear))}</strong></div>
        <div><span>Drink by</span><strong>${esc(data.drinkByYear||"—")}</strong></div>
        <div><span>Serve</span><strong>${esc(data.servingTemperature||"—")}</strong></div>
      </div>
      ${data.styleSummary?`<div class="enrichment-summary"><strong>Style</strong><br>${esc(data.styleSummary)}</div>`:""}
      ${pairs.length?`<p><strong>Food pairing ideas</strong></p><ul class="enrichment-list">${pairs.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
      ${basis.length?`<p><strong>Estimate based on</strong></p><ul class="enrichment-list">${basis.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
      ${assumptions.length?`<p class="smart-note"><strong>Assumptions:</strong> ${assumptions.map(esc).join(" · ")}</p>`:""}
      ${(()=>{const x=intelligentDrinkStatus(data.drinkFromYear?`${data.drinkFromYear}-01-01`:"",data.drinkByYear?`${data.drinkByYear}-12-31`:"",data.peakFromYear,data.peakToYear);return `<div class="enrichment-status">${intelligentStatusBadge(x)} <span>${esc(x.note)}</span></div>`})()}<p class="enrichment-estimate"><strong>AI estimate:</strong> ${esc(data.warning||"Bottle condition, storage history and personal taste can change the ideal drinking window.")}</p>
      <div class="smart-actions"><button id="applyEstimatedWindow" class="button button-primary" type="button">Apply estimated dates</button><button id="keepManualWindow" class="button button-secondary" type="button">Keep dates manual</button></div>`;
    smartMeta={...smartMeta,enrichmentMethod:"gemini-ai-estimate",enrichmentConfidence:data.confidence||"low",enrichmentAt:new Date().toISOString(),drinkFromYear:data.drinkFromYear||null,peakFromYear:data.peakFromYear||null,peakToYear:data.peakToYear||null,drinkByYear:data.drinkByYear||null,foodPairings:pairs,servingTemperature:data.servingTemperature||"",styleSummary:data.styleSummary||"",enrichmentBasis:basis,enrichmentAssumptions:assumptions,enrichmentWarning:data.warning||""};
    $("applyEstimatedWindow").onclick=()=>{
      if(data.drinkFromYear)$("drinkFrom").value=`${data.drinkFromYear}-01-01`;
      if(data.drinkByYear)$("drinkBy").value=`${data.drinkByYear}-12-31`;
      box.classList.add("hidden");
      toast("Estimated drinking dates applied. Please review them before saving.");
    };
    $("keepManualWindow").onclick=()=>{box.classList.add("hidden");toast("Estimate retained as guidance; drinking dates left unchanged.")};
  }catch(e){
    console.error(e);
    box.innerHTML=`<h4>Drinking-window estimate unavailable</h4><p class="smart-warning">${esc(e.message)}</p><p class="smart-note">You can still enter the drinking dates manually.</p>`;
    box.classList.remove("hidden");
    toast("Drinking-window estimation could not complete.");
  }finally{
    btn.disabled=false;btn.textContent="🍷 Estimate drinking window";
  }
}
function bind(){document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="editor")reset();view(b.dataset.view)}));$("quickAdd").onclick=$("inventoryAdd").onclick=()=>{reset();view("editor")};$("wineForm").onsubmit=save;$("cancelEdit").onclick=()=>{reset();view("inventory")};$("favouriteButton").onclick=()=>{favourite=!favourite;syncFavourite()};["searchInput","filterStatus","filterColour","filterCountry","filterCellar","filterFavourite","sortBy"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderInventory));$("clearSearch").onclick=()=>{$("searchInput").value="";renderInventory()};$("resetFilters").onclick=()=>{["filterStatus","filterColour","filterCountry","filterCellar","filterFavourite"].forEach(id=>$(id).value="all");$("sortBy").value="name";$("searchInput").value="";renderInventory()};$("dashboardFilter").onchange=renderDashboard;document.querySelectorAll("[data-dashboard-filter]").forEach(b=>b.onclick=()=>{$("dashboardFilter").value=b.dataset.dashboardFilter;renderDashboard();view("dashboard")});$("inventoryList").onclick=$("dashboardList").onclick=action;for(const k of["front","back","bottle"]){$(`${k}PhotoInput`).onchange=async e=>{const f=e.target.files?.[0];if(f){photos[k]=await resize(f);syncPhotos();if(k==="front"){toast(autoRecogniseAfterCapture?"Front label captured. Starting Smart Recognition…":"Front label captured. Review the photo below; retake it by tapping Front label again if needed.");$("frontPhotoPreview").scrollIntoView({behavior:"smooth",block:"center"});if(autoRecogniseAfterCapture){autoRecogniseAfterCapture=false;setTimeout(()=>recogniseLabel(),250)}}}};$(`remove${k[0].toUpperCase()+k.slice(1)}Photo`).onclick=()=>{photos[k]="";$(`${k}PhotoInput`).value="";syncPhotos()}}$("scanBarcodeButton").onclick=async()=>{try{await BarcodeScanner.start(async c=>{$("barcode").value=c;await lookup(c)})}catch(e){toast(e.message)}};$("lookupBarcodeButton").onclick=()=>lookup($("barcode").value);$("smartLabelButton").onclick=()=>{autoRecogniseAfterCapture=true;$("frontPhotoInput").click()};$("recogniseLabelButton").onclick=recogniseLabel;$("estimateWindowButton").onclick=estimateDrinkingWindow;$("closeScannerButton").onclick=BarcodeScanner.stop;$("exportJson").onclick=exportJson;$("exportCsv").onclick=exportCsv;$("importJson").onchange=e=>e.target.files?.[0]&&importJson(e.target.files[0]);$("importCsv").onchange=e=>e.target.files?.[0]&&importCsv(e.target.files[0]);$("clearAll").onclick=async()=>{if(confirm("Delete every wine stored on this device?")){await WineDB.clear();await refresh();toast("All local data deleted.")}}}
function pwa(){if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.error));addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installButton").classList.remove("hidden")});$("installButton").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installButton").classList.add("hidden")}}}
async function init(){bind();pwa();reset();await refresh()}return{init}})();document.addEventListener("DOMContentLoaded",App.init);