import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "./store/authStore";

/* ================= PAGES ================= */
import Home from "./pages/Home";
import CompleteProfile from "./pages/CompleteProfile";
import RoomPage from "./pages/RoomPage";
import Checkout from "./pages/Checkout";
import MyBookings from "./pages/MyBookings";
import MyAccount from "./pages/MyAccount";
import Invoices from "./pages/Invoices";
import BookingSuccess from "./pages/BookingSuccess";
import EntireVillaform from "./pages/EntireVillaform";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundCancellation from "./pages/RefundCancellation";
import PoolSafety from "./pages/PoolSafety";
import HouseRules from "./pages/HouseRules";


/* ================= COMPONENTS ================= */
import Header from "./components/Header";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
import VillaInvoice from "./components/VillaInvoice";

/* =====================================================
   🔁 SCROLL TO TOP
===================================================== */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/* =====================================================
   🔐 ROUTE GUARD
===================================================== */
function RequireAuth({ children }) {
  const { user, openAuth } = useAuth();
  const location = useLocation();

  if (!user) {
    sessionStorage.setItem(
      "postAuthRedirect",
      JSON.stringify({
        redirectTo: location.pathname,
        bookingState: location.state || null,
      })
    );

    openAuth();
    return <Navigate to="/" replace />;
  }

  return children;
}

/* =====================================================
   🔐 PROFILE GUARD
===================================================== */
function RequireProfile({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.profileComplete && location.pathname !== "/complete-profile") {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{
          redirectTo: location.pathname,
          bookingState: location.state || null,
        }}
      />
    );
  }

  return children;
}

/* =====================================================
   🚦 APP ROUTES
===================================================== */
function AppRoutes() {
  return (
    <>
      {/* 🔑 REQUIRED FOR FIREBASE OTP */}
      <div id="recaptcha-container" />

      <ScrollToTop />
      <Header />
      <AuthModal />

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/entire-villa-form" element={<EntireVillaform />} />

        {/* PROFILE */}
        <Route
          path="/complete-profile"
          element={
            <RequireAuth>
              <CompleteProfile />
            </RequireAuth>
          }
        />

        {/* PROTECTED */}
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <RequireProfile>
                <Checkout />
              </RequireProfile>
            </RequireAuth>
          }
        />

        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <MyBookings />
            </RequireAuth>
          }
        />

        <Route
          path="/my-account"
          element={
            <RequireAuth>
              <MyAccount />
            </RequireAuth>
          }
        />

        <Route
          path="/invoices"
          element={
            <RequireAuth>
              <Invoices />
            </RequireAuth>
          }
        />

        <Route
          path="/invoice-view/:id"
          element={
            <RequireAuth>
              <VillaInvoice />
            </RequireAuth>
          }
        />

        <Route
          path="/booking-success/:id"
          element={
            <RequireAuth>
              <BookingSuccess />
            </RequireAuth>
          }
        />

        <Route
          path="/enquiry-success/:id"
          element={
            <RequireAuth>
              <EnquirySuccess />
            </RequireAuth>
          }
        />

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

/* =====================================================
   🚀 ROOT APP
===================================================== */
export default function App() {
  const { init, initialized } = useAuth();

useEffect(() => {
  init();
}, []);

if (!initialized) {
  return null; // or splash loader
}

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
