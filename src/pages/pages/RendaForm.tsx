import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { toDateInputValue } from "@/lib/format";
import { rendaService } from "@/Services/api";
import type { FonteRenda } from "@/types/fonte-renda";
import type { Renda } from "@/types/renda";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RendaFormProps {
  /** Renda existente. Quando informada, o formulário entra em modo de edição. */
  renda?: Renda | null;
  /** Fontes de renda disponíveis para seleção. */
  fontes: FonteRenda[];
  onSaved?: (renda: Renda) => void;
  onCancel?: () => void;
}

export default function RendaForm({
  renda,
  fontes,
  onSaved,
  onCancel,
}: RendaFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(renda);

  const [fonteRendaId, setFonteRendaId] = useState<string>(
    renda ? String(renda.fonte_renda_id) : "",
  );
  const [valor, setValor] = useState<number>(
    renda ? Number(renda.valor) : 0,
  );
  const [dataRecebimento, setDataRecebimento] = useState(
    toDateInputValue(renda?.data_recebimento),
  );
  const [descricao, setDescricao] = useState(renda?.descricao ?? "");
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
        fonte_renda_id: Number(fonteRendaId),
        valor,
        data_recebimento: dataRecebimento,
        descricao: descricao.trim(),
      };
      const saved =
        isEditing && renda
          ? await rendaService.update(renda.id, input)
          : await rendaService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("rendas.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fonte_renda_id">
            {t("rendas.form.fonte")}
          </FieldLabel>
          <Select value={fonteRendaId} onValueChange={setFonteRendaId} required>
            <SelectTrigger id="fonte_renda_id">
              <SelectValue placeholder={t("rendas.form.fontePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {fontes.map((fonte) => (
                <SelectItem key={fonte.id} value={String(fonte.id)}>
                  {fonte.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fontes.length === 0 && (
            <FieldDescription>{t("rendas.form.noFontes")}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="valor">{t("rendas.form.valor")}</FieldLabel>
          <CurrencyInput
            id="valor"
            value={valor}
            onValueChange={setValor}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="data_recebimento">
            {t("rendas.form.data")}
          </FieldLabel>
          <Input
            id="data_recebimento"
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="descricao">
            {t("rendas.form.descricao")}
          </FieldLabel>
          <Textarea
            id="descricao"
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("rendas.form.descricaoPlaceholder")}
            className="bg-background"
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
          <Button
            type="submit"
            disabled={isSubmitting || fontes.length === 0 || valor <= 0}
          >
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
