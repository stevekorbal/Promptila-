// Incomplete evidence presentation policy v1: unchanged verified scoring and weights.
// An unverified check contributes [0, its approved points] to the possible range.
// The midpoint is DISPLAY-ONLY and explicitly estimated; it is never written
// to the authoritative score or interpreted as a verified pass/failure.
export type EvidenceCheck={id:string;category:string;points:number;status:'pass'|'fail'|'unverified'};
const categories=[['AI crawler access',25],['Structured data',20],['Semantic structure',20],
 ['Content and entity signals',15],['llms.txt',10],['Technical health',10]] as const;
const weights:Record<string,readonly number[]>={ChatGPT:[30,20,15,20,5,10],Gemini:[25,20,20,20,5,10],
 Claude:[30,15,20,20,5,10],Perplexity:[30,15,20,20,5,10]};
export const MAX_ESTIMATED_UNKNOWN_POINTS=5;
export type EstimatedReadiness={
 policy:'bounded-evidence-v1'; status:'verified'|'estimated'|'range_only';
 overall:{value:number|null;minimum:number;maximum:number;unknown_points:number;estimated:boolean};
 engines:Record<string,{value:number|null;minimum:number;maximum:number;estimated:boolean}>;
 badge_eligible:boolean
};
export function estimateReadiness(checks:EvidenceCheck[]):EstimatedReadiness|null{
 if(!Array.isArray(checks)||checks.length!==25)return null;
 const data=categories.map(([category,max])=>{
  const relevant=checks.filter(x=>x.category===category);
  const confirmed=relevant.filter(x=>x.status==='pass').reduce((sum,x)=>sum+x.points,0);
  const unknown=relevant.filter(x=>x.status==='unverified').reduce((sum,x)=>sum+x.points,0);
  return {max,confirmed,unknown};
 });
 if(data.some(x=>x.confirmed+x.unknown>x.max))return null;
 const confirmed=data.reduce((sum,x)=>sum+x.confirmed,0);
 const unknown=data.reduce((sum,x)=>sum+x.unknown,0);
 const estimated=unknown>0;
 const showNumber=unknown<=MAX_ESTIMATED_UNKNOWN_POINTS;
 const engines:EstimatedReadiness['engines']={};
 for(const [name,weight] of Object.entries(weights)){
  const low=weight.reduce((sum,pct,i)=>sum+pct*data[i].confirmed/data[i].max,0);
  const high=weight.reduce((sum,pct,i)=>sum+pct*(data[i].confirmed+data[i].unknown)/data[i].max,0);
  engines[name]={minimum:Math.round(low),maximum:Math.round(high),
   value:showNumber?Math.round((low+high)/2):null,estimated};
 }
 return {policy:'bounded-evidence-v1',status:!estimated?'verified':showNumber?'estimated':'range_only',
  overall:{value:showNumber?Math.round(confirmed+unknown/2):null,
   minimum:confirmed,maximum:confirmed+unknown,unknown_points:unknown,estimated},
  engines,badge_eligible:showNumber};
}
