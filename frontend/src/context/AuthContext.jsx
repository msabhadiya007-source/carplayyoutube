import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthLostHandler, setAccessToken, clearAccessToken } from "../lib/api";
const AuthContext = createContext(null);

// user: null = checking, false = signed out, object = signed in
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setAuthLostHandler(() => setUser(false));
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSearchCache();
      setUser(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
