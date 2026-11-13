import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { normalizeCustomerEmail } from './_lib/pay-first-guards.ts';

/**
 * Guest checkout lookup: email entered by customer -> eligible completed audits.
 * This endpoint is a lookup, NOT proof of email ownership or payment authorization.
 * Never send audit findings, scores, internal UUIDs, or payment credentials here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const email = normalizeCustomerEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: 'Guest checkout lookup is not configured.' });
  }

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: audits, error } = await db.from('audits')
      .select('audit_id,audit_request_id,business_name,website,overall_score,status,needs_review')
      .ilike('contact_email', email)
      .in('status', ['free_audit_sent', 'completed'])
      .eq('needs_review', false)
      .not('overall_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;

    const requestIds = [...new Set((audits || [])
      .map(a => a.audit_request_id).filter(Boolean))];
    const requestMap = new Map<string, any>();
    if (requestIds.length) {
      const { data: requests, error: requestError } = await db.from('audit_requests')
        .select('id,first_name,last_name,email,phone,business_name,website,city,state')
        .in('id', requestIds);
      if (requestError) throw requestError;
      for (const item of requests || []) {
        if (normalizeCustomerEmail(item.email) === email) requestMap.set(item.id, item);
      }
    }

    const matches = (audits || []).map(a => {
      const request = requestMap.get(a.audit_request_id);
      return {
        audit_id: a.audit_id,
        business_name: request?.business_name || a.business_name || '',
        website: request?.website || a.website || '',
        first_name: request?.first_name || '',
        last_name: request?.last_name || '',
        phone: request?.phone || '',
        city: request?.city || '',
        state: request?.state || '',
      };
    });
    return res.status(200).json({ matches });
  } catch (err) {
    console.error('Guest audit lookup failed', err);
    return res.status(503).json({ error: 'Unable to look up completed audits right now.' });
  }
}
