import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DbBanner, PageSkeleton } from "@/components/apoio-ui";
import { MenuForm } from "@/components/menu-form";
import { useMenu } from "@/hooks/use-data";
import { useIsAdmin } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/cardapio/$id")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (params.id === "precos") {
      throw redirect({ to: "/cardapio/precos" });
    }
    if (params.id === "nova") {
      throw redirect({ to: "/cardapio/nova" });
    }
  },
  component: CardapioDetailPage,
});

function CardapioDetailPage() {
  const { id } = Route.useParams();
  const menu = useMenu(id);
  const isAdmin = useIsAdmin();

  if (menu.isLoading) {
    return (
      <AppShell wide>
        <PageSkeleton />
      </AppShell>
    );
  }
  if (menu.error) {
    return (
      <AppShell wide>
        <DbBanner error={menu.error} />
      </AppShell>
    );
  }
  if (!menu.data) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Alimentação não encontrada.</p>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <MenuForm menu={menu.data} isAdmin={isAdmin} />
    </AppShell>
  );
}
