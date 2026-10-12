import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { openFinanceService } from "@/Services/api";
import type { ConnectToken } from "@/types/open-finance";
import { Landmark, RefreshCw } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

// O widget só é baixado quando o usuário clica em conectar.
const PluggyConnect = lazy(() =>
  import("react-pluggy-connect").then((m) => ({ default: m.PluggyConnect })),
);

interface ConectarBancoProps {
  /** Quando informado, reautoriza essa conexão em vez de criar uma nova. */
  conexao?: { id: number };
  onConnected: () => void;
  onError: (message: string) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

/**
 * Botão que abre o widget do agregador e registra a conexão no backend.
 * Com o provider "fake" (desenvolvimento) não há widget: a conexão é
 * registrada direto com um id fictício.
 */
export default function ConectarBanco({
  conexao,
  onConnected,
  onError,
  variant = "default",
  size = "default",
}: ConectarBancoProps) {
  const { t } = useTranslation();
  const [connect, setConnect] = useState<ConnectToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const registrar = async (externalId: string) => {
    try {
      await openFinanceService.registrarConexao(externalId);
      onConnected();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : t("openFinance.connectError"));
    }
  };

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const token = await openFinanceService.connectToken(conexao?.id);
      if (token.provider === "fake") {
        if (conexao) {
          await openFinanceService.sincronizar(conexao.id);
          onConnected();
        } else {
          await registrar(`fake-${Date.now()}`);
        }
        return;
      }
      setConnect(token);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : t("openFinance.connectError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={isLoading}>
        {conexao ? <RefreshCw className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
        {isLoading
          ? t("openFinance.opening")
          : conexao
            ? t("openFinance.reconnect")
            : t("openFinance.connect")}
      </Button>

      {connect && (
        <Suspense fallback={null}>
          <PluggyConnect
            connectToken={connect.token}
            includeSandbox={import.meta.env.DEV}
            onSuccess={async ({ item }) => {
              setConnect(null);
              await registrar(item.id);
            }}
            onError={(error) => onError(error.message)}
            onClose={() => setConnect(null)}
          />
        </Suspense>
      )}
    </>
  );
}
