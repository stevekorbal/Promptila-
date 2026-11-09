import React, { useState } from 'react';
import { AuditRequest } from '../types.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import { useAuth } from '../context/AuthContext.tsx';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const AuditForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<AuditRequest>({
    full_name: '',
    business_name: '',
    website: '',
    email: '',
    industry: '',
    priority_service_raw: '',
    city: '',
    state: '',
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
    if (!formData.city.trim()) {
      setError('Please enter your city before requesting an audit.');
      return;
    }
    if (!formData.state.trim()) {
      setError('Please select your state before requesting an audit.');
      return;
    }

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

      const trimmedCity = (formData.city || '').trim();
      const stateCode = (formData.state || '').trim();

      // Generate or assign a client UUID for the new record to reliably retrieve the created row's ID under all RLS environments
      const newAuditRequestId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

      const priorityServiceRaw = formData.priority_service_raw && formData.priority_service_raw.trim() !== ''
        ? formData.priority_service_raw
        : null;

      const insertPayload = {
        id: newAuditRequestId,
        first_name: firstName,
        last_name: lastName,
        email: formData.email.trim(),
        phone: (formData as any).phone || null,
        business_name: formData.business_name.trim(),
        website: formData.website.trim(),
        category: formData.industry.trim(),
        priority_service_raw: priorityServiceRaw,
        city: trimmedCity,
        state: stateCode || null,
        status: 'pending',
        user_id: authenticatedUserId,
      };

      const { error: insertError } = await supabase
        .from('audit_requests')
        .insert(insertPayload);

      if (insertError) {
        throw insertError;
      }

      // Supabase insert succeeded! Audits start automatically from the database.
      // Go straight to the success experience and reset form state
      setIsSubmitted(true);
      setFormData({
        full_name: '',
        business_name: '',
        website: '',
        email: '',
        industry: '',
        priority_service_raw: '',
        city: '',
        state: '',
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
          Check your inbox in the next 10 minutes for your free AI Visibility Report. If you don't see it, check your spam folder.
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
          <label htmlFor="priority_service_raw" className="block text-sm font-medium text-slate-700 mb-1">
            Which service would you most like to get more customers for?
          </label>
          <input
            type="text"
            id="priority_service_raw"
            name="priority_service_raw"
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="e.g. AC replacement, teeth whitening, roof repair"
            value={formData.priority_service_raw || ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input
            type="text"
            id="city"
            name="city"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-75 disabled:bg-slate-50"
            placeholder="e.g. Lansing"
            value={formData.city}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            id="state"
            name="state"
            required
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-75 disabled:bg-slate-50 text-slate-700 bg-white"
            value={formData.state}
            onChange={handleChange}
          >
            <option value="">Select state</option>
            {US_STATES.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
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