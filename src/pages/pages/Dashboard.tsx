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
import { formatCurrency } from "@/lib/format";
import { fonteRendaService, rendaService } from "@/Services/api";
import type { FonteRenda, TipoFonteRenda } from "@/types/fonte-renda";
import type { Renda } from "@/types/renda";
import { Banknote, TrendingUp, Wallet } from "lucide-react";
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

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export default function Dashboard() {
  const { t } = useTranslation();

  const [rendas, setRendas] = useState<Renda[]>([]);
  const [fontes, setFontes] = useState<FonteRenda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([rendaService.list(), fonteRendaService.list()])
      .then(([rendasData, fontesData]) => {
        if (cancelled) return;
        setRendas(rendasData);
        setFontes(fontesData);
      })
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

  const fonteById = useMemo(
    () => new Map(fontes.map((f) => [f.id, f])),
    [fontes],
  );

  // KPIs
  const totalRecebido = useMemo(
    () => rendas.reduce((sum, r) => sum + Number(r.valor), 0),
    [rendas],
  );

  const totalMesAtual = useMemo(() => {
    const key = monthKey(new Date());
    return rendas
      .filter((r) => monthKey(new Date(r.data_recebimento)) === key)
      .reduce((sum, r) => sum + Number(r.valor), 0);
  }, [rendas]);

  const fontesAtivas = useMemo(
    () => fontes.filter((f) => f.status === "ativo").length,
    [fontes],
  );

  // Evolução mensal (últimos 6 meses)
  const evolucao = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: monthKey(d), label: monthFormatter.format(d), total: 0 };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    rendas.forEach((r) => {
      const i = index.get(monthKey(new Date(r.data_recebimento)));
      if (i !== undefined) buckets[i].total += Number(r.valor);
    });
    return buckets;
  }, [rendas]);

  // Rendas por fonte (top 6)
  const porFonte = useMemo(() => {
    const map = new Map<number, number>();
    rendas.forEach((r) =>
      map.set(r.fonte_renda_id, (map.get(r.fonte_renda_id) ?? 0) + Number(r.valor)),
    );
    return [...map.entries()]
      .map(([id, total]) => ({
        name: fonteById.get(id)?.nome ?? t("rendas.unknownFonte"),
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [rendas, fonteById, t]);

  // Rendas por tipo de fonte
  const porTipo = useMemo(() => {
    const map = new Map<TipoFonteRenda, number>();
    rendas.forEach((r) => {
      const tipo = fonteById.get(r.fonte_renda_id)?.tipo ?? "outro";
      map.set(tipo, (map.get(tipo) ?? 0) + Number(r.valor));
    });
    return [...map.entries()].map(([tipo, total]) => ({
      name: t(`fontesRenda.tipos.${tipo}`),
      total,
    }));
  }, [rendas, fonteById, t]);

  const areaConfig: ChartConfig = {
    total: { label: t("dashboard.income"), color: "#10b981" },
  };
  const emptyConfig: ChartConfig = {};

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
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("dashboard.kpi.total")}
          value={formatCurrency(totalRecebido)}
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={t("dashboard.kpi.month")}
          value={formatCurrency(totalMesAtual)}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label={t("dashboard.kpi.activeSources")}
          value={String(fontesAtivas)}
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={t("dashboard.kpi.count")}
          value={String(rendas.length)}
        />
      </div>

      {rendas.length === 0 ? (
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
          {/* Evolução mensal */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("dashboard.evolution.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.evolution.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={areaConfig} className="h-64 w-full">
                <AreaChart data={evolucao} margin={{ left: 12, right: 12 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-total)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-total)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(v) => formatCurrency(v)} />
                    }
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="url(#fillTotal)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Rendas por fonte */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.bySource.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.bySource.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={emptyConfig}
                className="mx-auto aspect-square max-h-64"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(v) => formatCurrency(v)}
                      />
                    }
                  />
                  <Pie
                    data={porFonte}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={55}
                    strokeWidth={2}
                  >
                    {porFonte.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {porFonte.map((item, index) => (
                  <li key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-[2px]"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Rendas por tipo */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.byType.title")}</CardTitle>
              <CardDescription>
                {t("dashboard.byType.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={emptyConfig} className="h-64 w-full">
                <BarChart
                  data={porTipo}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(v) => formatCurrency(v)}
                      />
                    }
                  />
                  <Bar dataKey="total" radius={4}>
                    {porTipo.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="rounded-md bg-primary/10 p-2 text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
