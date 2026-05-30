import { api } from "@/lib/api";
import type { LoginCredentials, SignupCredentials, User } from "@/types/auth";
import type { Profile, ProfileInput } from "@/types/profile";

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

function toFormData(input: ProfileInput, method?: "PUT"): FormData {
  const form = new FormData();
  if (method) form.append("_method", method);
  if (input.bio !== undefined && input.bio !== null) {
    form.append("bio", input.bio);
  }
  if (input.avatar_photo) {
    form.append("avatar_photo", input.avatar_photo);
  }
  return form;
}

export const profileService = {
  get: () => api.get<Wrapped<Profile | null>>("/profile").then(unwrap),

  create: (input: ProfileInput) =>
    api.post<Wrapped<Profile>>("/profile", toFormData(input)).then(unwrap),

  update: (input: ProfileInput) =>
    api.post<Wrapped<Profile>>("/profile", toFormData(input, "PUT")).then(unwrap),
};
