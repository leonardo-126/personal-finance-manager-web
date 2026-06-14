export interface CategoriaGasto {
  id: number;
  user_id: number;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface CategoriaGastoInput {
  nome: string;
}
