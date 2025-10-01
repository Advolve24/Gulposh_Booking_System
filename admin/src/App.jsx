import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function InitAuthWatcher({ children }) {
  const { init, ready } = useAuth();
  const location = useLocation();

  useEffect(() => {
    init(); 
  }, [init, location.pathname]);

  if (!ready) return null;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const authed = !!user?.isAdmin;

  return (
    <BrowserRouter>
      <InitAuthWatcher>
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
              <Route path="/users" element={<Users />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/customize-bookings" element={<CustomizeBookings />} />
              <Route path="/room/:id" element={<RoomPage />} />
              <Route path="/villa-booking" element={<VillaBookingForm />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </InitAuthWatcher>
    </BrowserRouter>
  );
}
