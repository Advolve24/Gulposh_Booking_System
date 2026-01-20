import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/authStore";

export default function RequireProfileComplete({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or loader

  // Not logged in → allow AuthModal to handle
  if (!user) return children;

  // Logged in but profile incomplete
  if (!user.profileComplete) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{
          redirectTo: location.pathname,
          bookingState: location.state,
        }}
      />
    );
  }

  return children;
}
