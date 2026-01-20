import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import CompleteProfile from "./pages/CompleteProfile";
import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";
import Checkout from "./pages/Checkout";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { useAuth } from "./store/authStore";
import AuthModal from "./components/AuthModal";
import MyBookings from "./pages/MyBookings";
import MyAccount from "./pages/MyAccount";
import VillaInvoice from "./components/VillaInvoice";
import Invoices from "./pages/Invoices";
import BookingSuccess from "./pages/BookingSuccess";
import EntireVillaform from "./pages/EntireVillaform";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundCancellation from "./pages/RefundCancellation";
import PoolSafety from "./pages/PoolSafety";
import HouseRules from "./pages/HouseRules";
import ThankYou from "./pages/ThankYou";

/* =====================================================
   🔄 SCROLL TO TOP
===================================================== */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/* =====================================================
   🔑 GLOBAL AUTH REDIRECT HANDLER (FIXED)
===================================================== */
function AuthRedirectHandler() {
  const { user, loading, init } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // useEffect(() => {
  //   init();
  // }, [init]);

  useEffect(() => {
    if (loading || !user) return;

    // ⛔ prevent re-run on every render
    if (sessionStorage.getItem("authRedirectHandled")) return;

    const raw = sessionStorage.getItem("postAuthRedirect");
    const redirect = raw ? JSON.parse(raw) : null;

    // 🔴 Force profile completion ONLY if not already there
    if (!user.profileComplete && location.pathname !== "/complete-profile") {
      sessionStorage.setItem("authRedirectHandled", "1");

      navigate("/complete-profile", {
        state: redirect || null,
        replace: true,
      });
      return;
    }

    // 🟢 Resume intended route
    if (
      redirect?.redirectTo &&
      location.pathname !== redirect.redirectTo
    ) {
      sessionStorage.removeItem("postAuthRedirect");
      sessionStorage.setItem("authRedirectHandled", "1");

      navigate(redirect.redirectTo, {
        state: redirect.bookingState,
        replace: true,
      });
    }
  }, [user, loading, navigate, location.pathname]);

  return null;
}

/* =====================================================
   🏁 APP ROOT
===================================================== */
export default function App() {
  return (
    <BrowserRouter>
      {/* 🔑 REQUIRED FOR FIREBASE PHONE AUTH */}
      <div id="recaptcha-container"></div>

      <ScrollToTop />
      <AuthRedirectHandler />

      <Header />
      <AuthModal />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoice-view/:id" element={<VillaInvoice />} />
        <Route path="/booking-success/:id" element={<BookingSuccess />} />
        <Route path="/entire-villa-form" element={<EntireVillaform />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* 📜 LEGAL */}
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundCancellation />} />
        <Route path="/pool-safety" element={<PoolSafety />} />
        <Route path="/house-rules" element={<HouseRules />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
