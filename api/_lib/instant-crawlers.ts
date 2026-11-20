export type RobotsVerdict='allowed'|'blocked'|'unverified';
export const ROBOTS_AGENTS=['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','Claude-Web','Google-Extended','PerplexityBot'] as const;
type Group={agents:string[];rules:{allow:boolean;pattern:string}[]};
export function robotsPermission(body:string,agent:string,path='/'):RobotsVerdict{
 const groups:Group[]=[];let group:Group|null=null;
 for(const original of body.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const line=original.split('#')[0].trim();
  const m=/^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);
  if(!m)continue;
  const kind=m[1].toLowerCase(),value=m[2].trim();
  if(kind==='user-agent'){
   if(!value)return 'unverified';
   if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group);}
   group.agents.push(value.toLowerCase());
  }else if(group&&value)group.rules.push({allow:kind==='allow',pattern:value});
 }
 const named=groups.filter(g=>g.agents.includes(agent.toLowerCase()));
 const matching=named.length?named:groups.filter(g=>g.agents.includes('*'));
 if(!matching.length)return 'allowed';
 const rules=matching.flatMap(x=>x.rules);
 const relevant:{rule:typeof rules[number];length:number}[]=[];
 for(const rule of rules){
  if(!rule.pattern.startsWith('/')&&!rule.pattern.startsWith('*'))continue;
  const escaped=rule.pattern.replace(/[|\\{}()[\]^$+?.]/g,'\\$&').replace(/\*/g,'.*');
  const end=escaped.endsWith('\\$')?'$':'';
  const pat=end?escaped.slice(0,-2):escaped;
  let re:RegExp;
  try{re=new RegExp('^'+pat+end);}catch{return 'unverified';}
  if(re.test(path))relevant.push({rule,length:Buffer.byteLength(rule.pattern.replace(/[*$]/g,''))});
 }
 if(!relevant.length)return 'allowed';
 relevant.sort((a,b)=>b.length-a.length||Number(b.rule.allow)-Number(a.rule.allow));
 return relevant[0].rule.allow?'allowed':'blocked';
}
export function classifyProbe(status:number,contentType:string,body:string,truncated:boolean){
 if([401,403,407,429].includes(status))return {status:'blocked',reason:'http_'+status,evidence:'HTTP status '+status};
 if(status!==200)return {status:'unverified',reason:'http_'+status,evidence:'HTTP status '+status};
 if(!contentType.includes('html'))return {status:'unverified',reason:'non_html_response',evidence:contentType.slice(0,90)};
 // Ignore script and style contents so challenge libraries or marketing copy don't trigger false alarms.
 const title=(body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<[^>]*>/g,' ').trim();
 const visible=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 const heading=(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/<[^>]*>/g,' ').trim();
 const challengeTitle=/^(just a moment|attention required|access denied|verify you are human|security check|robot check|checking your browser)/i.test(title);
 const challengeHeading=/^(verify you are human|checking your browser|access denied|security verification|complete the captcha)/i.test(heading);
 const challengeDominates=/verify you are human|checking your browser|please complete the security check|your request has been blocked/i.test(visible.slice(0,700))&&visible.length<1800;
 if(challengeTitle||challengeHeading||challengeDominates)
  return {status:'challenge',reason:'verified_interstitial_markers',evidence:'Challenge title, primary heading or dominant interstitial text'};
 // HTML byte size alone does not prove useful content: require readable content and site markup.
 const substantive=(visible.length>=200&&
  (/<(?:main|article|h1|h2|nav)\b/i.test(body)||/<meta\b[^>]*name=["']description["']/i.test(body)));
 if(!substantive)return {status:'unverified',
  reason:truncated?'truncated_unverified_content':'insufficient_semantic_content',
  evidence:'No sufficiently readable HTML and semantic elements'};
 return {status:'accessible',reason:truncated?'meaningful_bounded_html':'meaningful_html',
  evidence:'HTTP 200, '+visible.length+' readable characters and semantic elements'};
}
export const PROBE_AGENTS=[
 {name:'GPTBot',value:'Mozilla/5.0 (compatible; GPTBot/1.3; +https://openai.com/gptbot)'},
 {name:'Googlebot',value:'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'},
 {name:'ClaudeBot',value:'ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)'},
 {name:'PerplexityBot',value:'PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)'}
] as const;
