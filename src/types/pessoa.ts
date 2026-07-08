export interface Pessoa {
  id: number;
  user_id: number;
  nome: string;
  cor: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface PessoaInput {
  nome: string;
  cor?: string | null;
  email?: string | null;
}
