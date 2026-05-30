import axios from "axios";

// Resolve the backend base URL. In dev we default to a RELATIVE path so every
// request goes through the Vite dev proxy (vite.config.js proxies /api ->
// http://localhost:8000). That keeps API calls same-origin, so they work
// regardless of how the app is opened, localhost vs 127.0.0.1, or behind
// WSL / VS Code port-forwarding, and avoids CORS entirely.
// In production, set VITE_BACKEND_URL to the absolute API origin.
export const BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "/api/v1";

// Network timeouts. axios has NO timeout by default, so on a slow/flaky
// connection a request hangs forever and leaves a spinner stuck (confirmed in
// testing). Bound every call so it fails into the UI's error state instead.
// AI endpoints make real Gemini round-trips and legitimately take longer, so
// they get a more generous bound, call sites pass `{ timeout: AI_TIMEOUT }`.
export const API_TIMEOUT = 15000; // 15s, content / CRUD calls
export const AI_TIMEOUT = 45000; // 45s, AI endpoints (search / plan / concierge)

// Apply the default to every plain `axios` call (content GETs/POSTs + useFetch).
// Per-request `timeout` still overrides this (the AI calls do). Importing this
// module anywhere a request is made ensures the default is set before it fires.
axios.defaults.timeout = API_TIMEOUT;
