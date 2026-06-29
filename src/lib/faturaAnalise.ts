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
}

/**
 * Calcula todas as análises de uma fatura/gasto a partir dos seus itens.
 * Convenção: valor positivo = gasto; valor negativo = estorno/crédito.
 */
export function analisarFatura(itens: GastoItem[]): FaturaAnalise {
  const analisados: ItemAnalisado[] = itens.map((item) => ({
    id: item.id,
    nome: item.nome,
    valor: Number(item.valor),
    data: item.data_transacao,
    categoria: inferirCategoria(item.nome),
  }));

  const gastos = analisados.filter((i) => i.valor > 0);
  const estornos = analisados.filter((i) => i.valor < 0);

  const totalBruto = gastos.reduce((s, i) => s + i.valor, 0);
  const totalEstornos = estornos.reduce((s, i) => s - i.valor, 0); // valor abs
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
  };
}
