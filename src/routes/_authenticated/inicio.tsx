import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton } from "@/components/apoio-ui";
import { Card } from "@/components/ui/card";
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
    <Card className="min-w-0 px-2 py-2 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-border/40 lg:bg-transparent lg:p-0 lg:py-4 lg:shadow-none lg:first:border-t-0 lg:first:pt-0">
      <div className="flex flex-col items-center gap-1 text-center lg:block lg:text-left">
        <Icon className="size-3.5 shrink-0 text-muted-foreground lg:hidden" />
        <p className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground lg:mt-0 lg:flex lg:items-center lg:gap-2 lg:text-sm lg:leading-normal">
          <Icon className="hidden size-4 lg:inline" /> {label}
        </p>
        <div className="line-clamp-2 w-full font-display text-xs font-semibold leading-tight lg:mt-1 lg:line-clamp-none lg:truncate lg:text-xl lg:leading-normal">
          {value}
        </div>
        <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{hint}</p>
      </div>
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

  return (
    <AppShell wide>
      {events.error && <DbBanner error={events.error} />}
      {finance.error && <DbBanner error={finance.error} />}
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="grid items-center gap-3 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-3 lg:space-y-8">
            <div className="grid grid-cols-3 gap-2 lg:max-w-sm lg:grid-cols-1 lg:gap-0 lg:border-l lg:border-primary/40 lg:pl-5">
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

            <Card className="flex w-full items-center justify-center gap-4 px-3 py-4 lg:max-w-md lg:justify-start lg:gap-8 lg:border-0 lg:bg-transparent lg:p-0 lg:pl-5 lg:shadow-none">
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
            </Card>
          </div>

          <Suspense fallback={<div className="min-h-10 lg:min-h-[22rem]" />}>
            <HomeMascot />
          </Suspense>
        </div>
      )}
    </AppShell>
  );
}
