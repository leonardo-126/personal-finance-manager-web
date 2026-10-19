import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import { openFinanceService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { FonteRenda } from "@/types/fonte-renda";
import type {
  ContaOpenFinance,
  ResultadoLancamentos,
  TransacaoOpenFinance,
} from "@/types/open-finance";
import { ArrowDownLeft, ArrowUpRight, FileUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface OpenFinanceLancamentosProps {
  conta: ContaOpenFinance;
  selecionadas: TransacaoOpenFinance[];
  caixas: CaixaFinanceira[];
  categorias: CategoriaGasto[];
  fontes: FonteRenda[];
  onImported: (resultado: ResultadoLancamentos, ids: number[]) => void;
  onError: (message: string) => void;
}

const soma = (txs: TransacaoOpenFinance[]) =>
  txs.reduce((total, tx) => total + Number(tx.valor), 0);

/**
 * Importação de conta corrente/poupança: as saídas selecionadas viram gastos
 * (com categoria) e as entradas viram rendas (com fonte). Cada campo só
 * aparece quando há transações daquele sentido na seleção.
 */
export default function OpenFinanceLancamentos({
  conta,
  selecionadas,
  caixas,
  categorias,
  fontes,
  onImported,
  onError,
}: OpenFinanceLancamentosProps) {
  const { t } = useTranslation();
  const [caixaId, setCaixaId] = useState(conta.caixa_id ? String(conta.caixa_id) : "");
  const [categoriaId, setCategoriaId] = useState("");
  const [fonteId, setFonteId] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const saidas = selecionadas.filter((tx) => tx.tipo === "debito");
  const entradas = selecionadas.filter((tx) => tx.tipo === "credito");
  const temSaida = saidas.length > 0;
  const temEntrada = entradas.length > 0;

  const canImport =
    selecionadas.length > 0 &&
    (!temSaida || (caixaId !== "" && categoriaId !== "")) &&
    (!temEntrada || fonteId !== "") &&
    !isImporting;

  const handleImport = async () => {
    if (!canImport) return;
    setIsImporting(true);
    const ids = selecionadas.map((tx) => tx.id);
    try {
      const resultado = await openFinanceService.importarLancamentos(conta.id, {
        transacao_ids: ids,
        caixa_id: temSaida ? Number(caixaId) : null,
        categoria_id: temSaida ? Number(categoriaId) : null,
        fonte_renda_id: temEntrada ? Number(fonteId) : null,
      });
      onImported(resultado, ids);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : t("openFinance.conta.importError"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            {t("openFinance.conta.selected", { count: selecionadas.length })}
          </span>
          {temSaida && (
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              {t("openFinance.lancamentos.saidas", { count: saidas.length })}
              <span className="font-semibold text-destructive">
                {formatCurrency(soma(saidas))}
              </span>
            </span>
          )}
          {temEntrada && (
            <span className="inline-flex items-center gap-1">
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              {t("openFinance.lancamentos.entradas", { count: entradas.length })}
              <span className="font-semibold text-emerald-600">
                {formatCurrency(soma(entradas))}
              </span>
            </span>
          )}
        </div>

        {selecionadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("openFinance.lancamentos.selecione")}
          </p>
        ) : (
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              {temSaida && (
                <>
                  <Field>
                    <FieldLabel htmlFor="lanc_caixa_id">{t("faturas.form.caixa")}</FieldLabel>
                    <Select value={caixaId} onValueChange={setCaixaId}>
                      <SelectTrigger id="lanc_caixa_id">
                        <SelectValue placeholder={t("faturas.form.caixaPlaceholder")} />
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
                      <FieldDescription>{t("faturas.form.noCaixas")}</FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lanc_categoria_id">
                      {t("openFinance.lancamentos.categoria")}
                    </FieldLabel>
                    <Select value={categoriaId} onValueChange={setCategoriaId}>
                      <SelectTrigger id="lanc_categoria_id">
                        <SelectValue placeholder={t("faturas.form.categoriaPlaceholder")} />
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
                      <FieldDescription>{t("faturas.form.noCategorias")}</FieldDescription>
                    )}
                  </Field>
                </>
              )}
              {temEntrada && (
                <Field>
                  <FieldLabel htmlFor="lanc_fonte_id">
                    {t("openFinance.lancamentos.fonte")}
                  </FieldLabel>
                  <Select value={fonteId} onValueChange={setFonteId}>
                    <SelectTrigger id="lanc_fonte_id">
                      <SelectValue placeholder={t("openFinance.lancamentos.fontePlaceholder")} />
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
                    <FieldDescription>{t("openFinance.lancamentos.noFontes")}</FieldDescription>
                  )}
                </Field>
              )}
            </div>
            <FieldDescription>{t("openFinance.lancamentos.hint")}</FieldDescription>
          </FieldGroup>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={handleImport} disabled={!canImport}>
            <FileUp className="h-4 w-4" />
            {isImporting ? t("faturas.importing") : t("openFinance.lancamentos.import")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
