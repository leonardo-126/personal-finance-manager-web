import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { analisarFatura, type FaturaAnalise } from "@/lib/faturaAnalise";
import { gastoService } from "@/Services/api";
import type { GastoComItens } from "@/types/gasto";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  gastoId: number;
}

export default function FaturaDetalhe({ gastoId }: Props) {
  const { t } = useTranslation();
  const [gasto, setGasto] = useState<GastoComItens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    gastoService
      .show(gastoId)
      .then((data) => {
        if (!cancelled) setGasto(data);
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

  const analise = useMemo<FaturaAnalise | null>(
    () => (gasto ? analisarFatura(gasto.itens) : null),
    [gasto],
  );

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

  return (
    <div className="flex flex-col gap-4">
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

      {/* Ranking de transações */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {t("faturaDetalhe.ranking.title")}
          </h3>
          <div className="flex flex-col">
            {analise.ranking.slice(0, 10).map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-t py-2 text-sm first:border-t-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground">
                    {i + 1}º
                  </span>
                  <span className="truncate">{item.nome}</span>
                </div>
                <span className="whitespace-nowrap font-medium text-destructive">
                  {formatCurrency(item.valor)}
                </span>
              </div>
            ))}
          </div>
          {analise.ranking.length > 10 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("faturaDetalhe.ranking.mais", {
                count: analise.ranking.length - 10,
              })}
            </p>
          )}
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
