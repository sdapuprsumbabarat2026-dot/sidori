import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("sidori_token"),
  loading: !!localStorage.getItem("sidori_token"),

  login: async (email, password) => {
    const { data, error } = await supabase.rpc("auth_login", {
      p_email: email,
      p_password: password,
    });

    if (error || !data?.success) {
      return data?.error || error?.message || "Login gagal";
    }

    localStorage.setItem("sidori_token", data.token);
    set({ user: data.user, token: data.token });
    return null;
  },

  logout: async () => {
    localStorage.removeItem("sidori_token");
    set({ user: null, token: null });
  },

  checkSession: async () => {
    const token = localStorage.getItem("sidori_token");
    if (!token) {
      set({ loading: false });
      return;
    }

    const { data, error } = await supabase.rpc("auth_check_session", {
      p_token: token,
    });

    if (error || !data?.success) {
      localStorage.removeItem("sidori_token");
      set({ user: null, token: null, loading: false });
      return;
    }

    set({ user: data.user, loading: false });
  },
}));
