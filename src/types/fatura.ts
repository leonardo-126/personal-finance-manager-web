import type { GastoItem } from "@/types/gasto-item";

/** Uma transação lida do arquivo da fatura (ainda não persistida). */
export interface FaturaTransacao {
  data: string | null;
  descricao: string;
  valor: number;
}

/** Resultado da pré-visualização: transações lidas do arquivo, sem salvar. */
export interface FaturaPreview {
  transacoes: FaturaTransacao[];
  total: number;
  quantidade: number;
}

/** Fatura importada: um gasto com um item por transação. */
export interface FaturaImportada {
  id: number;
  user_id: number;
  caixa_id: number;
  categoria_id: number;
  valor_total: string;
  descricao: string | null;
  data_gasto: string;
  itens: GastoItem[];
  created_at: string;
  updated_at: string;
}

export interface ImportarFaturaInput {
  arquivo: File;
  caixa_id: number;
  categoria_id: number;
  descricao?: string | null;
  data_gasto?: string | null;
}
