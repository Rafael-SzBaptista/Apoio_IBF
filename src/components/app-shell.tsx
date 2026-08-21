import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Boxes,
  UtensilsCrossed,
  Wallet,
  Users,
  LogOut,
  Home,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMember, useIsAdmin } from "@/hooks/use-session";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { MobileNav, MobileProfileButton } from "@/mobile";
import { AppLogo } from "@/components/app-logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SIDEBAR_COLLAPSED_KEY = "apoio-sidebar-collapsed";

function readSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

type NavChild = {
  to: string;
  label: string;
};

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/programacoes", label: "Programações", icon: ClipboardList },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/almoxarifado", label: "Almoxarifado", icon: Boxes },
  {
    to: "/cardapio",
    label: "Cardápio",
    icon: UtensilsCrossed,
    children: [
      { to: "/cardapio", label: "Alimentações" },
      { to: "/cardapio/precos", label: "Preços" },
    ],
  },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/equipe", label: "Equipe", icon: Users },
];

export function AppShell({
  actions,
  children,
  wide,
  fill,
}: {
  actions?: ReactNode | undefined;
  children: ReactNode;
  wide?: boolean;
  fill?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: member } = useCurrentMember();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [sidebarReady, setSidebarReady] = useState(false);

  useEffect(() => {
    setSidebarReady(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const renderNav = (iconOnly: boolean) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        if (item.children) {
          return (
            <NavGroup
              key={item.to}
              item={item}
              pathname={pathname}
              iconOnly={iconOnly}
            />
          );
        }
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <NavLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            active={active}
            iconOnly={iconOnly}
          />
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh bg-background lg:flex lg:h-svh lg:overflow-hidden">
      <TooltipProvider delayDuration={0}>
        <div className="relative z-40 hidden h-svh shrink-0 lg:block">
          <aside
            className={cn(
              "flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar",
              sidebarReady && "transition-[width] duration-200 ease-in-out",
              collapsed ? "w-[4.5rem] px-1.5 py-4" : "w-56 p-3",
            )}
          >
            <Brand collapsed={collapsed} />
            <div
              className={cn(
                "mt-6 min-h-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-none",
                collapsed && "w-full",
              )}
            >
              {renderNav(collapsed)}
            </div>
            <Footer
              member={member?.full_name}
              isAdmin={isAdmin}
              collapsed={collapsed}
              onSignOut={signOut}
            />
          </aside>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="absolute top-1/2 right-0 z-40 flex size-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>
      </TooltipProvider>

      <main
        className={cn(
          "scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(7rem+var(--safe-bottom))] lg:h-svh lg:pb-0",
          fill && "lg:overflow-hidden",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full pt-[calc(0.75rem+var(--safe-top))] sm:pt-[calc(1rem+var(--safe-top))] lg:pt-[calc(1rem+var(--safe-top))]",
            fill
              ? "pb-[calc(5rem+var(--safe-bottom))] sm:pb-[calc(7rem+var(--safe-bottom))] lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-8"
              : "pb-[calc(5rem+var(--safe-bottom))] sm:pb-[calc(7rem+var(--safe-bottom))] lg:pb-32",
            wide ? "max-w-none px-3 sm:px-3 lg:px-4 xl:px-5 2xl:px-6" : "max-w-6xl px-4 sm:px-5",
          )}
        >
          <div
            className={cn(
              "mb-10 flex items-center gap-2",
              actions ? "lg:mb-4 lg:justify-end" : "lg:hidden",
            )}
          >
            <AppLogo
              alt="Ministério Apoio"
              width={80}
              height={96}
              className="mr-auto h-10 w-auto shrink-0 object-contain lg:hidden"
            />
            {actions ? (
              <div className="hidden flex-wrap justify-end gap-2 lg:flex">{actions}</div>
            ) : null}
            <div className="lg:hidden">
              <MobileProfileButton
                member={member?.full_name ?? null}
                isAdmin={isAdmin}
                onSignOut={() => {
                  void signOut();
                }}
              />
            </div>
          </div>
          {fill ? (
            <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

function isCardapioPrecos(pathname: string) {
  return pathname === "/cardapio/precos" || pathname.startsWith("/cardapio/precos/");
}

function isCardapioAlimentacoes(pathname: string) {
  if (isCardapioPrecos(pathname)) return false;
  return pathname === "/cardapio" || pathname === "/cardapio/" || pathname.startsWith("/cardapio/");
}

function navItemClass(active: boolean, iconOnly?: boolean) {
  return cn(
    "flex items-center rounded-lg text-sm font-medium transition-colors",
    iconOnly ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

function NavGroup({
  item,
  pathname,
  iconOnly,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  iconOnly?: boolean;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const inSection = pathname === item.to || pathname.startsWith(`${item.to}/`);
  const [open, setOpen] = useState(inSection);

  useEffect(() => {
    setOpen(inSection);
  }, [inSection]);

  const parentActive = iconOnly && inSection;

  if (iconOnly) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" className={cn("w-full", navItemClass(Boolean(parentActive), true))}>
                <item.icon className="size-4 shrink-0" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="center"
          sideOffset={12}
          className="min-w-[10.5rem] border-0 bg-primary p-1 text-primary-foreground shadow-md"
        >
          {children.map((child) => {
            const active =
              child.to === "/cardapio/precos"
                ? isCardapioPrecos(pathname)
                : isCardapioAlimentacoes(pathname);
            return (
              <DropdownMenuItem
                key={child.to}
                asChild
                className={cn(
                  "rounded-md text-primary-foreground focus:bg-primary-foreground/15 focus:text-primary-foreground",
                  active && "bg-primary-foreground/20",
                )}
              >
                <Link to={child.to} onClick={onNavigate}>
                  {child.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn("w-full", navItemClass(false), "pr-2")}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-sidebar-border pl-2">
          {children.map((child) => {
            const active =
              child.to === "/cardapio/precos"
                ? isCardapioPrecos(pathname)
                : isCardapioAlimentacoes(pathname);
            return (
              <Link
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
  iconOnly,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  iconOnly?: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link to={to} onClick={onNavigate} className={navItemClass(active, iconOnly)}>
      <Icon className="size-4 shrink-0" />
      {!iconOnly && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!iconOnly) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Brand({ collapsed }: { collapsed?: boolean } = {}) {
  return (
    <div
      className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}
      title={collapsed ? "Apoio" : undefined}
    >
      <AppLogo
        alt={collapsed ? "Apoio" : ""}
        width={80}
        height={96}
        variant="white"
        className={cn("shrink-0 object-contain", collapsed ? "size-14" : "h-12 w-auto max-h-12")}
      />
      {!collapsed && (
        <span className="font-display text-lg font-bold text-sidebar-foreground">Apoio</span>
      )}
    </div>
  );
}

function Footer({
  member,
  isAdmin,
  collapsed,
  onSignOut,
}: {
  member?: string | undefined | null;
  isAdmin: boolean;
  collapsed?: boolean;
  onSignOut: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const initials = (member ?? "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const avatar = (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
      {initials}
    </span>
  );

  const themeItems = (
    <>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="size-4" /> Claro
        {theme === "light" ? <Check className="ml-auto size-4" /> : null}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="size-4" /> Escuro
        {theme === "dark" ? <Check className="ml-auto size-4" /> : null}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );

  if (collapsed) {
    return (
      <div className="mt-3 border-t border-sidebar-border pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mx-auto flex size-9 items-center justify-center rounded-full outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2"
              aria-label="Conta"
            >
              {avatar}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end">
            {themeItems}
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="size-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-sidebar-border pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2"
          >
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {member ?? "Membro"}
              </span>
              <span className="block text-xs text-sidebar-foreground/60">
                {isAdmin ? "Administrador" : "Membro"}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-sidebar-foreground/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-48">
          {themeItems}
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="size-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
