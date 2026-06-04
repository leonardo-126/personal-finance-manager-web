import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { fonteRendaService } from "@/Services/api";
import type {
  FonteRenda,
  StatusFonteRenda,
  TipoFonteRenda,
} from "@/types/fonte-renda";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const TIPOS: TipoFonteRenda[] = ["salário", "investimento", "extra", "outro"];
const STATUSES: StatusFonteRenda[] = ["ativo", "inativo"];

interface FonteRendaFormProps {
  /** Fonte existente. Quando informada, o formulário entra em modo de edição. */
  fonte?: FonteRenda | null;
  /** Chamado após salvar com sucesso, recebendo a fonte atualizada. */
  onSaved?: (fonte: FonteRenda) => void;
  /** Chamado ao cancelar. */
  onCancel?: () => void;
}

export default function FonteRendaForm({
  fonte,
  onSaved,
  onCancel,
}: FonteRendaFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(fonte);

  const [nome, setNome] = useState(fonte?.nome ?? "");
  const [tipo, setTipo] = useState<TipoFonteRenda>(fonte?.tipo ?? "salário");
  const [descricao, setDescricao] = useState(fonte?.descricao ?? "");
  const [status, setStatus] = useState<StatusFonteRenda>(
    fonte?.status ?? "ativo",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const base = { nome: nome.trim(), tipo, descricao: descricao.trim() };
      const saved =
        isEditing && fonte
          ? await fonteRendaService.update(fonte.id, { ...base, status })
          : await fonteRendaService.create(base);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("fontesRenda.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nome">{t("fontesRenda.form.nome")}</FieldLabel>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("fontesRenda.form.nomePlaceholder")}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="tipo">{t("fontesRenda.form.tipo")}</FieldLabel>
          <Select
            value={tipo}
            onValueChange={(value) => setTipo(value as TipoFonteRenda)}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`fontesRenda.tipos.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {isEditing && (
          <Field>
            <FieldLabel htmlFor="status">
              {t("fontesRenda.form.status")}
            </FieldLabel>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFonteRenda)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`fontesRenda.statuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="descricao">
            {t("fontesRenda.form.descricao")}
          </FieldLabel>
          <Textarea
            id="descricao"
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("fontesRenda.form.descricaoPlaceholder")}
            className="bg-background"
          />
          <FieldDescription>
            {t("fontesRenda.form.descricaoDescription")}
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
