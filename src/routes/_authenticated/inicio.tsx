import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton } from "@/components/apoio-ui";
import { Card } from "@/components/ui/card";
import { SummaryDonut } from "@/components/summary-donut";
import { useEvents, useFinance, scopeEventsForUser, type FinanceListItem } from "@/hooks/use-data";
import { useCurrentMember, useIsAdmin } from "@/hooks/use-session";
import { isEventCompleted } from "@/lib/constants";
import { BRL, todayIso } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";

const HomeMascot = lazy(() => import("@/components/home-mascot"));

export const Route = createFileRoute("/_authenticated/inicio")({
  ssr: false,
  component: InicioPage,
});

function isPendingReimbursement(row: FinanceListItem) {
  return (
    row.kind === "gasto" &&
    (row.reimbursement_status === "pendente" || row.reimbursement_status === "solicitado")
  );
}

function MobileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <Card className="min-w-0 px-2 py-2">
      <div className="flex flex-col items-center gap-1 text-center">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <p className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground">{label}</p>
        <div className="line-clamp-2 w-full font-display text-xs font-semibold leading-tight">{value}</div>
      </div>
    </Card>
  );
}

function DesktopInsight({
  icon: Icon,
  iconWrap,
  label,
  value,
  hint,
  featured,
  action,
  trailing,
}: {
  icon: LucideIcon;
  iconWrap: string;
  label: string;
  value: ReactNode;
  hint: ReactNode;
  featured?: boolean;
  action?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "flex items-center gap-4 rounded-2xl border-0 p-4 shadow-sm",
        featured
          ? "bg-sidebar text-sidebar-foreground"
          : "bg-card",
      )}
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", iconWrap)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            featured ? "text-sidebar-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            "mt-0.5 truncate font-display text-2xl font-semibold leading-tight",
            featured && "text-sidebar-foreground",
          )}
        >
          {value}
        </div>
        <p
          className={cn(
            "mt-1 truncate text-sm",
            featured ? "text-sidebar-foreground/75" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      </div>
      {action}
      {trailing}
    </Card>
  );
}

function PillLink({
  to,
  params,
  className,
  children,
}: {
  to: "/financeiro" | "/programacoes" | "/programacoes/$id";
  params?: { id: string };
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        className,
      )}
    >
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

function DonutCard({
  label,
  display,
  fill,
  caption,
  delayMs,
  badge: Badge,
  badgeClass,
}: {
  label: string;
  display: number;
  fill: string;
  caption: string;
  delayMs?: number;
  badge: LucideIcon;
  badgeClass: string;
}) {
  return (
    <Card className="relative rounded-2xl border-0 p-4 shadow-sm">
      <span className={cn("absolute top-3 right-3 grid size-8 place-items-center rounded-xl", badgeClass)}>
        <Badge className="size-4" />
      </span>
      <SummaryDonut
        hideLabel
        size="sm"
        delayMs={delayMs}
        label={label}
        display={display}
        fill={fill}
        caption={caption}
      />
    </Card>
  );
}

