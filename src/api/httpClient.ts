import axios from "axios";
import { queryClient } from "./queryClient";

const FALLBACK_API_URL = "http://localhost:3000";

const resolveApiUrl = () => {
  const raw = String(import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return FALLBACK_API_URL;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return FALLBACK_API_URL;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK_API_URL;
  }
};

export const API_BASE_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleInvalidateAll = () => {
  if (invalidateTimer) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    queryClient.invalidateQueries();
  }, 50);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || "").toLowerCase();
    if (MUTATING_METHODS.has(method)) {
      scheduleInvalidateAll();
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("tomstore_user");
    }
    return Promise.reject(error);
  },
);
