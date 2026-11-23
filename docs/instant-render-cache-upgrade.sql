-- STAGED / NOT APPLIED: use only after browser-run validation and approved zero-cost deployment.
-- Updates ONLY the isolated public.instant_scans table and public.instant_claim_scan function.
-- Preserves previous completed/incomplete results inside result_history before a refresh.
-- Does not change lead records, paid reports, Stripe, or n8n.
-- Existing 7-day cache remains for instant-v1.1-render; previous unfinished
-- JS-shell results can be rescanned once, without deleting any report or lead.
-- Requires the Instant Checker v1.1 application release and browser fallback.
begin;
alter table public.instant_scans
 add column if not exists result_history jsonb not null default '[]'::jsonb;
create or replace function public.instant_claim_scan(p_domain text,p_url text,p_ip_hash text)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
 v_start timestamptz := to_timestamp(floor(extract(epoch from now())/3600)*3600);
 v_count integer;
 v_domain_count integer;
 v_token uuid;
 v_state public.instant_scans%rowtype;
begin
 if length(p_domain)>253 or p_domain !~ '^[a-z0-9.-]+$' or length(p_ip_hash)<>64 then
  raise exception 'Invalid claim';
 end if;
 insert into public.instant_scan_rate(ip_hash,window_start,attempts)
 values(p_ip_hash,v_start,1)
 on conflict(ip_hash,window_start) do update set attempts=public.instant_scan_rate.attempts+1
 returning attempts into v_count;
 if v_count>8 then return 'rate_limited'; end if;
 -- Opportunistic rate-record cleanup: 2% of claim attempts; no external scheduler.
 -- Keep two full days of rate evidence; never touch scans, reports or leads.
 if pg_catalog.random() < 0.02 then
  delete from public.instant_scan_rate
   where window_start < now() - interval '48 hours';
 end if;
 -- Domain-wide daily cap is enforced atomically to prevent distributed abuse.
 insert into public.instant_scan_rate(ip_hash,window_start,attempts)
 values('domain:'||pg_catalog.md5(p_domain),
   pg_catalog.to_timestamp(pg_catalog.floor(extract(epoch from now())/86400)*86400),1)
 on conflict(ip_hash,window_start) do update set attempts=public.instant_scan_rate.attempts+1
 returning attempts into v_domain_count;
 if v_domain_count>60 then return 'rate_limited'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('instant:'||p_domain));
 select * into v_state from public.instant_scans where domain=p_domain for update;
 if found then
  if v_state.status in ('complete','incomplete') and v_state.expires_at>now() and v_state.score_version='instant-v1.1-render' then
   return 'cached';
  end if;
  if v_state.status='running' and v_state.lease_expires_at>now() then
   return 'busy';
  end if;
  v_token := pg_catalog.gen_random_uuid();
  update public.instant_scans set
   result_history = case
     when status in ('complete','incomplete') and result is not null
     then result_history || pg_catalog.jsonb_build_array(
       pg_catalog.jsonb_build_object('result',result,'score_version',score_version,
         'scanned_at',scanned_at,'archived_at',now()))
     else result_history end,
   status='running',website_url=p_url,
   claim_token=v_token,started_at=now(),lease_expires_at=now()+interval '75 seconds',
   score_version='instant-v1.1-render'
   where domain=p_domain;
 else
  v_token := pg_catalog.gen_random_uuid();
  insert into public.instant_scans(domain,website_url,claim_token,lease_expires_at,score_version)
   values (p_domain,p_url,v_token,now()+interval '75 seconds','instant-v1.1-render');
 end if;
 return 'claimed:' || v_token::text;
end;
$$;
revoke all on function public.instant_claim_scan(text,text,text) from public,anon,authenticated;
grant execute on function public.instant_claim_scan(text,text,text) to service_role;
commit;
