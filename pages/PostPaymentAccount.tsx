import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

/** Optional account creation after payment. Email Blueprint delivery remains unchanged. */
export default function PostPaymentAccount() {
  const [params] = useSearchParams();
  const paymentId = params.get('payment_intent') || '';
  const { user, signUp } = useAuth();
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch('/api/verify-checkout-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentId }),
        });
        const result = await response.json();
        if (!response.ok || !result.paid) throw new Error(result.error || 'Payment could not be verified.');
        if (alive) setVerified(true);
      } catch (err: any) {
        if (alive) setError(err.message || 'Payment could not be verified.');
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [paymentId]);

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !verified) return;
    setSubmitting(true);
    setError('');
    const result = await signUp(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage(result.data?.session
      ? 'Your account is ready. You can open your dashboard.'
      : 'Check your email for the account confirmation link, then sign in.');
  };

  return <main className="min-h-screen bg-slate-50 px-4 pt-28 pb-20">
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Set up your Promptila account</h1>
      <p className="mt-3 text-sm text-slate-600">Account setup is optional. Your purchased Blueprint will still be emailed to the address used for your free audit.</p>
      {checking && <p className="mt-5 text-sm">Checking your payment…</p>}
      {!checking && !verified && <p className="mt-5 text-sm text-rose-700">{error || 'Payment not confirmed.'}</p>}
      {verified && <>
        <p className="mt-5 text-sm font-semibold text-emerald-700">Payment confirmed.</p>
        {user ? <div className="mt-5"><p className="text-sm">You are already signed in.</p><Link className="text-indigo-700 underline" to="/dashboard">Open dashboard</Link></div> :
          <form onSubmit={register} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Email address
              <input className="mt-1 w-full rounded-lg border p-3" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-medium">Password
              <input className="mt-1 w-full rounded-lg border p-3" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <button className="rounded-lg bg-indigo-600 px-5 py-3 text-white disabled:opacity-50" disabled={submitting || Boolean(message)} type="submit">{submitting ? 'Creating account…' : 'Create account'}</button>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            <p className="text-sm">Already have an account? <Link className="text-indigo-700 underline" to="/login">Sign in</Link></p>
          </form>}
      </>}
      <div className="mt-8 border-t pt-5"><Link className="text-sm text-slate-600 underline" to="/">Return to home</Link></div>
    </section>
  </main>;
}
