export interface Renda {
  id: number;
  fonte_renda_id: number;
  valor: string;
  data_recebimento: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface RendaInput {
  fonte_renda_id: number;
  valor: number;
  data_recebimento: string;
  descricao?: string | null;
}
