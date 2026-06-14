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
import { formatCurrency } from "@/lib/format";
import { gastoItemService } from "@/Services/api";
import type { Gasto } from "@/types/gasto";
import type { GastoItem } from "@/types/gasto-item";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface GastoItemFormProps {
  /** Item existente. Quando informado, o formulário entra em modo de edição. */
  item?: GastoItem | null;
  /** Gastos disponíveis para vincular o item. */
  gastos: Gasto[];
  onSaved?: (item: GastoItem) => void;
  onCancel?: () => void;
}

export default function GastoItemForm({
  item,
  gastos,
  onSaved,
  onCancel,
}: GastoItemFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(item);

  const [gastoId, setGastoId] = useState<string>(
    item ? String(item.gasto_id) : "",
  );
  const [nome, setNome] = useState(item?.nome ?? "");
  const [valor, setValor] = useState<number>(item ? Number(item.valor) : 0);
  const [motivo, setMotivo] = useState(item?.motivo ?? "");
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
        gasto_id: Number(gastoId),
        nome: nome.trim(),
        valor,
        motivo: motivo.trim(),
      };
      const saved =
        isEditing && item
          ? await gastoItemService.update(item.id, input)
          : await gastoItemService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("gastosItens.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="gasto_id">
            {t("gastosItens.form.gasto")}
          </FieldLabel>
          <Select value={gastoId} onValueChange={setGastoId} required>
            <SelectTrigger id="gasto_id">
              <SelectValue placeholder={t("gastosItens.form.gastoPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {gastos.map((gasto) => (
                <SelectItem key={gasto.id} value={String(gasto.id)}>
                  #{gasto.id} · {formatCurrency(gasto.valor_total)}
                  {gasto.descricao ? ` · ${gasto.descricao}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gastos.length === 0 && (
            <FieldDescription>{t("gastosItens.form.noGastos")}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="nome">{t("gastosItens.form.nome")}</FieldLabel>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("gastosItens.form.nomePlaceholder")}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="valor">{t("gastosItens.form.valor")}</FieldLabel>
          <CurrencyInput
            id="valor"
            value={valor}
            onValueChange={setValor}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="motivo">
            {t("gastosItens.form.motivo")}
          </FieldLabel>
          <Textarea
            id="motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t("gastosItens.form.motivoPlaceholder")}
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
            disabled={
              isSubmitting || gastos.length === 0 || !nome.trim() || valor <= 0
            }
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
