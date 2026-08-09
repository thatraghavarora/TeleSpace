import { create } from "zustand";
import { setAuthToken } from "../services/api.js";

const storedToken = localStorage.getItem("telegram_auth_token");
let storedUser = null;
let storedPending = null;

try {
  const rawUser = localStorage.getItem("telegram_auth_user");
  if (rawUser) storedUser = JSON.parse(rawUser);
} catch {
  localStorage.removeItem("telegram_auth_user");
}

try {
  const rawPending = sessionStorage.getItem("telegram_auth_pending");
  if (rawPending) storedPending = JSON.parse(rawPending);
} catch {
  sessionStorage.removeItem("telegram_auth_pending");
}

if (storedToken) {
  setAuthToken(storedToken);
}

export const useAuthStore = create((set) => ({
  token: storedToken,
  user: storedUser,
  pending: storedPending,
  setSession: ({ token, user }) => {
    localStorage.setItem("telegram_auth_token", token);
    localStorage.setItem("telegram_auth_user", JSON.stringify(user));
    sessionStorage.removeItem("telegram_auth_pending");
    setAuthToken(token);
    set({ token, user, pending: null });
  },
  setPending: (pending) => {
    sessionStorage.setItem("telegram_auth_pending", JSON.stringify(pending));
    set({ pending });
  },
  logout: () => {
    localStorage.removeItem("telegram_auth_token");
    localStorage.removeItem("telegram_auth_user");
    sessionStorage.removeItem("telegram_auth_pending");
    setAuthToken(null);
    set({ token: null, user: null, pending: null });
  }
}));
