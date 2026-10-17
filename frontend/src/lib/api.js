import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

let onAuthLost = () => {};
export function setAuthLostHandler(fn) {
  onAuthLost = fn;
}

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = error.config;
    const url = cfg?.url || "";
    const noRetry = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].includes(url);
    if (error.response?.status !== 401 || !cfg || cfg._retried || noRetry) {
      return Promise.reject(error);
    }
    cfg._retried = true;
    try {
      refreshing = refreshing || api.post("/auth/refresh").finally(() => (refreshing = null));
      await refreshing;
      return api(cfg);
    } catch {
      onAuthLost();
      return Promise.reject(error);
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
