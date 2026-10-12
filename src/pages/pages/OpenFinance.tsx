import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { caixaService, openFinanceService } from "@/Services/api";
import type { CaixaFinanceira } from "@/types/caixa";
import type {
  ConexaoOpenFinance,
  ContaOpenFinance,
  StatusConexao,
  TipoConta,
} from "@/types/open-finance";
import {
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  PiggyBank,
  RefreshCw,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ConectarBanco from "./ConectarBanco";

const POLL_MS = 4000;
const POLL_TIMEOUT_MS = 90_000;
const SEM_CAIXA = "none";

const statusStyle: Record<StatusConexao, string> = {
  ativa: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  atualizando: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  aguardando_usuario: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  desatualizada: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  erro_login: "bg-destructive/10 text-destructive",
};

const tipoIcon: Record<TipoConta, LucideIcon> = {
  corrente: Wallet,
  poupanca: PiggyBank,
  cartao: CreditCard,
  outra: Landmark,
};

/** Conexões que precisam que o usuário passe pelo widget de novo. */
const precisaReconectar = (status: StatusConexao) =>
  status === "erro_login" ||
  status === "desatualizada" ||
  status === "aguardando_usuario";

type Aguardando = { desde: number; syncAnterior: Record<number, string | null> };

const snapshot = (conexoes: ConexaoOpenFinance[]): Aguardando => ({
  desde: Date.now(),
  syncAnterior: Object.fromEntries(conexoes.map((c) => [c.id, c.ultimo_sync_em])),
});

/** Concluído quando toda conexão sincronizou de novo ou parou num estado que exige o usuário. */
const syncConcluido = (conexoes: ConexaoOpenFinance[], aguardando: Aguardando) =>
  conexoes.every(
    (c) =>
      precisaReconectar(c.status) ||
      (c.status !== "atualizando" &&
        c.ultimo_sync_em !== null &&
        c.ultimo_sync_em !== aguardando.syncAnterior[c.id]),
  );

const expirou = (aguardando: Aguardando) =>
  Date.now() - aguardando.desde > POLL_TIMEOUT_MS;

export default function OpenFinance() {
  const { t } = useTranslation();

  const [conexoes, setConexoes] = useState<ConexaoOpenFinance[]>([]);
  const [caixas, setCaixas] = useState<CaixaFinanceira[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Sync pedido e ainda não concluído: `ultimo_sync_em` de cada conexão no momento do pedido.
  const [aguardando, setAguardando] = useState<Aguardando | null>(null);

  const carregar = useCallback(
    () => openFinanceService.listConexoes().then(setConexoes),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([openFinanceService.listConexoes(), caixaService.list()])
      .then(([conexoesData, caixasData]) => {
        if (cancelled) return;
        setConexoes(conexoesData);
        setCaixas(caixasData);
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
  }, [t]);

  // O sync roda na fila: enquanto algo está pendente, recarrega a lista periodicamente.
  const sincronizando =
    aguardando !== null ||
    conexoes.some((c) => c.status === "atualizando" || !c.ultimo_sync_em);

  useEffect(() => {
    if (!sincronizando) return;
    const timer = setTimeout(async () => {
      try {
        const data = await openFinanceService.listConexoes();
        setConexoes(data);
        if (aguardando && (syncConcluido(data, aguardando) || expirou(aguardando))) {
          setAguardando(null);
        }
      } catch {
        // Falha pontual no polling: tenta de novo no próximo ciclo.
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [sincronizando, conexoes, aguardando]);

  const acompanharSync = () => setAguardando(snapshot(conexoes));

  const handleConnected = async () => {
    setError(null);
    await carregar().catch(() => setError(t("openFinance.loadError")));
  };

  const handleSync = async (conexao: ConexaoOpenFinance) => {
    setError(null);
    try {
      await openFinanceService.sincronizar(conexao.id);
      acompanharSync();
    } catch {
      setError(t("openFinance.syncError"));
    }
  };

  const handleRemove = async (conexao: ConexaoOpenFinance) => {
    if (!window.confirm(t("openFinance.removeConfirm"))) return;
    setRemovingId(conexao.id);
    try {
      await openFinanceService.removerConexao(conexao.id);
      setConexoes((prev) => prev.filter((c) => c.id !== conexao.id));
    } catch {
      setError(t("common.deleteError"));
    } finally {
      setRemovingId(null);
    }
  };

  const handleCaixa = async (conta: ContaOpenFinance, value: string) => {
    const caixaId = value === SEM_CAIXA ? null : Number(value);
    try {
      const atualizada = await openFinanceService.vincularCaixa(conta.id, caixaId);
      setConexoes((prev) =>
        prev.map((c) => ({
          ...c,
          contas: c.contas.map((ct) =>
            ct.id === conta.id ? { ...ct, caixa_id: atualizada.caixa_id } : ct,
          ),
        })),
      );
    } catch {
      setError(t("openFinance.caixaError"));
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("openFinance.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("openFinance.subtitle")}
          </p>
        </div>
        <ConectarBanco onConnected={handleConnected} onError={setError} />
      </header>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : conexoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Landmark className="h-10 w-10 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("openFinance.empty")}
            </p>
            <ConectarBanco
              variant="outline"
              onConnected={handleConnected}
              onError={setError}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {conexoes.map((conexao) => (
            <Card key={conexao.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {conexao.instituicao_logo ? (
                      <img
                        src={conexao.instituicao_logo}
                        alt=""
                        className="h-10 w-10 rounded-md object-contain"
                      />
                    ) : (
                      <span className="rounded-md bg-primary/10 p-2 text-primary">
                        <Landmark className="h-6 w-6" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">
                        {conexao.instituicao_nome ?? t("openFinance.instituicao")}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                            statusStyle[conexao.status],
                          )}
                        >
                          {conexao.status === "atualizando" && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {t(`openFinance.status.${conexao.status}`)}
                        </span>
                        <span>
                          {conexao.ultimo_sync_em
                            ? t("openFinance.lastSync", {
                                date: formatDate(conexao.ultimo_sync_em),
                              })
                            : t("openFinance.neverSynced")}
                        </span>
                        {conexao.consentimento_expira_em && (
                          <span>
                            {t("openFinance.consentExpires", {
                              date: formatDate(conexao.consentimento_expira_em),
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {precisaReconectar(conexao.status) ? (
                      <ConectarBanco
                        conexao={conexao}
                        size="sm"
                        variant="outline"
                        onConnected={handleConnected}
                        onError={setError}
                      />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSync(conexao)}
                        disabled={sincronizando}
                        aria-label={t("openFinance.sync")}
                        title={t("openFinance.sync")}
                      >
                        <RefreshCw
                          className={cn("h-4 w-4", sincronizando && "animate-spin")}
                        />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(conexao)}
                      disabled={removingId === conexao.id}
                      aria-label={t("openFinance.remove")}
                      title={t("openFinance.remove")}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {conexao.erro && precisaReconectar(conexao.status) && (
                  <p className="mt-3 text-sm text-destructive">{conexao.erro}</p>
                )}

                {conexao.contas.length > 0 && (
                  <ul className="mt-4 divide-y rounded-md border">
                    {conexao.contas.map((conta) => {
                      const Icon = tipoIcon[conta.tipo];
                      const pendentes = conta.transacoes_pendentes ?? 0;
                      return (
                        <li
                          key={conta.id}
                          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {conta.nome}
                                {conta.numero && (
                                  <span className="ml-2 font-normal text-muted-foreground">
                                    {conta.numero}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t(`openFinance.tipo.${conta.tipo}`)}
                                {conta.saldo !== null &&
                                  ` · ${t(
                                    conta.tipo === "cartao"
                                      ? "openFinance.fatura"
                                      : "openFinance.saldo",
                                  )} ${formatCurrency(conta.saldo)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={conta.caixa_id ? String(conta.caixa_id) : SEM_CAIXA}
                              onValueChange={(v) => handleCaixa(conta, v)}
                            >
                              <SelectTrigger
                                className="w-40"
                                aria-label={t("openFinance.caixaVinculado")}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SEM_CAIXA}>
                                  {t("openFinance.semCaixa")}
                                </SelectItem>
                                {caixas.map((caixa) => (
                                  <SelectItem key={caixa.id} value={String(caixa.id)}>
                                    {caixa.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/dashboard/open-finance/contas/${conta.id}`}>
                                {pendentes > 0
                                  ? t("openFinance.review", { count: pendentes })
                                  : t("openFinance.viewTransactions")}
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
