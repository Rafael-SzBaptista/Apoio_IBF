import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton } from "@/components/apoio-ui";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { InventorySummary } from "@/components/dashboard/inventory-summary";
import {
  attentionItems,
  countPendingReimbursements,
  eventCounts,
  eventDayMonth,
  eventTimeLabel,
  firstName,
  greetingForHour,
  inventoryCounts,
  monthTotals,
  upcomingEvents,
  yearActivity,
} from "@/components/dashboard/model";
import {
  MonthBalanceCard,
  NextProgramCard,
  PendingCard,
  ProgramsCard,
} from "@/components/dashboard/summary-cards";
import { UpcomingPrograms } from "@/components/dashboard/upcoming-programs";
import { useEvents, useFinance, useInventory, scopeEventsForUser } from "@/hooks/use-data";
import { useCurrentMember, useIsAdmin } from "@/hooks/use-session";
import { formatDate, todayIso } from "@/lib/apoio-utils";

export const Route = createFileRoute("/_authenticated/inicio")({
  ssr: false,
  component: InicioPage,
});

function InicioPage() {
  const events = useEvents();
  const finance = useFinance();
  const inventory = useInventory();
  const isAdmin = useIsAdmin();
  const { data: me } = useCurrentMember();
  const reduceMotion = useReducedMotion();
  const today = todayIso();
  const visible = scopeEventsForUser(events.data ?? [], isAdmin, me?.id);
  const upcoming = upcomingEvents(visible, today);
  const next = upcoming[0];
  const nextWhen = next ? eventDayMonth(next.event_date) : null;
  const financeRows = finance.data ?? [];
  const totals = monthTotals(financeRows, today.slice(0, 7));
  const pending = countPendingReimbursements(financeRows);
  const history = yearActivity(financeRows, today.slice(0, 4));
  const stock = inventoryCounts(inventory.data ?? []);
  const counts = eventCounts(visible);
  const attention = attentionItems(
    upcoming,
    finance.isError ? 0 : pending,
    inventory.isError ? 0 : stock.outOfStock,
  );
  const loading = events.isLoading || finance.isLoading || inventory.isLoading;

  return (
    <AppShell wide>
      {events.error ? <DbBanner error={events.error} /> : null}
      {finance.error ? <DbBanner error={finance.error} /> : null}
      {inventory.error ? <DbBanner error={inventory.error} /> : null}
      {loading ? (
        <PageSkeleton />
      ) : (
        <motion.div
          className="space-y-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <DashboardHeader
            greeting={greetingForHour(new Date().getHours())}
            name={firstName(me?.full_name)}
            dateLabel={formatDate(today)}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NextProgramCard
              day={nextWhen?.day}
              month={nextWhen?.month}
              title={next?.title}
              time={next ? eventTimeLabel(next.event_time) : null}
              eventId={next?.id}
              unavailable={events.isError}
            />
            <PendingCard
              count={attention.length}
              incomplete={events.isError || finance.isError || inventory.isError}
            />
            <MonthBalanceCard
              saldo={totals.saldo}
              receitas={totals.receitas}
              gastos={totals.gastos}
              unavailable={finance.isError}
            />
            <ProgramsCard open={counts.open} done={counts.done} unavailable={events.isError} />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UpcomingPrograms events={upcoming} unavailable={events.isError} />
            </div>
            <AttentionPanel items={attention} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FinancialSummary
              receitas={totals.receitas}
              gastos={totals.gastos}
              saldo={totals.saldo}
              history={history}
              unavailable={finance.isError}
            />
            <InventorySummary
              total={stock.total}
              outOfStock={stock.outOfStock}
              unavailable={inventory.isError}
            />
          </div>
        </motion.div>
      )}
    </AppShell>
  );
}
