-- Promptila Instant Checker Phase 1 — isolated storage. No changes to paid/full audits.
create table if not exists public.instant_scans (
 id uuid primary key default gen_random_uuid(),
 host text not null unique check(length(host) between 4 and 253),
 source_url text not null,
 status text not null default 'running' check(status in ('running','complete','incomplete','error')),
 public_result jsonb,
 score integer check(score between 0 and 100),
 scoring_version text not null default 'instant-v1.1',
 started_at timestamptz not null default now(),
 scanned_at timestamptz,
 expires_at timestamptz,
 duration_ms integer check(duration_ms>=0),
 request_count integer check(request_count>=0),
 bytes_transferred bigint check(bytes_transferred>=0),
 estimated_cost_usd numeric(10,6),
 created_at timestamptz not null default now()
);
create index if not exists idx_instant_scans_expires on public.instant_scans(expires_at);
alter table public.instant_scans enable row level security;
revoke all on public.instant_scans from public, anon, authenticated;
grant select,insert,update on public.instant_scans to service_role;

create table if not exists public.instant_scan_leads (
 id uuid primary key default gen_random_uuid(),
 scan_id uuid not null references public.instant_scans(id) on delete restrict,
 full_name text not null check(length(full_name) between 2 and 120),
 business_email text not null check(length(business_email) between 5 and 254),
 company_name text not null check(length(company_name) between 2 and 160),
 job_role text not null check(length(job_role) between 2 and 120),
 consent_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(scan_id,business_email)
);
alter table public.instant_scan_leads enable row level security;
revoke all on public.instant_scan_leads from public, anon, authenticated;
grant select,insert on public.instant_scan_leads to service_role;

create table if not exists public.instant_scan_limits (
 limiter_key text not null,
 bucket text not null,
 count integer not null default 0 check(count>=0),
 updated_at timestamptz not null default now(),
 primary key(limiter_key,bucket)
);
alter table public.instant_scan_limits enable row level security;
revoke all on public.instant_scan_limits from public, anon, authenticated;
grant select,insert,update on public.instant_scan_limits to service_role;

-- Atomic gating: IP rate limiting, host daily limiting, duplicate in-flight locking, 7-day cache.
-- Invoker privileges only. Revoke public execution including the default PUBLIC grant.
create or replace function public.claim_instant_scan(p_host text,p_url text,p_ip_hash text)
returns text language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_now timestamptz:=now();v_row public.instant_scans%rowtype;v_hour text:=to_char(v_now at time zone 'UTC','YYYYMMDDHH24');v_day text:=to_char(v_now at time zone 'UTC','YYYYMMDD');v_count integer;
begin
 if p_host is null or length(p_host)>253 or p_host !~ '^[a-z0-9.-]+$' or p_url is null or length(p_url)>2048 or p_ip_hash !~ '^[a-f0-9]{64}$' then return 'invalid';end if;
 -- Serialize matching site requests across serverless instances; release at transaction end.
 perform pg_advisory_xact_lock(hashtextextended(p_host,7138));
 select * into v_row from public.instant_scans where host=p_host;
 if found and v_row.status in ('complete','incomplete') and v_row.expires_at>v_now then return 'cached';end if;
 if found and v_row.status='running' and v_row.started_at>v_now-interval '2 minutes' then return 'busy';end if;
 insert into public.instant_scan_limits(limiter_key,bucket,count) values('ip:'||p_ip_hash,v_hour,1)
 on conflict(limiter_key,bucket) do update set count=instant_scan_limits.count+1,updated_at=v_now
 returning count into v_count;
 if v_count>10 then return 'rate_limited';end if;
 insert into public.instant_scan_limits(limiter_key,bucket,count) values('host:'||p_host,v_day,1)
 on conflict(limiter_key,bucket) do update set count=instant_scan_limits.count+1,updated_at=v_now
 returning count into v_count;
 if v_count>3 then return 'rate_limited';end if;
 insert into public.instant_scans(host,source_url,status,public_result,score,started_at,expires_at)
 values(p_host,p_url,'running',null,null,v_now,null)
 on conflict(host) do update set source_url=excluded.source_url,status='running',public_result=null,score=null,started_at=v_now,expires_at=null;
 return 'claimed';
end;
$$;
revoke all on function public.claim_instant_scan(text,text,text) from public,anon,authenticated;
grant execute on function public.claim_instant_scan(text,text,text) to service_role;
