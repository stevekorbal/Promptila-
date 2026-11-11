-- Checkout audit discovery: only the authenticated, email-verified owner can see candidates.
-- Return minimal business identifiers; never expose arbitrary email searches.
create or replace function public.find_own_scored_audits_for_checkout()
returns table(audit_id text, business_name text, website text, location text, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare verified_email text;
begin
  if auth.uid() is null then return; end if;
  select lower(trim(u.email)) into verified_email
    from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null;
  if verified_email is null then return; end if;
  return query
    select a.audit_id, a.business_name, a.website, a.location, a.created_at
    from public.audits a
    where lower(trim(a.contact_email)) = verified_email
      and (a.user_id is null or a.user_id = auth.uid())
      and a.overall_score is not null
      and a.status in ('free_audit_sent', 'completed')
      and a.needs_review = false
      and exists (
        select 1 from public.audit_requests r
        where r.id = a.audit_request_id
          and lower(trim(r.email)) = verified_email
          and (r.user_id is null or r.user_id = auth.uid())
      )
    order by a.created_at desc;
end;
$$;
revoke all on function public.find_own_scored_audits_for_checkout() from public, anon;
grant execute on function public.find_own_scored_audits_for_checkout() to authenticated;
