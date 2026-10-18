import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAuthLostHandler, setAccessToken, clearAccessToken } from "../lib/api";
import { clearSearchCache } from "../lib/youtube";

const AuthContext = createContext(null);

// user: null = checking, false = signed out, object = signed in
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // when global auth is lost (refresh failed), set user to signed out
    setAuthLostHandler(() => {
      clearAccessToken();
      setUser(false);
    });

    // Try to fetch current user. If not authenticated, attempt a single refresh.
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
      })
      .catch(async () => {
        try {
          // Try a single refresh attempt to obtain a new access token and user
          const r = await api.post("/auth/refresh");
          const data = r?.data;
          if (data?.access_token) {
            setAccessToken(data.access_token);
          }
          if (data?.user) {
            setUser(data.user);
          } else {
            setUser(false);
          }
        } catch {
          setUser(false);
        }
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    // API returns { access_token, refresh_token, token_type, expires_in, user }
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    const userObj = data?.user ?? null;
    setUser(userObj);
    return userObj;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    const userObj = data?.user ?? null;
    setUser(userObj);
    return userObj;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSearchCache();
      clearAccessToken();
      setUser(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
