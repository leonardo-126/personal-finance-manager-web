export interface CaixaFinanceira {
  id: number;
  user_id: number;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaixaFinanceiraInput {
  nome: string;
  descricao?: string | null;
}
