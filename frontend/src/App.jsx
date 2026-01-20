import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "./store/authStore";

/* Components */
import Header from "./components/Header";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";

/* Pages */
import Home from "./pages/Home";
import CompleteProfile from "./pages/CompleteProfile";
import RoomPage from "./pages/RoomPage";
import Checkout from "./pages/Checkout";
import MyBookings from "./pages/MyBookings";
import MyAccount from "./pages/MyAccount";
import Invoices from "./pages/Invoices";
import VillaInvoice from "./components/VillaInvoice";
import BookingSuccess from "./pages/BookingSuccess";
import EntireVillaform from "./pages/EntireVillaform";
import ThankYou from "./pages/ThankYou";

/* Legal Pages */
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundCancellation from "./pages/RefundCancellation";
import PoolSafety from "./pages/PoolSafety";
import HouseRules from "./pages/HouseRules";

/* ================= SCROLL TO TOP ================= */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/* ================= INNER APP (INSIDE SAME FILE) ================= */

function AppRoutes() {
  const { user, init, loading } = useAuth();
  const navigate = useNavigate();

  /* 🔁 Init session */
  useEffect(() => {
    init();
  }, [init]);

  /* =====================================================
     🔑 GLOBAL POST-LOGIN + PROFILE ENFORCEMENT
  ===================================================== */
  useEffect(() => {
    if (loading) return;

    const raw = sessionStorage.getItem("postAuthRedirect");
    const redirect = raw ? JSON.parse(raw) : null;

    // 🚫 Not logged in → do nothing
    if (!user) return;

    // 🔴 Profile incomplete → force complete profile
    if (!user.profileComplete) {
      navigate("/complete-profile", {
        replace: true,
        state: redirect || null,
      });
      return;
    }

    // 🟢 Profile complete → continue original flow
    if (redirect?.redirectTo) {
      sessionStorage.removeItem("postAuthRedirect");
      navigate(redirect.redirectTo, {
        replace: true,
        state: redirect.bookingState,
      });
    }
  }, [user, loading, navigate]);

  return (
    <>
      {/* 🔑 REQUIRED FOR FIREBASE PHONE AUTH */}
      <div id="recaptcha-container"></div>

      <ScrollToTop />
      <Header />
      <AuthModal />

      <Routes>
        {/* CORE */}
        <Route path="/" element={<Home />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* USER */}
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoice-view/:id" element={<VillaInvoice />} />
        <Route path="/booking-success/:id" element={<BookingSuccess />} />

        {/* FLOWS */}
        <Route path="/entire-villa-form" element={<EntireVillaform />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* LEGAL */}
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundCancellation />} />
        <Route path="/pool-safety" element={<PoolSafety />} />
        <Route path="/house-rules" element={<HouseRules />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}

/* ================= ROOT APP ================= */

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
