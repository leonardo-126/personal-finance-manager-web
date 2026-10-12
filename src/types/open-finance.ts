export type StatusConexao =
  | "atualizando"
  | "ativa"
  | "erro_login"
  | "desatualizada"
  | "aguardando_usuario";

export type TipoConta = "corrente" | "poupanca" | "cartao" | "outra";

export type StatusTransacao = "pendente" | "importada" | "ignorada";

/** Conta (corrente, cartão...) dentro de uma conexão. O número já vem mascarado. */
export interface ContaOpenFinance {
  id: number;
  conexao_id: number;
  caixa_id: number | null;
  tipo: TipoConta;
  nome: string;
  numero: string | null;
  saldo: string | null;
  moeda: string;
  transacoes_pendentes?: number;
}

/** Consentimento do usuário em uma instituição, mantido pelo agregador. */
export interface ConexaoOpenFinance {
  id: number;
  provider: string;
  instituicao_nome: string | null;
  instituicao_logo: string | null;
  status: StatusConexao;
  erro: string | null;
  consentimento_expira_em: string | null;
  ultimo_sync_em: string | null;
  contas: ContaOpenFinance[];
  created_at: string;
}

/** Transação recebida do banco, aguardando conciliação. Valor sempre positivo. */
export interface TransacaoOpenFinance {
  id: number;
  conta_id: number;
  data: string;
  descricao: string;
  valor: string;
  tipo: "debito" | "credito";
  categoria_externa: string | null;
  confirmada: boolean;
  status: StatusTransacao;
  gasto_item_id: number | null;
}

export interface ConnectToken {
  provider: string;
  token: string;
}

export interface PaginaTransacoes {
  data: TransacaoOpenFinance[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface ImportarTransacoesInput {
  transacao_ids: number[];
  caixa_id?: number | null;
  categoria_id: number;
  descricao?: string | null;
}
