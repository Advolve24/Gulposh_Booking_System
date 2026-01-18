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
import { useAuth } from "./store/authStore";
import AuthModal from "./components/AuthModal";
import MyBookings from "./pages/MyBookings";
import MyAccount from "./pages/MyAccount";
import VillaInvoice from "./components/VillaInvoice";
import Invoices from "./pages/Invoices";
import BookingSuccess from "./pages/BookingSuccess";
import EntireVillaform from "./pages/EntireVillaform";
import ThankYou from "./pages/ThankYou";

/* =====================================================
   SCROLL TO TOP
===================================================== */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* =====================================================
   AUTH GUARD
===================================================== */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* =====================================================
   PROFILE COMPLETION GUARD
===================================================== */
function RequireProfileComplete({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}

/* =====================================================
   APP
===================================================== */
export default function App() {
  const { init } = useAuth();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      {/* 🔑 REQUIRED FOR FIREBASE PHONE AUTH */}
      <div id="recaptcha-container"></div>

      <ScrollToTop />
      <Header />
      <AuthModal />

      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* ================= PROFILE ================= */}
        <Route
          path="/complete-profile"
          element={
            <RequireAuth>
              <CompleteProfile />
            </RequireAuth>
          }
        />

        {/* ================= PROTECTED + PROFILE COMPLETE ================= */}
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

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
