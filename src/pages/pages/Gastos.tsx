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
import { caixaService, categoriaGastoService, gastoService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { Gasto } from "@/types/gasto";
import { Pencil, Plus, Receipt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GastoForm from "./GastoForm";

export default function Gastos() {
  const { t } = useTranslation();

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Gasto | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      gastoService.list(),
      caixaService.list(),
      categoriaGastoService.list(),
    ])
      .then(([gastosData, caixasData, categoriasData]) => {
        if (cancelled) return;
        setGastos(gastosData);
        setCaixas(caixasData);
        setCategorias(categoriasData);
      })
      .catch(() => {
        if (!cancelled) setError(t("gastos.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const categoriaById = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const caixaById = useMemo(
    () => new Map(caixas.map((c) => [c.id, c])),
    [caixas],
  );

  const total = useMemo(
    () => gastos.reduce((sum, g) => sum + Number(g.valor_total), 0),
    [gastos],
  );

  const handleSaved = (saved: Gasto) => {
    setGastos((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists
        ? prev.map((g) => (g.id === saved.id ? saved : g))
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
            {t("gastos.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("gastos.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("gastos.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : gastos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("gastos.empty")}</p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("gastos.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">
                {t("gastos.total")}
              </span>
              <span className="text-lg font-semibold text-destructive">
                {formatCurrency(total)}
              </span>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {gastos.map((gasto) => (
              <Card key={gasto.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {categoriaById.get(gasto.categoria_id)?.nome ??
                        t("gastos.unknownCategoria")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(gasto.data_gasto)}
                      {" · "}
                      {caixaById.get(gasto.caixa_id)?.nome ??
                        t("gastos.unknownCaixa")}
                      {gasto.descricao ? ` · ${gasto.descricao}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold whitespace-nowrap text-destructive">
                      {formatCurrency(gasto.valor_total)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(gasto)}
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
              {editing ? t("gastos.editTitle") : t("gastos.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("gastos.editDescription")
                : t("gastos.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <GastoForm
                gasto={editing}
                caixas={caixas}
                categorias={categorias}
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
