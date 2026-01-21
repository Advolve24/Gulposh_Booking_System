import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/authStore";

export default function AuthSuccess() {
  const { init } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const user = await init();

      // restore reserve flow
      const raw = sessionStorage.getItem("postAuthRedirect");
      const parsed = raw ? JSON.parse(raw) : null;

      if (!user.profileComplete) {
        navigate("/complete-profile", { replace: true, state: parsed });
        return;
      }

      if (parsed) {
        sessionStorage.removeItem("postAuthRedirect");
        navigate(parsed.redirectTo || "/", {
          replace: true,
          state: parsed.bookingState || null,
        });
        return;
      }

      navigate("/", { replace: true });
    })();
  }, []);

  return null;
}
