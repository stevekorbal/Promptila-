
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="pt-20">
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-10">The AI-First Choice.</h1>
          
          <div className="prose prose-base text-slate-600 max-w-none space-y-6">
            <p className="text-lg text-slate-900 font-medium">
              Promptila was founded on a simple realization: the way the world finds information has changed forever, but the way businesses market themselves hasn't.
            </p>
            <p>
              Traditional SEO agencies are still fighting over keywords and backlinks. We believe those signals are becoming secondary. In an era where a singular AI voice gives the answer, there is no "page two" of Google. You are either the recommendation, or you are invisible.
            </p>
            <p>
              Our mission is to help mid-sized and local businesses adapt early. We believe the early adopters of AI Visibility Optimization will build a moat that traditional marketing simply can't bridge.
            </p>
            <div className="bg-slate-50 border-l-4 border-indigo-600 p-6 rounded-r-2xl my-10">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Our Core Philosophy</h3>
              <p className="italic text-sm">"We don't chase algorithms. We build signals of trust that are undeniable to any intelligence—human or artificial."</p>
            </div>
            <p className="text-sm">
              We are a team of AI researchers, technical SEOs, and data engineers. We don't use hype or buzzwords. We use data, structured testing, and a deep understanding of how Large Language Models work to ensure our clients are never left behind.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-40 bg-slate-200 rounded-2xl overflow-hidden flex-shrink-0">
              <img 
                src="https://green-ibex-616338.hostingersite.com/assets/stevekorbal.png" 
                alt="Steve Korbal" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Steve Korbal</h2>
              <p className="text-indigo-600 font-bold mb-3 text-sm">Founder, Promptila</p>
              <p className="text-slate-500 text-[10px] mb-5 uppercase tracking-widest font-semibold">Clarkston, Michigan</p>
              <p className="text-slate-600 text-base leading-relaxed italic">
                "Promptila was created after seeing local businesses struggle to appear in AI search results. Our goal is to help businesses become the recommended answer when customers ask AI for services."
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-1.5">2023</div>
              <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Founded</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-1.5">5+</div>
              <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Models Supported</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600 mb-1.5">100%</div>
              <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">AI-First Mindset</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
