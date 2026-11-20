-- Phase 1 private migration. DO NOT apply before Steve reviews the corrections.
-- Only three NEW instant_* tables and two NEW instant_claim_* functions are created.
-- Retention: hourly/daily hashed rate counters older than 48h are pruned
-- opportunistically (2% of scan claims, no cron / paid service).
-- IMPORTANT: saved reports (including outdated reports), scan rows and leads
-- are NOT deleted by this migration. Consent data is retained. An explicit
-- separate retention/erasure policy and approval is required before any
-- scan or lead purging. Expired report cache is revalidated, not destroyed.
-- A new claim token is generated each time a lease is replaced;
-- API writes are conditional on BOTH current token and active lease.
create table if not exists public.instant_scans (
 id uuid primary key default gen_random_uuid(), domain text not null unique, website_url text not null,
 status text not null default 'running' check (status in ('running','complete','incomplete','error')),
 result jsonb, claim_token uuid not null default pg_catalog.gen_random_uuid(),
 score_version text not null default 'instant-v1.0',
 elapsed_ms integer, bytes_fetched integer, request_count integer,
 estimated_cost_usd numeric(10,6),
 started_at timestamptz not null default now(), scanned_at timestamptz, expires_at timestamptz,
 lease_expires_at timestamptz not null default now() + interval '30 seconds',
 created_at timestamptz not null default now()
);
create index if not exists instant_scans_expires_idx on public.instant_scans(expires_at);
create table if not exists public.instant_scan_leads (
 id uuid primary key default gen_random_uuid(),
 scan_id uuid not null references public.instant_scans(id) on delete restrict,
 full_name text not null, business_email text not null, company_name text not null,
 role_title text not null, consent boolean not null check (consent),
 marketing_consent boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.instant_scan_rate (
 ip_hash text not null, window_start timestamptz not null, attempts integer not null default 0,
 primary key(ip_hash,window_start)
);
create index if not exists instant_scan_rate_window_idx on public.instant_scan_rate(window_start);
alter table public.instant_scans enable row level security;
alter table public.instant_scan_leads enable row level security;
alter table public.instant_scan_rate enable row level security;
revoke all on public.instant_scans,public.instant_scan_leads,public.instant_scan_rate from anon,authenticated;
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
   pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.extract(epoch from now())/86400)*86400),1)
 on conflict(ip_hash,window_start) do update set attempts=public.instant_scan_rate.attempts+1
 returning attempts into v_domain_count;
 if v_domain_count>60 then return 'rate_limited'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('instant:'||p_domain));
 select * into v_state from public.instant_scans where domain=p_domain for update;
 if found then
  if v_state.status in ('complete','incomplete') and v_state.expires_at>now() then
   return 'cached';
  end if;
  if v_state.status='running' and v_state.lease_expires_at>now() then
   return 'busy';
  end if;
  v_token := pg_catalog.gen_random_uuid();
  update public.instant_scans set status='running',website_url=p_url,
   claim_token=v_token,started_at=now(),lease_expires_at=now()+interval '75 seconds',
   score_version='instant-v1.0'
   where domain=p_domain;
 else
  v_token := pg_catalog.gen_random_uuid();
  insert into public.instant_scans(domain,website_url,claim_token,lease_expires_at)
   values (p_domain,p_url,v_token,now()+interval '75 seconds');
 end if;
 return 'claimed:' || v_token::text;
end;
$$;
revoke all on function public.instant_claim_scan(text,text,text) from public,anon,authenticated;
grant execute on function public.instant_claim_scan(text,text,text) to service_role;

-- Atomic independent lead-submission limiter: 5 attempts / hashed IP / hour.
create or replace function public.instant_claim_lead(p_ip_hash text)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare
 v_start timestamptz := pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.extract(epoch from now())/3600)*3600);
 v_count integer;
begin
 if length(p_ip_hash)<>64 then return false; end if;
 insert into public.instant_scan_rate(ip_hash,window_start,attempts)
 values(p_ip_hash,v_start,1)
 on conflict(ip_hash,window_start) do update set attempts=public.instant_scan_rate.attempts+1
 returning attempts into v_count;
 return v_count<=5;
end;
$$;
revoke all on function public.instant_claim_lead(text) from public,anon,authenticated;
grant execute on function public.instant_claim_lead(text) to service_role;
