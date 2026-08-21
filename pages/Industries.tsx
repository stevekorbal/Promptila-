
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Stethoscope, Utensils, Car, Briefcase, Store, ChevronRight } from 'lucide-react';

const Industries: React.FC = () => {
  const slugify = (text: string) => 
    text.toLowerCase()
      .replace(/ & /g, '-')
      .replace(/ /g, '-')
      .replace(/companies/g, '')
      .replace(/--/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-$/, '')
      .replace(/^-/, '');

  const industries = [
    {
      title: "Home Services",
      icon: <Home className="w-5 h-5" />,
      why: "Local intent is rapidly shifting from traditional search to AI-driven questions such as:",
      examples: ["\"Best HVAC company near me\"", "\"Top plumber in Dallas\""],
      supported: ["HVAC Companies", "Plumbers", "Electricians", "Roofers", "Landscapers", "Pest Control"]
    },
    {
      title: "Healthcare & Wellness",
      icon: <Stethoscope className="w-5 h-5" />,
      why: "AI models are extremely cautious when recommending healthcare providers. They prioritize businesses with strong authority, credentials, and a trusted reputation.",
      supported: ["Dentists", "Chiropractors", "Physical Therapists", "Mental Health", "Optometrists", "Specialized Clinics"]
    },
    {
      title: "Food & Hospitality",
      icon: <Utensils className="w-5 h-5" />,
      why: "Consumers increasingly ask AI tools for dining and local recommendations such as:",
      examples: ["\"Best restaurant near me\"", "\"Top coffee shop in Chicago\""],
      supported: ["Restaurants", "Coffee Shops", "Bakeries", "Food Trucks", "Catering Companies", "Bars & Lounges"]
    },
    {
      title: "Automotive Services",
      icon: <Car className="w-5 h-5" />,
      why: "Vehicle owners frequently ask AI Assistants for trusted repair shops and automotive services. Businesses with strong reputation signals and clear service information are favored.",
      supported: ["Auto Repair Shops", "Car Washes", "Tire Shops", "Collision Repair", "Auto Dealerships", "Detailing Services"]
    },
    {
      title: "Professional Services",
      icon: <Briefcase className="w-5 h-5" />,
      why: "Promptila strengthens the reputation signals providers need to appear in AI recommendations by improving authority and expertise markers.",
      supported: ["Law Firms", "Accountants", "Financial Advisors", "Real Estate Agents", "Marketing Agencies", "Consulting Firms"]
    },
    {
      title: "Local Consumer Businesses",
      icon: <Store className="w-5 h-5" />,
      why: "AI assistants are becoming the new local recommendations engine for every service. We ensure your business is the top choice for AI recommendations.",
      supported: ["Fitness Gyms", "Pet Groomers", "Daycare Centers", "Cleaning Services", "Salons", "Dry Cleaners"]
    }
  ];

  return (
    <div className="pt-20">
      {/* Header Section */}
      <section className="bg-white py-16 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-5">Industries We Serve</h1>
          <p className="text-lg text-slate-600 mb-4">
            AI systems evaluate businesses differently depending on the industry. <span className="font-medium text-indigo-600">Promptila helps</span> companies build the authority signals that AI models trust when recommending businesses.
          </p>
          <p className="text-sm text-slate-500 italic">
            Explore how <span className="text-indigo-600 font-medium">AI visibility</span> works in your industry.
          </p>
        </div>
      </section>

      {/* Grid Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {industries.map((industry, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    {industry.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{industry.title}</h3>
                </div>

                <div className="space-y-6 flex-grow">
                  <div>
                    <h4 className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-2">Why AI Matters Here</h4>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">
                      {industry.why}
                    </p>
                    {industry.examples && (
                      <ul className="space-y-1.5 mb-4">
                        {industry.examples.map((ex, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm text-slate-500 italic">
                            <span className="text-indigo-400 mt-1">•</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-3">Industries we support:</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {industry.supported.map((item, i) => (
                        <Link 
                          key={i} 
                          to={`/industries/${slugify(item)}`}
                          className="flex items-center text-sm text-slate-600 hover:text-indigo-600 transition-colors group"
                        >
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 group-hover:scale-125 transition-transform" />
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-indigo-50 rounded-3xl py-12 border border-indigo-100 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to see if your business appears in AI recommendations?</h2>
          <p className="text-base text-slate-600 mb-8 max-w-2xl mx-auto">
            Run a free AI visibility audit to discover how your business is recognized across AI platforms.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95 text-base shadow-lg shadow-indigo-200 group"
          >
            Get Your Free AI Report
            <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Industries;
