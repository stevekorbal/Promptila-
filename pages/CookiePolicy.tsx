import React from 'react';

const CookiePolicy: React.FC = () => {
  return (
    <div className="pt-20">
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Cookie Policy</h1>
          <p className="text-slate-500 font-medium mb-12 italic border-b border-slate-100 pb-4">Effective Date: September 1st 2025</p>
          
          <div className="prose prose-slate prose-lg max-w-none space-y-10 text-slate-600">
            <p className="text-xl text-slate-900 font-medium leading-relaxed">
              Promptila uses cookies and similar technologies to improve website functionality, analyze traffic, and understand how visitors interact with our site.
            </p>

            <p>
              Cookies are small data files stored on your device when you visit a website. They help websites function properly and provide insights into usage and performance.
            </p>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 uppercase tracking-tight">Types of Cookies We Use</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Essential Cookies</h3>
                  <p>
                    These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions made by you, such as filling out forms or setting privacy preferences.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Analytics Cookies</h3>
                  <p>
                    We may use analytics cookies to collect information about how visitors use our website, such as pages visited and time spent on the site. This information helps us improve our website and services.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Third-Party Cookies</h3>
                  <p>
                    Some cookies may be placed by third-party services we use, such as analytics or embedded tools. These cookies are governed by the privacy policies of those third parties.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Managing Cookies</h2>
              <p>
                You can control or disable cookies through your browser settings. Please note that disabling cookies may affect the functionality of our website.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Changes to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. Any changes will be posted on this page with a revised effective date.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 uppercase tracking-tight">Contact Us</h2>
              <p>
                If you have questions about this Cookie Policy, contact us at <a href="mailto:hello@promptila.com" className="text-indigo-600 hover:underline">hello@promptila.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CookiePolicy;