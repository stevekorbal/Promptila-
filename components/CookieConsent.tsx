
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-grow text-center md:text-left">
          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            Promptila uses <Link to="/cookie-policy" className="text-white font-semibold underline hover:text-indigo-400 transition-colors">cookies</Link> to improve site performance and analyze traffic. By continuing to use this site, you agree to our use of cookies.
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-4">
          <button
            onClick={handleAccept}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg whitespace-nowrap"
          >
            I Accept
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
