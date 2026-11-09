import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  return new Stripe(secretKey);
}

function cleanMetaString(val: any, maxLength = 200): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, maxLength);
}

export function normalizeService(service: any): 'diy' | 'dfy' | 'monitoring' {
  const s = String(service || '').toLowerCase().trim();
  if (s === 'dfy' || s === 'optimization') return 'dfy';
  if (s === 'monitoring' || s === 'monthly') return 'monitoring';
  return 'diy';
}

export function sanitizeAuditId(auditId: any): string {
  if (!auditId) return '';
  const cleaned = String(auditId).trim().toUpperCase();
  return /^AUD-\d{4,}$/.test(cleaned) ? cleaned.slice(0, 200) : '';
}

export function extractStripeMetadata(body: any): {
  service: 'diy' | 'dfy' | 'monitoring';
  audit_id: string;
  customer_email: string;
  customer_name: string;
  business_name: string;
  website: string;
} {
  const emailRaw = body?.customer_email ?? body?.email ?? '';
  const email = String(emailRaw).trim().toLowerCase().slice(0, 200);

  const nameRaw =
    body?.customer_name ??
    `${body?.firstName || ''} ${body?.lastName || ''}`.trim();
  const name = cleanMetaString(nameRaw, 200);

  const businessRaw = body?.business_name ?? body?.businessName ?? '';
  const business = cleanMetaString(businessRaw, 200);

  const websiteRaw = body?.website ?? '';
  const website = cleanMetaString(websiteRaw, 200);

  const auditIdRaw = body?.audit_id ?? body?.auditId ?? '';
  const audit_id = sanitizeAuditId(auditIdRaw);

  const service = normalizeService(body?.service);

  return {
    service,
    audit_id,
    customer_email: email,
    customer_name: name,
    business_name: business,
    website,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const bearer = req.headers.authorization || '';
  const token = /^Bearer (.+)$/i.exec(bearer)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in before checkout.' });
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Checkout authentication is not configured.' });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  const authenticatedUserId = authData.user.id;
  // Use the caller's JWT for RLS-protected audit ownership queries.
  const userSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({
      error: 'Stripe secret key is not configured',
    });
  }

  try {
    const stripe = getStripeInstance();
    const body = req.body || {};
    const metadata = extractStripeMetadata(body);
    // A supplied audit must be owned by the authenticated payer. This is checked
    // server-side on both PaymentIntent creation and metadata updates.
    const suppliedAuditId = body.audit_id ?? body.auditId;
    if (suppliedAuditId && !metadata.audit_id) {
      return res.status(400).json({ error: 'Invalid audit ID.' });
    }
    if (metadata.audit_id) {
      // Guest free audits have no user_id. A verified-email account can safely
      // claim its matching audit and request before the ownership check.
      const { error: claimError } = await userSupabase.rpc('claim_own_audit_for_checkout', {
        p_audit_id: metadata.audit_id,
      });
      if (claimError) return res.status(503).json({ error: 'Unable to verify audit ownership.' });
      const { data: ownedAudit, error: auditError } = await userSupabase
        .from('audits')
        .select('id')
        .eq('audit_id', metadata.audit_id)
        .eq('user_id', authenticatedUserId)
        .maybeSingle();
      if (auditError) return res.status(503).json({ error: 'Unable to verify audit ownership.' });
      if (!ownedAudit) return res.status(403).json({ error: 'This audit does not belong to your account.' });
    }
    const customerEmail = metadata.customer_email;
    const securedMetadata = { ...metadata, user_id: authenticatedUserId };

    // Check if updating an existing PaymentIntent right before confirmation
    const intentIdToUpdate = body.payment_intent_id || body.paymentIntentId;

    if (intentIdToUpdate && typeof intentIdToUpdate === 'string') {
      const updateParams: Stripe.PaymentIntentUpdateParams = {
        metadata: securedMetadata,
      };
      if (customerEmail) {
        updateParams.receipt_email = customerEmail;
      }

      const existingIntent = await stripe.paymentIntents.retrieve(intentIdToUpdate);
      if (existingIntent.metadata?.user_id !== authenticatedUserId) return res.status(403).json({ error: 'Payment session does not belong to this account.' });
      if (existingIntent.status !== 'requires_payment_method' && existingIntent.status !== 'requires_confirmation') return res.status(409).json({ error: 'Payment session can no longer be edited.' });
      const updatedIntent = await stripe.paymentIntents.update(intentIdToUpdate, updateParams);

      return res.status(200).json({
        clientSecret: updatedIntent.client_secret,
        paymentIntentId: updatedIntent.id,
        metadata: updatedIntent.metadata,
      });
    }

    // Otherwise, create a new PaymentIntent
    // Never take amount from the browser. DIY stays 29900, DFY stays 99900.
    const amount = metadata.service === 'dfy' ? 99900 : 29900;

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      metadata: securedMetadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (customerEmail) {
      createParams.receipt_email = customerEmail;
    }

    const paymentIntent = await stripe.paymentIntents.create(createParams);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    });
  } catch (error: any) {
    console.error('Stripe PaymentIntent error:', error);

    return res.status(500).json({
      error: 'Unable to process payment',
      message: error?.message || String(error),
    });
  }
}