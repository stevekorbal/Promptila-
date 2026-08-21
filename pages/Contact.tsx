
import React from 'react';
import AuditForm from '../components/AuditForm.tsx';

const Contact: React.FC = () => {
  return (
    <div className="pt-20">
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-5">Is Your Business Showing Up in AI Recommendations?</h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Stop guessing how AI models see your business. Run a free audit to see if your company appears in ChatGPT, Gemini, and Perplexity results.
              </p>

              {/* Direct Contact Details */}
              <div className="mb-10 space-y-5">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Office</p>
                    <p className="text-slate-600 text-sm">Davisburg, MI</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Phone</p>
                    <a href="tel:248-216-8175" className="text-indigo-600 font-medium hover:underline tracking-tight text-sm">248-216-8175</a>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Email</p>
                    <a href="mailto:hello@promptila.com" className="text-indigo-600 font-medium hover:underline text-sm">hello@promptila.com</a>
                  </div>
                </div>
              </div>

              <div className="space-y-6 border-t border-slate-200 pt-8">
                <div>
                  <h4 className="font-bold text-slate-900 text-base mb-1.5">What happens next?</h4>
                  <p className="text-slate-600 text-sm">Once you submit, an AI analyst will manually review your brand's digital footprint across GPT-4, Gemini, and AI Overviews.</p>
                </div>
                <div className="flex items-center space-x-4 p-5 bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">48-Hour Response Time</p>
                    <p className="text-[11px] text-slate-500">We respond to all qualified audit requests within 2 business days.</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <AuditForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
