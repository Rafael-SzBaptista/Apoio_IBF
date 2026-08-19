import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton } from "@/components/apoio-ui";
import { SummaryDonut } from "@/components/summary-donut";
import { useEvents, useFinance, scopeEventsForUser, type FinanceListItem } from "@/hooks/use-data";
import { useCurrentMember, useIsAdmin } from "@/hooks/use-session";
import { isEventCompleted } from "@/lib/constants";
import { BRL, todayIso } from "@/lib/apoio-utils";

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

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint: ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4" /> {label}
      </p>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
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

  return (
    <AppShell>
      {events.error && <DbBanner error={events.error} />}
      {finance.error && <DbBanner error={finance.error} />}
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-8">
            <div className="max-w-sm divide-y divide-border/40 border-l border-primary/40 pl-5">
              <Stat
                icon={Wallet}
                label="Saldo do mês"
                value={BRL.format(receitas - gastos)}
                hint={`${BRL.format(receitas)} entrada · ${BRL.format(gastos)} saída`}
              />

              <Stat
                icon={CalendarDays}
                label="Próxima programação"
                value={next?.title ?? "Nenhuma no radar"}
                hint={
                  next
                    ? `${next.event_date.split("-").reverse().join("/")}${next.food_label ? ` · ${next.food_label}` : ""}`
                    : "Nenhuma programação futura cadastrada."
                }
              />

              <Stat
                icon={Receipt}
                label="Reembolsos pendentes"
                value={pendingReimbursements}
                hint={
                  pendingReimbursements === 1
                    ? "reembolso a regularizar"
                    : "reembolsos a regularizar"
                }
              />
            </div>

            <div className="flex max-w-md gap-8 pl-5">
              <SummaryDonut
                size="sm"
                label="Abertas"
                display={openEvents}
                fill="var(--color-destructive)"
                caption={openEvents === 1 ? "programação aberta" : "programações abertas"}
              />
              <SummaryDonut
                size="sm"
                delayMs={140}
                label="Finalizadas"
                display={doneEvents}
                fill="var(--color-success)"
                caption={doneEvents === 1 ? "programação finalizada" : "programações finalizadas"}
              />
            </div>
          </div>

          <Suspense fallback={<div className="min-h-[16rem] lg:min-h-[22rem]" />}>
            <HomeMascot />
          </Suspense>
        </div>
      )}
    </AppShell>
  );
}
