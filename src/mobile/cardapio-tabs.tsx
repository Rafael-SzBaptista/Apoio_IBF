import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/cardapio", label: "Alimentação", match: (path: string) => path === "/cardapio" || path === "/cardapio/" },
  {
    to: "/cardapio/precos",
    label: "Ingredientes",
    match: (path: string) => path === "/cardapio/precos" || path.startsWith("/cardapio/precos/"),
  },
] as const;

export function MobileCardapioTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div
      role="tablist"
      aria-label="Seções do cardápio"
      className="mb-4 grid grid-cols-2 gap-2 lg:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-xl border px-2.5 py-1.5 text-center text-xs font-medium transition-colors",
              active
                ? "border-primary/30 bg-card text-foreground shadow-sm"
                : "border-border bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
