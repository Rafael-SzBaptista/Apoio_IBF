import { Link } from "@tanstack/react-router";
import { DashboardSection, dashboardLinkClass } from "@/components/dashboard/dashboard-section";

export function InventorySummary({
  total,
  outOfStock,
  lowStock,
  unavailable,
}: {
  total: number;
  outOfStock: number;
  /** Reservado para quando o cadastro passar a ter um limite de estoque baixo. */
  lowStock?: number;
  unavailable?: boolean;
}) {
  return (
    <DashboardSection
      title="Almoxarifado"
      tone="ink"
      action={
        <Link to="/almoxarifado" className={dashboardLinkClass()}>
          Ver almoxarifado →
        </Link>
      }
    >
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar o almoxarifado.</p>
      ) : (
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Itens cadastrados</dt>
            <dd className="font-display text-2xl font-semibold leading-none tabular-nums">{total}</dd>
          </div>
          {lowStock != null ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">Estoque baixo</dt>
              <dd className="font-display text-2xl font-semibold leading-none tabular-nums">{lowStock}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Sem estoque</dt>
            <dd className="font-display text-2xl font-semibold leading-none tabular-nums">{outOfStock}</dd>
          </div>
        </dl>
      )}
    </DashboardSection>
  );
}
