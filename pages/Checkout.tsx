import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Check, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ArrowLeft, 
  Building2, 
  Globe, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2,
  Calendar,
  Info
} from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

import { SERVICE_PLANS, getServicePlan, useServices } from '../data/plans.ts';
import { CheckoutFormData, ServicePlanId } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { getSupabaseClient } from '../lib/supabase.ts';

// Cached Stripe promise to avoid unnecessary re-creation across re-renders
let cachedStripePromise: Promise<Stripe | null> | null = null;

interface StripePaymentFormHandle {
  confirmPayment: () => Promise<{ error?: any; paymentIntent?: any }>;
}

interface StripePaymentFormProps {
  billingDetails: {
    name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
  };
  errorMessage: string | null;
}

const StripePaymentForm = React.forwardRef<StripePaymentFormHandle, StripePaymentFormProps>(
  ({ billingDetails, errorMessage }, ref) => {
    const stripe = useStripe();
    const elements = useElements();

    React.useImperativeHandle(
      ref,
      () => ({
        confirmPayment: async () => {
          if (!stripe || !elements) {
            return {
              error: {
                message: 'Secure payment is still initializing. Please wait a moment and try again.',
              },
            };
          }

          return await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: window.location.href,
              payment_method_data: {
                billing_details: {
                  name: billingDetails.name || undefined,
                  email: billingDetails.email || undefined,
                  phone: billingDetails.phone || undefined,
                  address: {
                    city: billingDetails.city || undefined,
                    state: billingDetails.state || undefined,
                  },
                },
              },
            },
            redirect: 'if_required',
          });
        },
      }),
      [stripe, elements, billingDetails]
    );

    return (
      <div className="space-y-4">
        <PaymentElement
          id="payment-element"
          options={{
            layout: 'tabs',
            wallets: {
              link: 'never',
            },
          }}
        />
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start space-x-2">
            <Info className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }
);
StripePaymentForm.displayName = 'StripePaymentForm';

