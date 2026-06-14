import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { categoriaGastoService } from "@/Services/api";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CategoriaGastoForm from "./CategoriaGastoForm";

export default function CategoriasGastos() {
  const { t } = useTranslation();

  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoriaGasto | null | undefined>(
    undefined,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    categoriaGastoService
      .list()
      .then((data) => {
        if (!cancelled) setCategorias(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("categoriasGastos.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaved = (saved: CategoriaGasto) => {
    setCategorias((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const handleDelete = async (categoria: CategoriaGasto) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setDeletingId(categoria.id);
    try {
      await categoriaGastoService.remove(categoria.id);
      setCategorias((prev) => prev.filter((c) => c.id !== categoria.id));
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
            {t("categoriasGastos.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("categoriasGastos.subtitle")}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("categoriasGastos.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : categorias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("categoriasGastos.empty")}
            </p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("categoriasGastos.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <p className="truncate font-medium">{categoria.nome}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(categoria)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(categoria)}
                    disabled={deletingId === categoria.id}
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
              {editing
                ? t("categoriasGastos.editTitle")
                : t("categoriasGastos.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("categoriasGastos.editDescription")
                : t("categoriasGastos.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <CategoriaGastoForm
                categoria={editing}
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
