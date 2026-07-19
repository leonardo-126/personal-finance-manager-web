import type { FaturaAnalise, ItemAnalisado } from "./faturaAnalise";
import { formatDate } from "./format";

/** Função de tradução (i18next) restrita ao que usamos aqui. */
type Traduzir = (key: string, opts?: Record<string, unknown>) => string;

interface ExportarParams {
  analise: FaturaAnalise;
  faturaNome: string;
  /** Nome da pessoa filtrada, ou `null` para "todas as pessoas". */
  pessoaFiltroNome: string | null;
  t: Traduzir;
}

/** Formato de célula monetária (o Excel aplica os separadores do idioma do usuário). */
const MOEDA_FMT = '"R$" #,##0.00';
const CINZA_CLARO = "FFF1F5F9";
const CINZA_BORDA = "FFCBD5E1";

/** Remove caracteres inválidos para nome de arquivo. */
function sanitizar(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim() || "fatura";
}

function baixar(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Gera e baixa um .xlsx da fatura já respeitando o filtro por pessoa aplicado
 * na tela (a `analise` recebida é a filtrada). Uma aba com: resumo no topo e a
 * tabela de transações (gastos + estornos) abaixo.
 */
export async function exportarFaturaXlsx({
  analise,
  faturaNome,
  pessoaFiltroNome,
  t,
}: ExportarParams): Promise<void> {
  // Carrega o ExcelJS sob demanda (fora do bundle inicial).
  const { Workbook } = await import("exceljs");

  const wb = new Workbook();
  wb.creator = "Personal Finance Manager";
  wb.created = new Date();

  const ws = wb.addWorksheet(t("faturaDetalhe.exportar.aba"));
  ws.columns = [
    { width: 5 }, // #
    { width: 42 }, // descrição
    { width: 12 }, // data
    { width: 18 }, // categoria
    { width: 22 }, // pessoa
    { width: 15 }, // valor
  ];

  // --- Cabeçalho / resumo ---
  const titulo = ws.addRow([faturaNome]);
  titulo.getCell(1).font = { bold: true, size: 14 };

  const filtroRow = ws.addRow([
    t("faturaDetalhe.exportar.filtro"),
    pessoaFiltroNome ?? t("faturaDetalhe.pessoas.todos"),
  ]);
  filtroRow.getCell(1).font = { bold: true };

  ws.addRow([]);

  const resumo: Array<[string, number]> = [
    [t("faturaDetalhe.resumo.bruto"), analise.totalBruto],
    [t("faturaDetalhe.resumo.estornos"), -analise.totalEstornos],
    [t("faturaDetalhe.resumo.liquido"), analise.totalLiquido],
  ];
  for (const [label, valor] of resumo) {
    const r = ws.addRow([label, valor]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).numFmt = MOEDA_FMT;
  }
  ws.addRow([t("faturaDetalhe.resumo.transacoes"), analise.qtdTotal]);

  ws.addRow([]);

  // --- Cabeçalho da tabela ---
  const head = ws.addRow([
    "#",
    t("faturaDetalhe.ranking.descricao"),
    t("faturaDetalhe.ranking.data"),
    t("faturaDetalhe.exportar.categoria"),
    t("faturaDetalhe.ranking.pessoa"),
    t("faturaDetalhe.ranking.valor"),
  ]);
  head.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: CINZA_CLARO },
    };
    cell.border = { bottom: { style: "thin", color: { argb: CINZA_BORDA } } };
  });

  // --- Transações: gastos (ranking, desc) seguidos dos estornos ---
  const itens: ItemAnalisado[] = [...analise.ranking, ...analise.estornos];
  itens.forEach((item, i) => {
    const linha = ws.addRow([
      i + 1,
      item.nome,
      item.data ? formatDate(item.data) : "—",
      t(`faturaDetalhe.categorias.${item.categoria}`),
      item.pessoaNome ?? t("faturaDetalhe.pessoas.semPessoa"),
      item.valor,
    ]);
    linha.getCell(6).numFmt = MOEDA_FMT;
  });

  // --- Total líquido (mesma conta da tela) ---
  const totalRow = ws.addRow([
    "",
    "",
    "",
    "",
    t("faturaDetalhe.resumo.liquido"),
    analise.totalLiquido,
  ]);
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(6).font = { bold: true };
  totalRow.getCell(6).numFmt = MOEDA_FMT;
  totalRow.getCell(6).border = {
    top: { style: "thin", color: { argb: CINZA_BORDA } },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const sufixo = pessoaFiltroNome ? ` - ${pessoaFiltroNome}` : "";
  baixar(blob, `${sanitizar(faturaNome + sufixo)}.xlsx`);
}
