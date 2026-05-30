import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "./ui/input";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password_confirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (
    event,
  ) => {
    event.preventDefault();
    setError(null);

    if (password !== password_confirmation) {
      setError(t("signup.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ name, email, password, password_confirmation });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("signup.genericError");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center border-gray-100">
          <h1 className="text-2xl font-bold">{t("signup.title")}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t("signup.description")}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">{t("signup.name")}</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder={t("signup.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t("signup.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-background"
          />
          <FieldDescription>{t("signup.emailDescription")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t("signup.password")}</FieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-background"
          />
          <FieldDescription>{t("signup.passwordDescription")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">
            {t("signup.password_confirmation")}
          </FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            value={password_confirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            className="bg-background"
          />
          <FieldDescription>
            {t("signup.password_confirmationDescription")}
          </FieldDescription>
        </Field>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("signup.submitting") : t("signup.submit")}
          </Button>
        </Field>
        <FieldSeparator>{t("signup.orContinueWith")}</FieldSeparator>
        <Field>
          <FieldDescription className="px-6 text-center">
            {t("signup.hasAccount")}{" "}
            <Link to="/login" className="underline underline-offset-4">
              {t("signup.loginLink")}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
