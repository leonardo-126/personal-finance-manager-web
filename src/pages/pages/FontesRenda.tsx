import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fonteRendaService } from "@/Services/api";
import type { FonteRenda } from "@/types/fonte-renda";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FonteRendaForm from "./FonteRendaForm";

export default function FontesRenda() {
  const { t } = useTranslation();

  const [fontes, setFontes] = useState<FonteRenda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // null = criando; objeto = editando; undefined = drawer fechado.
  const [editing, setEditing] = useState<FonteRenda | null | undefined>(
    undefined,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fonteRendaService
      .list()
      .then((data) => {
        if (!cancelled) setFontes(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("fontesRenda.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaved = (saved: FonteRenda) => {
    setFontes((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      return exists
        ? prev.map((f) => (f.id === saved.id ? saved : f))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const handleDelete = async (fonte: FonteRenda) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setDeletingId(fonte.id);
    try {
      await fonteRendaService.remove(fonte.id);
      setFontes((prev) => prev.filter((f) => f.id !== fonte.id));
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
            {t("fontesRenda.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("fontesRenda.subtitle")}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("fontesRenda.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : fontes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("fontesRenda.empty")}
            </p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("fontesRenda.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fontes.map((fonte) => (
            <Card key={fonte.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{fonte.nome}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        fonte.status === "ativo"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t(`fontesRenda.statuses.${fonte.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(`fontesRenda.tipos.${fonte.tipo}`)}
                  </p>
                  {fonte.descricao && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {fonte.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(fonte)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(fonte)}
                    disabled={deletingId === fonte.id}
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
              {editing ? t("fontesRenda.editTitle") : t("fontesRenda.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("fontesRenda.editDescription")
                : t("fontesRenda.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <FonteRendaForm
                fonte={editing}
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
