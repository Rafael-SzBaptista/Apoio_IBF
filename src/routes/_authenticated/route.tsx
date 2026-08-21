import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSplash } from "@/components/app-splash";
import {
  fetchEvents,
  fetchFinance,
  fetchInventory,
  fetchMembers,
  fetchMenus,
} from "@/hooks/use-data";
import { fetchCurrentMember, fetchIsAdmin } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapProjectData } from "@/lib/bootstrap";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingMinMs: 400,
  pendingComponent: AppSplash,
  staleTime: 60_000,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  loader: async ({ context }) => {
    await bootstrapProjectData(context.queryClient, context.user.id);
  },
  component: AuthenticatedLayout,
});

function querySettled(query: { isFetched: boolean; isError: boolean; isPending: boolean }) {
  return query.isFetched || query.isError || !query.isPending;
}

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const userId = user.id;

  const member = useQuery({
    queryKey: ["current-member", userId],
    staleTime: 5 * 60_000,
    queryFn: () => fetchCurrentMember(userId),
  });
  const admin = useQuery({
    queryKey: ["is-admin", userId],
    staleTime: 5 * 60_000,
    queryFn: () => fetchIsAdmin(userId),
  });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const finance = useQuery({ queryKey: ["finance"], queryFn: fetchFinance });
  const members = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const menus = useQuery({ queryKey: ["menus"], queryFn: fetchMenus });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });

  const ready = [member, admin, events, finance, members, menus, inventory].every(querySettled);

  if (!ready) return <AppSplash />;
  return <Outlet />;
}
