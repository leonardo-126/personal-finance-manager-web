import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { gastoItemService, gastoService } from "@/Services/api";
import type { Gasto } from "@/types/gasto";
import type { GastoItem } from "@/types/gasto-item";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GastoItemForm from "./GastoItemForm";

export default function GastosItens() {
  const { t } = useTranslation();

  const [itens, setItens] = useState<GastoItem[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GastoItem | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([gastoItemService.list(), gastoService.list()])
      .then(([itensData, gastosData]) => {
        if (cancelled) return;
        setItens(itensData);
        setGastos(gastosData);
      })
      .catch(() => {
        if (!cancelled) setError(t("gastosItens.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const total = useMemo(
    () => itens.reduce((sum, i) => sum + Number(i.valor), 0),
    [itens],
  );

  const handleSaved = (saved: GastoItem) => {
    setItens((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists
        ? prev.map((i) => (i.id === saved.id ? saved : i))
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
            {t("gastosItens.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("gastosItens.subtitle")}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("gastosItens.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ListChecks className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("gastosItens.empty")}
            </p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("gastosItens.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">
                {t("gastosItens.total")}
              </span>
              <span className="text-lg font-semibold">
                {formatCurrency(total)}
              </span>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {itens.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("gastosItens.gastoRef", { id: item.gasto_id })}
                      {item.motivo ? ` · ${item.motivo}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(item.valor)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(item)}
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
                ? t("gastosItens.editTitle")
                : t("gastosItens.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("gastosItens.editDescription")
                : t("gastosItens.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <GastoItemForm
                item={editing}
                gastos={gastos}
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
