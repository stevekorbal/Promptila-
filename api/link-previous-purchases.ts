import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const normalized = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization || ''))?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in to link your purchases.' });
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Account linking is not configured.' });

  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Please sign in again.' });
    if (!user.email_confirmed_at || !user.email) {
      return res.status(403).json({ error: 'Confirm your email address before linking previous purchases.' });
    }
    const email = normalized(user.email);
    const pattern = escapeLike(email);
    const userId = user.id;

    // Only unclaimed records for the authenticated, confirmed email may be linked.
    // Never overwrite another account's ownership.
    const { data: requests, error: requestError } = await db.from('audit_requests')
      .select('id,email').is('user_id', null).ilike('email', pattern).limit(1000);
    if (requestError) throw requestError;
    const requestIds = (requests || []).filter(r => normalized(r.email) === email).map(r => r.id);
    if (requestIds.length) {
      const { error } = await db.from('audit_requests').update({ user_id: userId })
        .in('id', requestIds).is('user_id', null);
      if (error) throw error;
    }

    const { data: candidates, error: auditError } = await db.from('audits')
      .select('id,contact_email,audit_request_id').is('user_id', null)
      .ilike('contact_email', pattern).limit(1000);
    if (auditError) throw auditError;
    const auditIds = (candidates || []).filter(a => normalized(a.contact_email) === email).map(a => a.id);
    if (auditIds.length) {
      const { error } = await db.from('audits').update({ user_id: userId })
        .in('id', auditIds).is('user_id', null);
      if (error) throw error;
    }
    // Link audits whose original request belongs to this user, even if contact_email is blank.
    if (requestIds.length) {
      const { error } = await db.from('audits').update({ user_id: userId })
        .in('audit_request_id', requestIds).is('user_id', null);
      if (error) throw error;
    }

    const { data: purchases, error: purchaseError } = await db.from('blueprint_orders')
      .select('id,customer_email,stripe_payment_intent_id').is('user_id', null)
      .ilike('customer_email', pattern).limit(1000);
    if (purchaseError) throw purchaseError;
    const purchaseIds = (purchases || []).filter(p => normalized(p.customer_email) === email && /^pi_[a-zA-Z0-9]+$/.test(p.stripe_payment_intent_id || '')).map(p => p.id);
    if (purchaseIds.length) {
      const { error } = await db.from('blueprint_orders').update({ user_id: userId })
        .in('id', purchaseIds).is('user_id', null);
      if (error) throw error;
    }

    const { data: orders, error: ordersError } = await db.from('blueprint_orders')
      .select('id,audit_id,business_name,amount_paid,currency,status,payment_status,delivery_status,created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    if (ordersError) throw ordersError;
    return res.status(200).json({ linked: true, blueprint_orders: orders || [] });
  } catch (error) {
    console.error('Link previous purchases failed', error);
    return res.status(503).json({ error: 'Unable to link purchases right now. Please retry later.' });
  }
}
