import type { GastoItem } from "./gasto-item";

/** Pessoa resumida (dona de um link / item). */
export interface FaturaSharePessoa {
  id: number;
  nome: string;
  cor: string | null;
}

/** Link de compartilhamento de uma fatura com uma pessoa (visão do dono). */
export interface FaturaShare {
  id: number;
  gasto_id: number;
  pessoa_id: number;
  token: string;
  pessoa?: FaturaSharePessoa | null;
  created_at: string;
}

/** Visão pública da fatura, acessada por token (sem login). */
export interface FaturaPublica {
  /** Quem é a pessoa dona deste link. */
  eu: FaturaSharePessoa;
  fatura: {
    id: number;
    descricao: string | null;
    data_gasto: string;
    valor_total: string | number;
    itens: GastoItem[];
  };
}
