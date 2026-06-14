export interface Gasto {
  id: number;
  user_id: number;
  caixa_id: number;
  categoria_id: number;
  valor_total: string;
  descricao: string | null;
  data_gasto: string;
  created_at: string;
  updated_at: string;
}

export interface GastoInput {
  caixa_id: number;
  categoria_id: number;
  valor_total: number;
  descricao?: string | null;
  data_gasto: string;
}
