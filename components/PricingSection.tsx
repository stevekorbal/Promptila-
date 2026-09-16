import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { SERVICE_PLANS } from '../data/plans.ts';

const PricingSection: React.FC = () => {
  const diyPlan = SERVICE_PLANS.diy;
  const dfyPlan = SERVICE_PLANS.dfy;
  const monitoringPlan = SERVICE_PLANS.monitoring;

  return (
    <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200/80 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
        <div className="absolute top-12 left-1/3 w-80 h-80 bg-indigo-200/50 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-blue-100/60 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-indigo-700 text-xs font-bold uppercase tracking-wider">
              Transparent, Value-Driven Investment
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Choose the Right Path to <span className="text-indigo-600">AI Citation</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            From self-directed blueprints to complete hands-on execution and continuous brand protection, ensure your business is recommended when buyers ask AI.
          </p>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
          {/* Card 1: DIY Blueprint */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Self-Paced
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {diyPlan.name}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {diyPlan.tagline}
              </p>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {diyPlan.formattedPrice}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    one-time
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Full blueprint with lifetime resource access</p>
              </div>

              <div className="space-y-3.5 mb-8">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">What's Included:</p>
                <ul className="space-y-3">
                  {diyPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-700">
                      <div className="mt-0.5 mr-3 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Link
                to="/checkout?service=diy"
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all active:scale-[0.99] shadow-sm group"
              >
                <span>Get DIY Blueprint</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Card 2: DFY Optimization (Featured / Recommended) */}
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-8 flex flex-col justify-between shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-200 relative lg:-translate-y-2">
            {/* Featured Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center space-x-1.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                <Sparkles className="w-3 h-3" />
                <span>Featured • Recommended</span>
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Turnkey Implementation
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>High Impact</span>
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {dfyPlan.name}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {dfyPlan.tagline}
              </p>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {dfyPlan.formattedPrice}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    one-time
                  </span>
                </div>
                <p className="text-xs text-indigo-600 font-semibold mt-1">
                  Complete white-glove deployment by our engineers
                </p>
              </div>

              <div className="space-y-3.5 mb-8">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">What's Included:</p>
                <ul className="space-y-3">
                  {dfyPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-700">
                      <div className="mt-0.5 mr-3 w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="leading-snug font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Link
                to="/checkout?service=dfy"
                className="w-full inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.99] shadow-lg shadow-indigo-600/20 group"
              >
                <span>Get DFY Optimization</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Card 3: Monthly Monitoring */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Continuous Oversight
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Cancel anytime
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {monitoringPlan.name}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {monitoringPlan.tagline}
              </p>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {monitoringPlan.formattedPrice}
                  </span>
                  <span className="text-lg font-bold text-slate-600">
                    /month
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Flexible subscription • Cancel anytime</p>
              </div>

              <div className="space-y-3.5 mb-8">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">What's Included:</p>
                <ul className="space-y-3">
                  {monitoringPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-700">
                      <div className="mt-0.5 mr-3 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <Link
                to="/checkout?service=monitoring"
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all active:scale-[0.99] shadow-sm group"
              >
                <span>Start Monitoring</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Reassurance Footer */}
        <div className="mt-14 pt-8 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm text-slate-500 text-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Secure 256-Bit SSL Checkout</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>No Long-Term Contracts for Monitoring</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Dedicated B2B AI Search Specialists</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
