import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { caixaService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CaixaForm from "./CaixaForm";

export default function Caixas() {
  const { t } = useTranslation();

  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    CaixaFinanceira | null | undefined
  >(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    caixaService
      .list()
      .then((data) => {
        if (!cancelled) setCaixas(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("caixas.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaved = (saved: CaixaFinanceira) => {
    setCaixas((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const handleDelete = async (caixa: CaixaFinanceira) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setDeletingId(caixa.id);
    try {
      await caixaService.remove(caixa.id);
      setCaixas((prev) => prev.filter((c) => c.id !== caixa.id));
    } catch {
      setError(t("common.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const isSheetOpen = editing !== undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("caixas.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("caixas.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("caixas.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : caixas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("caixas.empty")}</p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("caixas.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {caixas.map((caixa) => (
            <Card key={caixa.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rounded-md bg-primary/10 p-2 text-primary">
                    <PiggyBank className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{caixa.nome}</h3>
                    {caixa.descricao && (
                      <p className="truncate text-sm text-muted-foreground">
                        {caixa.descricao}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(caixa)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(caixa)}
                    disabled={deletingId === caixa.id}
                    aria-label={t("common.delete")}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? t("caixas.editTitle") : t("caixas.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("caixas.editDescription")
                : t("caixas.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <CaixaForm
                caixa={editing}
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
