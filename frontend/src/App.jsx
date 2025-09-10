// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";
import Checkout from "./pages/Checkout";
import Header from "./components/Header";
import { useAuth } from "./store/authStore";
import AuthModal from "./components/AuthModal"; 
import MyBookings from "./pages/MyBookings";

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
      <ScrollToTop />
      <Header />
      <AuthModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
