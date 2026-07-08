import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { pessoaService } from "@/Services/api";
import type { Pessoa } from "@/types/pessoa";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PessoaForm from "./PessoaForm";

export default function Pessoas() {
  const { t } = useTranslation();

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pessoa | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    pessoaService
      .list()
      .then((data) => {
        if (!cancelled) setPessoas(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("pessoas.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaved = (saved: Pessoa) => {
    setPessoas((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev];
    });
    setEditing(undefined);
  };

  const handleDelete = async (pessoa: Pessoa) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setDeletingId(pessoa.id);
    try {
      await pessoaService.remove(pessoa.id);
      setPessoas((prev) => prev.filter((p) => p.id !== pessoa.id));
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
            {t("pessoas.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pessoas.subtitle")}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4" />
          {t("pessoas.new")}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : pessoas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("pessoas.empty")}</p>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              {t("pessoas.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {pessoas.map((pessoa) => (
            <Card key={pessoa.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border"
                    style={{ backgroundColor: pessoa.cor ?? "#94a3b8" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pessoa.nome}</p>
                    {pessoa.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {pessoa.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(pessoa)}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(pessoa)}
                    disabled={deletingId === pessoa.id}
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
              {editing ? t("pessoas.editTitle") : t("pessoas.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? t("pessoas.editDescription")
                : t("pessoas.createDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {isSheetOpen && (
              <PessoaForm
                pessoa={editing}
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
