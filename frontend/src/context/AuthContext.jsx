import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  api,
  setAuthLostHandler,
  setAccessToken,
  clearAccessToken,
} from "../lib/api";

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
      // Access tokens are short-lived. On every app start, rotate the
      // persistent refresh cookie first so returning users stay signed in.
      try {
        const { data: refreshed } = await api.post("/auth/refresh");
        if (refreshed?.access_token) setAccessToken(refreshed.access_token);
      } catch {
        // A refresh cookie may be absent/expired while the access cookie
        // is still valid, so still try /me before declaring the user signed out.
      }

      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data);
      } catch {
        if (active) {
          clearAccessToken();
          setUser(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
      remember_me: rememberMe,
    });

    setAccessToken(data.access_token);
    setUser(data.user);

    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      name,
    });

    setAccessToken(data.access_token);
    setUser(data.user);

    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAccessToken();
      clearSearchCache();
      setUser(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
