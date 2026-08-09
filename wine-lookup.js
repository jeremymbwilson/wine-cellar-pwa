const WineLookup=(()=>{
  function cleanTag(value=""){
    return String(value).replace(/^[a-z]{2}:/i,"").replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();
  }
  function first(...values){return values.find(v=>String(v||"").trim())||""}
  function inferColour(product){
    const hay=[product.product_name,product.categories,...(product.categories_tags||[]),...(product.labels_tags||[])].join(" ").toLowerCase();
    if(/ros[eé]|rose wine|rosé/.test(hay))return"Rosé";
    if(/white wine|vin blanc|vino bianco/.test(hay))return"White";
    if(/red wine|vin rouge|vino rosso/.test(hay))return"Red";
    if(/sparkling|champagne|prosecco|cava/.test(hay))return"Sparkling";
    return"";
  }
  async function lookupOpenFoodFacts(barcode){
    const fields=["code","product_name","product_name_en","brands","countries","countries_tags","origins","origins_tags","categories","categories_tags","labels_tags","image_front_url","image_url"].join(",");
    const url=`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
    const r=await fetch(url,{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("External product lookup is unavailable.");
    const x=await r.json();
    if(x.status!==1||!x.product)return null;
    const p=x.product;
    const categories=[p.categories,...(p.categories_tags||[])].join(" ").toLowerCase();
    const looksLikeWine=/wine|vin-|vin |vino|champagne|prosecco|cava/.test(categories+" "+String(p.product_name||"").toLowerCase());
    const result={
      barcode:String(x.code||barcode),
      name:first(p.product_name_en,p.product_name),
      producer:first(p.brands),
      country:cleanTag(first(p.countries_tags?.[0],p.countries)),
      region:cleanTag(first(p.origins_tags?.[0],p.origins)),
      colour:inferColour(p),
      photo:first(p.image_front_url,p.image_url),
      source:"Open Food Facts",
      looksLikeWine
    };
    const populated=[result.name,result.producer,result.country,result.region,result.colour,result.photo].filter(Boolean).length;
    result.confidence=looksLikeWine&&populated>=4?"medium":populated>=3?"medium":"low";
    return result;
  }
  return{lookupOpenFoodFacts};
})();