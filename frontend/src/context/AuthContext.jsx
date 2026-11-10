import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, refreshSession, setAuthLostHandler, setAccessToken, clearAccessToken } from "../lib/api";
import { clearSearchCache } from "../lib/youtube";

const AuthContext = createContext(null);

// user: null = checking, false = signed out, object = signed in
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setAuthLostHandler(() => {
      clearAccessToken();
      setUser(false);
    });
    let active = true;

    const restoreSession = async () => {
      // Restore via the persistent HttpOnly refresh cookie after browser/app restart.
      // Passwords are never persisted in JavaScript-accessible storage.
      try { await refreshSession(); } catch {
        // If no refresh cookie exists, /me may still succeed with a valid access cookie.
      }
      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data);
      } catch {
        if (active) { clearAccessToken(); setUser(false); }
      }
    };

    restoreSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    const { data } = await api.post("/auth/login", { email, password, remember_me: rememberMe });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); }
    finally {
      clearAccessToken();
      clearSearchCache();
      setUser(false);
    }
  }, []);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
