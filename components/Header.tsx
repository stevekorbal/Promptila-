import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { User, ShieldCheck } from 'lucide-react';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Services', path: '/services' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'Industries', path: '/industries' },
    { name: 'Case Studies', path: '/case-study/big-lake-candy' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img 
                src="https://i.ibb.co/GBsQfJL/promptila-logo-removebg-preview.png" 
                alt="Promptila" 
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-7">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path) ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <Link
              to="/contact"
              className={`text-sm font-medium transition-colors ${
                isActive('/contact') ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              Contact Us
            </Link>

            {/* Auth links */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <User className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  <span>Dashboard</span>
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
            )}

            <Link
              to="/contact"
              className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Free AI Report
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            {user && (
              <Link
                to="/dashboard"
                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
              >
                Dashboard
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-indigo-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 text-base font-medium ${
                  isActive(link.path) ? 'text-indigo-600 bg-slate-50' : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <Link
              to="/contact"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 text-base font-medium border-t border-slate-100 mt-2 pt-4 ${
                isActive('/contact') ? 'text-indigo-600 bg-slate-50' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              Contact Us
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-base font-bold text-indigo-600"
                >
                  My Dashboard
                </Link>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-base font-bold text-amber-600"
                  >
                    Admin Panel
                  </Link>
                )}
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 text-base font-semibold text-slate-700 hover:text-indigo-600"
              >
                Sign In
              </Link>
            )}

            <Link
              to="/contact"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-base font-bold text-indigo-600"
            >
              Get Your Free AI Report
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
