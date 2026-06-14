import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFound() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const backHref = isAuthenticated ? "/dashboard" : "/";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-9" />
      </div>

      <p className="bg-linear-to-b from-foreground to-foreground/40 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
        404
      </p>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {t("notFound.title")}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("notFound.description")}
      </p>

      <Link to={backHref} className="mt-8">
        <Button size="lg">{t("notFound.backHome")}</Button>
      </Link>
    </div>
  );
}