const Checkout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const auditId = searchParams.get('audit_id');
  const { user } = useAuth();
  const { plans } = useServices();

  // Load service name, price, description, and billing type using the URL service slug
  const rawService = searchParams.get('service');
  const selectedPlan = getServicePlan(rawService, plans);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    website: '',
    city: '',
    state: '',
  });

  // Stripe integration state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(() => cachedStripePromise);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializingPayment, setIsInitializingPayment] = useState<boolean>(false);
  const [paymentInitError, setPaymentInitError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const stripePaymentFormRef = useRef<StripePaymentFormHandle | null>(null);
  const isFetchingIntentRef = useRef<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const isDetailsComplete = Boolean(
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    isValidEmail(formData.email) &&
    formData.phone.trim() &&
    formData.businessName.trim() &&
    formData.website.trim() &&
    formData.city.trim() &&
    formData.state.trim()
  );

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch publishable key from /api/stripe-config and initialize Stripe on page load
  useEffect(() => {
    if (cachedStripePromise) {
      setStripePromise(cachedStripePromise);
      return;
    }

    let isMounted = true;

    async function fetchStripeConfig() {
      try {
        const response = await fetch('/api/stripe-config');
        if (!response.ok) {
          throw new Error('Failed to load Stripe configuration');
        }
        const data = await response.json();
        if (!data.publishableKey) {
          throw new Error('Stripe publishable key is missing');
        }

        const promise = loadStripe(data.publishableKey);
        cachedStripePromise = promise;

        if (isMounted) {
          setStripePromise(promise);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load Stripe configuration:', err);
          setPaymentInitError('Unable to load payment configuration. Please try again later.');
        }
      }
    }

    fetchStripeConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Create PaymentIntent for DIY plan only ONCE per checkout session after details are complete
  useEffect(() => {
    if (selectedPlan.id !== 'diy') {
      return;
    }

    if (clientSecret) {
      return;
    }

    if (!auditId) {
      setPaymentInitError(
        'An audit ID (e.g. AUD-XXXXXX) is required to order the DIY AI Visibility Blueprint. Please use the link provided in your audit report.'
      );
      return;
    }

    // Do not initialize until all required customer and business details are completed
    if (!isDetailsComplete) {
      return;
    }

    if (isFetchingIntentRef.current) {
      return;
    }

    let isMounted = true;

    // Debounce by 500ms to prevent creating PaymentIntents while typing
    const debounceTimer = setTimeout(async () => {
      if (clientSecret || isFetchingIntentRef.current) {
        return;
      }

      isFetchingIntentRef.current = true;
      setIsInitializingPayment(true);
      setPaymentInitError(null);

      const currentPayload = {
        audit_id: auditId,
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        businessName: formData.businessName.trim(),
        website: formData.website.trim(),
        phone: formData.phone.trim(),
      };

      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(currentPayload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || 'Failed to initialize payment');
        }

        const data = await response.json();
        if (isMounted) {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            throw new Error('No client secret returned from payment service');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('PaymentIntent creation error:', err);
          setPaymentInitError(err.message || 'Unable to prepare payment session. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsInitializingPayment(false);
        }
        isFetchingIntentRef.current = false;
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [
    selectedPlan.id,
    auditId,
    isDetailsComplete,
    formData.email,
    formData.firstName,
    formData.lastName,
    formData.businessName,
    formData.website,
    formData.phone,
    clientSecret,
  ]);

  // Check if returning from a redirected Stripe payment
  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');

    if (redirectStatus === 'succeeded' && paymentIntentClientSecret && stripePromise) {
      stripePromise.then(async (stripe) => {
        if (!stripe) return;
        try {
          const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
          if (paymentIntent && paymentIntent.status === 'succeeded') {
            const confirmedId = `PRM-${Math.floor(100000 + Math.random() * 900000)}`;
            setOrderId(confirmedId);
            setIsSuccess(true);
          }
        } catch (err) {
          console.error('Error verifying redirected payment:', err);
        }
      });
    }
  }, [searchParams, stripePromise]);

  const handleServiceChange = (id: ServicePlanId) => {
    const params: Record<string, string> = { service: id };

    if (auditId) {
      params.audit_id = auditId;
    }

    setSearchParams(params);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    if (selectedPlan.id !== 'diy') {
      setSubmissionError(
        `Instant card checkout is currently active for the DIY Blueprint ($297). Please select the DIY Blueprint to complete payment online, or contact us regarding ${selectedPlan.name}.`
      );
      return;
    }

    if (!auditId) {
      setSubmissionError(
        'An audit ID (e.g. AUD-XXXXXX) is required to order the DIY Blueprint. Please access checkout through your audit report.'
      );
      return;
    }

    if (!isDetailsComplete) {
      setSubmissionError('Please complete all required customer and business details before proceeding to payment.');
      return;
    }

    if (!clientSecret || !stripePaymentFormRef.current) {
      setSubmissionError('Payment form is not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setSubmissionError(null);

    try {
      const { error, paymentIntent } = await stripePaymentFormRef.current.confirmPayment();

      if (error) {
        setIsProcessing(false);
        setSubmissionError(error.message || 'Payment could not be confirmed. Please check your payment details.');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const generatedId = `PRM-${Math.floor(100000 + Math.random() * 900000)}`;

        const supabase = getSupabaseClient();
        if (supabase && user) {
          try {
            // Save business if specified
            if (formData.businessName && formData.website) {
              await supabase.from('businesses').insert({
                user_id: user.id,
                name: formData.businessName,
                website: formData.website,
                city: formData.city,
                state: formData.state,
                phone: formData.phone,
              });
            }

            // Record completed order only after payment success
            await supabase.from('orders').insert({
              user_id: user.id,
              service_name: selectedPlan.name,
              amount: selectedPlan.price,
              status: 'completed',
              billing_type: selectedPlan.billingType,
            });
          } catch (dbErr) {
            console.warn('Could not persist order to Supabase:', dbErr);
          }
        }

        setOrderId(generatedId);
        setIsProcessing(false);
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setIsProcessing(false);
        setSubmissionError('Payment confirmation incomplete. Please contact support if your card was charged.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setSubmissionError(err?.message || 'An unexpected error occurred while confirming payment.');
    }
  };

  // Success Confirmation Screen
  if (isSuccess) {
    return (
      <div className="pt-28 pb-24 bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-flex items-center space-x-1 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
              <span>Order Confirmed • #{orderId}</span>
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
              Thank You, {formData.firstName || 'Partner'}!
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
              Your order for <strong className="text-slate-900">{selectedPlan.name}</strong> has been received and confirmed. Our AI search specialists are preparing your kickoff dossier.
            </p>

            {/* Order Confirmation Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left mb-8 max-w-xl mx-auto space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
                <span className="text-slate-500">Service Plan</span>
                <span className="font-bold text-slate-900">{selectedPlan.name}</span>
              </div>
              {auditId && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
                  <span className="text-slate-500">Audit Dossier ID</span>
                  <span className="font-mono font-bold text-indigo-600">{auditId}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
                <span className="text-slate-500">Billing Type</span>
                <span className="font-medium text-slate-900 capitalize">
                  {selectedPlan.billingType === 'recurring' ? 'Monthly Recurring ($99/mo)' : 'One-Time Investment'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
                <span className="text-slate-500">Total Charged Today</span>
                <span className="font-bold text-indigo-600 text-base">{selectedPlan.formattedPrice}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Receipt Sent To</span>
                <span className="font-medium text-slate-900">{formData.email || 'your email'}</span>
              </div>
              {formData.businessName && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm">
                  <span className="text-slate-500">Company Registered</span>
                  <span className="font-medium text-slate-900">{formData.businessName}</span>
                </div>
              )}
            </div>

            {/* Next Steps Box */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-6 text-left mb-8 max-w-xl mx-auto">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>What Happens Next?</span>
              </h3>
              <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
                <li>
                  <strong className="text-slate-900">Check your inbox:</strong> A receipt and onboarding instructions have been sent to <strong>{formData.email || 'your email'}</strong>.
                </li>
                <li>
                  <strong className="text-slate-900">Dedicated Analyst Assignment:</strong> A Promptila AI search engineer is assigned to audit your domain <em>{formData.website ? `(${formData.website})` : ''}</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Fast Turnaround:</strong> You will receive initial credentials and recommendations within 24–48 business hours.
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/"
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Return to Homepage
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all active:scale-95"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFormSubmittable =
    !isProcessing &&
    !isInitializingPayment &&
    isDetailsComplete &&
    (selectedPlan.id !== 'diy' || (Boolean(stripePromise) && Boolean(clientSecret)));

  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            to="/#pricing"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Plans
          </Link>
        </div>

        <div className="text-left mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Complete Your Optimization Order
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-3xl">
            Secure your spot in the AI recommendation era. Fill in your business details below to initiate your onboarding.
          </p>
        </div>

        {/* Plan Switcher Pills */}
        <div className="mb-10 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm inline-flex flex-wrap gap-2 max-w-full">
          {(Object.keys(SERVICE_PLANS) as ServicePlanId[]).map((planId) => {
            const plan = SERVICE_PLANS[planId];
            const isSelected = selectedPlan.id === planId;
            return (
              <button
                key={planId}
                type="button"
                onClick={() => handleServiceChange(planId)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{plan.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {plan.formattedPrice}{plan.billingInterval || ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Checkout Forms (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSubmit} id="checkout-form">
              {/* Section 1: Business & Contact Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Customer & Business Details</h2>
                    <p className="text-xs text-slate-500">Provide details for your AI visibility footprint</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Jane"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Work Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="jane@company.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="businessName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Business Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        required
                        value={formData.businessName}
                        onChange={handleInputChange}
                        placeholder="Acme Legal Services LLC"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="website" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Website URL <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        required
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://acmelegal.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Phoenix"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      State / Region <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Arizona"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Information with Stripe Payment Element */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Payment Information</h2>
                      <p className="text-xs text-slate-500">256-bit bank-level encrypted transaction</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      SSL Secure
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedPlan.id === 'diy' ? (
                    stripePromise && clientSecret ? (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#4f46e5',
                              colorBackground: '#ffffff',
                              colorText: '#0f172a',
                              borderRadius: '12px',
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            },
                          },
                        }}
                      >
                        <StripePaymentForm
                          ref={stripePaymentFormRef}
                          billingDetails={{
                            name: `${formData.firstName} ${formData.lastName}`.trim(),
                            email: formData.email,
                            phone: formData.phone,
                            city: formData.city,
                            state: formData.state,
                          }}
                          errorMessage={submissionError}
                        />
                      </Elements>
                    ) : paymentInitError ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
                        <div className="flex items-center space-x-2 font-semibold mb-1">
                          <Info className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>Payment Setup Notice</span>
                        </div>
                        <p>{paymentInitError}</p>
                      </div>
                    ) : isInitializingPayment ? (
                      <div className="py-10 px-4 text-center">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm font-medium text-slate-600">Loading secure payment form...</p>
                        <p className="text-xs text-slate-400 mt-1">Connecting to Stripe encryption gateway</p>
                      </div>
                    ) : (
                      <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-slate-200/80">
                        <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">Enter Contact & Business Details</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Complete the required customer and business information above to load the secure payment form.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <div className="flex items-center space-x-2 font-semibold text-slate-900 mb-2">
                        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>Online checkout for {selectedPlan.name} is in preparation</span>
                      </div>
                      <p className="text-slate-600 mb-3 text-xs leading-relaxed">
                        Online Stripe credit card checkout is currently active for the DIY AI Visibility Blueprint ($297).
                      </p>
                      <button
                        type="button"
                        onClick={() => handleServiceChange('diy')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Switch to DIY AI Visibility Blueprint ($297)
                      </button>
                    </div>
                  )}

                  {!clientSecret && submissionError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start space-x-2">
                      <Info className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{submissionError}</span>
                    </div>
                  )}

                  <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start space-x-3 text-xs text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Transactions are secured with 256-bit bank-grade encryption via Stripe. Card details are never stored on our servers.
                    </span>
                  </div>
                </div>

                {/* Purchase Button for Mobile */}
                <div className="mt-8 pt-6 border-t border-slate-100 lg:hidden">
                  <button
                    type="submit"
                    disabled={!isFormSubmittable}
                    className="w-full py-4 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.99] shadow-lg shadow-indigo-600/20 disabled:opacity-70 flex items-center justify-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Securing Transaction...</span>
                      </>
                    ) : selectedPlan.billingType === 'recurring' ? (
                      <span>Start Monthly Monitoring • $99/mo (Cancel anytime)</span>
                    ) : (
                      <span>Complete Order • {selectedPlan.formattedPrice}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
                <h3 className="text-xl font-extrabold text-slate-900">Order Summary</h3>
                <span className="text-xs font-semibold text-slate-500">1 Item</span>
              </div>

              {/* Selected Plan Details */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Selected Service</span>
                    <h4 className="text-lg font-bold text-slate-900">{selectedPlan.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900">{selectedPlan.formattedPrice}</span>
                    {selectedPlan.billingInterval && (
                      <span className="text-xs text-slate-500 font-medium block">/month</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {selectedPlan.description}
                </p>

                {/* Audit ID badge if attached */}
                {auditId && (
                  <div className="mb-3 px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-indigo-700 font-medium">Audit Reference:</span>
                    <span className="font-mono font-bold text-indigo-900">{auditId}</span>
                  </div>
                )}

                {/* Plan Highlights */}
                <ul className="space-y-2 pt-3 border-t border-slate-200/60">
                  {selectedPlan.features.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cost Calculations */}
              <div className="space-y-3 text-sm pb-6 border-b border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Service Subtotal</span>
                  <span className="font-semibold text-slate-900">{selectedPlan.formattedPrice}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Billing Cadence</span>
                  <span className="font-medium text-slate-700 capitalize">
                    {selectedPlan.billingType === 'recurring' ? 'Recurring Monthly' : 'One-time investment'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax & Surcharges</span>
                  <span className="font-semibold text-slate-900">$0.00</span>
                </div>
              </div>

              {/* Total Due Today */}
              <div className="pt-5 pb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-base font-bold text-slate-900">Total Due Today</span>
                  <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                    {selectedPlan.formattedPrice}
                  </span>
                </div>

                {selectedPlan.billingType === 'recurring' ? (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 mt-3 text-xs text-indigo-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Subscription Terms: $99/month</span>
                    </div>
                    <p className="text-indigo-700">
                      Billed monthly. Cancel anytime through your dashboard or with a one-click email request. No setup fees or contracts.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    One-time payment. Lifetime access to blueprint & deliverable assets.
                  </p>
                )}
              </div>

              {/* Purchase Button Desktop */}
              <button
                type="submit"
                form="checkout-form"
                disabled={!isFormSubmittable}
                className="w-full hidden lg:flex items-center justify-center py-4 px-6 rounded-xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.99] shadow-xl shadow-indigo-600/20 disabled:opacity-70 group"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    <span>Securing Transaction...</span>
                  </>
                ) : selectedPlan.billingType === 'recurring' ? (
                  <span>Start Monthly Monitoring • $99/mo</span>
                ) : (
                  <span>Complete Order • {selectedPlan.formattedPrice}</span>
                )}
              </button>

              {/* Security Badges */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-500">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Promptila 100% Satisfaction Guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>256-Bit SSL Bank-Grade Encryption</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1 mr-1.5"></span>
                  <span>Direct Specialist Onboarding within 24 Hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
