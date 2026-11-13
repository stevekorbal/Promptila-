/** Shared input guards for the planned guest-checkout endpoints.
 * These guards do not authorize audit ownership or prove payment.
 * Callers MUST separately verify a short-lived email ownership proof,
 * query the matching audit server-side, and verify Stripe webhook signatures.
 */
export type PaidService = 'diy' | 'dfy';
export const PAID_SERVICE_AMOUNTS_CENTS: Readonly<Record<PaidService, number>> =
  Object.freeze({ diy: 29900, dfy: 99900 });

export function parsePaidService(value: unknown): PaidService | null {
  return value === 'diy' || value === 'dfy' ? value : null;
}

export function parseAuditId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  return /^AUD-\d{4,}$/.test(cleaned) && cleaned.length <= 200 ? cleaned : null;
}

export function normalizeCustomerEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function assertVerifiedAuditMatch(
  audit: { audit_id?: string | null; contact_email?: string | null; overall_score?: number | null; needs_review?: boolean | null; status?: string | null },
  requestedAuditId: string,
  verifiedEmail: string
): boolean {
  return parseAuditId(audit.audit_id) === requestedAuditId &&
    normalizeCustomerEmail(audit.contact_email) === verifiedEmail &&
    typeof audit.overall_score === 'number' &&
    audit.needs_review === false &&
    (audit.status === 'free_audit_sent' || audit.status === 'completed');
}
