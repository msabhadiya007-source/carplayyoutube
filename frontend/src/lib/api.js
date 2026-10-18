import axios from "axios";

const API_BASE = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let onAuthLost = () => {};
export function setAuthLostHandler(fn) {
  onAuthLost = fn;
}

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

api.interceptors.request.use((config) => {
  const token = accessToken;
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error.config;
    if (!cfg) return Promise.reject(error);

    const url = cfg.url || "";
    const noRetry = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].includes(url);

    if (error.response?.status !== 401 || cfg._retried || noRetry) {
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = api.post("/auth/refresh").then((res) => {
          const nextAccess = res?.data?.access_token;
          if (nextAccess) setAccessToken(nextAccess);
          return res;
        }).finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;
      cfg._retried = true;
      return api.request({ ...cfg, _retried: true });
    } catch (refreshError) {
      clearAccessToken();
      onAuthLost();
      return Promise.reject(refreshError);
    }
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg.replace(/^Value error, /, "") : JSON.stringify(e)))
      .join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
