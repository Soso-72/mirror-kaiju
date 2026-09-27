import axios, { AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export async function getUserLogin(email: string, password: string) {
  try {
    const response = await api.post("/user/login", { email, password });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string }>;
    throw new Error(err.response?.data?.message || "Login failed");
  }
}

export async function getUserProfile(token?: string | null) {
  const authToken = token ?? getStoredToken();

  if (authToken) {
    setAuthToken(authToken);
  } else {
    setAuthToken(null);
  }

  try {
    const response = await api.get("/user/profil");
    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string }>;
    throw new Error(err.response?.data?.message || "Impossible de charger le profil");
  }
}

export async function getResourceMap() {
  try {
    const response = await api.get("/resource/map");
    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string }>;
    throw new Error(err.response?.data?.message || "Impossible de charger les ressources");
  }
}