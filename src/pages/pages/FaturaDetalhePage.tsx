import { formatCurrency } from "@/lib/format";
import { gastoService } from "@/Services/api";
import type { GastoComItens } from "@/types/gasto";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import FaturaDetalhe from "./FaturaDetalhe";

export default function FaturaDetalhePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const gastoId = Number(id);

  // Cabeçalho leve com o resumo da fatura (descrição + total).
  const [fatura, setFatura] = useState<GastoComItens | null>(null);

  useEffect(() => {
    let cancelled = false;
    gastoService
      .show(gastoId)
      .then((data) => {
        if (!cancelled) setFatura(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gastoId]);

  if (!Number.isFinite(gastoId)) {
    return (
      <p className="text-sm text-destructive">{t("faturaDetalhe.loadError")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <Link
          to="/dashboard/faturas"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("faturas.voltar")}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {fatura?.descricao || t("faturaDetalhe.title")}
          </h1>
          {fatura && (
            <span className="whitespace-nowrap text-lg font-semibold text-destructive">
              {formatCurrency(fatura.valor_total)}
            </span>
          )}
        </div>
      </header>

      <FaturaDetalhe gastoId={gastoId} />
    </div>
  );
}
