// Authenticated axios instance for admin (and any future logged-in) calls.
// Public pages keep using plain axios / fetch; this one attaches the JWT.
import axios from "axios";
import { BASE_URL, API_TIMEOUT } from "../utils/config";

const api = axios.create({ baseURL: BASE_URL, timeout: API_TIMEOUT });

// Attach Authorization: Bearer <token> from the stored user on every request.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  } catch (_) {
    /* ignore corrupt localStorage */
  }
  return config;
}); 

// If the token is missing/expired/invalid while inside the admin area, bounce
// to login. (Public flows don't use this instance, so they're unaffected.)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const onAdmin =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin");
    if (status === 401 && onAdmin) {
      try {
        localStorage.removeItem("user");
      } catch (_) {}
      const back = encodeURIComponent(window.location.pathname);
      window.location.assign(`/login?redirect=${back}`);
    }
    return Promise.reject(err);
  }
);

export default api;
