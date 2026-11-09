import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import PricingSection from '../components/PricingSection.tsx';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Can I start with the Free AI Visibility Report first?',
    answer:
      'Yes, absolutely! We encourage every business owner to request their Free AI Visibility Report first. It gives you your baseline score (0–100) and pinpoints your visibility gaps. If you decide to order a Blueprint or DFY service later, your audit data links directly to your account.',
  },
  {
    question: 'What is the difference between the DIY Blueprint and DFY Optimization?',
    answer:
      'The DIY Blueprint ($299 one-time) provides a comprehensive, 40+ page custom engineering guide with exact schema code, prompt citation maps, and step-by-step actions for your internal team or agency. DFY Optimization ($999 one-time) is a full white-glove service where our senior AI search engineers implement every technical schema, profile, semantic entity, and directory update for you.',
  },
  {
    question: 'Can I upgrade from the DIY Blueprint to DFY Optimization later?',
    answer:
      'Yes. If you start with the $299 DIY Blueprint and later decide you would rather have our team execute the changes for you, 100% of your $299 investment is credited toward the $999 DFY package (you pay only the $700 difference).',
  },
  {
    question: 'How does the Monthly Monitoring subscription work?',
    answer:
      'At $99/month, our systems query ChatGPT, Gemini, Perplexity, Claude, and Apple Intelligence weekly across your target buyer prompts. You get real-time drift alerts, recommendation rankings, and monthly executive summaries. There are no long-term contracts; you can cancel anytime with one click.',
  },
  {
    question: 'How quickly will my business start appearing in AI answers?',
    answer:
      'AI models index web knowledge bases, knowledge graphs, and real-time retrieval feeds continuously. With DFY Optimization and proper schema structuring, clients typically observe initial citations and recommendations within 2 to 4 weeks.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) processed securely with 256-bit encryption via Stripe. Invoicing is also available for enterprise or agency partnerships.',
  },
];

const Pricing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="pt-20">
      {/* Header Banner */}
      <section className="bg-slate-900 text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
              Transparent, One-Time & Flexible Plans
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Plans & <span className="text-indigo-400">Pricing</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything you need to get your brand recommended when prospective customers ask AI assistants for recommendations.
          </p>
        </div>
        {/* Ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Main Pricing Cards Component */}
      <PricingSection />

      {/* Pricing FAQs */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions About Pricing
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Clear answers about our packages, guarantees, and service rollout.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50/50 hover:bg-slate-50"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    <span className="text-base sm:text-lg pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free Report Bottom CTA */}
      <section className="py-20 bg-indigo-600 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Want to see how your business currently ranks in AI search?
          </h2>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Get your comprehensive AI Visibility Report at zero cost. We audit ChatGPT, Perplexity, and Gemini to reveal your visibility score and competitors.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl text-base group"
            >
              <span>Get Your Free AI Report</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-indigo-700/60 border border-indigo-400/40 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 text-base"
            >
              See Our Methodology
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
