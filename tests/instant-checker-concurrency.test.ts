import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardedScanUpdate,parseClaimToken} from '../api/instant-checker.ts';

const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
type Row={domain:string;status:string;claim_token:string;lease_expires_at:string;result:any};

function fakeDatabase(row:Row){
 return {from(name:string){
  assert.equal(name,'instant_scans');
  return {update(patch:Record<string,any>){
   const eqs:Record<string,string>={};const gts:Record<string,string>={};
   const builder={
    eq(field:string,value:string){eqs[field]=value;return builder;},
    gt(field:string,value:string){gts[field]=value;return builder;},
    select(field:string){assert.equal(field,'domain');return builder;},
    async maybeSingle(){
     const current=Object.entries(eqs).every(([k,v])=>(row as any)[k]===v)
      && Object.entries(gts).every(([k,v])=>String((row as any)[k])>v);
     if(current)Object.assign(row,patch);
     return {data:current?{domain:row.domain}:null,error:null};
    }
   };
   return builder;
  }};
 }};
}

test('claim parser accepts one exact UUID and rejects stale protocol values',()=>{
 assert.equal(parseClaimToken('claimed:'+first),first);
 for(const bad of ['claimed','cached','busy','claimed:not-a-uuid','claimed:'+first+':extra',null])
  assert.equal(parseClaimToken(bad),null);
});

test('overlapping scan generations: old success and old failure cannot replace new result',async()=>{
 const row:Row={domain:'example.com',status:'running',claim_token:first,lease_expires_at:'2026-11-21T00:00:10.000Z',result:null};
 const db=fakeDatabase(row);
 // First lease expired; a newer claim atomically replaces the token and lease.
 row.claim_token=second;row.lease_expires_at='2026-11-21T00:02:00.000Z';
 const at='2026-11-21T00:01:00.000Z';
 assert.equal(await guardedScanUpdate(db,'example.com',first,{status:'complete',result:{score:100}},at),false);
 assert.equal(await guardedScanUpdate(db,'example.com',first,{status:'error'},at),false);
 assert.equal(row.status,'running');assert.equal(row.result,null);
 assert.equal(await guardedScanUpdate(db,'example.com',second,{status:'complete',result:{score:72}},at),true);
 assert.equal(row.status,'complete');assert.equal(row.result.score,72);
 assert.equal(await guardedScanUpdate(db,'example.com',first,{status:'error'},at),false);
 assert.equal(row.result.score,72);
});

test('expired lease rejects both success and failure until a fresh claim',async()=>{
 const row:Row={domain:'example.com',status:'running',claim_token:first,lease_expires_at:'2026-11-21T00:00:10.000Z',result:{saved:true}};
 const db=fakeDatabase(row),now='2026-11-21T00:00:11.000Z';
 assert.equal(await guardedScanUpdate(db,'example.com',first,{status:'complete',result:{score:100}},now),false);
 assert.equal(await guardedScanUpdate(db,'example.com',first,{status:'error'},now),false);
 assert.deepEqual(row.result,{saved:true});
 row.claim_token=second;row.lease_expires_at='2026-11-21T00:03:00.000Z';
 assert.equal(await guardedScanUpdate(db,'example.com',second,{status:'error'},now),true);
 assert.equal(row.status,'error');
 assert.deepEqual(row.result,{saved:true});
});

test('migration creates only three isolated tables and two named functions; rate-only cleanup',()=>{
 const sql=readFileSync('docs/instant-checker-phase1.sql','utf8');
 const tables=[...sql.matchAll(/create table if not exists\s+(public\.\w+)/gi)].map(x=>x[1]);
 const functions=[...sql.matchAll(/create or replace function\s+(public\.\w+)/gi)].map(x=>x[1]);
 assert.deepEqual(tables,['public.instant_scans','public.instant_scan_leads','public.instant_scan_rate']);
 assert.deepEqual(functions,['public.instant_claim_scan','public.instant_claim_lead']);
 assert.match(sql,/claim_token uuid not null/);
 assert.match(sql,/return 'claimed:' \|\| v_token::text/);
 assert.match(sql,/claim_token=v_token/);
 assert.match(sql,/delete from public\.instant_scan_rate[\s\S]*window_start < now\(\) - interval '48 hours'/);
 assert.doesNotMatch(sql,/delete from public\.instant_scans|delete from public\.instant_scan_leads/i);
 assert.doesNotMatch(sql,/(?:drop|truncate)\s+(?:table\s+)?/i);
 for(const table of tables)assert.match(sql,new RegExp('alter table '+table.replace('.','\\.')+' enable row level security','i'));
 assert.match(sql,/revoke all on public\.instant_scans,public\.instant_scan_leads,public\.instant_scan_rate from anon,authenticated;/);
});
