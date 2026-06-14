import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Banknote,
  PiggyBank,
  Wallet,
  ArrowLeftRight,
  Tag,
  Receipt,
  ListChecks,
  Settings,
  User,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type NavItem = { key: string; href: string; icon: LucideIcon };
type NavGroup = { labelKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: "sidebar.groups.overview",
    items: [
      { key: "sidebar.dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    labelKey: "sidebar.groups.income",
    items: [
      { key: "sidebar.fontesRenda", href: "/dashboard/fontes-renda", icon: Wallet },
      { key: "sidebar.rendas", href: "/dashboard/rendas", icon: Banknote },
    ],
  },
  {
    labelKey: "sidebar.groups.expenses",
    items: [
      { key: "sidebar.categoriasGastos", href: "/dashboard/categorias-gastos", icon: Tag },
      { key: "sidebar.gastos", href: "/dashboard/gastos", icon: Receipt },
      { key: "sidebar.gastosItens", href: "/dashboard/gastos-itens", icon: ListChecks },
    ],
  },
  {
    labelKey: "sidebar.groups.cash",
    items: [
      { key: "sidebar.caixas", href: "/dashboard/caixas", icon: PiggyBank },
      { key: "sidebar.movimentacoes", href: "/dashboard/movimentacoes", icon: ArrowLeftRight },
    ],
  },
  {
    labelKey: "sidebar.groups.account",
    items: [
      { key: "sidebar.profile", href: "/dashboard/profile", icon: User },
      { key: "sidebar.settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

/**
 * Lista de navegação compartilhada entre a sidebar do desktop e o drawer mobile.
 * `onNavigate` é chamado ao clicar num link (usado para fechar o drawer no mobile).
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex-1 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.labelKey} className="mb-5 last:mb-0">
            <p className="px-3 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t(group.labelKey)}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t("sidebar.logout")}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-60 flex-col border-r bg-sidebar md:flex">
      <SidebarNav />
    </aside>
  );
}
