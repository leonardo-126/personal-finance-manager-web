import { api } from "@/lib/api";
import type { LoginCredentials, SignupCredentials, User } from "@/types/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const SERVER_URL = API_BASE.replace(/\/api\/?$/, "");

type Wrapped<T> = { data: T };
const unwrap = <T>(res: Wrapped<T>): T => res.data;

export const authService = {
  csrfCookie: () =>
    fetch(`${SERVER_URL}/sanctum/csrf-cookie`, { credentials: "include" }),

  login: (credentials: LoginCredentials) =>
    api.post<Wrapped<User>>("/auth/login", credentials).then(unwrap),

  signup: (credentials: SignupCredentials) =>
    api.post<Wrapped<User>>("/auth/register", credentials).then(unwrap),

  me: () => api.get<Wrapped<User>>("/auth/me").then(unwrap),

  logout: () => api.post<void>("/auth/logout"),
};
