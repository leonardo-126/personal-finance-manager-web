import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  caixaService,
  categoriaGastoService,
  faturaService,
} from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { FaturaImportada, FaturaPreview } from "@/types/fatura";
import { CheckCircle2, CreditCard, FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Faturas() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<FaturaPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [caixaId, setCaixaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<FaturaImportada | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([caixaService.list(), categoriaGastoService.list()])
      .then(([caixasData, categoriasData]) => {
        if (cancelled) return;
        setCaixas(caixasData);
        setCategorias(categoriasData);
      })
      .catch(() => {
        if (!cancelled) setError(t("faturas.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleFile = async (file: File | null) => {
    setArquivo(file);
    setPreview(null);
    setImported(null);
    setError(null);
    if (!file) return;

    setIsPreviewing(true);
    try {
      const data = await faturaService.preview(file);
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError(
        err instanceof ApiError ? err.message : t("faturas.previewError"),
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const resetForm = () => {
    setArquivo(null);
    setPreview(null);
    setImported(null);
    setError(null);
    setCaixaId("");
    setCategoriaId("");
    setDescricao("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!arquivo || !caixaId || !categoriaId) return;
    setError(null);
    setIsImporting(true);
    try {
      const result = await faturaService.importar({
        arquivo,
        caixa_id: Number(caixaId),
        categoria_id: Number(categoriaId),
        descricao: descricao.trim() || null,
      });
      setImported(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("faturas.importError"),
      );
    } finally {
      setIsImporting(false);
    }
  };

  const canImport =
    Boolean(arquivo) &&
    Boolean(preview) &&
    caixaId !== "" &&
    categoriaId !== "" &&
    !isImporting;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("faturas.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("faturas.subtitle")}</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : imported ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">
              {t("faturas.success", { count: imported.itens.length })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("faturas.total")}:{" "}
              <span className="font-semibold text-destructive">
                {formatCurrency(imported.valor_total)}
              </span>
            </p>
            <Button variant="outline" onClick={resetForm}>
              {t("faturas.importAnother")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="arquivo">
                    {t("faturas.form.arquivo")}
                  </FieldLabel>
                  <input
                    ref={fileInputRef}
                    id="arquivo"
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm text-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
                  />
                  <FieldDescription>
                    {t("faturas.form.arquivoHint")}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="caixa_id">
                    {t("faturas.form.caixa")}
                  </FieldLabel>
                  <Select value={caixaId} onValueChange={setCaixaId}>
                    <SelectTrigger id="caixa_id">
                      <SelectValue
                        placeholder={t("faturas.form.caixaPlaceholder")}
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
                      {t("faturas.form.noCaixas")}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="categoria_id">
                    {t("faturas.form.categoria")}
                  </FieldLabel>
                  <Select value={categoriaId} onValueChange={setCategoriaId}>
                    <SelectTrigger id="categoria_id">
                      <SelectValue
                        placeholder={t("faturas.form.categoriaPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem
                          key={categoria.id}
                          value={String(categoria.id)}
                        >
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categorias.length === 0 && (
                    <FieldDescription>
                      {t("faturas.form.noCategorias")}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="descricao">
                    {t("faturas.form.descricao")}
                  </FieldLabel>
                  <Input
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder={t("faturas.form.descricaoPlaceholder")}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {isPreviewing && (
            <p className="text-sm text-muted-foreground">
              {t("faturas.reading")}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {preview && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("faturas.transactionsCount", {
                      count: preview.quantidade,
                    })}
                  </span>
                  <span className="text-lg font-semibold text-destructive">
                    {formatCurrency(preview.total)}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t("faturas.table.data")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("faturas.table.descricao")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("faturas.table.valor")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.transacoes.map((tx, i) => (
                        <tr key={i} className="border-t">
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {tx.data ? formatDate(tx.data) : "—"}
                          </td>
                          <td className="px-3 py-2">{tx.descricao}</td>
                          <td
                            className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                              tx.valor < 0 ? "text-emerald-600" : ""
                            }`}
                          >
                            {formatCurrency(tx.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isImporting}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleImport} disabled={!canImport}>
                    <FileUp className="h-4 w-4" />
                    {isImporting
                      ? t("faturas.importing")
                      : t("faturas.import")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!preview && !isPreviewing && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("faturas.empty")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
