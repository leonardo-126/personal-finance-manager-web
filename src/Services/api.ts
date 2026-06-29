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
import type {
  MovimentacaoCaixa,
  MovimentacaoCaixaInput,
} from "@/types/movimentacao";
import type {
  CategoriaGasto,
  CategoriaGastoInput,
} from "@/types/categoria-gasto";
import type { Gasto, GastoComItens, GastoInput } from "@/types/gasto";
import type { GastoItem, GastoItemInput } from "@/types/gasto-item";
import type {
  FaturaImportada,
  FaturaPreview,
  ImportarFaturaInput,
} from "@/types/fatura";

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

  remove: (id: number) => api.del<void>(`/fontes-renda/${id}`),
};

export const rendaService = {
  list: () => api.get<Wrapped<Renda[]>>("/rendas").then(unwrap),

  create: (input: RendaInput) =>
    api.post<Wrapped<Renda>>("/rendas", input).then(unwrap),

  update: (id: number, input: RendaInput) =>
    api.put<Wrapped<Renda>>(`/rendas/${id}`, input).then(unwrap),

  remove: (id: number) => api.del<void>(`/rendas/${id}`),
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

  remove: (id: number) => api.del<void>(`/caixas-financeiras/${id}`),
};

export const movimentacaoService = {
  list: () =>
    api.get<Wrapped<MovimentacaoCaixa[]>>("/movimentacoes-caixas").then(unwrap),

  create: (input: MovimentacaoCaixaInput) =>
    api
      .post<Wrapped<MovimentacaoCaixa>>("/movimentacoes-caixas", input)
      .then(unwrap),

  update: (id: number, input: MovimentacaoCaixaInput) =>
    api
      .put<Wrapped<MovimentacaoCaixa>>(`/movimentacoes-caixas/${id}`, input)
      .then(unwrap),

  remove: (id: number) => api.del<void>(`/movimentacoes-caixas/${id}`),
};

export const categoriaGastoService = {
  list: () =>
    api.get<Wrapped<CategoriaGasto[]>>("/categorias-gastos").then(unwrap),

  create: (input: CategoriaGastoInput) =>
    api.post<Wrapped<CategoriaGasto>>("/categorias-gastos", input).then(unwrap),

  update: (id: number, input: CategoriaGastoInput) =>
    api
      .put<Wrapped<CategoriaGasto>>(`/categorias-gastos/${id}`, input)
      .then(unwrap),

  remove: (id: number) => api.del<void>(`/categorias-gastos/${id}`),
};

export const gastoService = {
  list: () => api.get<Wrapped<Gasto[]>>("/gastos").then(unwrap),

  /** Busca um gasto/fatura com seus itens carregados, para análise. */
  show: (id: number) =>
    api.get<Wrapped<GastoComItens>>(`/gastos/${id}`).then(unwrap),

  create: (input: GastoInput) =>
    api.post<Wrapped<Gasto>>("/gastos", input).then(unwrap),

  update: (id: number, input: GastoInput) =>
    api.put<Wrapped<Gasto>>(`/gastos/${id}`, input).then(unwrap),

  remove: (id: number) => api.del<void>(`/gastos/${id}`),
};

export const faturaService = {
  /** Lê o arquivo da fatura e devolve as transações encontradas, sem persistir. */
  preview: (arquivo: File) => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    return api
      .post<Wrapped<FaturaPreview>>("/faturas/preview", form)
      .then(unwrap);
  },

  /** Importa a fatura: cria um gasto com um item por transação do arquivo. */
  importar: (input: ImportarFaturaInput) => {
    const form = new FormData();
    form.append("arquivo", input.arquivo);
    form.append("caixa_id", String(input.caixa_id));
    form.append("categoria_id", String(input.categoria_id));
    if (input.descricao) form.append("descricao", input.descricao);
    if (input.data_gasto) form.append("data_gasto", input.data_gasto);
    return api
      .post<Wrapped<FaturaImportada>>("/faturas/importar", form)
      .then(unwrap);
  },
};

export const gastoItemService = {
  list: () => api.get<Wrapped<GastoItem[]>>("/gastos-itens").then(unwrap),

  create: (input: GastoItemInput) =>
    api.post<Wrapped<GastoItem>>("/gastos-itens", input).then(unwrap),

  update: (id: number, input: GastoItemInput) =>
    api.put<Wrapped<GastoItem>>(`/gastos-itens/${id}`, input).then(unwrap),

  remove: (id: number) => api.del<void>(`/gastos-itens/${id}`),
};
