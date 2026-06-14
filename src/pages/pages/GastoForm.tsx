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
import { gastoService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { Gasto } from "@/types/gasto";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface GastoFormProps {
  /** Gasto existente. Quando informado, o formulário entra em modo de edição. */
  gasto?: Gasto | null;
  /** Caixas financeiras disponíveis para seleção. */
  caixas: CaixaFinanceira[];
  /** Categorias de gasto disponíveis para seleção. */
  categorias: CategoriaGasto[];
  onSaved?: (gasto: Gasto) => void;
  onCancel?: () => void;
}

export default function GastoForm({
  gasto,
  caixas,
  categorias,
  onSaved,
  onCancel,
}: GastoFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(gasto);

  const [caixaId, setCaixaId] = useState<string>(
    gasto ? String(gasto.caixa_id) : "",
  );
  const [categoriaId, setCategoriaId] = useState<string>(
    gasto ? String(gasto.categoria_id) : "",
  );
  const [valorTotal, setValorTotal] = useState<number>(
    gasto ? Number(gasto.valor_total) : 0,
  );
  const [dataGasto, setDataGasto] = useState(toDateInputValue(gasto?.data_gasto));
  const [descricao, setDescricao] = useState(gasto?.descricao ?? "");
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
        caixa_id: Number(caixaId),
        categoria_id: Number(categoriaId),
        valor_total: valorTotal,
        descricao: descricao.trim(),
        data_gasto: dataGasto,
      };
      const saved =
        isEditing && gasto
          ? await gastoService.update(gasto.id, input)
          : await gastoService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("gastos.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="caixa_id">{t("gastos.form.caixa")}</FieldLabel>
          <Select value={caixaId} onValueChange={setCaixaId} required>
            <SelectTrigger id="caixa_id">
              <SelectValue placeholder={t("gastos.form.caixaPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {caixas.map((caixa) => (
                <SelectItem key={caixa.id} value={String(caixa.id)}>
                  {caixa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {caixas.length === 0 && (
            <FieldDescription>{t("gastos.form.noCaixas")}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="categoria_id">
            {t("gastos.form.categoria")}
          </FieldLabel>
          <Select value={categoriaId} onValueChange={setCategoriaId} required>
            <SelectTrigger id="categoria_id">
              <SelectValue placeholder={t("gastos.form.categoriaPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categorias.length === 0 && (
            <FieldDescription>{t("gastos.form.noCategorias")}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="valor_total">
            {t("gastos.form.valorTotal")}
          </FieldLabel>
          <CurrencyInput
            id="valor_total"
            value={valorTotal}
            onValueChange={setValorTotal}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="data_gasto">{t("gastos.form.data")}</FieldLabel>
          <Input
            id="data_gasto"
            type="date"
            value={dataGasto}
            onChange={(e) => setDataGasto(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="descricao">
            {t("gastos.form.descricao")}
          </FieldLabel>
          <Textarea
            id="descricao"
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={t("gastos.form.descricaoPlaceholder")}
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
              isSubmitting ||
              caixas.length === 0 ||
              categorias.length === 0 ||
              valorTotal <= 0
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
