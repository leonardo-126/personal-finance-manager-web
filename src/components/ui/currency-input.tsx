import * as React from "react";

import { Input } from "@/components/ui/input";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface CurrencyInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type"
  > {
  /** Valor em reais (ex.: 223003.23). */
  value: number;
  /** Recebe o novo valor em reais sempre que o usuário digita. */
  onValueChange: (value: number) => void;
}

/**
 * Campo monetário com máscara de BRL. O usuário digita apenas dígitos e o
 * valor é interpretado como centavos (ex.: "22300323" → R$ 223.003,23).
 */
export function CurrencyInput({
  value,
  onValueChange,
  ...props
}: CurrencyInputProps) {
  const cents = Math.round((Number.isFinite(value) ? value : 0) * 100);
  const display = cents > 0 ? formatter.format(cents / 100) : "";

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const digits = event.target.value.replace(/\D/g, "");
    const nextCents = digits ? parseInt(digits, 10) : 0;
    onValueChange(nextCents / 100);
  };

  return (
    <Input
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={formatter.format(0)}
      {...props}
    />
  );
}
