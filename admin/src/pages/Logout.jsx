import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogout } from "../api/admin";
import { useAuth } from "../store/auth"; 


export default function Logout() {
  const navigate = useNavigate();
  const { setUser, init } = useAuth(); 

  useEffect(() => {
    (async () => {
      try {
        await adminLogout();         
      } catch {}
      setUser(null);                 
      await init?.();                
      sessionStorage.removeItem("adminUser");
      navigate("/login", { replace: true });
    })();
  }, [navigate, setUser, init]);

  return null;
}
