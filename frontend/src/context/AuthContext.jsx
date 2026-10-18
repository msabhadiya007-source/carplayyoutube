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
    try {
      await api.post("/auth/logout");
} finally {
  clearAccessToken();
  clearSearchCache();
  setUser(false);
}

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
