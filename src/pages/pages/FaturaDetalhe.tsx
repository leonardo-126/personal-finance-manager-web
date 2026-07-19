import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { analisarFatura, type FaturaAnalise } from "@/lib/faturaAnalise";
import { exportarFaturaXlsx } from "@/lib/exportFatura";
import {
  gastoService,
  gastoItemService,
  pessoaService,
  faturaShareService,
} from "@/Services/api";
import type { GastoComItens } from "@/types/gasto";
import type { Pessoa } from "@/types/pessoa";
import type { FaturaShare } from "@/types/fatura-share";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart } from "recharts";
import { Check, Copy, Download, Link2, Trash2 } from "lucide-react";

interface Props {
  gastoId: number;
}

/** Cores de apoio para pessoas sem cor definida e para o bucket "não atribuído". */
const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];
const COR_SEM_PESSOA = "#94a3b8";

/** Valores especiais do Select de filtro/atribuição. */
const FILTRO_TODOS = "todos";
const FILTRO_SEM_PESSOA = "none";

export default function FaturaDetalhe({ gastoId }: Props) {
  const { t } = useTranslation();
  const [gasto, setGasto] = useState<GastoComItens | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [filtro, setFiltro] = useState<string>(FILTRO_TODOS);
  // Ids de estornos que o usuário optou por NÃO abater do total (só nesta tela).
  const [estornosExcluidos, setEstornosExcluidos] = useState<Set<number>>(
    () => new Set(),
  );
  // Links de compartilhamento existentes (um por pessoa) desta fatura.
  const [shares, setShares] = useState<FaturaShare[]>([]);
  // Feedback "copiado" temporário, por pessoa.
  const [copiadoPessoaId, setCopiadoPessoaId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      gastoService.show(gastoId),
      pessoaService.list(),
      faturaShareService.list(gastoId).catch(() => [] as FaturaShare[]),
    ])
      .then(([gastoData, pessoasData, sharesData]) => {
        if (cancelled) return;
        setGasto(gastoData);
        setPessoas(pessoasData);
        setShares(sharesData);
      })
      .catch(() => {
        if (!cancelled) setError(t("faturaDetalhe.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gastoId, t]);

  /** Monta a URL pública a partir do token do compartilhamento. */
  const urlDoShare = (token: string) =>
    `${window.location.origin}/f/${token}`;

  /** Gera (ou reaproveita) o link da pessoa e copia para a área de transferência. */
  const gerarECopiar = async (pessoaId: number) => {
    try {
      const share = await faturaShareService.create(gastoId, pessoaId);
      setShares((prev) => {
        const semDuplicar = prev.filter((s) => s.pessoa_id !== pessoaId);
        return [...semDuplicar, share];
      });
      await copiarLink(pessoaId, share.token);
    } catch {
      setError(t("faturaDetalhe.compartilhar.erro"));
    }
  };

  /** Copia o link e mostra o feedback "copiado" por alguns instantes. */
  const copiarLink = async (pessoaId: number, token: string) => {
    try {
      await navigator.clipboard.writeText(urlDoShare(token));
      setCopiadoPessoaId(pessoaId);
      window.setTimeout(() => setCopiadoPessoaId(null), 2000);
    } catch {
      // Clipboard indisponível (ex.: sem HTTPS) — silencioso.
    }
  };

  /** Revoga o link de uma pessoa (deixa de funcionar imediatamente). */
  const revogarLink = async (pessoaId: number) => {
    try {
      await faturaShareService.remove(gastoId, pessoaId);
      setShares((prev) => prev.filter((s) => s.pessoa_id !== pessoaId));
    } catch {
      setError(t("faturaDetalhe.compartilhar.erro"));
    }
  };

  // Converte o valor do Select no filtro esperado por analisarFatura.
  const filtroPessoa = useMemo(() => {
    if (filtro === FILTRO_TODOS) return undefined;
    if (filtro === FILTRO_SEM_PESSOA) return null;
    return Number(filtro);
  }, [filtro]);

  const analise = useMemo<FaturaAnalise | null>(
    () =>
      gasto
        ? analisarFatura(gasto.itens, filtroPessoa, estornosExcluidos)
        : null,
    [gasto, filtroPessoa, estornosExcluidos],
  );

  /** Exporta um .xlsx respeitando o filtro por pessoa atualmente aplicado. */
  const exportarExcel = () => {
    if (!analise || !gasto) return;
    const pessoaFiltroNome =
      filtro === FILTRO_TODOS
        ? null
        : filtro === FILTRO_SEM_PESSOA
          ? t("faturaDetalhe.pessoas.semPessoa")
          : (pessoas.find((p) => p.id === Number(filtro))?.nome ?? null);

    exportarFaturaXlsx({
      analise,
      faturaNome: gasto.descricao || t("faturaDetalhe.title"),
      pessoaFiltroNome,
      t,
    }).catch(() => setError(t("faturaDetalhe.exportar.erro")));
  };

  /** Inclui/exclui um estorno do cálculo do total líquido (apenas nesta tela). */
  const toggleEstorno = (itemId: number) => {
    setEstornosExcluidos((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(itemId)) proximo.delete(itemId);
      else proximo.add(itemId);
      return proximo;
    });
  };

  /** Atribui/remove a pessoa de um item e atualiza o estado local (recalcula ao vivo). */
  const handleAtribuir = async (itemId: number, valor: string) => {
    const pessoaId = valor === FILTRO_SEM_PESSOA ? null : Number(valor);
    const pessoa = pessoaId
      ? (pessoas.find((p) => p.id === pessoaId) ?? null)
      : null;

    // Atualização otimista.
    setGasto((prev) =>
      prev
        ? {
            ...prev,
            itens: prev.itens.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    pessoa_id: pessoaId,
                    pessoa: pessoa
                      ? { id: pessoa.id, nome: pessoa.nome, cor: pessoa.cor }
                      : null,
                  }
                : item,
            ),
          }
        : prev,
    );

    try {
      await gastoItemService.atribuirPessoa(itemId, pessoaId);
    } catch {
      // Em caso de erro, recarrega para voltar ao estado do servidor.
      gastoService
        .show(gastoId)
        .then(setGasto)
        .catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (!gasto || !analise) return null;

  if (gasto.itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("faturaDetalhe.empty")}
      </p>
    );
  }

  const corDaPessoa = (pessoaId: number | null, index: number): string => {
    if (pessoaId === null) return COR_SEM_PESSOA;
    const pessoa = pessoas.find((p) => p.id === pessoaId);
    return pessoa?.cor ?? PALETTE[index % PALETTE.length];
  };

  const chartData = analise.porPessoa.map((grupo, index) => ({
    name: grupo.nome ?? t("faturaDetalhe.pessoas.semPessoa"),
    total: grupo.total,
    cor: corDaPessoa(grupo.pessoaId, index),
  }));
  const emptyConfig: ChartConfig = {};

  return (
    <div className="flex flex-col gap-4">
      {/* Filtro por pessoa + exportação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {t("faturaDetalhe.pessoas.filtroLabel")}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarExcel}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            {t("faturaDetalhe.exportar.botao")}
          </button>
          <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTRO_TODOS}>
              {t("faturaDetalhe.pessoas.todos")}
            </SelectItem>
            <SelectItem value={FILTRO_SEM_PESSOA}>
              {t("faturaDetalhe.pessoas.semPessoa")}
            </SelectItem>
            {pessoas.map((pessoa) => (
              <SelectItem key={pessoa.id} value={String(pessoa.id)}>
                {pessoa.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Compartilhar a fatura com cada pessoa (link único por pessoa) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold">
            {t("faturaDetalhe.compartilhar.title")}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("faturaDetalhe.compartilhar.hint")}
          </p>
          {pessoas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("faturaDetalhe.compartilhar.semPessoas")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pessoas.map((pessoa) => {
                const share = shares.find((s) => s.pessoa_id === pessoa.id);
                const copiado = copiadoPessoaId === pessoa.id;
                return (
                  <div
                    key={pessoa.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: pessoa.cor ?? COR_SEM_PESSOA }}
                      />
                      <span className="truncate">{pessoa.nome}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      {share ? (
                        <>
                          <button
                            type="button"
                            onClick={() => copiarLink(pessoa.id, share.token)}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          >
                            {copiado ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiado
                              ? t("faturaDetalhe.compartilhar.copiado")
                              : t("faturaDetalhe.compartilhar.copiar")}
                          </button>
                          <button
                            type="button"
                            onClick={() => revogarLink(pessoa.id)}
                            aria-label={t("faturaDetalhe.compartilhar.revogar")}
                            title={t("faturaDetalhe.compartilhar.revogar")}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-destructive hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => gerarECopiar(pessoa.id)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          {t("faturaDetalhe.compartilhar.gerar")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valores a calcular por pessoa */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold">
            {t("faturaDetalhe.pessoas.title")}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("faturaDetalhe.pessoas.hint")}
          </p>

          {analise.porPessoa.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("faturaDetalhe.pessoas.vazio")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Lista com barras */}
              <div className="flex flex-col gap-2">
                {analise.porPessoa.map((grupo, index) => (
                  <div key={grupo.pessoaId ?? "sem-pessoa"}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: corDaPessoa(grupo.pessoaId, index),
                          }}
                        />
                        <span className="truncate">
                          {grupo.nome ?? t("faturaDetalhe.pessoas.semPessoa")}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({grupo.count})
                          </span>
                        </span>
                      </span>
                      <span className="font-medium">
                        {formatCurrency(grupo.total)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {grupo.percentual.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${grupo.percentual}%`,
                          backgroundColor: corDaPessoa(grupo.pessoaId, index),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráfico de rosca */}
              <ChartContainer
                config={emptyConfig}
                className="mx-auto aspect-square max-h-56"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(v) => formatCurrency(v as number)}
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={50}
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo: bruto, estornos, líquido + estatísticas */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {t("faturaDetalhe.resumo.title")}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label={t("faturaDetalhe.resumo.bruto")}
              value={formatCurrency(analise.totalBruto)}
              className="text-destructive"
            />
            <Stat
              label={t("faturaDetalhe.resumo.estornos")}
              value={formatCurrency(analise.totalEstornos)}
              className="text-emerald-600"
            />
            <Stat
              label={t("faturaDetalhe.resumo.liquido")}
              value={formatCurrency(analise.totalLiquido)}
              className="text-destructive font-semibold"
            />
            <Stat
              label={t("faturaDetalhe.resumo.transacoes")}
              value={String(analise.qtdTotal)}
            />
            <Stat
              label={t("faturaDetalhe.resumo.media")}
              value={formatCurrency(analise.media)}
            />
            {analise.maior && (
              <Stat
                label={t("faturaDetalhe.resumo.maior")}
                value={formatCurrency(analise.maior.valor)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estornos / créditos (se houver) */}
      {analise.estornos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">
              {t("faturaDetalhe.estornos.title")}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("faturaDetalhe.estornos.hint")}
            </p>
            <Separator className="mb-2" />
            <div className="flex flex-col">
              {analise.estornos.map((item) => {
                const excluido = estornosExcluidos.has(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center justify-between gap-3 border-t py-2 text-sm first:border-t-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!excluido}
                        onChange={() => toggleEstorno(item.id)}
                        className="h-4 w-4 shrink-0 accent-emerald-600"
                        aria-label={t("faturaDetalhe.estornos.abater", {
                          nome: item.nome,
                        })}
                      />
                      <span
                        className={
                          excluido
                            ? "truncate text-muted-foreground line-through"
                            : "truncate"
                        }
                      >
                        {item.nome}
                      </span>
                    </span>
                    <span
                      className={
                        excluido
                          ? "whitespace-nowrap font-medium text-muted-foreground line-through"
                          : "whitespace-nowrap font-medium text-emerald-600"
                      }
                    >
                      {formatCurrency(item.valor)}
                    </span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Por categoria (inferida) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold">
            {t("faturaDetalhe.categoria.title")}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("faturaDetalhe.categoria.hint")}
          </p>
          <div className="flex flex-col gap-2">
            {analise.porCategoria.map((grupo) => (
              <div key={grupo.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {t(`faturaDetalhe.categorias.${grupo.key}`)}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({grupo.count})
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatCurrency(grupo.total)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {grupo.percentual.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${grupo.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ranking de transações com atribuição de pessoa */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {t("faturaDetalhe.ranking.title")}
          </h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">
                    {t("faturaDetalhe.ranking.descricao")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("faturaDetalhe.ranking.data")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("faturaDetalhe.ranking.pessoa")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("faturaDetalhe.ranking.valor")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {analise.ranking.map((item, i) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {i + 1}º
                    </td>
                    <td className="px-3 py-2">{item.nome}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {item.data ? formatDate(item.data) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={
                          item.pessoaId
                            ? String(item.pessoaId)
                            : FILTRO_SEM_PESSOA
                        }
                        onValueChange={(v) => handleAtribuir(item.id, v)}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FILTRO_SEM_PESSOA}>
                            {t("faturaDetalhe.pessoas.semPessoa")}
                          </SelectItem>
                          {pessoas.map((pessoa) => (
                            <SelectItem
                              key={pessoa.id}
                              value={String(pessoa.id)}
                            >
                              {pessoa.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-destructive">
                      {formatCurrency(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Por período (data) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {t("faturaDetalhe.periodo.title")}
          </h3>
          <div className="flex flex-col">
            {analise.porPeriodo.map((bucket) => (
              <div
                key={bucket.data ?? "sem-data"}
                className="flex items-center justify-between gap-3 border-t py-2 text-sm first:border-t-0"
              >
                <span className="text-muted-foreground">
                  {bucket.data
                    ? formatDate(bucket.data)
                    : t("faturaDetalhe.periodo.semData")}
                  <span className="ml-2 text-xs">({bucket.count})</span>
                </span>
                <span className="whitespace-nowrap font-medium">
                  {formatCurrency(bucket.total)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
