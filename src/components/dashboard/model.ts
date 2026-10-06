import type { EventListItem, FinanceListItem, InventoryRow } from "@/hooks/use-data";
import { isEventCompleted } from "@/lib/constants";
import { formatShortDate } from "@/lib/apoio-utils";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"] as const;

export function greetingForHour(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstName(fullName: string | null | undefined) {
  const name = fullName?.trim();
  if (!name) return null;
  return name.split(/\s+/)[0] ?? null;
}

export function eventDayMonth(iso: string) {
  const [, month, day] = iso.split("-");
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);
  return {
    day: Number.isNaN(dayNumber) ? "" : String(dayNumber),
    month: MONTHS[monthIndex] ?? "",
  };
}

export function eventTimeLabel(time: string | null) {
  if (!time) return null;
  return time.slice(0, 5);
}

export type TeamState = "ok" | "empty" | "incomplete";

export function teamState(event: Pick<EventListItem, "event_assignments">): TeamState {
  const assignments = event.event_assignments ?? [];
  if (assignments.length === 0) return "empty";
  const areas = new Set(assignments.map((assignment) => assignment.area));
  if (areas.has("equipe")) return "ok";
  if (areas.has("alimentacao") && areas.has("decoracao")) return "ok";
  return "incomplete";
}

export function teamLine(event: EventListItem) {
  if (teamState(event) !== "ok") return "Equipe incompleta";
  const count = event.event_assignments?.length ?? 0;
  return count === 1 ? "1 pessoa escalada" : `${count} pessoas escaladas`;
}

export function upcomingEvents(events: EventListItem[], today: string) {
  return events
    .filter((event) => event.event_date >= today && !isEventCompleted(event.status))
    .slice()
    .sort((a, b) => {
      const byDate = a.event_date.localeCompare(b.event_date);
      if (byDate !== 0) return byDate;
      return (a.event_time ?? "").localeCompare(b.event_time ?? "");
    });
}

export function eventCounts(events: EventListItem[]) {
  const open = events.filter((event) => !isEventCompleted(event.status)).length;
  return { open, done: events.length - open };
}

export type AttentionItem = {
  id: string;
  text: string;
  tone: "reimbursement" | "missing" | "incomplete" | "stock";
} & ({ to: "finance" } | { to: "inventory" } | { to: "event"; eventId: string });

export function attentionItems(
  upcoming: EventListItem[],
  pendingReimbursements: number,
  outOfStock: number,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (pendingReimbursements > 0) {
    items.push({
      id: "reembolsos",
      text:
        pendingReimbursements === 1
          ? "1 reembolso aguardando regularização"
          : `${pendingReimbursements} reembolsos aguardando regularização`,
      tone: "reimbursement",
      to: "finance",
    });
  }

  for (const event of upcoming) {
    const state = teamState(event);
    if (state === "ok") continue;
    const date = formatShortDate(event.event_date);
    items.push({
      id: `${state}-${event.id}`,
      text:
        state === "empty"
          ? `Programação de ${date} está sem responsável`
          : `Escala de ${date} ainda está incompleta`,
      tone: state === "empty" ? "missing" : "incomplete",
      to: "event",
      eventId: event.id,
    });
  }

  if (outOfStock > 0) {
    items.push({
      id: "estoque",
      text:
        outOfStock === 1
          ? "1 item do almoxarifado está sem estoque"
          : `${outOfStock} itens do almoxarifado estão sem estoque`,
      tone: "stock",
      to: "inventory",
    });
  }

  return items;
}

export function monthTotals(rows: FinanceListItem[], month: string) {
  const monthRows = rows.filter((row) => row.entry_date.startsWith(month));
  const receitas = monthRows
    .filter((row) => row.kind === "receita")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const gastos = monthRows
    .filter((row) => row.kind === "gasto")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  return { receitas, gastos, saldo: receitas - gastos };
}

export function countPendingReimbursements(rows: FinanceListItem[]) {
  return rows.filter(
    (row) =>
      row.kind === "gasto" &&
      (row.reimbursement_status === "pendente" || row.reimbursement_status === "solicitado"),
  ).length;
}

export type MonthPoint = { mes: string; receitas: number; gastos: number };

export function yearActivity(rows: FinanceListItem[], year: string): MonthPoint[] {
  const buckets = new Map<string, MonthPoint>();
  for (const row of rows) {
    if (!row.entry_date.startsWith(`${year}-`)) continue;
    const key = row.entry_date.slice(0, 7);
    const current = buckets.get(key) ?? { mes: monthShort(key), receitas: 0, gastos: 0 };
    if (row.kind === "receita") current.receitas += Number(row.amount);
    if (row.kind === "gasto") current.gastos += Number(row.amount);
    buckets.set(key, current);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point)
    .filter((point) => point.receitas > 0 || point.gastos > 0);
}

function monthShort(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  const clean = label.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function inventoryCounts(items: InventoryRow[]) {
  return {
    total: items.length,
    outOfStock: items.filter((item) => item.quantity === 0).length,
  };
}
