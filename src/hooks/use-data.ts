import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { isMissingRelation } from "@/lib/apoio-utils";
import { useSession } from "@/hooks/use-session";
import { removePrivateFile, uploadPrivateFile } from "@/lib/storage";

export type EventRow = Tables<"events">;
export type MemberRow = Tables<"members">;
export type MenuRow = Tables<"menus">;
export type InventoryRow = Tables<"inventory_items">;
export type FinanceRow = Tables<"finance_entries">;
export type MenuIngredientRow = Tables<"menu_ingredients">;

export type MenuWithIngredients = MenuRow & {
  menu_ingredients: MenuIngredientRow[];
};

export type EventAssignment = {
  id: string;
  area: string;
  member_id: string;
  members: { id?: string; full_name: string } | null;
};

export type EventListItem = EventRow & {
  menus: { name: string } | null;
  event_assignments: EventAssignment[];
};

export type EventDetail = EventRow & {
  menus: MenuWithIngredients | null;
  event_assignments: EventAssignment[];
  event_tasks: (Tables<"event_tasks"> & { members: { full_name: string } | null })[];
  event_shopping_items: Tables<"event_shopping_items">[];
  event_decorations: Tables<"event_decorations">[];
  event_photo_path: string | null;
};

export type FinanceListItem = FinanceRow & {
  events: { title: string; event_date: string } | null;
};

function useAuthReady() {
  const { session, loading } = useSession();
  return !loading && !!session;
}

async function loadEventShoppingItems(
  eventId: string,
  ingredients: MenuIngredientRow[],
): Promise<Tables<"event_shopping_items">[]> {
  const shopping = await supabase
    .from("event_shopping_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (shopping.error) {
    if (isMissingRelation(shopping.error)) return [];
    throw shopping.error;
  }

  const existing = shopping.data ?? [];
  if (existing.length > 0) return existing;
  if (ingredients.length === 0) return [];

  const { error } = await supabase.from("event_shopping_items").insert(
    ingredients.map((item) => ({
      event_id: eventId,
      menu_ingredient_id: item.id,
      name: item.name,
      qty_per_person: item.qty_per_person,
      where_to_buy: item.where_to_buy,
      notes: item.notes,
      sort_order: item.sort_order,
    })),
  );
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }

  const refreshed = await supabase
    .from("event_shopping_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  if (refreshed.error) {
    if (isMissingRelation(refreshed.error)) return [];
    throw refreshed.error;
  }
  return refreshed.data ?? [];
}

export function useEvents() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["events"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, menus(name), event_assignments(id, area, member_id, members(full_name))")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventListItem[];
    },
  });
}

export function assignedToMember(
  event: Pick<EventListItem, "event_assignments">,
  memberId: string | undefined,
) {
  if (!memberId) return false;
  return (event.event_assignments ?? []).some((assignment) => assignment.member_id === memberId);
}

export function scopeEventsForUser<T extends Pick<EventListItem, "event_assignments">>(
  events: T[],
  isAdmin: boolean,
  memberId: string | undefined,
) {
  if (isAdmin) return events;
  return events.filter((event) => assignedToMember(event, memberId));
}

export function useEvent(id: string | undefined) {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["event", id],
    enabled: ready && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "*, menus(*, menu_ingredients(*)), event_assignments(id, area, member_id, members(id, full_name)), event_tasks(*, members(full_name))",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let event_decorations: Tables<"event_decorations">[] = [];
      const decorations = await supabase
        .from("event_decorations")
        .select("id, title, sort_order, notes, inventory_item_id")
        .eq("event_id", id!)
        .order("sort_order");
      if (decorations.error) {
        if (!isMissingRelation(decorations.error)) {
          const fallback = await supabase
            .from("event_decorations")
            .select("id, title, sort_order")
            .eq("event_id", id!)
            .order("sort_order");
          if (fallback.error) {
            if (!isMissingRelation(fallback.error)) throw decorations.error;
          } else {
            event_decorations = (fallback.data ?? []).map((item) => ({
              ...item,
              notes: null,
              inventory_item_id: null,
            }));
          }
        }
      } else {
        event_decorations = decorations.data ?? [];
      }

      const ingredients = [...(data.menus?.menu_ingredients ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const event_shopping_items = await loadEventShoppingItems(id!, ingredients);

      let event_photo_path: string | null = null;
      const photo = await supabase.from("event_photos").select("path").eq("event_id", id!).maybeSingle();
      if (photo.error) {
        if (!isMissingRelation(photo.error)) throw photo.error;
      } else {
        event_photo_path = photo.data?.path ?? null;
      }

      return { ...data, event_decorations, event_shopping_items, event_photo_path } as EventDetail;
    },
  });
}

export function useMembers() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["members"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMenus() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["menus"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*, menu_ingredients(*)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as MenuWithIngredients[];
    },
  });
}

export function useMenu(id: string | undefined) {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["menu", id],
    enabled: ready && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*, menu_ingredients(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as MenuWithIngredients | null;
    },
  });
}

export function usePrices() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["ingredient-prices"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredient_prices").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInventory() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["inventory"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("sector")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInventorySectors() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["inventory-sectors"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_sectors")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) {
        if (isMissingRelation(error)) return [];
        throw error;
      }
      return data ?? [];
    },
  });
}

export function useFinance() {
  const ready = useAuthReady();
  return useQuery({
    queryKey: ["finance"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("*, events(title, event_date)")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinanceListItem[];
    },
  });
}

export function useInvalidate() {
  const client = useQueryClient();
  return (...keys: string[][]) =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export function useSetEventStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("events").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["events"], ["event"]),
  });
}

export function useToggleTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("event_tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["events"], ["event"]),
  });
}

export function useToggleShoppingItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("event_shopping_items").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(["event"]),
  });
}

export function useSetEventPhoto() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      eventId,
      file,
      previousPath,
    }: {
      eventId: string;
      file: File | null;
      previousPath: string | null;
    }) => {
      if (file) {
        const path = await uploadPrivateFile("programacoes", file);
        const { data: existing, error: lookupError } = await supabase
          .from("event_photos")
          .select("path")
          .eq("event_id", eventId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) {
          const { error } = await supabase.from("event_photos").update({ path }).eq("event_id", eventId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("event_photos").insert({ event_id: eventId, path });
          if (error) throw error;
        }
        if (previousPath && previousPath !== path) await removePrivateFile("programacoes", previousPath);
        return;
      }
      const { error } = await supabase.from("event_photos").delete().eq("event_id", eventId);
      if (error) throw error;
      await removePrivateFile("programacoes", previousPath);
    },
    onSuccess: () => invalidate(["event"]),
  });
}
