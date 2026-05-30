import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        {t("notFound.title")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("notFound.description")}
      </p>
      <Link to="/" className="mt-8">
        <Button>{t("notFound.backHome")}</Button>
      </Link>
    </div>
  );
}
