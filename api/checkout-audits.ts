import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Authenticated only: no unauthenticated email enumeration.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in to find your free audit.' });
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').split('/rest/v1')[0].replace(/\/$/, '');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Audit lookup is unavailable.' });
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return res.status(401).json({ error: 'Please sign in again.' });
  const requestedEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!requestedEmail || requestedEmail !== String(auth.user.email || '').trim().toLowerCase() || !auth.user.email_confirmed_at) {
    return res.status(403).json({ error: 'Use your verified account email (the same one used for your free audit).' });
  }
  const { data, error } = await db.rpc('find_own_scored_audits_for_checkout');
  if (error) return res.status(503).json({ error: 'Unable to verify your audit right now.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ audits: data || [] });
}
