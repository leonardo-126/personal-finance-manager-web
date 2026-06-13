import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { movimentacaoService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type {
  MovimentacaoCaixa,
  MovimentacaoTipo,
} from "@/types/movimentacao";
import type { Renda } from "@/types/renda";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MovimentacaoFormProps {
  /** Movimentação existente. Quando informada, o formulário entra em modo de edição. */
  movimentacao?: MovimentacaoCaixa | null;
  /** Caixas financeiras disponíveis para seleção. */
  caixas: CaixaFinanceira[];
  /** Rendas disponíveis para vincular (opcional). */
  rendas: Renda[];
  onSaved?: (movimentacao: MovimentacaoCaixa) => void;
  onCancel?: () => void;
}

const NENHUMA_RENDA = "none";

const TIPOS: MovimentacaoTipo[] = ["entrada", "saida", "transferencia"];

export default function MovimentacaoForm({
  movimentacao,
  caixas,
  rendas,
  onSaved,
  onCancel,
}: MovimentacaoFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(movimentacao);

  const [caixaId, setCaixaId] = useState<string>(
    movimentacao ? String(movimentacao.caixa_id) : "",
  );
  const [tipo, setTipo] = useState<MovimentacaoTipo>(
    movimentacao?.tipo ?? "entrada",
  );
  const [rendaId, setRendaId] = useState<string>(
    movimentacao?.renda_id ? String(movimentacao.renda_id) : NENHUMA_RENDA,
  );
  const [valor, setValor] = useState<number>(
    movimentacao ? Number(movimentacao.valor) : 0,
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
      const input = {
        caixa_id: Number(caixaId),
        renda_id: rendaId === NENHUMA_RENDA ? null : Number(rendaId),
        valor,
        tipo,
      };
      const saved =
        isEditing && movimentacao
          ? await movimentacaoService.update(movimentacao.id, input)
          : await movimentacaoService.create(input);
      onSaved?.(saved);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("movimentacoes.form.genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="caixa_id">
            {t("movimentacoes.form.caixa")}
          </FieldLabel>
          <Select value={caixaId} onValueChange={setCaixaId} required>
            <SelectTrigger id="caixa_id">
              <SelectValue
                placeholder={t("movimentacoes.form.caixaPlaceholder")}
              />
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
            <FieldDescription>
              {t("movimentacoes.form.noCaixas")}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="tipo">{t("movimentacoes.form.tipo")}</FieldLabel>
          <Select
            value={tipo}
            onValueChange={(value) => setTipo(value as MovimentacaoTipo)}
            required
          >
            <SelectTrigger id="tipo">
              <SelectValue placeholder={t("movimentacoes.form.tipoPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`movimentacoes.tipos.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="valor">
            {t("movimentacoes.form.valor")}
          </FieldLabel>
          <CurrencyInput
            id="valor"
            value={valor}
            onValueChange={setValor}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="renda_id">
            {t("movimentacoes.form.renda")}
          </FieldLabel>
          <Select value={rendaId} onValueChange={setRendaId}>
            <SelectTrigger id="renda_id">
              <SelectValue
                placeholder={t("movimentacoes.form.rendaPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA_RENDA}>
                {t("movimentacoes.form.rendaNenhuma")}
              </SelectItem>
              {rendas.map((renda) => (
                <SelectItem key={renda.id} value={String(renda.id)}>
                  #{renda.id} · {renda.valor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {t("movimentacoes.form.rendaDescription")}
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
          <Button
            type="submit"
            disabled={isSubmitting || caixas.length === 0 || valor <= 0}
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
