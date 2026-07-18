import type { GastoItem } from "@/types/gasto-item";

/** Remove acentos e baixa a caixa, para comparação de termos. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Categoria inferida a partir do nome do estabelecimento. É uma heurística:
 * a fatura não guarda categoria por transação, então classificamos pelo texto.
 * A chave corresponde a uma tradução em `faturaDetalhe.categorias.<key>`.
 */
const REGRAS_CATEGORIA: { key: string; termos: string[] }[] = [
  {
    key: "mercado",
    termos: [
      "mercado", "supermerc", "atacad", "carrefour", "pao de acucar",
      "assai", "extra", "hortifruti", "sacolao", "armazem", "emporio",
    ],
  },
  {
    key: "alimentacao",
    termos: [
      "ifood", "rappi", "restaurante", "lanchon", "burger", "mc donalds",
      "mcdonalds", "bk ", "pizz", "padaria", "cafe", "coffee", "starbucks",
      "bar ", "açai", "acai", "sorvet", "doceria", "food",
    ],
  },
  {
    key: "transporte",
    termos: [
      "uber", "99app", "99 ", "cabify", "posto", "shell", "ipiranga",
      "combust", "estacion", "metro", "buser", "blablacar", "auto posto",
    ],
  },
  {
    key: "assinaturas",
    termos: [
      "netflix", "spotify", "prime", "disney", "hbo", "max ", "youtube",
      "google", "apple.com", "icloud", "playstation", "xbox", "deezer",
      "amazon prime", "claro tv",
    ],
  },
  {
    key: "comprasOnline",
    termos: [
      "amazon", "mercado livre", "mercadolivre", "shopee", "aliexpress",
      "magazine", "magalu", "americanas", "shein",
    ],
  },
  {
    key: "saude",
    termos: [
      "farmacia", "drogaria", "drogasil", "pacheco", "raia", "hospital",
      "clinica", "laborator", "lab ", "odonto", "dentista", "psico",
    ],
  },
  {
    key: "vestuario",
    termos: [
      "renner", "riachuelo", "c&a", "zara", "nike", "adidas", "centauro",
      "calcad", "moda", "boutique",
    ],
  },
  {
    key: "casa",
    termos: ["leroy", "telhanorte", "casas bahia", "casa", "construc", "movei"],
  },
  {
    key: "servicos",
    termos: [
      "vivo", "claro", "tim ", "oi ", "net ", "energia", "enel", "cemig",
      "sabesp", "agua", "internet",
    ],
  },
];

export function inferirCategoria(nome: string): string {
  const n = normalizar(nome);
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.termos.some((termo) => n.includes(termo))) return regra.key;
  }
  return "outros";
}

export interface ItemAnalisado {
  id: number;
  nome: string;
  valor: number;
  data: string | null;
  categoria: string;
  pessoaId: number | null;
  pessoaNome: string | null;
  pessoaCor: string | null;
}

export interface GrupoCategoria {
  key: string;
  total: number;
  count: number;
  percentual: number;
}

export interface BucketPeriodo {
  data: string | null;
  total: number;
  count: number;
}

/** Total gasto por pessoa ("valores a calcular"). pessoaId null = não atribuído. */
export interface GrupoPessoa {
  pessoaId: number | null;
  nome: string | null;
  cor: string | null;
  total: number;
  count: number;
  percentual: number;
}

/**
 * Filtro de pessoa aplicado à análise:
 * - `undefined` = todas as pessoas;
 * - `null` = apenas itens não atribuídos;
 * - `number` = apenas a pessoa com esse id.
 */
export type FiltroPessoa = number | null | undefined;

export interface FaturaAnalise {
  totalBruto: number;
  totalEstornos: number;
  totalLiquido: number;
  qtdTotal: number;
  qtdGastos: number;
  qtdEstornos: number;
  media: number;
  maior: ItemAnalisado | null;
  menor: ItemAnalisado | null;
  porCategoria: GrupoCategoria[];
  ranking: ItemAnalisado[];
  estornos: ItemAnalisado[];
  porPeriodo: BucketPeriodo[];
  /** Sempre calculado sobre todos os itens (não sofre o filtro de pessoa). */
  porPessoa: GrupoPessoa[];
}

/**
 * Calcula todas as análises de uma fatura/gasto a partir dos seus itens.
 * Convenção: valor positivo = gasto; valor negativo = estorno/crédito.
 *
 * `estornosExcluidos` lista ids de estornos que o usuário optou por NÃO
 * abater do total (ficam de fora de `totalEstornos`/`totalLiquido`), mas
 * continuam aparecendo na lista de estornos para poder reincluí-los.
 */
