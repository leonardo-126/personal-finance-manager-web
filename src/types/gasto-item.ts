/** Pessoa resumida embutida no item (quem usou o cartão). */
export interface GastoItemPessoa {
  id: number;
  nome: string;
  cor: string | null;
}

export interface GastoItem {
  id: number;
  gasto_id: number;
  nome: string;
  valor: string;
  motivo: string | null;
  data_transacao: string | null;
  pessoa_id: number | null;
  pessoa?: GastoItemPessoa | null;
  created_at: string;
  updated_at: string;
}

export interface GastoItemInput {
  gasto_id: number;
  nome: string;
  valor: number;
  motivo?: string | null;
}