function InicioPage() {
  const events = useEvents();
  const finance = useFinance();
  const isAdmin = useIsAdmin();
  const { data: me } = useCurrentMember();
  const today = todayIso();
  const month = today.slice(0, 7);
  const visible = scopeEventsForUser(events.data ?? [], isAdmin, me?.id);

  const next = visible
    .filter((event) => event.event_date >= today && !isEventCompleted(event.status))
    .at(0);

  const monthEntries = (finance.data ?? []).filter((row) => row.entry_date.startsWith(month));
  const gastos = monthEntries
    .filter((r) => r.kind === "gasto")
    .reduce((s, r) => s + Number(r.amount), 0);
  const receitas = monthEntries
    .filter((r) => r.kind === "receita")
    .reduce((s, r) => s + Number(r.amount), 0);
  const pendingReimbursements = (finance.data ?? []).filter(isPendingReimbursement).length;
  const openEvents = visible.filter((event) => !isEventCompleted(event.status)).length;
  const doneEvents = visible.filter((event) => isEventCompleted(event.status)).length;

  const loading = events.isLoading || finance.isLoading;
  const nextHint = next
    ? `${next.event_date.split("-").reverse().join("/")}${next.food_label ? ` · ${next.food_label}` : ""}`
    : "Nenhuma programação futura cadastrada.";

  return (
    <AppShell wide>
      {events.error && <DbBanner error={events.error} />}
      {finance.error && <DbBanner error={finance.error} />}
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)] lg:gap-10 xl:gap-14 lg:pt-0">
          <div className="space-y-3 lg:space-y-4">
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              <MobileStat
                icon={Wallet}
                label="Saldo do mês"
                value={BRL.format(receitas - gastos)}
              />
              <MobileStat
                icon={CalendarDays}
                label="Próxima programação"
                value={next?.title ?? "Nenhuma no radar"}
              />
              <MobileStat
                icon={Receipt}
                label="Reembolsos pendentes"
                value={pendingReimbursements}
              />
            </div>

            <div className="hidden space-y-3 lg:block">
              <DesktopInsight
                featured
                icon={Wallet}
                iconWrap="bg-white/12 text-sidebar-foreground"
                label="Saldo do mês"
                value={BRL.format(receitas - gastos)}
                hint={
                  <>
                    <span className="text-emerald-400">{BRL.format(receitas)} entrada</span>
                    {" · "}
                    <span className="text-red-400">{BRL.format(gastos)} saída</span>
                  </>
                }
                trailing={
                  <Link
                    to="/financeiro"
                    aria-label="Abrir financeiro"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/25 text-sidebar-foreground/80 transition-colors hover:bg-black/35 hover:text-sidebar-foreground"
                  >
                    <BarChart3 className="size-5" />
                  </Link>
                }
              />

              <DesktopInsight
                icon={CalendarDays}
                iconWrap="bg-primary/15 text-primary"
                label="Próxima programação"
                value={next?.title ?? "Nenhuma no radar"}
                hint={nextHint}
                action={
                  next ? (
                    <PillLink
                      to="/programacoes/$id"
                      params={{ id: next.id }}
                      className="bg-primary/15 text-primary hover:bg-primary/25"
                    >
                      Ver detalhes
                    </PillLink>
                  ) : (
                    <PillLink to="/programacoes" className="bg-primary/15 text-primary hover:bg-primary/25">
                      Ver escalas
                    </PillLink>
                  )
                }
              />

              <DesktopInsight
                icon={Receipt}
                iconWrap="bg-success/15 text-success"
                label="Reembolsos pendentes"
                value={pendingReimbursements}
                hint={
                  pendingReimbursements === 1
                    ? "reembolso a regularizar"
                    : "reembolsos a regularizar"
                }
                action={
                  <PillLink to="/financeiro" className="bg-success/15 text-success hover:bg-success/25">
                    Regularizar
                  </PillLink>
                }
              />
            </div>

            <Card className="flex w-full items-center justify-center px-3 py-4 lg:hidden">
              <SummaryDonut
                size="sm"
                label="Abertas"
                display={openEvents}
                fill="var(--color-destructive)"
                caption={openEvents === 1 ? "programação aberta" : "programações abertas"}
              />
              <div aria-hidden className="mx-3 h-24 w-px shrink-0 self-center bg-border" />
              <SummaryDonut
                size="sm"
                delayMs={140}
                label="Finalizadas"
                display={doneEvents}
                fill="var(--color-success)"
                caption={doneEvents === 1 ? "programação finalizada" : "programações finalizadas"}
              />
            </Card>

            <div className="hidden grid-cols-2 gap-3 lg:grid">
              <DonutCard
                label="Abertas"
                display={openEvents}
                fill="var(--color-destructive)"
                caption={openEvents === 1 ? "programação aberta" : "programações abertas"}
                badge={CalendarDays}
                badgeClass="bg-destructive/15 text-destructive"
              />
              <DonutCard
                label="Finalizadas"
                display={doneEvents}
                fill="var(--color-success)"
                caption={doneEvents === 1 ? "programação finalizada" : "programações finalizadas"}
                delayMs={140}
                badge={Check}
                badgeClass="bg-success/15 text-success"
              />
            </div>
          </div>

          <Suspense fallback={<div className="min-h-10 lg:min-h-[22rem]" />}>
            <HomeMascot />
          </Suspense>
        </div>
      )}
    </AppShell>
  );
}
