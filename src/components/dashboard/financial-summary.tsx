import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DashboardSection, dashboardLinkClass } from "@/components/dashboard/dashboard-section";
import type { MonthPoint } from "@/components/dashboard/model";
import { BRL } from "@/lib/apoio-utils";

export function FinancialSummary({
  receitas,
  gastos,
  saldo,
  history,
  unavailable,
}: {
  receitas: number;
  gastos: number;
  saldo: number;
  history: MonthPoint[];
  unavailable?: boolean;
}) {
  const showChart = !unavailable && history.length >= 2;

  return (
    <DashboardSection
      title="Financeiro do mês"
      tone="orange"
      action={
        <Link to="/financeiro" className={dashboardLinkClass()}>
          Ver financeiro →
        </Link>
      }
    >
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar o financeiro.</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Entradas</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-success tabular-nums sm:text-base">
                {BRL.format(receitas)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Saídas</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-destructive tabular-nums sm:text-base">
                {BRL.format(gastos)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Saldo</dt>
              <dd className="mt-1 truncate text-sm font-semibold tabular-nums sm:text-base">
                {BRL.format(saldo)}
              </dd>
            </div>
          </dl>
          {showChart ? (
            <ChartContainer
              className="mt-4 aspect-auto h-28 w-full"
              config={{
                receitas: { label: "Entradas", color: "var(--color-success)" },
                gastos: { label: "Saídas", color: "var(--color-destructive)" },
              }}
            >
              <BarChart data={history} barGap={4} barCategoryGap="28%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receitas" fill="var(--color-receitas)" radius={3} />
                <Bar dataKey="gastos" fill="var(--color-gastos)" radius={3} />
              </BarChart>
            </ChartContainer>
          ) : null}
        </>
      )}
    </DashboardSection>
  );
}
