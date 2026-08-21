import React from 'react';
import { Link } from 'react-router-dom';

const Services: React.FC = () => {
  const services = [
    {
      title: "AI Visibility Audit",
      problem: "You don't know how AI currently views your business.",
      solution: "A deep-dive diagnostic report showing your current citation share, trust score, and competitive standing across 5 major LLMs.",
      outcome: "A clear roadmap of what needs fixing to get recommended."
    },
    {
      title: "AI Search Optimization",
      problem: "Traditional SEO signals are too weak for modern AI engines.",
      solution: "Full-scale implementation of structured data, authoritative digital sourcing, and entity-based content optimization.",
      outcome: "Consistent citations and placement in high-intent AI queries."
    },
    {
      title: "Ongoing AI Monitoring",
      problem: "Model updates and 'hallucinations' can erase your visibility.",
      solution: "Monthly tracking and rapid-response adjustments as new models (GPT-5, etc.) are released.",
      outcome: "Future-proof visibility and maintained authority."
    }
  ];

  return (
    <div className="pt-20">
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold mb-5">Outcome-Driven AI Optimization</h1>
          <p className="text-lg text-slate-400">Focused on one goal: Making your business the singular answer AI gives to its users.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <div key={idx} className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-7 bg-slate-50 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
                </div>
                <div className="p-7 flex-grow space-y-7">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">The Problem</span>
                    <p className="mt-2 text-slate-700 font-medium leading-relaxed text-sm">{service.problem}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest">Our Solution</span>
                    <p className="mt-2 text-slate-600 leading-relaxed text-sm">{service.solution}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Client Outcome</span>
                    <p className="mt-2 text-slate-700 font-bold leading-relaxed text-sm">{service.outcome}</p>
                  </div>
                </div>
                <div className="p-7 pt-0">
                  <Link
                    to="/contact"
                    className="block w-full text-center py-2.5 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors text-xs px-2"
                  >
                    Get Your Free AI Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Not sure which service you need?</h2>
          <p className="text-base text-slate-600 mb-8">Start with the AI Visibility Audit. It's the foundation for everything we do.</p>
          <Link
            to="/contact"
            className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 text-base"
          >
            Get Your Free AI Report
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Services;