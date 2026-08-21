import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  Home,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/programacoes", label: "Escalas", icon: ClipboardList },
  { to: "/calendario", label: "Agenda", icon: CalendarDays },
  { to: "/almoxarifado", label: "Estoque", icon: Boxes },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/financeiro", label: "Caixa", icon: Wallet },
  { to: "/equipe", label: "Equipe", icon: Users },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-3 bottom-[calc(0.85rem+var(--safe-bottom))] z-40 lg:hidden">
      <div className="grid grid-cols-7 items-end rounded-full border border-border bg-card/95 px-1.5 py-2 shadow-lg backdrop-blur">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-full px-0.5 py-0.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
