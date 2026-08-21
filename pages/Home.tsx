import React from 'react';
import { Link } from 'react-router-dom';
import AuditForm from '../components/AuditForm.tsx';

const Home: React.FC = () => {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-20 sm:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Now optimizing for Gemini & Claude</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              We help businesses <span className="text-indigo-600">get chosen</span> by AI — not buried by it.
            </h1>
            <p className="mt-6 text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Traditional SEO is no longer enough. We optimize your brand for AI search engines like ChatGPT, Gemini, and AI Overviews so you're the first recommendation users see.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 text-base"
              >
                Get Your Free AI Report
              </Link>
              <Link
                to="/how-it-works"
                className="w-full sm:w-auto px-7 py-3.5 bg-white text-slate-900 font-bold rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all active:scale-95 text-base"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-400 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-[100px]"></div>
        </div>
      </section>

      {/* Case Study Highlight Block */}
      <section className="bg-indigo-600 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="inline-block px-3 py-1 bg-indigo-500 text-indigo-100 font-bold rounded-full text-[10px] uppercase tracking-widest mb-4">Case Study Proof</span>
            <h2 className="text-2xl md:text-4xl font-bold leading-tight text-white max-w-3xl">
              Big Lake Candy Company went from invisible to <span className="text-indigo-200 underline decoration-indigo-300 underline-offset-4">#1 on ChatGPT</span> in 30 days.
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-1.5 rounded-2xl shadow-2xl border border-white/20 transform hover:scale-[1.01] transition-transform duration-500">
              <img 
                src="https://promptila.com/assets/Chatgpt.png" 
                alt="ChatGPT recommending Big Lake Candy Company" 
                className="w-full h-auto rounded-xl shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-10 text-center">
              <p className="text-indigo-100 font-bold text-lg md:text-xl italic leading-relaxed">
                Big Lake Candy Company went from invisible to appearing across ChatGPT, Gemini, Perplexity, and Claude in 30 days.
              </p>
              <div className="mt-8">
                <Link
                  to="/case-study/big-lake-candy"
                  className="inline-flex items-center px-7 py-3.5 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-all active:scale-95 text-base"
                >
                  View Full Case Study
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl -ml-48 -mb-48"></div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-12 border-b border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 font-medium tracking-tight">
            Trusted by growing businesses across the United States.
          </p>
        </div>
      </section>

      {/* Visibility Awareness Section */}
      <section className="bg-white py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-8">
              When someone asks ChatGPT for businesses in your city… <br className="hidden md:block" />
              <span className="text-indigo-600">does yours show up?</span>
            </h2>
            
            <div className="text-base text-slate-600 mb-10 max-w-2xl mx-auto">
              <p className="mb-6 font-medium text-slate-900">
                Millions of people are now asking AI tools questions like:
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "“Best HVAC company in Phoenix”",
                  "“Top dentist in Chicago”",
                  "“Best restaurants in Detroit”"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center space-x-3">
                    <span className="text-indigo-500 text-xl">•</span>
                    <span className="text-slate-800 italic font-semibold">{item}</span>
                  </div>
                ))}
              </div>
              <p className="leading-relaxed">
                If AI systems like ChatGPT, Gemini, or Perplexity don’t recognize your business, they won’t recommend you.
              </p>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Check Your ChatGPT Visibility</h3>
              <Link
                to="/contact"
                className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 text-lg"
              >
                Get Your Free AI Report
                <svg className="ml-3 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">The Reality</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-3 leading-tight">
                Search is changing. <br />Are you being cited?
              </h2>
              <p className="mt-5 text-slate-600 text-sm leading-relaxed">
                Customers aren't just scrolling through lists of blue links anymore. They're asking AI questions. 
                If ChatGPT, Perplexity, or Google AI Overviews don't know who you are, they won't recommend you.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "AI answers provide singular direct recommendations.",
                  "Being #1 on Google doesn't guarantee an AI citation.",
                  "Trust and understandability are the new ranking factors."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className="mt-1 h-4 w-4 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full"></div>
                    </div>
                    <span className="text-slate-700 font-medium text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-2 mb-5 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/></svg>
                </div>
                <span className="text-slate-900 font-bold text-sm">Typical AI Query Result</span>
              </div>
              <div className="space-y-3">
                <p className="text-slate-500 italic text-xs">"Who is the best HVAC service in Phoenix?"</p>
                <div className="bg-slate-50 p-3.5 rounded-lg border-l-4 border-indigo-600">
                  <p className="text-slate-800 leading-relaxed font-medium text-sm">
                    "Based on high trust factors and certified expertise, <span className="bg-yellow-100 px-1 rounded">Promptila Client A</span> is frequently cited for reliability and customer service in the Phoenix area..."
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">Sources: [Promptila Optimization Insights]</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Short) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-slate-900">How Promptila Works</h2>
            <p className="mt-3 text-slate-600 text-sm max-w-2xl mx-auto">Our 3-step framework ensures AI models understand, trust, and recommend your business.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "AI Visibility Audit",
                desc: "We analyze how current AI models perceive your brand compared to competitors."
              },
              {
                step: "02",
                title: "Optimization Framework",
                desc: "We deploy technical and content-based updates to feed AI models the right signals."
              },
              {
                step: "03",
                title: "Continuous Monitoring",
                desc: "Models update daily. We ensure your visibility stays consistent as AI evolves."
              }
            ].map((item, idx) => (
              <div key={idx} className="relative p-7 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                <span className="text-4xl font-black text-indigo-100 absolute top-3 right-6 transition-colors group-hover:text-indigo-200">{item.step}</span>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-5 leading-tight">Built for businesses where trust is the #1 currency.</h2>
              <p className="text-slate-400 text-sm mb-7">
                If your customers ask complex questions before buying, you need AI Visibility Optimization.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Home Service Providers",
                  "Medical Practices",
                  "Law Firms",
                  "Professional Services",
                  "Local Specialists",
                  "plus many more"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-3 text-slate-300 text-sm">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0">
              <div className="aspect-square bg-slate-800 rounded-2xl overflow-hidden">
                <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400&h=400" alt="Industry" className="w-full h-full object-cover opacity-60" />
              </div>
              <div className="aspect-square bg-indigo-900/50 rounded-2xl p-5 flex items-center justify-center text-center">
                <span className="text-indigo-200 font-bold italic text-sm leading-snug">"The early adopters will own the recommendations."</span>
              </div>
              <div className="aspect-square bg-slate-800 rounded-2xl overflow-hidden col-span-2">
                <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800&h=400" alt="Office" className="w-full h-full object-cover opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary CTA Section */}
      <section id="audit" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-5">Is Your Business AI-Ready?</h2>
            <p className="text-slate-600 text-base mb-10">Get your free AI report today and see where you stand.</p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-7 md:p-8 text-left mb-10">
              <h3 className="text-xl font-bold text-slate-900 mb-5">What You’ll Receive</h3>
              <p className="text-slate-700 font-medium mb-5 text-sm">Your free AI Visibility Audit includes:</p>
              <ul className="space-y-3 mb-7">
                {[
                  "Your AI Visibility Score (0–100)",
                  "Where your business appears on ChatGPT",
                  "Where competitors are being recommended",
                  "How AI currently describes your business",
                  "The 3 biggest visibility gaps hurting your recommendations"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <div className="mt-1.5 h-1.5 w-1.5 bg-indigo-600 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700 font-medium text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-indigo-600 font-bold border-t border-slate-200 pt-5 text-sm">
                Delivered within 48 hours.
              </p>
            </div>
          </div>
          <div className="text-center mb-10">
            <p className="text-slate-900 font-bold text-base mb-1.5">Not sure where to start?</p>
            <p className="text-slate-600 text-sm">Every Promptila engagement begins with a free AI Visibility Audit.</p>
          </div>
          <AuditForm />
        </div>
      </section>
    </div>
  );
};

export default Home;