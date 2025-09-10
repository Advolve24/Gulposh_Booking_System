import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null; 
  if (!user?.isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
