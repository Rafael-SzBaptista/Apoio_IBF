import type { QueryClient } from "@tanstack/react-query";
import {
  fetchEvents,
  fetchFinance,
  fetchInventory,
  fetchMembers,
  fetchMenus,
} from "@/hooks/use-data";
import { fetchCurrentMember, fetchIsAdmin } from "@/hooks/use-session";

function ignoreFailure(promise: Promise<unknown>) {
  return promise.catch(() => undefined);
}

/** Loads the lists the authenticated app needs before the splash can dismiss. */
export function bootstrapProjectData(queryClient: QueryClient, userId: string) {
  return Promise.all([
    ignoreFailure(
      queryClient.ensureQueryData({
        queryKey: ["current-member", userId],
        staleTime: 5 * 60_000,
        queryFn: () => fetchCurrentMember(userId),
      }),
    ),
    ignoreFailure(
      queryClient.ensureQueryData({
        queryKey: ["is-admin", userId],
        staleTime: 5 * 60_000,
        queryFn: () => fetchIsAdmin(userId),
      }),
    ),
    ignoreFailure(queryClient.ensureQueryData({ queryKey: ["events"], queryFn: fetchEvents })),
    ignoreFailure(queryClient.ensureQueryData({ queryKey: ["finance"], queryFn: fetchFinance })),
    ignoreFailure(queryClient.ensureQueryData({ queryKey: ["members"], queryFn: fetchMembers })),
    ignoreFailure(queryClient.ensureQueryData({ queryKey: ["menus"], queryFn: fetchMenus })),
    ignoreFailure(
      queryClient.ensureQueryData({ queryKey: ["inventory"], queryFn: fetchInventory }),
    ),
  ]);
}
