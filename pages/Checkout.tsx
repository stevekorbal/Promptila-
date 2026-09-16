import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Check, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
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
import { SERVICE_PLANS, getServicePlan } from '../data/plans.ts';
import { CheckoutFormData, ServicePlanId } from '../types.ts';

const Checkout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawService = searchParams.get('service');
  const selectedPlan = getServicePlan(rawService);

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

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleServiceChange = (id: ServicePlanId) => {
    setSearchParams({ service: id });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormatCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleFormatExp = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExp(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate front-end order processing
    setTimeout(() => {
      const generatedId = `PRM-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderId(generatedId);
      setIsProcessing(false);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
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
              Your order for <strong className="text-slate-900">{selectedPlan.name}</strong> has been received. Our AI search specialists are already preparing your kickoff dossier.
            </p>

            {/* Order Confirmation Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left mb-8 max-w-xl mx-auto space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-sm">
                <span className="text-slate-500">Service Plan</span>
                <span className="font-bold text-slate-900">{selectedPlan.name}</span>
              </div>
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
          {/* Left Column: Checkout Forms (8 cols) */}
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

              {/* Section 2: Payment Information Placeholder */}
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
                  <div>
                    <label htmlFor="cardHolder" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      id="cardHolder"
                      required
                      value={cardHolder || (formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : '')}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="cardNumber" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Card Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="cardNumber"
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={handleFormatCardNumber}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5 pointer-events-none">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">VISA</span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">MC</span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">AMEX</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="cardExp" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        id="cardExp"
                        required
                        maxLength={5}
                        value={cardExp}
                        onChange={handleFormatExp}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all text-center"
                      />
                    </div>

                    <div>
                      <label htmlFor="cardCvc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Security CVC
                      </label>
                      <input
                        type="password"
                        id="cardCvc"
                        required
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        placeholder="123"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all text-center"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label htmlFor="cardZip" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Billing ZIP
                      </label>
                      <input
                        type="text"
                        id="cardZip"
                        required
                        value={cardZip}
                        onChange={(e) => setCardZip(e.target.value)}
                        placeholder="90210"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-center"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start space-x-3 text-xs text-slate-600">
                    <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Frontend evaluation environment. Test your transaction securely; live card charges are simulated during this stage.
                    </span>
                  </div>
                </div>

                {/* Purchase Button for Mobile */}
                <div className="mt-8 pt-6 border-t border-slate-100 lg:hidden">
                  <button
                    type="submit"
                    disabled={isProcessing}
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
                disabled={isProcessing}
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
