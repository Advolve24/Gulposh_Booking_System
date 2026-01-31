import { useAuth } from "@/store/authStore";

export const forceLogout = async () => {
  const { logout } = useAuth.getState();
  await logout();
  window.location.replace("/");
};
