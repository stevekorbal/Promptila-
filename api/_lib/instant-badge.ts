export const BADGE_STYLES=['dark','light','shield','seal'] as const;
export type BadgeStyle=typeof BADGE_STYLES[number];
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]||c));

export function badgeSvg(domain:string,score:number,scannedAt:string,style:BadgeStyle,reportBase='https://www.promptila.com',estimated=false){
 if(!/^[a-z0-9.-]+$/.test(domain)||domain.length>253)throw Error('Invalid badge domain');
 if(!Number.isInteger(score)||score<0||score>100)throw Error('Invalid badge score');
 const iso=new Date(scannedAt);
 if(!Number.isFinite(iso.getTime()))throw Error('Invalid scan date');
 const date=iso.toISOString().slice(0,10);
 const link=esc(reportBase+'/ai-visibility-checker/report/'+encodeURIComponent(domain));
 const text=esc(domain.slice(0,34));
 const dark=style==='dark'||style==='shield';
 const fg=dark?'#ffffff':'#172033',sub=dark?'#cbd5e1':'#485670',bg=dark?'#111827':'#f8fafc';
 const stroke=dark?'#6366f1':'#c7d2fe';
 let shape='<rect x="1" y="1" width="318" height="88" rx="13" fill="'+bg+'" stroke="'+stroke+'" stroke-width="2"/>';
 if(style==='shield')shape+='<path d="M18 18 L44 12 L70 18 V43 Q65 62 44 72 Q23 62 18 43 Z" fill="#3730a3" stroke="#a5b4fc" stroke-width="2"/><text x="44" y="47" text-anchor="middle" font-size="23" font-family="Arial" font-weight="bold" fill="#fff">'+score+'</text>';
 if(style==='seal')shape+='<circle cx="45" cy="43" r="31" fill="#eef2ff" stroke="#4338ca" stroke-width="3"/><circle cx="45" cy="43" r="26" fill="none" stroke="#818cf8" stroke-dasharray="3 3"/><text x="45" y="49" text-anchor="middle" font-size="22" font-family="Arial" font-weight="bold" fill="#312e81">'+score+'</text>';
 const offset=(style==='shield'||style==='seal')?88:15;
 const bigScore=(style==='shield'||style==='seal')?'':'<text x="304" y="56" text-anchor="end" font-family="Arial" font-size="29" font-weight="bold" fill="'+fg+'">'+score+'/100</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90" role="img" aria-label="Promptila '+(estimated?'estimated website readiness':'website readiness')+' score '+score+' out of 100 for '+text+'"><a href="'+link+'" target="_blank">'+shape+
  '<text x="'+offset+'" y="24" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="'+fg+'">Promptila '+(estimated?'estimated score':'website check')+'</text>'+
  '<text x="'+offset+'" y="43" font-family="Arial,sans-serif" font-size="11" fill="'+sub+'">Website readiness</text>'+
  '<text x="'+offset+'" y="73" font-family="Arial,sans-serif" font-size="10" fill="'+sub+'">'+(estimated?'Estimated · Not verified':'Checked '+date+' · Not AI certification')+'</text>'+
  bigScore+'</a></svg>';
}
