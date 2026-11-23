// Customer-facing, deterministic explanations of existing confirmed failed checks.
// This module does not alter scoring, verdicts, engine estimates, or stored reports.
export type FixCheck={id:string;status:'pass'|'fail'|'unverified';points:number;label:string;category:string};
export type FixItem={id:string;title:string;problem:string;why:string;action:string;priority:'High'|'Medium'|'Low';impact:number};
type Rule={ids:string[];title:string;problem:string;why:string;action:string};
const rules:Rule[]=[
 {ids:['B1','B2','B3','B4'],title:'Make business information machine-readable',problem:'Structured website data is missing or incomplete.',why:'Structured data helps systems identify the business and interpret its pages.',action:'Add valid, consistent business and website schema to the appropriate public pages.'},
 {ids:['A1','A2','A3','A4','A5'],title:'Review crawler access',problem:'A crawler-access check failed.',why:'Restrictions can limit which publicly available pages some crawlers can request.',action:'Review robots.txt, accessibility and server access rules for the affected crawler.'},
 {ids:['C1','C2','C3','C4','C5'],title:'Improve page structure',problem:'A content or heading-structure check failed.',why:'Clear titles, headings and readable text help visitors and machines understand a page.',action:'Review the flagged page title, description, H1 or heading sequence and correct the identified issue.'},
 {ids:['D1','D2','D3','D4'],title:'Clarify the business description',problem:'A business identity or content check failed.',why:'Clear, consistent company and product descriptions reduce ambiguity.',action:'State who the business is, what it offers and where to find company information on public pages.'},
 {ids:['F1','F2','F3','F4'],title:'Correct website technical signals',problem:'A technical website check failed.',why:'Reliable HTTPS, homepage access, canonical URLs and indexability support site discovery.',action:'Review the failed technical signal and correct the homepage response or metadata.'},
 {ids:['E1','E2','E3'],title:'Consider publishing an llms.txt overview',problem:'The optional llms.txt checks failed.',why:'An llms.txt file can provide a curated summary, but is not required for AI recommendations.',action:'If useful for this site, publish a plain-text /llms.txt with a description and links to key public pages.'}
];
const specific:Record<string,Partial<Rule>>={
 C4:{title:'Correct the heading hierarchy',problem:'The page heading levels are not in a clear sequence.',action:'Use a logical H1–H2–H3 structure without skipping heading levels.'},
 F3:{title:'Fix the homepage canonical URL',problem:'The homepage canonical URL is missing or invalid.',action:'Add a valid HTTPS canonical URL pointing to the correct public homepage.'},
 C3:{title:'Review the primary page heading',problem:'The homepage H1 check failed.',action:'Use one clear primary H1 describing the page.'},
 B1:{title:'Add valid structured data',problem:'Valid structured data was not verified.',action:'Publish valid JSON-LD describing the relevant page and organization.'},
 B2:{title:'Identify the business in schema',problem:'A matching business or organization schema was not found.',action:'Include a same-site Organization or appropriate business entity in JSON-LD.'},
 B3:{title:'Make schema identity consistent',problem:'Business name and site URL were not paired in schema.',action:'Put the business name and correct website URL on the same typed schema entity.'},
 B4:{title:'Describe the website in schema',problem:'A matching site or page schema was not found.',action:'Include a relevant same-site WebSite or WebPage entity.'},
 E1:{title:'Consider an llms.txt file',problem:'A valid optional llms.txt file was not found.',action:'If it fits your content strategy, add a plain-text /llms.txt overview.'}
};
export function buildFixPlan(checks:FixCheck[],limit=5):FixItem[]{
 const failed=checks.filter(c=>c.status==='fail');
 const items:FixItem[]=[];
 for(const rule of rules){
  const matching=failed.filter(c=>rule.ids.includes(c.id));
  if(!matching.length)continue;
  const impact=matching.reduce((s,c)=>s+c.points,0);
  const chosen=matching.length===1?specific[matching[0].id]:undefined;
  const id=matching.map(c=>c.id).join('+');
  items.push({id,title:chosen?.title||rule.title,problem:chosen?.problem||rule.problem,why:rule.why,action:chosen?.action||rule.action,priority:impact>=12?'High':impact>=5?'Medium':'Low',impact});
 }
 return items.sort((a,b)=>b.impact-a.impact||a.id.localeCompare(b.id)).slice(0,limit);
}
