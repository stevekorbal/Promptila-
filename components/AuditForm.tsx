import React, { useState } from 'react';
import { AuditRequest } from '../types.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import { useAuth } from '../context/AuthContext.tsx';

const AuditForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<AuditRequest>({
    full_name: '',
    business_name: '',
    website: '',
    email: '',
    industry: '',
    location: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Database service is currently unavailable. Please try again later.');
      }

      // Check if the visitor is logged in to get their authenticated UUID
      let authenticatedUserId: string | null = user?.id || null;
      if (!authenticatedUserId) {
        try {
          const sessionRes = await supabase.auth.getSession();
          authenticatedUserId = sessionRes?.data?.session?.user?.id || null;
        } catch (_) {}
      }

      // Parse full name into first_name and last_name
      const nameParts = (formData.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      // Parse location into city and state
      let city = '';
      let state: string | null = null;
      if (formData.location) {
        const locParts = formData.location.split(',').map((p) => p.trim());
        if (locParts.length >= 2) {
          city = locParts[0];
          state = locParts.slice(1).join(', ') || null;
        } else {
          city = formData.location.trim();
          state = null;
        }
      }

      // Generate or assign a client UUID for the new record to reliably retrieve the created row's ID under all RLS environments
      const newAuditRequestId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

      const insertPayload = {
        id: newAuditRequestId,
        first_name: firstName,
        last_name: lastName,
        email: formData.email.trim(),
        phone: (formData as any).phone || null,
        business_name: formData.business_name.trim(),
        website: formData.website.trim(),
        category: formData.industry.trim(),
        city: city || formData.location.trim(),
        state: state,
        status: 'pending',
        user_id: authenticatedUserId,
      };

      const { error: insertError } = await supabase
        .from('audit_requests')
        .insert(insertPayload);

      if (insertError) {
        throw insertError;
      }

      // Supabase insert succeeded! Now trigger the n8n webhook with the new row's ID.
      // If n8n fails, do NOT create another audit request; the Supabase record remains intact.
      try {
        const webhookPayload = {
          audit_request_id: newAuditRequestId,
        };

        // Try direct call or fallback to proxy route
        await fetch('/api/audit-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });
      } catch (webhookErr) {
        console.warn('n8n webhook execution error (Supabase record preserved):', webhookErr);
      }

      // Show existing success experience and reset form state
      setIsSubmitted(true);
      setFormData({
        full_name: '',
        business_name: '',
        website: '',
        email: '',
        industry: '',
        location: '',
      });
    } catch (err: any) {
      console.error('Audit request submission error:', err);
      // Check for Supabase duplicate / unique constraint error (PostgreSQL code 23505 or duplicate constraint message)
      const errCode = err?.code || '';
      const errMsg = (err?.message || '').toLowerCase();
      const isDuplicate =
        errCode === '23505' ||
        errMsg.includes('duplicate') ||
        errMsg.includes('unique') ||
        errMsg.includes('already exists') ||
        errMsg.includes('one_free_audit_per_domain');

      if (isDuplicate) {
        setError(
          'This website has already received its free Promptila AI Visibility Audit. Each website is eligible for one free audit.'
        );
      } else {
        // Show friendly generic error and retain entered information so the visitor can retry
        setError(
          'Unable to submit your audit request. Please check your information and try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">Your free audit is on its way!</h3>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Check your inbox in the next few minutes. Our AI analysts are preparing your preliminary report.
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setError(null);
          }}
          className="text-indigo-600 font-semibold hover:text-indigo-700 underline transition-colors"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="Jane Doe"
            value={formData.full_name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="jane@company.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="business_name" className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input
            type="text"
            id="business_name"
            name="business_name"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="Acme Corp"
            value={formData.business_name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
          <input
            type="text"
            id="website"
            name="website"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="biglakecandy.com"
            value={formData.website}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
          <input
            type="text"
            id="industry"
            name="industry"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="e.g. HVAC, Legal, Medical"
            value={formData.industry}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">Primary Location</label>
          <input
            type="text"
            id="location"
            name="location"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="City, State"
            value={formData.location}
            onChange={handleChange}
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center space-x-2 animate-shake">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-10">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center space-x-2 group"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-3 border-t-2 border-white rounded-full" viewBox="0 0 24 24"></svg>
              <span>Analyzing Digital Footprint...</span>
            </>
          ) : (
            <>
              <span>Get Your Free AI Report</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
        
        <div className="mt-6 flex items-center justify-center space-x-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
           <div className="flex items-center space-x-1">
             <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
             <span className="text-xs font-bold text-slate-900 tracking-wider">SECURE SUBMISSION</span>
           </div>
           <div className="flex items-center space-x-1 border-l border-slate-300 pl-4">
             <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">Privacy Guaranteed</span>
           </div>
        </div>
        <p className="text-center text-slate-400 text-[11px] mt-4 leading-relaxed">
          Your audit is manually reviewed by our team and delivered within 48 hours.<br />
          No sales call. No obligation.
        </p>
      </div>
    </form>
  );
};

export default AuditForm;