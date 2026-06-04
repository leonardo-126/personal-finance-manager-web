import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { caixaService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CaixaFormProps {
  /** Caixa existente. Quando informada, o formulário entra em modo de edição. */
  caixa?: CaixaFinanceira | null;
  onSaved?: (caixa: CaixaFinanceira) => void;
  onCancel?: () => void;
}

export default function CaixaForm({ caixa, onSaved, onCancel }: CaixaFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(caixa);

  const [nome, setNome] = useState(caixa?.nome ?? "");
  const [descricao, setDescricao] = useState(caixa?.descricao ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input = { nome: nome.trim(), descricao: descricao.trim() };
      const saved =
        isEditing && caixa
          ? await caixaService.update(caixa.id, input)
          : await caixaService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("caixas.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">{t("caixas.form.nome")}</FieldLabel>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("caixas.form.nomePlaceholder")}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="descricao">
            {t("caixas.form.descricao")}
          </FieldLabel>
          <Textarea
            id="descricao"
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("caixas.form.descricaoPlaceholder")}
            className="bg-background"
          />
          <FieldDescription>
            {t("caixas.form.descricaoDescription")}
          </FieldDescription>
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
          <Button type="submit" disabled={isSubmitting}>
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
