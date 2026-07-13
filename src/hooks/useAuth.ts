import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, token, loading, login, logout, checkSession } = useAuthStore();

  useEffect(() => {
    if (token && !user && loading) {
      checkSession();
    }
  }, []);

  return { user, token, loading, login, logout };
}
