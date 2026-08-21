
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ExternalLink } from 'lucide-react';

const CaseStudies: React.FC = () => {
  const caseStudies = [
    {
      title: 'Big Lake Candy Company',
      location: 'Owosso, MI',
      description: 'How a local candy manufacturer dominated AI search results and captured high-intent regional traffic.',
      path: '/case-study/big-lake-candy',
      image: 'https://images.unsplash.com/photo-1582043219735-939982416630?auto=format&fit=crop&q=80&w=800',
    },
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Case Studies</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Real-world results of how we help businesses dominate the AI recommendation era.
          </p>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {caseStudies.map((cs, idx) => (
              <div key={idx} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={cs.image} 
                    alt={cs.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">{cs.location}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{cs.title}</h3>
                  <p className="text-slate-600 mb-6 line-clamp-3">
                    {cs.description}
                  </p>
                  <Link 
                    to={cs.path} 
                    className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700 group/btn"
                  >
                    Read Full Case Study
                    <ChevronRight className="ml-1 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to be our next success story?</h2>
          <p className="text-lg text-slate-600 mb-10">
            See how your business performs in the AI search landscape with a free visibility audit.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 text-lg shadow-xl shadow-indigo-200"
          >
            Get Your Free AI Report
            <ChevronRight className="ml-2 w-6 h-6" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CaseStudies;
