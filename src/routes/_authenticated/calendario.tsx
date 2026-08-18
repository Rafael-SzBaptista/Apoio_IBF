import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, MapPin, Phone, Users, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton, SidePanel, StatusBadge } from "@/components/apoio-ui";
import { Button } from "@/components/ui/button";
import { useEvents, type EventListItem, scopeEventsForUser } from "@/hooks/use-data";
import { useCurrentMember, useIsAdmin } from "@/hooks/use-session";
import { assignmentAreaLabel } from "@/lib/constants";
import { weekday } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  ssr: false,
  component: CalendarioPage,
});

function displayValue(value: string | number | null | undefined) {
  if (value == null) return "—";
  const text = String(value).trim();
  return text.length > 0 ? text : "—";
}

function formatEventWhen(iso: string, time: string | null) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const year = date.getFullYear();
  const clock = time ? time.slice(0, 5) : null;
  return `${weekday(iso)}, ${day} ${month} ${year}${clock ? ` • ${clock}` : ""}`;
}

function CalendarioPage() {
  const events = useEvents();
  const isAdmin = useIsAdmin();
  const { data: me } = useCurrentMember();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<EventListItem | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const label = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= lastDate; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: iso, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [year, month]);

  const visible = scopeEventsForUser(events.data ?? [], isAdmin, me?.id);
  const filtered = visible;

  const weekCount = days.length / 7;
  const food = selected?.food_label || selected?.menus?.name || null;
  const people = selected?.expected_people;
  const assignments = selected?.event_assignments ?? [];

  return (
    <AppShell wide fill>
      {events.error && <DbBanner error={events.error} />}
      {events.isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="flex min-h-[32rem] flex-col gap-3 lg:h-full lg:min-h-0">
          <div className="flex shrink-0 items-center gap-3 max-lg:relative max-lg:w-full max-lg:justify-center">
            <Button
              size="icon"
              variant="outline"
              className="max-lg:absolute max-lg:left-0"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-40 text-center font-display text-lg font-semibold capitalize">
              {label}
            </h2>
            <Button
              size="icon"
              variant="outline"
              className="max-lg:absolute max-lg:right-0"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-border text-xs font-medium tracking-wide text-muted-foreground">
            <div className="grid shrink-0 grid-cols-7 gap-px text-center uppercase">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="bg-card py-2">
                  {d}
                </div>
              ))}
            </div>
            <div
              className="grid min-h-0 flex-1 grid-cols-7 gap-px"
              style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
              {days.map((cell, index) => {
                const dayEvents = cell.date
                  ? filtered.filter((event) => event.event_date === cell.date)
                  : [];
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex min-h-24 flex-col bg-card p-1 text-left lg:min-h-0",
                      !cell.date && "bg-muted/40",
                    )}
                  >
                    {cell.day && (
                      <p className="shrink-0 px-1 text-xs font-medium text-muted-foreground">
                        {cell.day}
                      </p>
                    )}
                    <div className="min-h-0 space-y-1 overflow-y-auto">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelected(event)}
                          className="block w-full truncate rounded-md bg-[oklch(0.64_0.16_32)] px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-white hover:bg-[oklch(0.6_0.16_32)] dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                        >
                          {event.title}
                          {event.event_assignments?.[0]?.members?.full_name
                            ? ` · ${event.event_assignments[0].members.full_name}`
                            : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SidePanel
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        eyebrow="Programação"
        title={selected?.title ?? ""}
        footer={
          selected ? (
            <Button asChild className="w-full">
              <Link to="/programacoes/$id" params={{ id: selected.id }}>
                Ir para Programação
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
            </div>
            <p className="capitalize text-muted-foreground">
              {formatEventWhen(selected.event_date, selected.event_time)}
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p>
                    <span className="text-muted-foreground">Local: </span>
                    {displayValue(selected.location)}
                  </p>
                  {selected.maps_url ? (
                    <a
                      href={selected.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      Abrir no Maps <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="flex gap-2">
                <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Pessoas: </span>
                  {people ? `${people} pessoas` : "—"}
                </span>
              </p>
              <p className="flex gap-2">
                <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Alimentação: </span>
                  {displayValue(food)}
                </span>
              </p>
              <p className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Contato: </span>
                  {displayValue(selected.phones)}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Escala
              </p>
              {assignments.length === 0 ? (
                <p className="text-muted-foreground">Ninguém escalado ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {assignments.map((assignment) => (
                    <li key={assignment.id} className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">
                        {assignment.members?.full_name ?? "—"}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {assignmentAreaLabel(assignment.area)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected.notes ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Observações
                </p>
                <p className="whitespace-pre-wrap text-muted-foreground">{selected.notes}</p>
              </div>
            ) : null}
          </div>
        )}
      </SidePanel>
    </AppShell>
  );
}
