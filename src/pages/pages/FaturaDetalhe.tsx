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
import { gastoService, gastoItemService, pessoaService } from "@/Services/api";
import type { GastoComItens } from "@/types/gasto";
import type { Pessoa } from "@/types/pessoa";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart } from "recharts";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([gastoService.show(gastoId), pessoaService.list()])
      .then(([gastoData, pessoasData]) => {
        if (cancelled) return;
        setGasto(gastoData);
        setPessoas(pessoasData);
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

  // Converte o valor do Select no filtro esperado por analisarFatura.
  const filtroPessoa = useMemo(() => {
    if (filtro === FILTRO_TODOS) return undefined;
    if (filtro === FILTRO_SEM_PESSOA) return null;
    return Number(filtro);
  }, [filtro]);

  const analise = useMemo<FaturaAnalise | null>(
    () => (gasto ? analisarFatura(gasto.itens, filtroPessoa) : null),
    [gasto, filtroPessoa],
  );

  /** Atribui/remove a pessoa de um item e atualiza o estado local (recalcula ao vivo). */
  const handleAtribuir = async (itemId: number, valor: string) => {
    const pessoaId = valor === FILTRO_SEM_PESSOA ? null : Number(valor);
    const pessoa = pessoaId
      ? pessoas.find((p) => p.id === pessoaId) ?? null
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
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
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
      <p className="text-sm text-muted-foreground">{t("faturaDetalhe.empty")}</p>
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
      {/* Filtro por pessoa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {t("faturaDetalhe.pessoas.filtroLabel")}
        </h3>
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

      {/* Estornos / créditos (se houver) */}
      {analise.estornos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t("faturaDetalhe.estornos.title")}
            </h3>
            <Separator className="mb-2" />
            <div className="flex flex-col">
              {analise.estornos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-t py-2 text-sm first:border-t-0"
                >
                  <span className="truncate">{item.nome}</span>
                  <span className="whitespace-nowrap font-medium text-emerald-600">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
