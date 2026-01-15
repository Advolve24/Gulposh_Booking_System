import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useAuth } from "./store/auth";

import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";           // ✅ ADDED
import RoomsNew from "./pages/RoomsNew";
import Users from "./pages/Users";
import Bookings from "./pages/Bookings";
import VillaBookingForm from "./pages/VillaBookingForm";
import AdminRoomView from "./pages/RoomView";
import InvoicePage from "./components/booking/InvoicePage";
import BookingViewPage from "@/components/booking/BookingViewPage";
import AdminInvoiceTemplate from "./components/AdminBookingPrint";
import ProtectedRoute from "./components/ProtectedRoute";
import BlockDates from "./pages/BlockDates";


function InitAuthWatcher({ children }) {
  const { init, ready } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    init();
  }, [init]);

  if (!ready) return null; // ⛔ wait here ONLY
  return children;
}

/* ================================
   APP
================================ */
export default function App() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  return (
    <BrowserRouter>
      <InitAuthWatcher>
        <Routes>
          {/* ROOT */}
          <Route
            path="/"
            element={
              isAdmin ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          {/* ADMIN */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ✅ ROOMS LIST PAGE */}
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <Rooms />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms/new"
            element={
              <ProtectedRoute>
                <RoomsNew />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms/view/:id"
            element={
              <ProtectedRoute>
                <AdminRoomView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />

             <Route path="/bookings/:id" element={<BookingViewPage />} />
                    <Route
            path="/bookings/:id/invoice"
            element={
              <ProtectedRoute>
                <InvoicePage />
              </ProtectedRoute>
            }
          />


          <Route
            path="/villa-booking"
            element={
              <ProtectedRoute>
                <VillaBookingForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoice/:bookingId"
            element={
              <ProtectedRoute>
                <AdminInvoiceTemplate />
              </ProtectedRoute>
            }
          />


          <Route
            path="/block-dates"
            element={
              <ProtectedRoute>
                <BlockDates />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              isAdmin ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </InitAuthWatcher>
    </BrowserRouter>
  );
}
