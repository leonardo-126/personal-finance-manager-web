import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import {
  caixaService,
  categoriaGastoService,
  fonteRendaService,
  gastoItemService,
  gastoService,
  movimentacaoService,
  rendaService,
} from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { FonteRenda, TipoFonteRenda } from "@/types/fonte-renda";
import type { Gasto } from "@/types/gasto";
import type { GastoItem } from "@/types/gasto-item";
import type { MovimentacaoCaixa } from "@/types/movimentacao";
import type { Renda } from "@/types/renda";
import { ArrowDownCircle, Banknote, Scale, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
];

const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#ef4444";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

const ALL_CAIXAS = "todas";

export default function Dashboard() {
  const { t } = useTranslation();

  const [rendas, setRendas] = useState<Renda[]>([]);
  const [fontes, setFontes] = useState<FonteRenda[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [itens, setItens] = useState<GastoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [periodo, setPeriodo] = useState("6"); // meses
  const [caixaId, setCaixaId] = useState<string>(ALL_CAIXAS);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      rendaService.list(),
      fonteRendaService.list(),
      gastoService.list(),
      categoriaGastoService.list(),
      caixaService.list(),
      movimentacaoService.list(),
      gastoItemService.list(),
    ])
      .then(
        ([
          rendasData,
          fontesData,
          gastosData,
          categoriasData,
          caixasData,
          movimentacoesData,
          itensData,
        ]) => {
          if (cancelled) return;
          setRendas(rendasData);
          setFontes(fontesData);
          setGastos(gastosData);
          setCategorias(categoriasData);
          setCaixas(caixasData);
          setMovimentacoes(movimentacoesData);
          setItens(itensData);
        },
      )
      .catch(() => {
        if (!cancelled) setError(t("dashboard.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const periodMonths = Number(periodo);

  const fonteById = useMemo(
    () => new Map(fontes.map((f) => [f.id, f])),
    [fontes],
  );
  const categoriaById = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const caixaById = useMemo(
    () => new Map(caixas.map((c) => [c.id, c])),
    [caixas],
  );

  // Data de corte do período selecionado (primeiro dia do mês mais antigo).
  const cutoff = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1);
  }, [periodMonths]);

  const matchesCaixa = (id: number) =>
    caixaId === ALL_CAIXAS || id === Number(caixaId);

  // Conjuntos filtrados
  const rendasFiltradas = useMemo(
    () => rendas.filter((r) => new Date(r.data_recebimento) >= cutoff),
    [rendas, cutoff],
  );
  const gastosFiltrados = useMemo(
    () =>
      gastos.filter(
        (g) => new Date(g.data_gasto) >= cutoff && matchesCaixa(g.caixa_id),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gastos, cutoff, caixaId],
  );
  const movimentacoesFiltradas = useMemo(
    () =>
      movimentacoes.filter(
        (m) => new Date(m.created_at) >= cutoff && matchesCaixa(m.caixa_id),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimentacoes, cutoff, caixaId],
  );
  const gastoIdsFiltrados = useMemo(
    () => new Set(gastosFiltrados.map((g) => g.id)),
    [gastosFiltrados],
  );
  const itensFiltrados = useMemo(
    () => itens.filter((i) => gastoIdsFiltrados.has(i.gasto_id)),
    [itens, gastoIdsFiltrados],
  );

  // KPIs
  const totalRecebido = useMemo(
    () => rendasFiltradas.reduce((sum, r) => sum + Number(r.valor), 0),
    [rendasFiltradas],
  );
  const totalGasto = useMemo(
    () => gastosFiltrados.reduce((sum, g) => sum + Number(g.valor_total), 0),
    [gastosFiltrados],
  );
  const saldo = totalRecebido - totalGasto;

  // Evolução mensal — receitas x despesas
  const evolucao = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: periodMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1 - i), 1);
      return {
        key: monthKey(d),
        label: monthFormatter.format(d),
        receitas: 0,
        despesas: 0,
      };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    rendasFiltradas.forEach((r) => {
      const i = index.get(monthKey(new Date(r.data_recebimento)));
      if (i !== undefined) buckets[i].receitas += Number(r.valor);
    });
    gastosFiltrados.forEach((g) => {
      const i = index.get(monthKey(new Date(g.data_gasto)));
      if (i !== undefined) buckets[i].despesas += Number(g.valor_total);
    });
    return buckets;
  }, [rendasFiltradas, gastosFiltrados, periodMonths]);

  // Gastos por categoria
  const gastosPorCategoria = useMemo(() => {
    const map = new Map<number, number>();
    gastosFiltrados.forEach((g) =>
      map.set(
        g.categoria_id,
        (map.get(g.categoria_id) ?? 0) + Number(g.valor_total),
      ),
    );
    return [...map.entries()]
      .map(([id, total]) => ({
        name: categoriaById.get(id)?.nome ?? t("dashboard.expensesByCategory.unknown"),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [gastosFiltrados, categoriaById, t]);

  // Gastos por caixa
  const gastosPorCaixa = useMemo(() => {
    const map = new Map<number, number>();
    gastosFiltrados.forEach((g) =>
      map.set(g.caixa_id, (map.get(g.caixa_id) ?? 0) + Number(g.valor_total)),
    );
    return [...map.entries()]
      .map(([id, total]) => ({
        name: caixaById.get(id)?.nome ?? t("dashboard.expensesByCaixa.unknown"),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [gastosFiltrados, caixaById, t]);

  // Movimentações por caixa (entradas x saídas)
  const movPorCaixa = useMemo(() => {
    const map = new Map<number, { entrada: number; saida: number }>();
    movimentacoesFiltradas.forEach((m) => {
      if (m.tipo === "transferencia") return;
      const cur = map.get(m.caixa_id) ?? { entrada: 0, saida: 0 };
      if (m.tipo === "entrada") cur.entrada += Number(m.valor);
      else cur.saida += Number(m.valor);
      map.set(m.caixa_id, cur);
    });
    return [...map.entries()]
      .map(([id, val]) => ({
        name: caixaById.get(id)?.nome ?? t("dashboard.expensesByCaixa.unknown"),
        ...val,
      }))
      .slice(0, 7);
  }, [movimentacoesFiltradas, caixaById, t]);

  // Maiores itens de gasto
  const topItens = useMemo(
    () =>
      [...itensFiltrados]
        .sort((a, b) => Number(b.valor) - Number(a.valor))
        .slice(0, 6)
        .map((i) => ({ name: i.nome, total: Number(i.valor) })),
    [itensFiltrados],
  );

  // Receitas por fonte (top 6)
  const porFonte = useMemo(() => {
    const map = new Map<number, number>();
    rendasFiltradas.forEach((r) =>
      map.set(r.fonte_renda_id, (map.get(r.fonte_renda_id) ?? 0) + Number(r.valor)),
    );
    return [...map.entries()]
      .map(([id, total]) => ({
        name: fonteById.get(id)?.nome ?? t("rendas.unknownFonte"),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [rendasFiltradas, fonteById, t]);

  // Receitas por tipo de fonte
  const porTipo = useMemo(() => {
    const map = new Map<TipoFonteRenda, number>();
    rendasFiltradas.forEach((r) => {
      const tipo = fonteById.get(r.fonte_renda_id)?.tipo ?? "outro";
      map.set(tipo, (map.get(tipo) ?? 0) + Number(r.valor));
    });
    return [...map.entries()].map(([tipo, total]) => ({
      name: t(`fontesRenda.tipos.${tipo}`),
      total,
    }));
  }, [rendasFiltradas, fonteById, t]);

  const evoConfig: ChartConfig = {
    receitas: { label: t("dashboard.income"), color: INCOME_COLOR },
    despesas: { label: t("dashboard.expense"), color: EXPENSE_COLOR },
  };
  const movConfig: ChartConfig = {
    entrada: { label: t("dashboard.movementsByCaixa.entrada"), color: INCOME_COLOR },
    saida: { label: t("dashboard.movementsByCaixa.saida"), color: EXPENSE_COLOR },
  };
  const expenseConfig: ChartConfig = {
    total: { label: t("dashboard.expense"), color: EXPENSE_COLOR },
  };
  const emptyConfig: ChartConfig = {};

  const hasData = rendas.length > 0 || gastos.length > 0;

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

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-45" aria-label={t("dashboard.filters.period")}>
              <SelectValue placeholder={t("dashboard.filters.period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{t("dashboard.filters.period3")}</SelectItem>
              <SelectItem value="6">{t("dashboard.filters.period6")}</SelectItem>
              <SelectItem value="12">{t("dashboard.filters.period12")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={caixaId} onValueChange={setCaixaId}>
            <SelectTrigger className="w-45" aria-label={t("dashboard.filters.caixa")}>
              <SelectValue placeholder={t("dashboard.filters.caixa")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CAIXAS}>
                {t("dashboard.filters.allCaixas")}
              </SelectItem>
              {caixas.map((caixa) => (
                <SelectItem key={caixa.id} value={String(caixa.id)}>
                  {caixa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("dashboard.kpi.received")}
          value={formatCurrency(totalRecebido)}
        />
        <KpiCard
          icon={<ArrowDownCircle className="h-4 w-4" />}
          label={t("dashboard.kpi.spent")}
          value={formatCurrency(totalGasto)}
        />
        <KpiCard
          icon={<Scale className="h-4 w-4" />}
          label={t("dashboard.kpi.balance")}
          value={formatCurrency(saldo)}
          valueClassName={
            saldo >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={t("dashboard.kpi.expenseCount")}
          value={String(gastosFiltrados.length)}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.empty")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Receitas x Despesas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("dashboard.evolution.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.evolution.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={evoConfig} className="h-64 w-full">
                <AreaChart data={evolucao} margin={{ left: 12, right: 12 }}>
                  <defs>
                    <linearGradient id="fillReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-receitas)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-receitas)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-despesas)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-despesas)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => formatCurrency(v)} />}
                  />
                  <Area
                    dataKey="receitas"
                    type="monotone"
                    stroke="var(--color-receitas)"
                    strokeWidth={2}
                    fill="url(#fillReceitas)"
                  />
                  <Area
                    dataKey="despesas"
                    type="monotone"
                    stroke="var(--color-despesas)"
                    strokeWidth={2}
                    fill="url(#fillDespesas)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gastos por categoria */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.expensesByCategory.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.expensesByCategory.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gastosPorCategoria.length === 0 ? (
                <EmptyChart text={t("dashboard.noExpenses")} />
              ) : (
                <>
                  <ChartContainer config={emptyConfig} className="mx-auto aspect-square max-h-64">
                    <PieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel formatter={(v) => formatCurrency(v)} />}
                      />
                      <Pie data={gastosPorCategoria} dataKey="total" nameKey="name" innerRadius={55} strokeWidth={2}>
                        {gastosPorCategoria.map((_, index) => (
                          <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <Legend items={gastosPorCategoria.map((d) => d.name)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Gastos por caixa */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.expensesByCaixa.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.expensesByCaixa.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gastosPorCaixa.length === 0 ? (
                <EmptyChart text={t("dashboard.noExpenses")} />
              ) : (
                <ChartContainer config={expenseConfig} className="h-64 w-full">
                  <BarChart data={gastosPorCaixa} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel formatter={(v) => formatCurrency(v)} />}
                    />
                    <Bar dataKey="total" radius={4} fill="var(--color-total)" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Movimentações por caixa */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.movementsByCaixa.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.movementsByCaixa.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movPorCaixa.length === 0 ? (
                <EmptyChart text={t("dashboard.noMovements")} />
              ) : (
                <ChartContainer config={movConfig} className="h-64 w-full">
                  <BarChart data={movPorCaixa} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={70}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(v) => formatCurrency(v)} />}
                    />
                    <Bar dataKey="entrada" radius={4} fill="var(--color-entrada)" />
                    <Bar dataKey="saida" radius={4} fill="var(--color-saida)" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Maiores itens de gasto */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.topItems.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.topItems.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topItens.length === 0 ? (
                <EmptyChart text={t("dashboard.topItems.empty")} />
              ) : (
                <ChartContainer config={expenseConfig} className="h-64 w-full">
                  <BarChart data={topItens} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel formatter={(v) => formatCurrency(v)} />}
                    />
                    <Bar dataKey="total" radius={4} fill="var(--color-total)" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Receitas por fonte */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.bySource.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.bySource.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {porFonte.length === 0 ? (
                <EmptyChart text={t("dashboard.noIncome")} />
              ) : (
                <>
                  <ChartContainer config={emptyConfig} className="mx-auto aspect-square max-h-64">
                    <PieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel formatter={(v) => formatCurrency(v)} />}
                      />
                      <Pie data={porFonte} dataKey="total" nameKey="name" innerRadius={55} strokeWidth={2}>
                        {porFonte.map((_, index) => (
                          <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <Legend items={porFonte.map((d) => d.name)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Receitas por tipo */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.byType.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.byType.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {porTipo.length === 0 ? (
                <EmptyChart text={t("dashboard.noIncome")} />
              ) : (
                <ChartContainer config={emptyConfig} className="h-64 w-full">
                  <BarChart data={porTipo} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel formatter={(v) => formatCurrency(v)} />}
                    />
                    <Bar dataKey="total" radius={4}>
                      {porTipo.map((_, index) => (
                        <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="rounded-md bg-primary/10 p-2 text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`truncate text-lg font-semibold ${valueClassName ?? ""}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {items.map((name, index) => (
        <li key={name} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-xs"
            style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
          />
          <span className="text-muted-foreground">{name}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
