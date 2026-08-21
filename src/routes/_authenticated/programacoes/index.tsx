import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, EmptyState, Field, PageSkeleton, SearchField, SidePanel, StatusBadge, TableDeleteButton, TablePager } from "@/components/apoio-ui";
import { MobileRecordCard, MobileRecordList } from "@/mobile";
import { usePagedList } from "@/hooks/use-paged-list";
import { DatePicker } from "@/components/date-time-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useEvents, type EventListItem, scopeEventsForUser } from "@/hooks/use-data";
import { useCurrentMember, useIsAdmin, useSession } from "@/hooks/use-session";
import { EVENT_STATUS, eventStatusValue } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/programacoes/")({
  ssr: false,
  component: ProgramacoesPage,
});


function formatTableDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatTableTime(time: string | null) {
  if (!time) return "—";
  return time.slice(0, 5);
}

function responsaveis(event: EventListItem) {
  const names = (event.event_assignments ?? [])
    .map((a) => a.members?.full_name)
    .filter(Boolean) as string[];
  return names.length ? names.join(", ") : "—";
}

function ProgramacoesPage() {
  const events = useEvents();
  const { loading: authLoading } = useSession();
  const isAdmin = useIsAdmin();
  const { data: me, isPending: memberPending } = useCurrentMember();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<EventListItem | null>(null);

  const scoped = useMemo(
    () => scopeEventsForUser(events.data ?? [], isAdmin, me?.id),
    [events.data, isAdmin, me?.id],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped
      .filter((event) => {
        if (date && event.event_date !== date) return false;
        if (statusFilter !== "all" && eventStatusValue(event.status) !== statusFilter) return false;
        if (!needle) return true;
        const haystack = [
          event.title,
          event.location,
          event.food_label,
          event.menus?.name,
          responsaveis(event),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => b.event_date.localeCompare(a.event_date) || a.title.localeCompare(b.title));
  }, [scoped, q, date, statusFilter]);

  const paged = usePagedList(filtered, `${q}|${date}|${statusFilter}`);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Programação excluída.");
      refresh();
    }
  };

  return (
    <AppShell
      wide
      actions={
        isAdmin ? (
          <Button asChild className="hidden lg:inline-flex">
            <Link to="/programacoes/nova">
              <Plus className="size-4" /> Nova programação
            </Link>
          </Button>
        ) : undefined
      }
    >
      {events.error && <DbBanner error={events.error} />}

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <SearchField value={q} onChange={setQ} className="w-full min-w-0 flex-1 lg:w-60 lg:flex-none" />
          {isAdmin ? (
            <Button
              asChild
              size="icon"
              className="size-9 shrink-0 lg:hidden"
              aria-label="Nova programação"
            >
              <Link to="/programacoes/nova">
                <Plus className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            className="min-w-0 flex-1 sm:w-[10.75rem] sm:flex-none"
            value={date}
            onChange={setDate}
            placeholder="Filtrar data"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-0 flex-1 sm:w-auto sm:min-w-40 sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {EVENT_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.value === "aberta" ? "Abertas" : "Concluídas"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {events.isLoading || authLoading || memberPending ? (
        <PageSkeleton />
      ) : scoped.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isAdmin ? "Nenhuma programação ainda" : "Nenhuma programação na sua escala"}
          description={
            isAdmin
              ? "Cadastre o Culto Conecte, noites de jogos e demais escalas do semestre."
              : "Quando você for escalado, as programações aparecem aqui."
          }
          action={
            isAdmin ? (
              <Button asChild>
                <Link to="/programacoes/nova">Criar a primeira</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y">
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Programação
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide md:table-cell">
                  Local
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide sm:table-cell">
                  Cardápio
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide lg:table-cell">
                  Responsáveis
                </th>
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Data prevista
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide sm:table-cell">
                  Horário
                </th>
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                {isAdmin && <th className="h-10 w-14 py-2" />}
              </tr>
            </thead>
            <tbody>
              {paged.total === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum resultado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paged.pageItems.map((event) => (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-secondary/50"
                    onClick={() => navigate({ to: "/programacoes/$id", params: { id: event.id } })}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="truncate text-xs text-muted-foreground md:hidden">
                        {event.location ?? "Local a definir"}
                      </p>
                    </td>
                    <td className="hidden truncate py-2.5 pr-4 text-muted-foreground md:table-cell">
                      {event.location ?? "—"}
                    </td>
                    <td className="hidden truncate py-2.5 pr-4 text-muted-foreground sm:table-cell">
                      {event.menus?.name ?? event.food_label ?? "—"}
                    </td>
                    <td className="hidden truncate py-2.5 pr-4 text-muted-foreground lg:table-cell">
                      {responsaveis(event)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4">
                      {formatTableDate(event.event_date)}
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {event.event_time ? ` · ${formatTableTime(event.event_time)}` : ""}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap py-2.5 pr-4 sm:table-cell">
                      {formatTableTime(event.event_time)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={event.status} />
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir esta programação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tarefas, escala e possíveis decorações também serão removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteEvent(event.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paged.total === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground lg:hidden">
            Nenhum resultado com os filtros atuais.
          </p>
        )}
        {paged.total > 0 && (
          <MobileRecordList>
            {paged.pageItems.map((event) => (
              <MobileRecordCard
                key={event.id}
                topLeft={event.title}
                bottomLeft={event.location ?? "Local a definir"}
                topRight={<StatusBadge status={event.status} />}
                bottomRight={formatTableDate(event.event_date)}
                onClick={() => setSelected(event)}
                action={
                  isAdmin ? (
                    <TableDeleteButton
                      title="Excluir esta programação?"
                      description="Tarefas, escala e possíveis decorações também serão removidas."
                      onConfirm={() => deleteEvent(event.id)}
                    />
                  ) : undefined
                }
              />
            ))}
          </MobileRecordList>
        )}
        <TablePager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </>
      )}

      <SidePanel
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        eyebrow="Programação"
        title={selected?.title ?? "Programação"}
        footer={
          selected ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Fechar
              </Button>
              <Button
                onClick={() =>
                  navigate({ to: "/programacoes/$id", params: { id: selected.id } })
                }
              >
                Abrir programação
              </Button>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="grid gap-4">
            <Field label="Local">
              <p className="text-sm">{selected.location ?? "Local a definir"}</p>
            </Field>
            <Field label="Cardápio">
              <p className="text-sm">{selected.menus?.name ?? selected.food_label ?? "—"}</p>
            </Field>
            <Field label="Responsáveis">
              <p className="text-sm">{responsaveis(selected)}</p>
            </Field>
            <Field label="Data prevista">
              <p className="text-sm">{formatTableDate(selected.event_date)}</p>
            </Field>
            <Field label="Horário">
              <p className="text-sm">{formatTableTime(selected.event_time)}</p>
            </Field>
            <Field label="Status">
              <StatusBadge status={selected.status} />
            </Field>
          </div>
        )}
      </SidePanel>
    </AppShell>
  );
}
