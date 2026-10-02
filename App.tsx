
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import CookieConsent from './components/CookieConsent.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AdminRoute from './components/AdminRoute.tsx';
import Home from './pages/Home.tsx';
import HowItWorks from './pages/HowItWorks.tsx';
import Services from './pages/Services.tsx';
import Industries from './pages/Industries.tsx';
import About from './pages/About.tsx';
import Mission from './pages/Mission.tsx';
import CaseStudies from './pages/CaseStudies.tsx';
import CaseStudyBigLake from './pages/CaseStudyBigLake.tsx';
import IndustryDetail from './pages/IndustryDetail.tsx';
import Contact from './pages/Contact.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';
import TermsOfService from './pages/TermsOfService.tsx';
import CookiePolicy from './pages/CookiePolicy.tsx';
import Checkout from './pages/Checkout.tsx';
import Login from './pages/Login.tsx';
import SignUp from './pages/SignUp.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import AdminLayout from './pages/admin/AdminLayout.tsx';
import AdminOverview from './pages/admin/AdminOverview.tsx';
import AdminPlaceholder from './pages/admin/AdminPlaceholder.tsx';
import NotFound from './pages/NotFound.tsx';

const App: React.FC = () => {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        {!isAdminRoute && <Header />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/services" element={<Services />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/industries/:slug" element={<IndustryDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-study/big-lake-candy" element={<CaseStudyBigLake />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Dedicated Admin Shell & Nested Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="audits" element={<AdminPlaceholder sectionTitle="Audits" />} />
              <Route path="customers" element={<AdminPlaceholder sectionTitle="Customers" />} />
              <Route path="blueprint-orders" element={<AdminPlaceholder sectionTitle="Blueprint Orders" />} />
              <Route path="dfy-orders" element={<AdminPlaceholder sectionTitle="DFY Orders" />} />
              <Route path="emails" element={<AdminPlaceholder sectionTitle="Email Activity" />} />
              <Route path="alerts" element={<AdminPlaceholder sectionTitle="Alerts" />} />
              <Route path="settings" element={<AdminPlaceholder sectionTitle="Settings" />} />
            </Route>
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isAdminRoute && <Footer />}
        {!isAdminRoute && <CookieConsent />}
      </div>
    </AuthProvider>
  );
};

export default App;
