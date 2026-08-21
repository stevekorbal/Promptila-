import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="pt-20">
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-500 font-medium mb-12 italic">Effective Date: September 1st 2025</p>
          
          <div className="prose prose-slate prose-lg max-w-none space-y-10 text-slate-600">
            <p>
              Promptila (“we,” “our,” or “us”) respects your privacy and is committed to protecting it. This Privacy Policy explains how we collect, use, and safeguard information when you visit our website or use our services.
            </p>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
              <p>We may collect the following types of information.</p>
              
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">Information You Provide</h3>
                <p>
                  When you contact us, request an AI Visibility Scan, or use our services, you may provide your name, business name, email address, website URL, location information, and any information you voluntarily submit through forms or email.
                </p>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-3">Automatically Collected Information</h3>
                <p>
                  When you visit our website, we may automatically collect information such as your IP address, browser type, device information, pages visited, referring URLs, and the date and time of your visits. This information is collected using standard technologies such as cookies and analytics tools.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
              <p>
                We use the information we collect to provide and improve our services, perform AI Visibility Scans and related analyses, respond to inquiries and support requests, communicate with you about our services, improve website performance and user experience, and maintain security and prevent misuse. We do not sell your personal information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies and Analytics</h2>
              <p>
                Promptila may use cookies or similar technologies to understand how visitors use our site, improve site functionality and performance, and analyze traffic and usage trends. You can disable cookies in your browser settings if you prefer.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Share Information</h2>
              <p>
                We may share information only in limited circumstances, such as with trusted service providers who assist in operating our website or services, when required by law or legal process, or to protect the rights, property, or safety of Promptila or others. We do not share personal information for advertising resale or unrelated third-party marketing.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Security</h2>
              <p>
                We take reasonable measures to protect your information using administrative, technical, and physical safeguards. However, no method of transmission over the internet is 100 percent secure.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Links</h2>
              <p>
                Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites, and we encourage you to review their privacy policies separately.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Children’s Privacy</h2>
              <p>
                Promptila does not knowingly collect personal information from individuals under the age of 13. If we become aware that such information has been collected, we will take steps to delete it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights and Choices</h2>
              <p>
                Depending on your location, you may have the right to request access to your personal data, request correction or deletion of your data, or withdraw consent for data processing. To exercise these rights, contact us using the information below.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or how your information is handled, you can contact us at <a href="mailto:hello@promptila.com" className="text-indigo-600 hover:underline">hello@promptila.com</a> or visit <a href="https://promptila.com" className="text-indigo-600 hover:underline">https://promptila.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;