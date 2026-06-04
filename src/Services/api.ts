import { api } from "@/lib/api";
import type { LoginCredentials, SignupCredentials, User } from "@/types/auth";
import type { Profile, ProfileInput } from "@/types/profile";
import type {
  CaixaFinanceira,
  CaixaFinanceiraInput,
} from "@/types/caixa";
import type {
  CreateFonteRendaInput,
  FonteRenda,
  UpdateFonteRendaInput,
} from "@/types/fonte-renda";
import type { Renda, RendaInput } from "@/types/renda";

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

export const fonteRendaService = {
  list: () => api.get<Wrapped<FonteRenda[]>>("/fontes-renda").then(unwrap),

  create: (input: CreateFonteRendaInput) =>
    api.post<Wrapped<FonteRenda>>("/fontes-renda", input).then(unwrap),

  update: (id: number, input: UpdateFonteRendaInput) =>
    api.put<Wrapped<FonteRenda>>(`/fontes-renda/${id}`, input).then(unwrap),
};

export const rendaService = {
  list: () => api.get<Wrapped<Renda[]>>("/rendas").then(unwrap),

  create: (input: RendaInput) =>
    api.post<Wrapped<Renda>>("/rendas", input).then(unwrap),

  update: (id: number, input: RendaInput) =>
    api.put<Wrapped<Renda>>(`/rendas/${id}`, input).then(unwrap),
};

export const caixaService = {
  list: () =>
    api.get<Wrapped<CaixaFinanceira[]>>("/caixas-financeiras").then(unwrap),

  create: (input: CaixaFinanceiraInput) =>
    api.post<Wrapped<CaixaFinanceira>>("/caixas-financeiras", input).then(unwrap),

  update: (id: number, input: CaixaFinanceiraInput) =>
    api
      .put<Wrapped<CaixaFinanceira>>(`/caixas-financeiras/${id}`, input)
      .then(unwrap),
};
