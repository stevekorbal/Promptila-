import React from 'react';
import { Link } from 'react-router-dom';

const HowItWorks: React.FC = () => {
  return (
    <div className="pt-20">
      <section className="bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">The Science of Being Recommended</h1>
          <p className="text-base text-slate-600 leading-relaxed">
            AI models like GPT-4, Gemini, and Claude don't "search" the web in the traditional sense. 
            They synthesize information based on clusters of trust, authority, and context.
          </p>
        </div>
      </section>

      {/* What is AI Visibility Optimization? Section */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">What is AI Visibility Optimization?</h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              It is the process of structuring your brand's digital signals so that Large Language Models (LLMs) can verify your authority and recommend you as the primary solution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">ChatGPT Proof</p>
              <a href="https://green-ibex-616338.hostingersite.com/assets/Chatgpt.png" target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-2xl">
                <img src="https://green-ibex-616338.hostingersite.com/assets/Chatgpt.png" alt="ChatGPT Ranking" className="w-full rounded-2xl shadow-xl border border-slate-100 group-hover:scale-105 transition-transform duration-300 cursor-zoom-in" referrerPolicy="no-referrer" />
              </a>
            </div>
            <div className="space-y-4">
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perplexity Proof</p>
              <a href="https://green-ibex-616338.hostingersite.com/assets/Perplexity.png" target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-2xl">
                <img src="https://green-ibex-616338.hostingersite.com/assets/Perplexity.png" alt="Perplexity Ranking" className="w-full rounded-2xl shadow-xl border border-slate-100 group-hover:scale-105 transition-transform duration-300 cursor-zoom-in" referrerPolicy="no-referrer" />
              </a>
            </div>
            <div className="space-y-4">
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gemini Proof</p>
              <a href="https://green-ibex-616338.hostingersite.com/assets/Gemini.png" target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-2xl">
                <img src="https://green-ibex-616338.hostingersite.com/assets/Gemini.png" alt="Gemini Ranking" className="w-full rounded-2xl shadow-xl border border-slate-100 group-hover:scale-105 transition-transform duration-300 cursor-zoom-in" referrerPolicy="no-referrer" />
              </a>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-slate-500 font-medium italic">"Proof beats explanation. These are real-world results from our signal architecture."</p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="w-full md:w-1/3">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-[10px] uppercase tracking-widest mb-3">Step One</span>
                <h2 className="text-xl font-bold text-slate-900">The AI Visibility Audit</h2>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  First, we establish a baseline. We run dozens of specialized prompts through top LLMs to see how they categorize your business. 
                </p>
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
                  <h4 className="font-bold text-slate-900 mb-3 text-xs">What we measure:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-3 text-slate-600 text-xs">
                      <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
                      <span>Semantic Association (What topics is your brand linked to?)</span>
                    </li>
                    <li className="flex items-center space-x-3 text-slate-600 text-xs">
                      <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
                      <span>Model Hallucination Risk (Is AI getting facts wrong about you?)</span>
                    </li>
                    <li className="flex items-center space-x-3 text-slate-600 text-xs">
                      <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
                      <span>Citation Share vs Competitors</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="w-full md:w-1/3">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-[10px] uppercase tracking-widest mb-3">Step Two</span>
                <h2 className="text-xl font-bold text-slate-900">Optimization Framework</h2>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  Once we know the gaps, we fix them. This isn't just about keywords; it's about structured data and digital footprinting.
                </p>
                <p className="text-slate-600 leading-relaxed text-xs">
                  We modify your website’s technical metadata and craft authoritative content pieces that act as primary sources for LLM training data and real-time retrieval plugins.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="w-full md:w-1/3">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-[10px] uppercase tracking-widest mb-3">Step Three</span>
                <h2 className="text-xl font-bold text-slate-900">Monitoring & Refinement</h2>
              </div>
              <div className="w-full md:w-2/3">
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  The AI landscape shifts weekly. A new model version can change how your business is perceived overnight.
                </p>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Promptila provides ongoing monitoring. If a model starts favoring a competitor or misinterpreting your services, we adjust our framework to correct the course immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center bg-indigo-600 rounded-3xl p-8 text-white shadow-xl">
            <h2 className="text-xl font-bold mb-5">Ready to lead the AI answer era?</h2>
            <Link
              to="/contact"
              className="inline-block px-7 py-3.5 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all active:scale-95 text-sm"
            >
              Get Your Free AI Report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;