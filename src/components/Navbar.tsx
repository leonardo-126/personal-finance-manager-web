import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Navbar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PiggyBank className="size-4" />
            </span>
            {t("navbar.brand")}
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              {t("navbar.home")}
            </Link>
            <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground">
              {t("navbar.courses")}
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              {t("navbar.pricing")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              {t("navbar.login")}
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">
              {t("navbar.signup")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