export function analisarFatura(
  itens: GastoItem[],
  filtroPessoa?: FiltroPessoa,
  estornosExcluidos?: ReadonlySet<number>,
): FaturaAnalise {
  const todos: ItemAnalisado[] = itens.map((item) => ({
    id: item.id,
    nome: item.nome,
    valor: Number(item.valor),
    data: item.data_transacao,
    categoria: inferirCategoria(item.nome),
    pessoaId: item.pessoa_id ?? null,
    pessoaNome: item.pessoa?.nome ?? null,
    pessoaCor: item.pessoa?.cor ?? null,
  }));

  // "Valores a calcular por pessoa": sempre sobre TODOS os itens (gastos),
  // independentemente do filtro de pessoa aplicado aos demais cálculos.
  const porPessoa = agruparPorPessoa(todos.filter((i) => i.valor > 0));

  // Aplica o filtro de pessoa ao restante da análise.
  const analisados =
    filtroPessoa === undefined
      ? todos
      : todos.filter((i) => i.pessoaId === filtroPessoa);

  const gastos = analisados.filter((i) => i.valor > 0);
  const estornos = analisados.filter((i) => i.valor < 0);

  // Estornos efetivamente considerados no cálculo (os não excluídos pelo usuário).
  const estornosConsiderados = estornosExcluidos
    ? estornos.filter((i) => !estornosExcluidos.has(i.id))
    : estornos;

  const totalBruto = gastos.reduce((s, i) => s + i.valor, 0);
  const totalEstornos = estornosConsiderados.reduce((s, i) => s - i.valor, 0); // valor abs
  const totalLiquido = totalBruto - totalEstornos;

  const ranking = [...gastos].sort((a, b) => b.valor - a.valor);
  const estornosOrdenados = [...estornos].sort((a, b) => a.valor - b.valor);

  const media = gastos.length ? totalBruto / gastos.length : 0;
  const maior = ranking[0] ?? null;
  const menor = ranking.length ? ranking[ranking.length - 1] : null;

  // Agrupamento por categoria inferida (somente gastos).
  const porCategoriaMap = new Map<string, GrupoCategoria>();
  for (const item of gastos) {
    const atual = porCategoriaMap.get(item.categoria) ?? {
      key: item.categoria,
      total: 0,
      count: 0,
      percentual: 0,
    };
    atual.total += item.valor;
    atual.count += 1;
    porCategoriaMap.set(item.categoria, atual);
  }
  const porCategoria = [...porCategoriaMap.values()]
    .map((g) => ({
      ...g,
      percentual: totalBruto ? (g.total / totalBruto) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Agrupamento por data (somente gastos); itens sem data ficam por último.
  const porPeriodoMap = new Map<string, BucketPeriodo>();
  for (const item of gastos) {
    const chave = item.data ?? "__sem_data__";
    const atual = porPeriodoMap.get(chave) ?? {
      data: item.data,
      total: 0,
      count: 0,
    };
    atual.total += item.valor;
    atual.count += 1;
    porPeriodoMap.set(chave, atual);
  }
  const porPeriodo = [...porPeriodoMap.values()].sort((a, b) => {
    if (a.data === null) return 1;
    if (b.data === null) return -1;
    return a.data.localeCompare(b.data);
  });

  return {
    totalBruto,
    totalEstornos,
    totalLiquido,
    qtdTotal: analisados.length,
    qtdGastos: gastos.length,
    qtdEstornos: estornos.length,
    media,
    maior,
    menor,
    porCategoria,
    ranking,
    estornos: estornosOrdenados,
    porPeriodo,
    porPessoa,
  };
}

/**
 * Agrupa itens (gastos) por pessoa, incluindo um bucket "não atribuído"
 * (pessoaId null). Ordena por total desc, mas mantém "não atribuído" por último.
 */
function agruparPorPessoa(gastos: ItemAnalisado[]): GrupoPessoa[] {
  const total = gastos.reduce((s, i) => s + i.valor, 0);
  const mapa = new Map<number | null, GrupoPessoa>();

  for (const item of gastos) {
    const atual = mapa.get(item.pessoaId) ?? {
      pessoaId: item.pessoaId,
      nome: item.pessoaNome,
      cor: item.pessoaCor,
      total: 0,
      count: 0,
      percentual: 0,
    };
    atual.total += item.valor;
    atual.count += 1;
    mapa.set(item.pessoaId, atual);
  }

  return [...mapa.values()]
    .map((g) => ({
      ...g,
      percentual: total ? (g.total / total) * 100 : 0,
    }))
    .sort((a, b) => {
      if (a.pessoaId === null) return 1;
      if (b.pessoaId === null) return -1;
      return b.total - a.total;
    });
}
