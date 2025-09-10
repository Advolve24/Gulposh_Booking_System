import { Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function GuestRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user?.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
