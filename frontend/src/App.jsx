import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import ThankYou from "./pages/ThankYou";


function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}