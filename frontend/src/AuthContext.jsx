import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, settingsApi } from "./api";
import { loginPath } from "./utils";

const AuthContext = createContext(null);

async function applyLanguage() {
  try {
    const { data } = await settingsApi.get();
    if (data?.language) document.documentElement.lang = data.language;
  } catch {
    /* guest or missing settings */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const token = localStorage.getItem("ig_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
      await applyLanguage();
      return data;
    } catch {
      localStorage.removeItem("ig_token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    const onLost = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("ig-logout", onLost);
    return () => window.removeEventListener("ig-logout", onLost);
  }, []);

  async function login(username, password) {
    const { data } = await authApi.login({ username, password });
    localStorage.setItem("ig_token", data.access_token);
    setUser(data.user);
    await applyLanguage();
    return data.user;
  }

  async function signup(payload) {
    const { data } = await authApi.signup(payload);
    localStorage.setItem("ig_token", data.access_token);
    setUser(data.user);
    await applyLanguage();
    return data.user;
  }

  function logout() {
    localStorage.removeItem("ig_token");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshMe, setUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return (e) => {
    if (user) return true;
    e?.preventDefault?.();
    nav(loginPath(loc.pathname + loc.search));
    return false;
  };
}
