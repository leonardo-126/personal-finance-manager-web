import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { categoriaGastoService } from "@/Services/api";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CategoriaGastoFormProps {
  /** Categoria existente. Quando informada, o formulário entra em modo de edição. */
  categoria?: CategoriaGasto | null;
  onSaved?: (categoria: CategoriaGasto) => void;
  onCancel?: () => void;
}

export default function CategoriaGastoForm({
  categoria,
  onSaved,
  onCancel,
}: CategoriaGastoFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(categoria);

  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input = { nome: nome.trim() };
      const saved =
        isEditing && categoria
          ? await categoriaGastoService.update(categoria.id, input)
          : await categoriaGastoService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("categoriasGastos.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">
            {t("categoriasGastos.form.nome")}
          </FieldLabel>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("categoriasGastos.form.nomePlaceholder")}
            required
          />
        </Field>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Field orientation="horizontal" className="justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || !nome.trim()}>
            {isSubmitting
              ? t("common.saving")
              : isEditing
                ? t("common.save")
                : t("common.create")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
