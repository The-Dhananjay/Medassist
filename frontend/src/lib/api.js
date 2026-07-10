import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const AUTH_REFRESH_EXCLUSIONS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/verify-reset-otp",
  "/auth/reset-password",
  "/auth/resend-reset-otp",
  "/auth/refresh",
];

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let refreshPromise = null;

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

function shouldAttachCsrf(method) {
  return ["post", "put", "patch", "delete"].includes((method || "get").toLowerCase());
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", {}, { skipAuthRefresh: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (!config.headers) config.headers = {};
  if (shouldAttachCsrf(config.method)) {
    const csrfToken = readCookie("csrf_token");
    if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const response = error?.response;
    const config = error?.config;
    if (!response || !config) throw error;

    const requestUrl = config.url || "";
    const excluded = AUTH_REFRESH_EXCLUSIONS.some((path) => requestUrl.includes(path));
    const canRetry =
      response.status === 401 && !config._retry && !config.skipAuthRefresh && !excluded;

    if (!canRetry) throw error;

    config._retry = true;
    await refreshSession();
    return api(config);
  }
);

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail != null) {
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((entry) => (entry && typeof entry.msg === "string" ? entry.msg : JSON.stringify(entry)))
        .filter(Boolean)
        .join(" ");
    }
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
  }

  const status = err?.response?.status;
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that yet.";
  if (status === 404) return "We could not find what you were looking for.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on the server. Please try again.";
  return err?.message || "Something went wrong.";
}

export default api;
