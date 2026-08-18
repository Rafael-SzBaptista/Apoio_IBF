import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MenuForm } from "@/components/menu-form";
import { useIsAdmin } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/cardapio/nova")({
  ssr: false,
  component: NovaAlimentacaoPage,
});

function NovaAlimentacaoPage() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Apenas administradores criam alimentações.</p>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <MenuForm menu={null} isAdmin />
    </AppShell>
  );
}
