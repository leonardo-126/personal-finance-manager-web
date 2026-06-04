export type TipoFonteRenda = "salário" | "investimento" | "extra" | "outro";
export type StatusFonteRenda = "ativo" | "inativo";

export interface FonteRenda {
  id: number;
  user_id: number;
  nome: string;
  tipo: TipoFonteRenda;
  descricao: string | null;
  status: StatusFonteRenda;
  created_at: string;
  updated_at: string;
}

export interface CreateFonteRendaInput {
  nome: string;
  tipo: TipoFonteRenda;
  descricao?: string | null;
}

export interface UpdateFonteRendaInput extends CreateFonteRendaInput {
  status: StatusFonteRenda;
}
