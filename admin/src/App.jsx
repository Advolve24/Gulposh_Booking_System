import { useEffect, useRef } from "react";
import { socket } from "./lib/socket";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "./store/auth";
import { useNotificationStore } from "./store/useNotificationStore";

import { initFCM } from "@/lib/fcm";

import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
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
import Settings from "./pages/Settings";
import { getAdminNotifications } from "@/api/admin";


function InitAuthWatcher({ children }) {
  const { init, ready } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    init();
  }, [init]);

  if (!ready) return null;
  return children;
}


export default function App() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const setInitial = useNotificationStore(s => s.setInitial);

useEffect(() => {
if (!isAdmin) return;


(async () => {
const data = await getAdminNotifications();
setInitial(data);
})();
}, [isAdmin]);

  const addNotification = useNotificationStore(
    (s) => s.addNotification
  );

  const socketInitRef = useRef(false);
  const fcmInitRef = useRef(false);

  /* ================= SOCKET.IO ================= */
  useEffect(() => {
    if (!isAdmin) {
      if (socket.connected) socket.disconnect();
      socketInitRef.current = false;
      return;
    }

    if (socketInitRef.current) return;
    socketInitRef.current = true;

    socket.connect();

    socket.on("connect", () => {
      console.log("🟢 Admin connected to socket:", socket.id);
      socket.emit("admin:online");
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Admin disconnected:", reason);
    });

    socket.on("ADMIN_NOTIFICATION", (payload) => {
      console.log("🔔 SOCKET NOTIFICATION:", payload);

      handleIncomingNotification(payload);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("ADMIN_NOTIFICATION");
    };
  }, [isAdmin]);

  
  /* ================= FCM ================= */
useEffect(() => {
  if (!isAdmin) return;
  if (fcmInitRef.current) return;

  fcmInitRef.current = true;

  initFCM((notification) => {
    console.log("🔔 FCM NOTIFICATION:", notification);
    handleIncomingNotification(notification);
  }).catch(console.error);

}, [isAdmin]);


  /* ================= COMMON HANDLER ================= */
  const handleIncomingNotification = (payload) => {
    const {
      type = "info",
      title = "Notification",
      message = "",
    } = payload || {};

    // Save to store
    addNotification({
      ...payload,
      isRead: false,
      createdAt: payload.createdAt || new Date().toISOString(),
    });

    // Toast
    const toastType = toast[type] ? type : "info";

    toast[toastType](
      <div className="space-y-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm opacity-90 whitespace-pre-line">
          {message}
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <InitAuthWatcher>
        <Routes>
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

          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />


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
