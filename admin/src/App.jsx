import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./store/auth";
import Login from "./pages/Login";
import RoomsNew from "./pages/RoomsNew";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import Logout from "./pages/Logout";
import Users from "./pages/Users";
import Bookings from "./pages/Bookings";
import CustomizeBookings from "./pages/CustomizeBookings";
import RoomPage from "./pages/RoomPage";
import VillaBookingForm from "./pages/VillaBookingForm";


export default function App() {
  const { init, user, ready } = useAuth();

  useEffect(() => { init(); }, [init]);

  if (!ready) return null;

  const authed = !!user?.isAdmin;

  return (
    <BrowserRouter>
      {/* /logout must be available regardless of auth */}
      <Routes>
        <Route path="/logout" element={<Logout />} />
      </Routes>

      {authed ? (
        <>
          <Header />
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/users" element={<Users />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/customize-bookings" element={<CustomizeBookings />} />
            <Route path="/room/:id" element={<RoomPage />} />
             <Route path="/villa-booking" element={<VillaBookingForm />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
