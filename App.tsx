
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
import Pricing from './pages/Pricing.tsx';
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
import AdminAudits from './pages/admin/AdminAudits.tsx';
import AdminAuditDetail from './pages/admin/AdminAuditDetail.tsx';
import AdminCustomers from './pages/admin/AdminCustomers.tsx';
import AdminBlueprintOrders from './pages/admin/AdminBlueprintOrders.tsx';
import AdminDfyOrders from './pages/admin/AdminDfyOrders.tsx';
import AdminEmails from './pages/admin/AdminEmails.tsx';
import AdminAlerts from './pages/admin/AdminAlerts.tsx';
import AdminSettings from './pages/admin/AdminSettings.tsx';
import AdminPlaceholder from './pages/admin/AdminPlaceholder.tsx';
import CustomerLayout from './pages/customer/CustomerLayout.tsx';
import CustomerOverview from './pages/customer/CustomerOverview.tsx';
import CustomerAudit from './pages/customer/CustomerAudit.tsx';
import CustomerBlueprint from './pages/customer/CustomerBlueprint.tsx';
import CustomerRecommendations from './pages/customer/CustomerRecommendations.tsx';
import CustomerProgress from './pages/customer/CustomerProgress.tsx';
import CustomerDfy from './pages/customer/CustomerDfy.tsx';
import CustomerMonitoring from './pages/customer/CustomerMonitoring.tsx';
import CustomerAccount from './pages/customer/CustomerAccount.tsx';
import NotFound from './pages/NotFound.tsx';

const App: React.FC = () => {
  const location = useLocation();
  const { pathname, hash } = location;
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isDedicatedConsole = isAdminRoute || isDashboardRoute;

  // Handle scroll on route or hash change
  useEffect(() => {
    if (hash) {
      const elementId = hash.replace('#', '');
      const scrollWithOffset = () => {
        const el = document.getElementById(elementId);
        if (el) {
          const headerOffset = 80;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          return true;
        }
        return false;
      };

      if (!scrollWithOffset()) {
        const timer = setTimeout(scrollWithOffset, 100);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        {!isDedicatedConsole && <Header />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pricing" element={<Pricing />} />
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
            {/* Dedicated Customer Dashboard Shell & Nested Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CustomerOverview />} />
              <Route path="audit" element={<CustomerAudit />} />
              <Route path="blueprint" element={<CustomerBlueprint />} />
              <Route path="recommendations" element={<CustomerRecommendations />} />
              <Route path="progress" element={<CustomerProgress />} />
              <Route path="dfy" element={<CustomerDfy />} />
              <Route path="monitoring" element={<CustomerMonitoring />} />
              <Route path="account" element={<CustomerAccount />} />
            </Route>
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
              <Route path="audits" element={<AdminAudits />} />
              <Route path="audits/:auditId" element={<AdminAuditDetail />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="blueprint-orders" element={<AdminBlueprintOrders />} />
              <Route path="dfy-orders" element={<AdminDfyOrders />} />
              <Route path="emails" element={<AdminEmails />} />
              <Route path="alerts" element={<AdminAlerts />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isDedicatedConsole && <Footer />}
        {!isDedicatedConsole && <CookieConsent />}
      </div>
    </AuthProvider>
  );
};

export default App;
