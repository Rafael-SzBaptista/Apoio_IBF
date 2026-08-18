import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Share2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton, StatusBadge } from "@/components/apoio-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EventPhotoField } from "@/components/event-photo-field";
import { useEvent, usePrices, useSetEventPhoto, useSetEventStatus, useToggleShoppingItem, useToggleTask } from "@/hooks/use-data";
import { useIsAdmin } from "@/hooks/use-session";
import { assignmentAreaLabel, isEventCompleted, SAFETY_TAX, SAFETY_TAX_PERCENT } from "@/lib/constants";
import { BRL, buildShoppingList, weekday } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";
import { EventValueChart } from "@/components/event-value-chart";

export const Route = createFileRoute("/_authenticated/programacoes/$id")({
  ssr: false,
  component: ProgramacaoDetailPage,
});

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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

function ProgramacaoDetailPage() {
  const { id } = Route.useParams();
  const event = useEvent(id);
  const prices = usePrices();
  const isAdmin = useIsAdmin();
  const toggleTask = useToggleTask();
  const toggleShopping = useToggleShoppingItem();
  const setStatus = useSetEventStatus();
  const setPhoto = useSetEventPhoto();

  if (event.isLoading) {
    return (
      <AppShell wide>
        <PageSkeleton />
      </AppShell>
    );
  }
  if (event.error) {
    return (
      <AppShell wide>
        <DbBanner error={event.error} />
      </AppShell>
    );
  }
  if (!event.data) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Programação não encontrada.</p>
      </AppShell>
    );
  }

  const row = event.data;
  const people = row.expected_people ?? 0;
  const food = row.food_label ?? row.menus?.name ?? null;
  const shoppingSource =
    (row.event_shopping_items ?? []).length > 0
      ? [...row.event_shopping_items].sort((a, b) => a.sort_order - b.sort_order)
      : [...(row.menus?.menu_ingredients ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            ...item,
            done: false,
            shoppingId: undefined as string | undefined,
          }));
  const shopping = buildShoppingList(shoppingSource, people || 1, prices.data ?? []).map(
    (item, index) => {
      const source = shoppingSource[index] as {
        id?: string;
        done?: boolean;
      };
      return {
        ...item,
        shoppingId: source?.id,
        done: source?.done ?? false,
      };
    },
  );
  const subtotal = shopping.reduce((sum, item) => sum + (item.estimate?.cost ?? 0), 0);
  const total = subtotal * SAFETY_TAX;
  const boughtCount = shopping.filter((item) => item.done).length;
  const tasks = [...(row.event_tasks ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const doneCount = tasks.filter((task) => task.done).length;
  const decorations = [...(row.event_decorations ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const when = formatEventWhen(row.event_date, row.event_time);
  const locked = isEventCompleted(row.status);

  const share = async () => {
    const url = window.location.href;
    const text = [row.title, when, row.location, url].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: row.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar.");
    }
  };

  return (
    <AppShell wide>
      <div className="grid items-start gap-4 pb-8 lg:grid-cols-[minmax(16rem,20rem)_1fr] xl:grid-cols-[minmax(18rem,22rem)_1fr]">
        <Card className="border border-foreground/25 bg-muted shadow-none">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Programação
                </p>
                <h1 className="mt-0.5 font-display text-xl font-semibold leading-tight">{row.title}</h1>
                <p className="mt-0.5 text-sm capitalize text-muted-foreground">{when}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p>
                    <span className="text-muted-foreground">Local: </span>
                    {displayValue(row.location)}
                  </p>
                  {row.maps_url ? (
                    <a
                      href={row.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      Abrir no Maps <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Maps: —</p>
                  )}
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
                  <span className="text-muted-foreground">Tipo de lanche: </span>
                  {displayValue(food)}
                </span>
              </p>
              <p className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="text-muted-foreground">Contato: </span>
                  {displayValue(row.phones)}
                </span>
              </p>
            </div>

            <div className="min-h-0">
              <EventValueChart
                size="md"
                ring="var(--muted)"
                people={people}
                chargedPerPerson={
                  row.menus?.charged_price_per_person != null
                    ? Number(row.menus.charged_price_per_person)
                    : null
                }
                cost={people > 0 ? subtotal : 0}
              />
            </div>

            {row.notes && (
              <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.notes}</p>
            )}

            {row.photo_enabled && (
              <EventPhotoField
                path={row.event_photo_path}
                locked={locked}
                pending={setPhoto.isPending}
                onPick={(file) =>
                  setPhoto.mutate(
                    { eventId: row.id, file, previousPath: row.event_photo_path },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
                onClear={() =>
                  setPhoto.mutate(
                    { eventId: row.id, file: null, previousPath: row.event_photo_path },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
              />
            )}

            <div className="flex flex-wrap gap-2">
              {isAdmin && !locked && (
                <Button asChild size="sm">
                  <Link to="/programacoes/nova" search={{ id: row.id }}>
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={share}>
                <Share2 className="size-3.5" /> Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <div>
            <h2 className="font-display text-base font-semibold">Escala</h2>
            <div className="mt-3">
              {(row.event_assignments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém escalado ainda.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(row.event_assignments ?? []).map((assignment) => {
                    const name = assignment.members?.full_name ?? "—";
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 rounded-md bg-muted px-3 py-2"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                          {initials(name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <span className="mt-0.5 inline-flex rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {assignmentAreaLabel(assignment.area)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-base font-semibold">Tarefas</h2>
              {tasks.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {doneCount} de {tasks.length} concluídas
                </p>
              )}
            </div>
            {tasks.length > 0 && (
              <Progress className="mt-3 h-1.5" value={(doneCount / tasks.length) * 100} />
            )}
            <div className="mt-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        toggleTask.mutate(
                          { id: task.id, done: !task.done },
                          { onError: (error) => toast.error(error.message) },
                        );
                      }}
                      className={cn(
                        "flex items-start gap-2.5 rounded-md bg-muted px-3 py-2 text-left text-sm",
                        locked ? "cursor-default" : "hover:bg-secondary/70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border",
                          task.done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {task.done && <Check className="size-2.5" />}
                      </span>
                      <span className={task.done ? "text-muted-foreground line-through" : ""}>
                        {task.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-base font-semibold">Compras</h2>
              {shopping.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {boughtCount} de {shopping.length} comprados
                </p>
              )}
            </div>
            {shopping.length > 0 && (
              <Progress className="mt-3 h-1.5" value={(boughtCount / shopping.length) * 100} />
            )}
            <div className="mt-3">
              {shopping.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Vincule um cardápio ou adicione itens na edição da programação.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-y">
                        <th className="h-7 w-8 py-1" aria-label="Comprado" />
                        <th className="h-7 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Item
                        </th>
                        <th className="h-7 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Total
                        </th>
                        <th className="h-7 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Onde
                        </th>
                        <th className="h-7 px-3 py-1 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Estimativa
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopping.map((item) => (
                        <tr
                          key={item.id ?? item.name}
                          className={cn(
                            "border-b border-border/60 last:border-b-0",
                            item.shoppingId && !locked && "cursor-pointer hover:bg-muted/70",
                          )}
                          onClick={() => {
                            if (locked || !item.shoppingId) return;
                            toggleShopping.mutate(
                              { id: item.shoppingId, done: !item.done },
                              { onError: (error) => toast.error(error.message) },
                            );
                          }}
                        >
                          <td className="py-1 pr-2">
                            <span
                              className={cn(
                                "grid size-4 place-items-center rounded-sm border",
                                item.done
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {item.done && <Check className="size-2.5" />}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1 leading-5",
                              item.done && "text-muted-foreground line-through",
                            )}
                          >
                            {item.name}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1 leading-5",
                              item.done && "text-muted-foreground line-through",
                            )}
                          >
                            {item.totalLabel}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1 leading-5 text-muted-foreground",
                              item.done && "line-through",
                            )}
                          >
                            {item.where_to_buy ?? "—"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1 text-right leading-5",
                              item.done && "text-muted-foreground line-through",
                            )}
                          >
                            {item.estimate ? BRL.format(item.estimate.cost) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-sm text-muted-foreground">
                          Subtotal {BRL.format(subtotal)} · com taxa de segurança {SAFETY_TAX_PERCENT}%:{" "}
                          <span className="font-medium text-foreground">{BRL.format(total)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="pb-8">
            <h2 className="font-display text-base font-semibold">Possível decoração</h2>
            <div className="mt-3">
              {decorations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ideia de decoração registrada.</p>
              ) : (
                <div className="space-y-2">
                  {decorations.map((item) => (
                    <div key={item.id} className="rounded-md bg-muted px-3 py-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.inventory_item_id && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Almoxarifado</p>
                      )}
                      {item.notes ? (
                        <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end pb-8">
        <Button
          type="button"
          variant={locked ? "outline" : "default"}
          disabled={setStatus.isPending}
          onClick={() =>
            setStatus.mutate(
              { id: row.id, status: locked ? "aberta" : "concluida" },
              {
                onSuccess: () =>
                  toast.success(locked ? "Programação reaberta." : "Programação concluída."),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          {locked ? (
            <>
              <RotateCcw className="size-4" /> Reabrir
            </>
          ) : (
            <>
              <Check className="size-4" /> Concluir
            </>
          )}
        </Button>
      </div>
    </AppShell>
  );
}
