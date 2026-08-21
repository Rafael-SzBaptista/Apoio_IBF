import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchIsAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function fetchCurrentMember(userId: string) {
  const { data } = await supabase.from("members").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useIsAdmin() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => fetchIsAdmin(userId!),
  });
  return !!data;
}

export function useCurrentMember() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["current-member", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => fetchCurrentMember(userId!),
  });
}
