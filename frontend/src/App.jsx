import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
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

import RequireProfileComplete from "./components/RequireProfileComplete";

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
   🏁 APP ROOT
===================================================== */
export default function App() {
  return (
    <BrowserRouter>
      {/* 🔑 REQUIRED FOR FIREBASE PHONE AUTH */}
      <div id="recaptcha-container"></div>

      <ScrollToTop />

      <Header />
      <AuthModal />

      <Routes>
        {/* 🌍 PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundCancellation />} />
        <Route path="/pool-safety" element={<PoolSafety />} />
        <Route path="/house-rules" element={<HouseRules />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* 🔴 PROFILE COMPLETION */}
        <Route path="/complete-profile" element={<CompleteProfile />} />

        {/* 🔐 PROTECTED ROUTES */}
        <Route
          path="/checkout"
          element={
            <RequireProfileComplete>
              <Checkout />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/bookings"
          element={
            <RequireProfileComplete>
              <MyBookings />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/my-account"
          element={
            <RequireProfileComplete>
              <MyAccount />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/invoices"
          element={
            <RequireProfileComplete>
              <Invoices />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/invoice-view/:id"
          element={
            <RequireProfileComplete>
              <VillaInvoice />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/booking-success/:id"
          element={
            <RequireProfileComplete>
              <BookingSuccess />
            </RequireProfileComplete>
          }
        />

        <Route
          path="/entire-villa-form"
          element={
            <RequireProfileComplete>
              <EntireVillaform />
            </RequireProfileComplete>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
