import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, token, loading, login, logout } = useAuthStore();
  return { user, token, loading, login, logout };
}
