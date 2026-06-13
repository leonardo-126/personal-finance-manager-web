export type MovimentacaoTipo = "entrada" | "saida" | "transferencia";

export interface MovimentacaoCaixa {
  id: number;
  user_id: number;
  caixa_id: number;
  renda_id: number | null;
  valor: string;
  tipo: MovimentacaoTipo;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoCaixaInput {
  caixa_id: number;
  renda_id?: number | null;
  valor: number;
  tipo: MovimentacaoTipo;
}
