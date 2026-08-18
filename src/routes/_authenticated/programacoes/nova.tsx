import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/apoio-ui";
import {
  EventForm,
  emptyEventForm,
  eventToFormValues,
  eventToPlanning,
  toEventPayload,
  type EventPlanningValues,
} from "@/components/event-form";
import { supabase } from "@/integrations/supabase/client";
import { useEvent, useInventory, useMembers, useMenus } from "@/hooks/use-data";
import { useIsAdmin } from "@/hooks/use-session";
import { isEventCompleted } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

type NovaSearch = {
  id?: string;
};

export const Route = createFileRoute("/_authenticated/programacoes/nova")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): NovaSearch => ({
    id: typeof search.id === "string" && search.id.length > 0 ? search.id : undefined,
  }),
  component: NovaProgramacaoPage,
});

async function saveShoppingItems(
  eventId: string,
  items: EventPlanningValues["shopping"],
  previous: { menu_ingredient_id: string | null; name: string; done: boolean }[] = [],
) {
  const { error: delError } = await supabase
    .from("event_shopping_items")
    .delete()
    .eq("event_id", eventId);
  if (delError) return delError;

  const rows = items.filter((item) => item.name.trim());
  if (rows.length === 0) return null;

  const { error } = await supabase.from("event_shopping_items").insert(
    rows.map((item, index) => ({
      event_id: eventId,
      menu_ingredient_id: item.menu_ingredient_id,
      name: item.name.trim(),
      qty_per_person: item.qty_per_person.trim() || null,
      where_to_buy: item.where_to_buy.trim() || null,
      notes: item.notes.trim() || null,
      sort_order: index + 1,
      done:
        previous.find(
          (row) =>
            (item.menu_ingredient_id && row.menu_ingredient_id === item.menu_ingredient_id) ||
            row.name === item.name.trim(),
        )?.done ?? false,
    })),
  );
  return error;
}

function NovaProgramacaoPage() {
  const { id } = Route.useSearch();
  const menus = useMenus();
  const members = useMembers();
  const inventory = useInventory();
  const event = useEvent(id);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  if (!isAdmin) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Apenas administradores criam programações.</p>
      </AppShell>
    );
  }

  if (id && event.isLoading) {
    return (
      <AppShell wide>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (id && (event.error || !event.data)) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Programação não encontrada.</p>
      </AppShell>
    );
  }

  if (id && event.data && isEventCompleted(event.data.status)) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">
          Esta programação está concluída. Reabra-a para editar.
        </p>
      </AppShell>
    );
  }

  const editing = Boolean(id && event.data);

  return (
    <AppShell wide>
      <EventForm
        key={editing ? id : "new"}
        initial={editing && event.data ? eventToFormValues(event.data) : emptyEventForm()}
        initialPlanning={editing && event.data ? eventToPlanning(event.data) : undefined}
        menus={menus.data ?? []}
        members={members.data ?? []}
        inventory={inventory.data ?? []}
        submitLabel={editing ? "Salvar alterações" : "Criar programação"}
        title={editing ? "Editar programação" : "Nova programação"}
        onCancel={() => {
          if (editing && id) navigate({ to: "/programacoes/$id", params: { id } });
          else navigate({ to: "/programacoes" });
        }}
        showPlanning
        onSubmit={async (values, planning) => {
          const payload = toEventPayload(values);

          if (editing && id) {
            const { error } = await supabase.from("events").update(payload).eq("id", id);
            if (error) {
              toast.error(error.message);
              return;
            }

            const previousTasks = event.data?.event_tasks ?? [];
            const { error: delTasks } = await supabase.from("event_tasks").delete().eq("event_id", id);
            if (delTasks) {
              toast.error(delTasks.message);
              return;
            }
            const { error: delAssign } = await supabase
              .from("event_assignments")
              .delete()
              .eq("event_id", id);
            if (delAssign) {
              toast.error(delAssign.message);
              return;
            }
            const { error: delDecor } = await supabase
              .from("event_decorations")
              .delete()
              .eq("event_id", id);
            if (delDecor) {
              toast.error(delDecor.message);
              return;
            }

            const tasks = planning?.tasks ?? [];
            if (tasks.length > 0) {
              const { error: tasksError } = await supabase.from("event_tasks").insert(
                tasks.map((title, index) => ({
                  event_id: id,
                  title,
                  sort_order: index + 1,
                  done: previousTasks.find((task) => task.title === title)?.done ?? false,
                })),
              );
              if (tasksError) {
                toast.error(tasksError.message);
                return;
              }
            }

            const assignments = planning?.assignments ?? [];
            if (assignments.length > 0) {
              const { error: assignError } = await supabase.from("event_assignments").insert(
                assignments.map((assignment) => ({
                  event_id: id,
                  member_id: assignment.member_id,
                  area: assignment.area,
                })),
              );
              if (assignError) {
                toast.error(assignError.message);
                return;
              }
            }

            const decorations = planning?.decorations ?? [];
            if (decorations.length > 0) {
              const { error: decorError } = await supabase.from("event_decorations").insert(
                decorations.map((item, index) => ({
                  event_id: id,
                  title: item.title,
                  notes: item.notes || null,
                  inventory_item_id: item.inventory_item_id,
                  sort_order: index + 1,
                })),
              );
              if (decorError) {
                toast.error(decorError.message);
                return;
              }
            }

            const shoppingError = await saveShoppingItems(
              id,
              planning?.shopping ?? [],
              event.data?.event_shopping_items ?? [],
            );
            if (shoppingError) {
              toast.error(shoppingError.message);
              return;
            }

            await queryClient.invalidateQueries({ queryKey: ["events"] });
            await queryClient.invalidateQueries({ queryKey: ["event", id] });
            toast.success("Programação atualizada.");
            navigate({ to: "/programacoes/$id", params: { id } });
            return;
          }

          const { data, error } = await supabase.from("events").insert(payload).select("id").single();
          if (error) {
            toast.error(error.message);
            return;
          }

          const tasks = planning?.tasks ?? [];
          if (tasks.length > 0) {
            const { error: tasksError } = await supabase.from("event_tasks").insert(
              tasks.map((title, index) => ({
                event_id: data.id,
                title,
                sort_order: index + 1,
              })),
            );
            if (tasksError) {
              toast.error(tasksError.message);
              return;
            }
          }

          const assignments = planning?.assignments ?? [];
          if (assignments.length > 0) {
            const { error: assignError } = await supabase.from("event_assignments").insert(
              assignments.map((assignment) => ({
                event_id: data.id,
                member_id: assignment.member_id,
                area: assignment.area,
              })),
            );
            if (assignError) {
              toast.error(assignError.message);
              return;
            }
          }

          const decorations = planning?.decorations ?? [];
          if (decorations.length > 0) {
            const { error: decorError } = await supabase.from("event_decorations").insert(
              decorations.map((item, index) => ({
                event_id: data.id,
                title: item.title,
                notes: item.notes || null,
                inventory_item_id: item.inventory_item_id,
                sort_order: index + 1,
              })),
            );
            if (decorError) {
              toast.error(decorError.message);
              return;
            }
          }

          const shoppingError = await saveShoppingItems(data.id, planning?.shopping ?? []);
          if (shoppingError) {
            toast.error(shoppingError.message);
            return;
          }

          toast.success("Programação criada.");
          navigate({ to: "/programacoes" });
        }}
      />
    </AppShell>
  );
}
