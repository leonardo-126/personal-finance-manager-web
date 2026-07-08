import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { pessoaService } from "@/Services/api";
import type { Pessoa } from "@/types/pessoa";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface PessoaFormProps {
  /** Pessoa existente. Quando informada, o formulário entra em modo de edição. */
  pessoa?: Pessoa | null;
  onSaved?: (pessoa: Pessoa) => void;
  onCancel?: () => void;
}

/** Cor padrão para novas pessoas (verde do tema). */
const COR_PADRAO = "#22c55e";

export default function PessoaForm({
  pessoa,
  onSaved,
  onCancel,
}: PessoaFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(pessoa);

  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [cor, setCor] = useState(pessoa?.cor ?? COR_PADRAO);
  const [email, setEmail] = useState(pessoa?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input = {
        nome: nome.trim(),
        cor,
        email: email.trim() || null,
      };
      const saved =
        isEditing && pessoa
          ? await pessoaService.update(pessoa.id, input)
          : await pessoaService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("pessoas.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">{t("pessoas.form.nome")}</FieldLabel>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("pessoas.form.nomePlaceholder")}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="cor">{t("pessoas.form.cor")}</FieldLabel>
          <div className="flex items-center gap-3">
            <input
              id="cor"
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <span className="text-sm text-muted-foreground">{cor}</span>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="email">{t("pessoas.form.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("pessoas.form.emailPlaceholder")}
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
