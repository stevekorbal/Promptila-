// Bounded HTML tokenizer: no scripting, no DOM/browser, no remote dependencies.
// Extracts only explicit evidence; never infers missing fields from a truncated document.
export type Evidence={
 title:string;description:string;h1:string[];headings:number[];text:string;
 canonical:string;noindex:boolean;aboutLinks:string[];schema:any[];
 ogName:string;siteName:string;services:string[];jsonErrors:number;
 appData:string[];truncated:boolean;hasDocumentEnd:boolean;jsShell:boolean;
};
function decode(input:string){
 return input.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_all,s:string)=>{
  const k=s.toLowerCase();
  if(k[0]==='#'){let n=Number.parseInt(k[1]==='x'?k.slice(2):k.slice(1),k[1]==='x'?16:10);
   return Number.isFinite(n)&&n>=32&&n<=0x10ffff?String.fromCodePoint(n):' ';}
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[k]||' ';
 });
}
function attrs(input:string):Record<string,string>{
 const result:Record<string,string>={};
 const re=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
 for(const match of input.matchAll(re)){
  const name=match[1].toLowerCase();
  if(name&&!Object.hasOwn(result,name))result[name]=decode(match[2]??match[3]??match[4]??'');
 }
 return result;
}
function values(node:any,results:string[],depth=0){
 if(results.length>=60||depth>12||node===null)return;
 if(typeof node==='string')return;
 if(Array.isArray(node)){node.slice(0,30).forEach(x=>values(x,results,depth+1));return;}
 if(typeof node!=='object')return;
 for(const [key,value] of Object.entries(node)){
  if(['description','name','headline','category','serviceType','productType','disambiguatingDescription'].includes(key)&&typeof value==='string'&&value.trim().length>14){
   results.push(value.slice(0,400));
  }
  if(value&&typeof value==='object')values(value,results,depth+1);
 }
}
export function parseHtml(html:string,truncated=false):Evidence{
 const result:Evidence={title:'',description:'',h1:[],headings:[],text:'',canonical:'',noindex:false,aboutLinks:[],
  schema:[],ogName:'',siteName:'',services:[],jsonErrors:0,appData:[],truncated,hasDocumentEnd:false,jsShell:false};
 const parts:string[]=[];
 let pointer=0,skip='',capture='',buffer='',activeAttrs:Record<string,string>={},scriptType='';
 const pushText=(value:string)=>{
  const cleaned=decode(value).replace(/\s+/g,' ').trim();
  if(cleaned&&parts.join(' ').length<24000)parts.push(cleaned.slice(0,4000));
 };
 while(pointer<html.length){
  const open=html.indexOf('<',pointer);
  if(open<0){if(!truncated)consume(html.slice(pointer));break;}
  consume(html.slice(pointer,open));
  if(html.startsWith('<!--',open)){
   const end=html.indexOf('-->',open+4);if(end<0)break;pointer=end+3;continue;
  }
  // Find closing > without interpreting > inside quotes.
  let end=open+1,quote='';
  for(;end<html.length;end++){
   const c=html[end];if(quote){if(c===quote)quote='';}
   else if(c==='"'||c==="'")quote=c;else if(c==='>')break;
  }
  if(end>=html.length)break;
  const token=html.slice(open+1,end);
  const tagMatch=/^\s*(\/?)\s*([a-zA-Z][\w:-]*)/.exec(token);
  pointer=end+1;
  if(!tagMatch)continue;
  const closing=!!tagMatch[1],tag=tagMatch[2].toLowerCase();
  if(closing){
   if(tag==='html')result.hasDocumentEnd=true;
   if(tag===capture){
    const value=decode(buffer).replace(/\s+/g,' ').trim();
    if(tag==='title')result.title=value.slice(0,300);
    if(/^h[1-6]$/.test(tag)&&value&&tag==='h1')result.h1.push(value.slice(0,250));
    capture='';buffer='';
   }
   if(tag===skip){skip='';scriptType='';}
   continue;
  }
  if(skip)continue;
  const a=attrs(token.slice(tagMatch[0].length));
  if(tag==='script'){
   const type=(a.type||'').toLowerCase();
   // Capture entire script body without executing it.
   const endScript=html.toLowerCase().indexOf('</script',pointer);
   if(endScript<0){skip='script';continue;}
   const body=html.slice(pointer,endScript);
   const scriptEnd=html.indexOf('>',endScript);
   pointer=scriptEnd<0?html.length:scriptEnd+1;
   if(type==='application/ld+json'){
    try{result.schema.push(JSON.parse(body.trim()));}catch{result.jsonErrors++;}
   }else if(a.id==='__NEXT_DATA__'||type==='application/json'){
    try{
     const node=JSON.parse(body.trim());
     values(node,result.appData);
    }catch{result.jsonErrors++;}
   }
   continue;
  }
  if(['style','noscript','template','svg'].includes(tag)){skip=tag;continue;}
  if(tag==='title'||/^h[1-6]$/.test(tag)){capture=tag;buffer='';if(tag!=='title')result.headings.push(Number(tag[1]));}
  if(tag==='meta'){
   const name=(a.name||a.property||'').toLowerCase(),value=a.content||'';
   if(name==='description')result.description=value.slice(0,500);
   if(name==='og:site_name')result.ogName=value.slice(0,200);
   if((name==='robots'||name==='googlebot')&&/\bnoindex\b/i.test(value))result.noindex=true;
  }
  if(tag==='link'&&(a.rel||'').toLowerCase().split(/\s+/).includes('canonical'))result.canonical=a.href||'';
  if(tag==='a'&&a.href&&/about|our-story|company|who-we-are/i.test(a.href))result.aboutLinks.push(a.href.slice(0,300));
  if(tag==='html'&&a['data-reactroot']!==undefined)result.jsShell=true;
  if(tag==='div'&&['root','app','__next'].includes(a.id||''))result.jsShell=true;
 }
 function consume(value:string){
  if(skip)return;
  if(capture){buffer+=value.slice(0,4000);return;}
  pushText(value);
 }
 result.text=parts.join(' ').slice(0,24000);
 const hints=[result.description,result.title,result.ogName,...result.appData].filter(Boolean);
 result.siteName=(result.ogName||result.title.split(/[|–—]/).pop()||'').trim().slice(0,160);
 result.services=hints.filter(s=>/(\bwe\b|\bour\b|provides?|offers?|specializ|manufacturer|retail|service|shop|plumb|hvac|candy|store)/i.test(s)&&s.length>30).slice(0,12);
 // JS dependency needs both shell markers and actual lack of visible content.
 result.jsShell=result.jsShell&&result.text.length<350&&result.h1.length===0;
 return result;
}
export function schemaNodes(raw:any[]):any[]{
 const out:any[]=[];
 const visit=(x:any,depth=0)=>{
  if(depth>8||out.length>100||!x)return;
  if(Array.isArray(x))return x.slice(0,100).forEach(y=>visit(y,depth+1));
  if(typeof x!=='object')return;
  if(x['@type'])out.push(x);
  if(x['@graph'])visit(x['@graph'],depth+1);
 };
 raw.forEach(x=>visit(x));return out;
}
export function schemaHasType(n:any,needle:string){
 const t=n?.['@type'];return (Array.isArray(t)?t:[t]).some((v:any)=>typeof v==='string'&&(v.toLowerCase()===needle.toLowerCase()||needle==='LocalBusiness'&&/business|plumber|store|restaurant|contractor|hvac/i.test(v)));
}
