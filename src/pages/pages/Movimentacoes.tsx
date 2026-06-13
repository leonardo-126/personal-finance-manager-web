import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDate } from "@/lib/format";
import { caixaService, movimentacaoService, rendaService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { MovimentacaoCaixa } from "@/types/movimentacao";
import type { Renda } from "@/types/renda";
import { ArrowLeftRight, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MovimentacaoForm from "./MovimentacaoForm";

export default function Movimentacoes() {
  const { t } = useTranslation();

  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    MovimentacaoCaixa | null | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      movimentacaoService.list(),
      caixaService.list(),
      rendaService.list(),
    ])
      .then(([movimentacoesData, caixasData, rendasData]) => {
        if (cancelled) return;
        setMovimentacoes(movimentacoesData);
        setCaixas(caixasData);
        setRendas(rendasData);
      })
      .catch(() => {
        if (!cancelled) setError(t("movimentacoes.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const caixaById = useMemo(
    () => new Map(caixas.map((c) => [c.id, c])),
    [caixas],
  );

  const saldo = useMemo(
    () =>
      movimentacoes.reduce((sum, m) => {
        const valor = Number(m.valor);
        return m.tipo === "saida" ? sum - valor : sum + valor;
      }, 0),
    [movimentacoes],
  );

  const handleSaved = (saved: MovimentacaoCaixa) => {
    setMovimentacoes((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists
        ? prev.map((m) => (m.id === saved.id ? saved : m))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const isSheetOpen = editing !== undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("movimentacoes.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("movimentacoes.subtitle")}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("movimentacoes.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : movimentacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("movimentacoes.empty")}
            </p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("movimentacoes.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">
                {t("movimentacoes.saldo")}
              </span>
              <span className="text-lg font-semibold">
                {formatCurrency(saldo)}
              </span>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {movimentacoes.map((movimentacao) => (
              <Card key={movimentacao.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {caixaById.get(movimentacao.caixa_id)?.nome ??
                        t("movimentacoes.unknownCaixa")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`movimentacoes.tipos.${movimentacao.tipo}`)}
                      {" · "}
                      {formatDate(movimentacao.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        movimentacao.tipo === "saida"
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {movimentacao.tipo === "saida" ? "−" : "+"}
                      {formatCurrency(movimentacao.valor)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(movimentacao)}
                      aria-label={t("common.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing
                ? t("movimentacoes.editTitle")
                : t("movimentacoes.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("movimentacoes.editDescription")
                : t("movimentacoes.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <MovimentacaoForm
                movimentacao={editing}
                caixas={caixas}
                rendas={rendas}
                onSaved={handleSaved}
                onCancel={() => setEditing(undefined)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
