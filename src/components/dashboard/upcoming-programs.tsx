import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { DashboardSection, dashboardLinkClass } from "@/components/dashboard/dashboard-section";
import { eventDayMonth, eventTimeLabel, teamLine, teamState } from "@/components/dashboard/model";
import type { EventListItem } from "@/hooks/use-data";

export function UpcomingPrograms({
  events,
  unavailable,
}: {
  events: EventListItem[];
  unavailable?: boolean;
}) {
  const listed = events.slice(0, 5);

  return (
    <DashboardSection
      title="Próximas programações"
      tone="blue"
      action={
        <Link to="/calendario" className={dashboardLinkClass()}>
          Ver calendário →
        </Link>
      }
    >
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar as programações.</p>
      ) : listed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma programação futura cadastrada.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {listed.map((event) => {
            const when = eventDayMonth(event.event_date);
            const time = eventTimeLabel(event.event_time);
            const incomplete = teamState(event) !== "ok";
            return (
              <li key={event.id}>
                <Link
                  to="/programacoes/$id"
                  params={{ id: event.id }}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/70"
                >
                  <span className="w-11 shrink-0 text-center">
                    <span className="block font-display text-lg font-semibold leading-none">{when.day}</span>
                    <span className="mt-1 block text-[11px] font-medium tracking-wide text-muted-foreground">
                      {when.month}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{event.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {[time, teamLine(event)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-primary">
                    <span className="hidden sm:inline">{incomplete ? "Resolver →" : "Ver detalhes →"}</span>
                    <ChevronRight className="size-4 sm:hidden" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
