import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Banknote,
  PiggyBank,
  Wallet,
  ArrowLeftRight,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const navItems = [
  { key: "sidebar.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "sidebar.profile", href: "/dashboard/profile", icon: User },
  { key: "sidebar.fontesRenda", href: "/dashboard/fontes-renda", icon: Wallet },
  { key: "sidebar.rendas", href: "/dashboard/rendas", icon: Banknote },
  { key: "sidebar.caixas", href: "/dashboard/caixas", icon: PiggyBank },
  {
    key: "sidebar.movimentacoes",
    href: "/dashboard/movimentacoes",
    icon: ArrowLeftRight,
  },
  { key: "sidebar.settings", href: "/dashboard/settings", icon: Settings },
];

/**
 * Lista de navegação compartilhada entre a sidebar do desktop e o drawer mobile.
 * `onNavigate` é chamado ao clicar num link (usado para fechar o drawer no mobile).
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            location.pathname === item.href
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {t(item.key)}
        </Link>
      ))}

      <Separator className="my-2" />

      <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="h-4 w-4" />
        {t("sidebar.logout")}
      </button>
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-60 border-r bg-background md:block">
      <SidebarNav />
    </aside>
  );
}
