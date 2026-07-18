import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { authService, faturaPublicaService } from "@/Services/api";
import type { FaturaPublica } from "@/types/fatura-share";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function FaturaCompartilhada() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<FaturaPublica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    // Garante o cookie CSRF antes de qualquer mutação (Sanctum stateful).
    authService
      .csrfCookie()
      .catch(() => {})
      .then(() => faturaPublicaService.show(token))
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(t("faturaCompartilhada.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const meuTotal = useMemo(() => {
    if (!data) return 0;
    return data.fatura.itens
      .filter((i) => i.pessoa_id === data.eu.id)
      .reduce((s, i) => s + Number(i.valor), 0);
  }, [data]);

  /** Marca/desmarca um item como sendo desta pessoa (otimista + persiste). */
  const toggleItem = async (itemId: number, meu: boolean) => {
    if (!token || !data) return;

    setData((prev) =>
      prev
        ? {
            ...prev,
            fatura: {
              ...prev.fatura,
              itens: prev.fatura.itens.map((item) =>
                item.id === itemId
                  ? { ...item, pessoa_id: meu ? prev.eu.id : null }
                  : item,
              ),
            },
          }
        : prev,
    );

    try {
      const atualizado = await faturaPublicaService.marcarItem(
        token,
        itemId,
        meu,
      );
      // Sincroniza com a resposta do servidor (mantém quem realmente ficou).
      setData((prev) =>
        prev
          ? {
              ...prev,
              fatura: {
                ...prev.fatura,
                itens: prev.fatura.itens.map((item) =>
                  item.id === itemId
                    ? { ...item, pessoa_id: atualizado.pessoa_id }
                    : item,
                ),
              },
            }
          : prev,
      );
    } catch {
      // Em caso de erro, recarrega para voltar ao estado do servidor.
      faturaPublicaService
        .show(token)
        .then(setData)
        .catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-destructive" role="alert">
          {error ?? t("faturaCompartilhada.loadError")}
        </p>
      </div>
    );
  }

  const { eu, fatura } = data;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: eu.cor ?? "#94a3b8" }}
            />
            {t("faturaCompartilhada.ola", { nome: eu.nome })}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            {fatura.descricao || t("faturaCompartilhada.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(fatura.data_gasto)}
          </p>
        </header>

        {/* Instrução + seu total */}
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-sm font-semibold">
                {t("faturaCompartilhada.hintTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("faturaCompartilhada.hint")}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-xs text-muted-foreground">
                {t("faturaCompartilhada.seuTotal")}
              </span>
              <span className="text-lg font-semibold">
                {formatCurrency(meuTotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lista de itens */}
        <Card>
          <CardContent className="p-2">
            <ul className="flex flex-col">
              {fatura.itens.map((item) => {
                const meu = item.pessoa_id === eu.id;
                // Item já marcado por outra pessoa (nome vem no payload).
                const deOutro =
                  item.pessoa_id !== null && item.pessoa_id !== eu.id;
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={meu}
                        onChange={(e) => toggleItem(item.id, e.target.checked)}
                        className="h-5 w-5 shrink-0 accent-primary"
                        aria-label={t("faturaCompartilhada.marcar", {
                          nome: item.nome,
                        })}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{item.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.data_transacao
                            ? formatDate(item.data_transacao)
                            : ""}
                          {deOutro && item.pessoa && (
                            <span className="ml-1 inline-flex items-center gap-1">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: item.pessoa.cor ?? "#94a3b8",
                                }}
                              />
                              {t("faturaCompartilhada.de", {
                                nome: item.pessoa.nome,
                              })}
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={
                          meu
                            ? "whitespace-nowrap text-sm font-semibold"
                            : "whitespace-nowrap text-sm font-medium text-muted-foreground"
                        }
                      >
                        {formatCurrency(Number(item.valor))}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          {t("faturaCompartilhada.rodape")}
        </p>
      </div>
    </div>
  );
}
