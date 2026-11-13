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

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Checkout audit verification is not configured.' });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

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
    // DIY orders must identify a completed audit before any payment is created.
    if (metadata.service === 'diy' && !metadata.audit_id) {
      return res.status(400).json({ error: 'Find and select your completed free audit before paying.' });
    }
    if (metadata.service !== 'diy') {
      return res.status(400).json({ error: 'Only the DIY Blueprint is available for instant checkout.' });
    }
    if (!metadata.customer_email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(metadata.customer_email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!metadata.audit_id) return res.status(400).json({ error: 'Select a completed free audit.' });
    const { data: ownedAudit, error: auditError } = await db.from('audits')
      .select('audit_id,contact_email,overall_score,status,needs_review,business_name,website')
      .eq('audit_id', metadata.audit_id).maybeSingle();
    if (auditError) return res.status(503).json({ error: 'Unable to verify free audit.' });
    if (!ownedAudit || String(ownedAudit.contact_email || '').trim().toLowerCase() !== metadata.customer_email ||
      ownedAudit.overall_score === null || ownedAudit.needs_review !== false ||
      !['free_audit_sent', 'completed'].includes(ownedAudit.status)) {
      return res.status(403).json({ error: 'No eligible completed free audit matches this email and audit.' });
    }
    // Never trust client-supplied business identity for fulfillment.
    const securedMetadata = {
      ...metadata,
      business_name: String(ownedAudit.business_name || '').slice(0, 200),
      website: String(ownedAudit.website || '').slice(0, 200),
    };
    const customerEmail = metadata.customer_email;

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
      if (existingIntent.metadata?.audit_id !== metadata.audit_id ||
          existingIntent.metadata?.customer_email !== customerEmail ||
          existingIntent.metadata?.service !== 'diy' ||
          existingIntent.amount !== 29900 || existingIntent.currency !== 'usd') {
        return res.status(403).json({ error: 'Payment session does not match the selected audit.' });
      }
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
    const amount = 29900;

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