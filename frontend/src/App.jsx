import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/authStore";
import AppRoutes from "./AppRoutes";

export default function App() {
  const { init } = useAuth();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      {/* 🔑 REQUIRED FOR FIREBASE PHONE AUTH */}
      <div id="recaptcha-container"></div>
      <AppRoutes />
    </BrowserRouter>
  );
}
