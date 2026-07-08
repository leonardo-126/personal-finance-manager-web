export interface Gasto {
  id: number;
  user_id: number;
  caixa_id: number;
  categoria_id: number;
  valor_total: string;
  descricao: string | null;
  is_fatura: boolean;
  /** Presente apenas na listagem de faturas (GET /faturas). */
  itens_count?: number;
  data_gasto: string;
  created_at: string;
  updated_at: string;
}

/** Gasto com seus itens carregados (usado no detalhe/análise da fatura). */
export interface GastoComItens extends Gasto {
  itens: import("./gasto-item").GastoItem[];
}

export interface GastoInput {
  caixa_id: number;
  categoria_id: number;
  valor_total: number;
  descricao?: string | null;
  data_gasto: string;
}
