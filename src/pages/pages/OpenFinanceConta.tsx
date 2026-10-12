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
import { cn } from "@/lib/utils";
import {
  caixaService,
  categoriaGastoService,
  openFinanceService,
} from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type { CategoriaGasto } from "@/types/categoria-gasto";
import type { FaturaImportada } from "@/types/fatura";
import type {
  ContaOpenFinance,
  StatusTransacao,
  TransacaoOpenFinance,
} from "@/types/open-finance";
import {
  ArrowLeft,
  CheckCircle2,
  EyeOff,
  FileUp,
  Inbox,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

const ABAS: StatusTransacao[] = ["pendente", "ignorada", "importada"];

/** Valor com sinal no formato das faturas: compra positiva, estorno negativo. */
const valorAssinado = (tx: TransacaoOpenFinance) =>
  tx.tipo === "debito" ? Number(tx.valor) : -Number(tx.valor);

export default function OpenFinanceConta() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const contaId = Number(useParams().id);

  const [conta, setConta] = useState<ContaOpenFinance | null>(null);
  const [instituicao, setInstituicao] = useState<string | null>(null);
  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aba, setAba] = useState<StatusTransacao>("pendente");
  const [transacoes, setTransacoes] = useState<TransacaoOpenFinance[]>([]);
  const [pagina, setPagina] = useState({ atual: 1, ultima: 1, total: 0 });
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [caixaId, setCaixaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [imported, setImported] = useState<FaturaImportada | null>(null);

  const isCartao = conta?.tipo === "cartao";
  const podeSelecionar = isCartao && aba === "pendente";

  useEffect(() => {
    let cancelled = false;
    // A primeira carga já traz as pendentes; trocas de aba usam carregarTransacoes.
    Promise.all([
      openFinanceService.listConexoes(),
      caixaService.list(),
      categoriaGastoService.list(),
      openFinanceService.listTransacoes({ conta_id: contaId, status: "pendente" }),
    ])
      .then(([conexoes, caixasData, categoriasData, pendentes]) => {
        if (cancelled) return;
        const conexao = conexoes.find((c) => c.contas.some((ct) => ct.id === contaId));
        const encontrada = conexao?.contas.find((ct) => ct.id === contaId) ?? null;
        setConta(encontrada);
        setInstituicao(conexao?.instituicao_nome ?? null);
        setCaixaId(encontrada?.caixa_id ? String(encontrada.caixa_id) : "");
        setCaixas(caixasData);
        setCategorias(categoriasData);
        setTransacoes(pendentes.data);
        setPagina({
          atual: pendentes.meta.current_page,
          ultima: pendentes.meta.last_page,
          total: pendentes.meta.total,
        });
        if (!encontrada) setError(t("openFinance.conta.notFound"));
      })
      .catch(() => {
        if (!cancelled) setError(t("openFinance.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contaId, t]);

  // Descarta respostas de abas que o usuário já deixou para trás.
  const ultimaRequisicao = useRef(0);

  const carregarTransacoes = async (alvo: ContaOpenFinance, status: StatusTransacao) => {
    const requisicao = ++ultimaRequisicao.current;
    setIsLoadingTx(true);
    setSelecionadas(new Set());
    setTransacoes([]);
    try {
      const res = await openFinanceService.listTransacoes({ conta_id: alvo.id, status });
      if (requisicao !== ultimaRequisicao.current) return;
      setTransacoes(res.data);
      setPagina({
        atual: res.meta.current_page,
        ultima: res.meta.last_page,
        total: res.meta.total,
      });
    } catch {
      if (requisicao === ultimaRequisicao.current) setError(t("openFinance.conta.loadTxError"));
    } finally {
      if (requisicao === ultimaRequisicao.current) setIsLoadingTx(false);
    }
  };

  const trocarAba = (status: StatusTransacao) => {
    setAba(status);
    if (conta) carregarTransacoes(conta, status);
  };

  const carregarMais = async () => {
    if (!conta) return;
    setIsLoadingTx(true);
    try {
      const res = await openFinanceService.listTransacoes({
        conta_id: conta.id,
        status: aba,
        page: pagina.atual + 1,
      });
      setTransacoes((prev) => [...prev, ...res.data]);
      setPagina((p) => ({ ...p, atual: res.meta.current_page, ultima: res.meta.last_page }));
    } catch {
      setError(t("openFinance.conta.loadTxError"));
    } finally {
      setIsLoadingTx(false);
    }
  };

  const alterarStatus = async (tx: TransacaoOpenFinance, status: "pendente" | "ignorada") => {
    setUpdatingId(tx.id);
    try {
      await openFinanceService.atualizarTransacao(tx.id, status);
      // Sai da aba atual: ela agora pertence à outra.
      setTransacoes((prev) => prev.filter((p) => p.id !== tx.id));
      setPagina((p) => ({ ...p, total: p.total - 1 }));
      setSelecionadas((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    } catch {
      setError(t("openFinance.conta.updateError"));
    } finally {
      setUpdatingId(null);
    }
  };

  const toggle = (id: number) =>
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const todasSelecionadas =
    transacoes.length > 0 && transacoes.every((tx) => selecionadas.has(tx.id));

  const toggleTodas = () =>
    setSelecionadas(todasSelecionadas ? new Set() : new Set(transacoes.map((tx) => tx.id)));

  const totalSelecionado = useMemo(
    () =>
      transacoes
        .filter((tx) => selecionadas.has(tx.id))
        .reduce((soma, tx) => soma + valorAssinado(tx), 0),
    [transacoes, selecionadas],
  );

  const handleImport = async () => {
    if (!conta || selecionadas.size === 0 || !caixaId || !categoriaId) return;
    setError(null);
    setIsImporting(true);
    try {
      const fatura = await openFinanceService.importarFatura(conta.id, {
        transacao_ids: [...selecionadas],
        caixa_id: Number(caixaId),
        categoria_id: Number(categoriaId),
        descricao: descricao.trim() || null,
      });
      setImported(fatura);
      setTransacoes((prev) => prev.filter((tx) => !selecionadas.has(tx.id)));
      setPagina((p) => ({ ...p, total: p.total - selecionadas.size }));
      setSelecionadas(new Set());
      setDescricao("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("openFinance.conta.importError"));
    } finally {
      setIsImporting(false);
    }
  };

  const canImport =
    selecionadas.size > 0 && caixaId !== "" && categoriaId !== "" && !isImporting;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <Link
          to="/dashboard/open-finance"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("openFinance.conta.voltar")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {conta?.nome ?? t("openFinance.conta.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[instituicao, conta?.numero].filter(Boolean).join(" · ") ||
            t("openFinance.conta.subtitle")}
        </p>
      </header>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !conta ? null : (
        <div className="flex flex-col gap-4">
          {imported && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <p className="text-sm">
                    {t("openFinance.conta.success", { count: imported.itens.length })}{" "}
                    <span className="font-semibold">
                      {formatCurrency(imported.valor_total)}
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/dashboard/faturas/${imported.id}`)}
                >
                  {t("faturas.verFatura")}
                </Button>
              </CardContent>
            </Card>
          )}

          {!isCartao && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              {t("openFinance.conta.somenteCartao")}
            </p>
          )}

          <div className="flex gap-1 border-b" role="tablist">
            {ABAS.map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={aba === status}
                onClick={() => trocarAba(status)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  aba === status
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`openFinance.conta.abas.${status}`)}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              {isLoadingTx && transacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : transacoes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t(`openFinance.conta.empty.${aba}`)}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t("openFinance.conta.count", { count: pagina.total })}
                  </p>
                  <div className="max-h-[28rem] overflow-y-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50 text-left text-xs uppercase text-muted-foreground backdrop-blur">
                        <tr>
                          {podeSelecionar && (
                            <th className="w-10 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={todasSelecionadas}
                                onChange={toggleTodas}
                                aria-label={t("openFinance.conta.selectAll")}
                                className="h-4 w-4 accent-primary"
                              />
                            </th>
                          )}
                          <th className="px-3 py-2 font-medium">{t("faturas.table.data")}</th>
                          <th className="px-3 py-2 font-medium">
                            {t("faturas.table.descricao")}
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            {t("faturas.table.valor")}
                          </th>
                          {aba !== "importada" && <th className="w-10 px-3 py-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {transacoes.map((tx) => {
                          const valor = valorAssinado(tx);
                          return (
                            <tr
                              key={tx.id}
                              className={cn(
                                "border-t",
                                selecionadas.has(tx.id) && "bg-primary/5",
                              )}
                            >
                              {podeSelecionar && (
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selecionadas.has(tx.id)}
                                    onChange={() => toggle(tx.id)}
                                    aria-label={tx.descricao}
                                    className="h-4 w-4 accent-primary"
                                  />
                                </td>
                              )}
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {formatDate(tx.data)}
                              </td>
                              <td className="px-3 py-2">
                                <span>{tx.descricao}</span>
                                <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {tx.categoria_externa && <span>{tx.categoria_externa}</span>}
                                  {!tx.confirmada && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      {t("openFinance.conta.naoConfirmada")}
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td
                                className={cn(
                                  "whitespace-nowrap px-3 py-2 text-right font-medium",
                                  valor < 0 && "text-emerald-600",
                                )}
                              >
                                {formatCurrency(valor)}
                              </td>
                              {aba !== "importada" && (
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={updatingId === tx.id}
                                    onClick={() =>
                                      alterarStatus(
                                        tx,
                                        aba === "pendente" ? "ignorada" : "pendente",
                                      )
                                    }
                                    aria-label={
                                      aba === "pendente"
                                        ? t("openFinance.conta.ignorar")
                                        : t("openFinance.conta.restaurar")
                                    }
                                    title={
                                      aba === "pendente"
                                        ? t("openFinance.conta.ignorar")
                                        : t("openFinance.conta.restaurar")
                                    }
                                  >
                                    {aba === "pendente" ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Undo2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {pagina.atual < pagina.ultima && (
                    <div className="mt-3 flex justify-center">
                      <Button variant="outline" size="sm" onClick={carregarMais} disabled={isLoadingTx}>
                        {isLoadingTx ? t("common.loading") : t("openFinance.conta.loadMore")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {podeSelecionar && transacoes.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("openFinance.conta.selected", { count: selecionadas.size })}
                  </span>
                  <span className="text-lg font-semibold text-destructive">
                    {formatCurrency(totalSelecionado)}
                  </span>
                </div>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="caixa_id">{t("faturas.form.caixa")}</FieldLabel>
                      <Select value={caixaId} onValueChange={setCaixaId}>
                        <SelectTrigger id="caixa_id">
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
                      <FieldLabel htmlFor="categoria_id">
                        {t("faturas.form.categoria")}
                      </FieldLabel>
                      <Select value={categoriaId} onValueChange={setCategoriaId}>
                        <SelectTrigger id="categoria_id">
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
                  </div>
                  <Field>
                    <FieldLabel htmlFor="descricao">{t("faturas.form.descricao")}</FieldLabel>
                    <Input
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder={t("openFinance.conta.descricaoPlaceholder", {
                        nome: conta.nome,
                      })}
                    />
                  </Field>
                </FieldGroup>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleImport} disabled={!canImport}>
                    <FileUp className="h-4 w-4" />
                    {isImporting ? t("faturas.importing") : t("openFinance.conta.import")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
