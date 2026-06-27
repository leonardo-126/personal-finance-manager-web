export interface GastoItem {
  id: number;
  gasto_id: number;
  nome: string;
  valor: string;
  motivo: string | null;
  data_transacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface GastoItemInput {
  gasto_id: number;
  nome: string;
  valor: number;
  motivo?: string | null;
}
