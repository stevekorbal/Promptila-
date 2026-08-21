
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronRight, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Star, 
  MessageSquare,
  Home,
  Stethoscope,
  Utensils,
  Car,
  Briefcase,
  Store,
  Wrench,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

const IndustryDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Format the slug back to a readable title
  const title = slug
    ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Industry';

  // Mapping for industry-specific icons
  const getIcon = (slug: string | undefined) => {
    if (!slug) return <Zap className="w-8 h-8" />;
    if (slug.includes('hvac') || slug.includes('plumber') || slug.includes('repair')) return <Wrench className="w-8 h-8" />;
    if (slug.includes('home') || slug.includes('roof')) return <Home className="w-8 h-8" />;
    if (slug.includes('health') || slug.includes('dentist') || slug.includes('clinic')) return <Stethoscope className="w-8 h-8" />;
    if (slug.includes('food') || slug.includes('restaurant')) return <Utensils className="w-8 h-8" />;
    if (slug.includes('car') || slug.includes('auto')) return <Car className="w-8 h-8" />;
    if (slug.includes('law') || slug.includes('accountant') || slug.includes('consult')) return <Briefcase className="w-8 h-8" />;
    if (slug.includes('gym') || slug.includes('salon') || slug.includes('store')) return <Store className="w-8 h-8" />;
    return <Zap className="w-8 h-8" />;
  };

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="bg-white py-12 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/industries" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 mb-8 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Industries
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  {getIcon(slug)}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                  AI Visibility for <br />
                  <span className="text-indigo-600">{title}</span>
                </h1>
              </div>

              <div className="space-y-6 text-lg text-slate-600 leading-relaxed max-w-xl">
                <p>
                  Most {title.toLowerCase()} companies still focus only on Google rankings.
                </p>
                <p>
                  But AI assistants like <span className="font-semibold text-slate-900">ChatGPT, Gemini, and Perplexity</span> are increasingly recommending businesses directly.
                </p>
                <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-indigo-600 italic">
                  <p className="text-slate-900 font-medium">
                    When someone asks: <br />
                    <span className="text-xl">"Who is the best {title.toLowerCase()} near me?"</span>
                  </p>
                </div>
                <p className="text-base">
                  AI models choose companies based on <span className="text-indigo-600 font-medium">trust signals, reviews, structured data</span>, and authority signals.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Decorative Background Elements */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50" />

              {/* Mock AI Recommendation Interface */}
              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 z-10">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-slate-900">ChatGPT Question</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center space-x-3 border border-slate-100">
                  <Search className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-600 font-medium">Best {title.toLowerCase()} in Dallas?</span>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-bold text-slate-900 mb-2">Top 3 {title} in Dallas</div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {i === 1 ? 'Precision ' : i === 2 ? 'Cool Comfort ' : 'Elite '} {title.split(' ')[0]}
                          </div>
                          <div className="flex space-x-0.5 mt-1">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    AI typically recommends only <span className="font-bold text-slate-900">3—5 companies</span>. 
                    Those companies have stronger authority signals than their competitors. 
                    <span className="text-indigo-600 font-semibold"> Promptila</span> helps businesses build those signals.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Struggle Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
                Why {title} Businesses Struggle With AI Visibility
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Most {title.toLowerCase()} websites have problems like:
              </p>
              <ul className="space-y-4">
                {[
                  "inconsistent business information",
                  "weak review signals",
                  "unclear service areas",
                  "missing structured data",
                  "weak authority signals"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-3 text-slate-700 font-medium">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  Ready to see if your business appears in AI recommendations?
                </h3>
                <p className="text-slate-600 mb-8">
                  Run a free AI visibility audit to discover how your business is recognized across AI platforms.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 text-lg shadow-xl shadow-indigo-100 group"
                >
                  Run Free AI Visibility Audit
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              {/* Decorative background for the CTA box */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Don't let competitors own the AI conversation.</h2>
          <p className="text-slate-600 mb-8">
            We specialize in building the digital authority that modern AI models require to recommend your business.
          </p>
          <Link to="/contact" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center justify-center group">
            Contact an AI Specialist
            <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default IndustryDetail;
