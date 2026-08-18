import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  MoreHorizontal,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/programacoes", label: "Escalas", icon: ClipboardList },
  { to: "/calendario", label: "Agenda", icon: CalendarDays },
  { to: "/almoxarifado", label: "Estoque", icon: Boxes },
  { to: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/financeiro", label: "Caixa", icon: Wallet },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const moreActive = pathname === "/equipe" || pathname.startsWith("/equipe/");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <nav className="fixed inset-x-3 bottom-[max(0.85rem,env(safe-area-inset-bottom))] z-40 lg:hidden">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-full px-0.5 py-0.5 text-[10px] font-medium outline-none",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="Mais"
            >
              <MoreHorizontal className="size-5" />
              <span>Mais</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 min-w-40">
            <DropdownMenuItem asChild>
              <Link to="/equipe">
                <Users className="size-4" /> Equipe
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="size-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
