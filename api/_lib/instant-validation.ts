// Evidence-based JSON-LD validation. Each check depends on related properties within
// the same typed entity, not on keywords or properties elsewhere in the graph.
const BUSINESS_TYPES=new Set(['organization','localbusiness','store','plumber','hvacbusiness','homeandconstructionbusiness','professionalservice','corporation','restaurant','bakery','roofingcontractor','electrician','generalcontractor','automotiverepair','foodestablishment']);
const PAGE_TYPES=new Set(['website','webpage','aboutpage','contactpage','collectionpage','service','product','itempage']);
function types(n:any):string[]{
 const raw=n?.['@type'];return (Array.isArray(raw)?raw:[raw]).filter((x:any)=>typeof x==='string').map((x:string)=>x.split(/[\/#]/).pop()!.toLowerCase());
}
function asName(x:any):string{
 if(typeof x==='string')return x.trim();
 if(x&&typeof x==='object'&&typeof x.name==='string')return x.name.trim();
 return '';
}
export function normalizedHost(input:string):string|null{
 try{
  const u=new URL(input);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)return null;
  return u.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
 }catch{return null;}
}
function sameSiteUrl(input:any,site:URL):boolean{
 if(typeof input!=='string')return false;
 return normalizedHost(input)===site.hostname.toLowerCase().replace(/^www\./,'');
}
function validContext(n:any){
 const ctx=n?.['@context'];
 const list=Array.isArray(ctx)?ctx:[ctx];
 return list.some((x:any)=>typeof x==='string'&&/^https?:\/\/schema\.org\/?$/i.test(x));
}
function entityName(n:any){return asName(n?.name).length>=3&&!/^(home|welcome|website)$/i.test(asName(n?.name));}
export function validateStructuredData(nodes:any[],site:URL){
 const contextual=nodes.filter(n=>n&&typeof n==='object'&&
  (validContext(n)||typeof n['@type']==='string'&&n['@type'].startsWith('https://schema.org/')));
 // For @graph nodes whose context is on the wrapper, the graph parser should propagate it.
 const business=contextual.filter(n=>types(n).some(t=>BUSINESS_TYPES.has(t)||
  (t.endsWith('business')&&t.length>8)));
 const relevantBusiness=business.filter(n=>sameSiteUrl(n.url,site)&&entityName(n));
 const pages=contextual.filter(n=>types(n).some(t=>PAGE_TYPES.has(t))&&
  (sameSiteUrl(n.url,site)||sameSiteUrl(n['@id'],site)||
   sameSiteUrl(n.mainEntityOfPage,site)||sameSiteUrl(n.isPartOf?.['@id'],site)));
 return {
  valid:contextual.length>0,
  business:business.some(n=>entityName(n)&&sameSiteUrl(n.url,site)),
  identity:relevantBusiness.length>0,
  page:pages.length>0,
  businessName:asName(relevantBusiness[0]?.name),
  businessDescription:typeof relevantBusiness[0]?.description==='string'?relevantBusiness[0].description:'',
  businessUrl:typeof relevantBusiness[0]?.url==='string'?relevantBusiness[0].url:'',
  evidence:{typedNodes:contextual.length,matchedBusiness:relevantBusiness.length,
   matchedPage:pages.length}
 };
}
export function validateCanonical(canonical:string,site:URL,finalPageUrl?:string){
 if(!canonical.trim())return {valid:false,reason:'canonical_missing'};
 try{
  const u=new URL(canonical,site);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||u.search||u.hash)
   return {valid:false,reason:'invalid_canonical_attributes'};
  const requestedHost=site.hostname.toLowerCase().replace(/^www\./,'');
  const targetHost=u.hostname.toLowerCase().replace(/^www\./,'');
  if(targetHost!==requestedHost)return {valid:false,reason:'unrelated_canonical_host'};
  const landingPath=finalPageUrl?new URL(finalPageUrl).pathname:site.pathname;
  if(u.pathname!=='/'&&u.pathname!==landingPath)return {valid:false,reason:'canonical_not_homepage_or_final_landing_page'};
  if(site.protocol==='https:'&&u.protocol!=='https:')return {valid:false,reason:'downgraded_canonical'};
  return {valid:true,reason:u.pathname===landingPath&&landingPath!=='/'?'matching_redirected_landing_page':u.hostname===site.hostname?'matching_homepage':'equivalent_www_homepage'};
 }catch{return {valid:false,reason:'invalid_canonical_url'};}
}
