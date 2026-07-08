import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { faturaService } from "@/Services/api";
import type { Gasto } from "@/types/gasto";
import { CreditCard, FileUp, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

export default function Faturas() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [faturas, setFaturas] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    faturaService
      .list()
      .then((data) => {
        if (!cancelled) setFaturas(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("faturas.listError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("faturas.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("faturas.listSubtitle")}
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/faturas/importar">
            <Plus className="h-4 w-4" />
            {t("faturas.importarNova")}
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : faturas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("faturas.listEmpty")}
            </p>
            <Button asChild variant="outline">
              <Link to="/dashboard/faturas/importar">
                <FileUp className="h-4 w-4" />
                {t("faturas.importarNova")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {faturas.map((fatura) => (
            <Card
              key={fatura.id}
              className="cursor-pointer transition-colors hover:bg-accent/40"
              onClick={() => navigate(`/dashboard/faturas/${fatura.id}`)}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {fatura.descricao || t("faturas.semDescricao")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(fatura.data_gasto)}
                      {fatura.itens_count !== undefined && (
                        <>
                          {" · "}
                          {t("faturas.transacoesCount", {
                            count: fatura.itens_count,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap font-semibold text-destructive">
                  {formatCurrency(fatura.valor_total)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
