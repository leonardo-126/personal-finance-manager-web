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
import { fonteRendaService, rendaService } from "@/Services/api";
import type { FonteRenda } from "@/types/fonte-renda";
import type { Renda } from "@/types/renda";
import { Banknote, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import RendaForm from "./RendaForm";

export default function Rendas() {
  const { t } = useTranslation();

  const [rendas, setRendas] = useState<Renda[]>([]);
  const [fontes, setFontes] = useState<FonteRenda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Renda | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([rendaService.list(), fonteRendaService.list()])
      .then(([rendasData, fontesData]) => {
        if (cancelled) return;
        setRendas(rendasData);
        setFontes(fontesData);
      })
      .catch(() => {
        if (!cancelled) setError(t("rendas.loadError"));
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

  const total = useMemo(
    () => rendas.reduce((sum, r) => sum + Number(r.valor), 0),
    [rendas],
  );

  const handleSaved = (saved: Renda) => {
    setRendas((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      return exists
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const handleDelete = async (renda: Renda) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setDeletingId(renda.id);
    try {
      await rendaService.remove(renda.id);
      setRendas((prev) => prev.filter((r) => r.id !== renda.id));
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
            {t("rendas.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("rendas.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("rendas.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : rendas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("rendas.empty")}</p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("rendas.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">
                {t("rendas.total")}
              </span>
              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total)}
              </span>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {rendas.map((renda) => (
              <Card key={renda.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {fonteById.get(renda.fonte_renda_id)?.nome ??
                        t("rendas.unknownFonte")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(renda.data_recebimento)}
                      {renda.descricao ? ` · ${renda.descricao}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(renda.valor)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(renda)}
                      aria-label={t("common.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(renda)}
                      disabled={deletingId === renda.id}
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
        </>
      )}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? t("rendas.editTitle") : t("rendas.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("rendas.editDescription")
                : t("rendas.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <RendaForm
                renda={editing}
                fontes={fontes}
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
